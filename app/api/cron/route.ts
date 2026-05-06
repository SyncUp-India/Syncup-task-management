import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendSlack } from '@/lib/slack';
import { sendEmail, overdueTaskHtml } from '@/lib/email';

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const today = new Date().toISOString().slice(0, 10);

  /* ── 1. Overdue task escalations + email alerts ── */
  const { data: tasks } = await supabaseAdmin
    .from('tasks')
    .select('*, members:assignee_id(name, email, slack_user_id)')
    .lt('due_date', today)
    .not('status', 'eq', 'done');

  const escalations: any[] = [];

  if (tasks && tasks.length > 0) {
    for (const t of tasks) {
      const dueDate   = new Date(t.due_date);
      const daysOverdue = Math.floor((Date.now() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

      let level = 0;
      if (daysOverdue >= 7) level = 3;
      else if (daysOverdue >= 3) level = 2;
      else if (daysOverdue >= 1) level = 1;

      if (level > (t.escalation_level ?? 0)) {
        await supabaseAdmin
          .from('tasks')
          .update({ escalation_level: level, last_escalated_at: new Date().toISOString() })
          .eq('id', t.id);

        const assignee = t.members?.name || 'unassigned';
        let slackMsg = '';
        if (level === 1) slackMsg = `⚠️ Task #${t.id} "${t.title}" is 1+ day overdue. Assignee: ${assignee}`;
        else if (level === 2) slackMsg = `🔶 Task #${t.id} "${t.title}" is 3+ days overdue — flagging to manager. Assignee: ${assignee}`;
        else if (level === 3) slackMsg = `🔴 Task #${t.id} "${t.title}" is 7+ days overdue — needs sprint review. Assignee: ${assignee}`;

        await sendSlack(slackMsg);

        // Send email to assignee if they have an email
        if (t.members?.email) {
          const subject = level === 3
            ? `🔴 CRITICAL: Task "${t.title}" is ${daysOverdue} days overdue`
            : level === 2
            ? `🔶 HIGH: Task "${t.title}" is ${daysOverdue} days overdue`
            : `⚠️ Task "${t.title}" is overdue`;

          await sendEmail({
            to:      t.members.email,
            subject,
            html:    overdueTaskHtml({ task: t, assigneeName: assignee, daysOverdue }),
          }).catch(err => console.error('[email error]', err));
        }

        escalations.push({ id: t.id, level });
      }
    }

    // Weekly digest (Mondays)
    const isMonday = new Date().getDay() === 1;
    if (isMonday) {
      const { count: total } = await supabaseAdmin.from('tasks').select('*', { count: 'exact', head: true });
      const { count: done  } = await supabaseAdmin
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'done')
        .gte('completed_at', new Date(Date.now() - 7 * 86400000).toISOString());
      await sendSlack(
        `📊 Weekly digest: ${done ?? 0} tasks completed last week · ${tasks.length} currently overdue · ${total ?? 0} total tasks`
      );
    }
  }

  /* ── 2. Monthly leave credit (0.5 sick + 1.0 privilege on 1st of month) ── */
  const isFirstOfMonth = new Date().getDate() === 1
  if (isFirstOfMonth) {
    const currentYear = new Date().getFullYear()
    const { data: activeUsers } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('active', true)

    if (activeUsers) {
      for (const u of activeUsers) {
        const { data: bal } = await supabaseAdmin
          .from('leave_balances')
          .select('*')
          .eq('user_id', u.id)
          .eq('year', currentYear)
          .maybeSingle()

        if (bal) {
          await supabaseAdmin
            .from('leave_balances')
            .update({
              sick_balance:      Math.min(6,  Number(bal.sick_balance)      + 0.5),
              privilege_balance: Math.min(12, Number(bal.privilege_balance) + 1.0),
            })
            .eq('id', bal.id)
        } else {
          await supabaseAdmin
            .from('leave_balances')
            .insert({ user_id: u.id, year: currentYear, sick_balance: 0.5, privilege_balance: 1.0 })
        }
      }
    }
  }

  /* ── 3. Timesheet cleanup: delete entries older than 2 months ── */
  const cutoff = new Date();
  cutoff.setDate(1);
  cutoff.setMonth(cutoff.getMonth() - 2);
  const cutoffDate = cutoff.toISOString().slice(0, 10);

  const { count: deletedTs } = await supabaseAdmin
    .from('timesheets')
    .delete({ count: 'exact' })
    .lt('date', cutoffDate);

  return NextResponse.json({
    ok:            true,
    overdue:       tasks?.length ?? 0,
    escalated:     escalations.length,
    leavesCredited: isFirstOfMonth,
    tsDeleted:     deletedTs ?? 0,
  });
}
