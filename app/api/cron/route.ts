import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendSlack, sendAttendanceSlack, sendSlackToDept } from '@/lib/slack';
import { sendEmail, overdueTaskHtml } from '@/lib/email';

const STATUS_LABEL: Record<string, string> = {
  todo: 'To Do', inprogress: 'In Progress', review: 'In Review', done: 'Done', blocked: 'Blocked',
};
const STATUS_EMOJI: Record<string, string> = {
  todo: '⏳', inprogress: '🔵', review: '🟡', done: '✅', blocked: '🔴',
};

async function sendEveningReport(today: string) {
  /* ── Attendance ── */
  const { data: allUsers } = await supabaseAdmin
    .from('users').select('id, name, department').eq('active', true);

  const { data: todayEntries } = await supabaseAdmin
    .from('timesheets')
    .select('user_id, check_in, check_out, pod, eod')
    .eq('date', today);

  const entryMap = new Map((todayEntries || []).map((e: any) => [e.user_id, e]));

  /* ── Who's on approved leave today ── */
  const { data: onLeave } = await supabaseAdmin
    .from('leave_requests')
    .select('user_id, leave_type, users!user_id(name, department)')
    .eq('status', 'approved')
    .lte('start_date', today)
    .gte('end_date', today);
  const onLeaveIds = new Set((onLeave || []).map((l: any) => l.user_id));

  const checkedIn:  string[] = [];
  const absent:     string[] = [];
  const missingEOD: string[] = [];

  for (const u of (allUsers || [])) {
    if (onLeaveIds.has(u.id)) continue; // skip — they're on leave
    const entry = entryMap.get(u.id);
    const tag   = u.department ? ` [${u.department}]` : '';
    if (!entry?.check_in) {
      absent.push(`${u.name}${tag}`);
    } else {
      checkedIn.push(`${u.name}${tag}`);
      if (!entry.eod) missingEOD.push(u.name);
    }
  }

  /* ── Status changes today ── */
  const todayStart = `${today}T00:00:00.000Z`;
  const { data: statusChanges } = await supabaseAdmin
    .from('activity_log')
    .select('task_id, details, tasks!task_id(title)')
    .eq('action', 'updated')
    .gte('created_at', todayStart)
    .not('details->>status', 'is', null);

  /* ── Pending tasks (not done) ── */
  const { data: pendingTasks } = await supabaseAdmin
    .from('tasks')
    .select('id, title, status, in_review_at, assignee:assignee_id(name)')
    .in('status', ['todo', 'inprogress', 'review', 'blocked'])
    .order('status');

  /* ── Build message ── */
  const lines: string[] = [`📋 *Daily Report — ${today}*`];

  // On leave today
  if (onLeave && onLeave.length > 0) {
    const names = onLeave.map((l: any) => {
      const u = l.users as any;
      const dept = u?.department ? ` [${u.department}]` : '';
      return `${u?.name || '?'}${dept} (${l.leave_type})`;
    });
    lines.push('');
    lines.push(`🌴 *On Leave (${onLeave.length}):* ${names.join(', ')}`);
  }

  // Attendance block
  lines.push('');
  lines.push('*👥 Attendance*');
  if (checkedIn.length > 0) lines.push(`✅ Checked in (${checkedIn.length}): ${checkedIn.join(', ')}`);
  if (absent.length > 0)    lines.push(`❌ Absent (${absent.length}): ${absent.join(', ')}`);
  if (missingEOD.length > 0) lines.push(`📝 EOD pending: ${missingEOD.join(', ')}`);
  if (checkedIn.length === 0 && absent.length === 0 && onLeave?.length === 0) lines.push('No timesheet data for today.');

  // Status changes block
  if (statusChanges && statusChanges.length > 0) {
    lines.push('');
    lines.push('*🔄 Status Changes Today*');
    for (const c of statusChanges) {
      const title     = (c.tasks as any)?.title || `Task #${c.task_id}`;
      const newStatus = (c.details as any)?.status;
      const emoji     = STATUS_EMOJI[newStatus] || '🔄';
      lines.push(`${emoji} "${title}" → *${STATUS_LABEL[newStatus] || newStatus}*`);
    }
  }

  // Pending tasks block
  if (pendingTasks && pendingTasks.length > 0) {
    lines.push('');
    lines.push(`*⏳ Open Tasks (${pendingTasks.length})*`);
    const byStatus: Record<string, typeof pendingTasks> = {};
    for (const t of pendingTasks) {
      if (!byStatus[t.status]) byStatus[t.status] = [];
      byStatus[t.status].push(t);
    }
    for (const [status, items] of Object.entries(byStatus)) {
      const emoji = STATUS_EMOJI[status] || '•';
      if (status === 'review') {
        lines.push(`${emoji} *${STATUS_LABEL[status]}* (${items.length}) — pending review:`);
        for (const t of items as any[]) {
          const hrs = t.in_review_at
            ? ((Date.now() - new Date(t.in_review_at).getTime()) / 3600000).toFixed(1)
            : '?';
          const who = t.assignee?.name || 'Unassigned';
          lines.push(`  › "${t.title}" — *${hrs}h in review* [${who}]`);
        }
      } else {
        lines.push(`${emoji} *${STATUS_LABEL[status]}* (${items.length}): ${items.map((t: any) => `"${t.title}"${t.assignee ? ` [${t.assignee.name}]` : ''}`).join(', ')}`);
      }
    }
  }

  await sendAttendanceSlack(lines.join('\n'));
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const nowIST  = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
  const isSunday = nowIST.getUTCDay() === 0;
  const today   = nowIST.toISOString().slice(0, 10);
  const hourIST = nowIST.getUTCHours();

  // On Sundays only send the 8 PM report — skip escalations and leave credits
  if (isSunday) {
    if (hourIST >= 20 && hourIST < 21) {
      await sendEveningReport(today);
    }
    return NextResponse.json({ ok: true, sunday: true, date: today });
  }

  /* ── 1. Overdue task escalations + email alerts ── */
  const { data: tasks } = await supabaseAdmin
    .from('tasks')
    .select('*, assignee:assignee_id(name, email, slack_user_id)')
    .lt('due_date', today)
    .not('status', 'eq', 'done');

  const escalations: any[] = [];

  if (tasks && tasks.length > 0) {
    for (const t of tasks) {
      const dueDate     = new Date(t.due_date);
      const daysOverdue = Math.floor((Date.now() - dueDate.getTime()) / 86400000);

      // Alert on large tasks (est_hours >= 8) that are overdue
      if ((t.est_hours ?? 0) >= 8) {
        const assignee = t.assignee?.name || 'Unassigned';
        await sendSlack(
          `🔔 *Big task overdue* — Task #${t.id} "${t.title}" (${t.est_hours}h estimated) is ${daysOverdue} day${daysOverdue !== 1 ? 's' : ''} overdue. Assignee: ${assignee}`
        );
      }

      let level = 0;
      if (daysOverdue >= 7) level = 3;
      else if (daysOverdue >= 3) level = 2;
      else if (daysOverdue >= 1) level = 1;

      if (level > (t.escalation_level ?? 0)) {
        await supabaseAdmin
          .from('tasks')
          .update({ escalation_level: level, last_escalated_at: new Date().toISOString() })
          .eq('id', t.id);

        const assignee = t.assignee?.name || 'unassigned';
        let slackMsg = '';
        if (level === 1) slackMsg = `⚠️ Task #${t.id} "${t.title}" is 1+ day overdue. Assignee: ${assignee}`;
        else if (level === 2) slackMsg = `🔶 Task #${t.id} "${t.title}" is 3+ days overdue — flagging to manager. Assignee: ${assignee}`;
        else if (level === 3) slackMsg = `🔴 Task #${t.id} "${t.title}" is 7+ days overdue — needs sprint review. Assignee: ${assignee}`;

        await sendSlack(slackMsg);

        if (t.assignee?.email) {
          const subject = level === 3
            ? `🔴 CRITICAL: Task "${t.title}" is ${daysOverdue} days overdue`
            : level === 2
            ? `🔶 HIGH: Task "${t.title}" is ${daysOverdue} days overdue`
            : `⚠️ Task "${t.title}" is overdue`;

          await sendEmail({
            to:   t.assignee.email,
            subject,
            html: overdueTaskHtml({ task: t, assigneeName: t.assignee.name, daysOverdue }),
          }).catch(err => console.error('[email error]', err));
        }

        escalations.push({ id: t.id, level });
      }
    }

    // Weekly digest (Mondays)
    if (nowIST.getUTCDay() === 1) {
      const { count: total } = await supabaseAdmin.from('tasks').select('*', { count: 'exact', head: true });
      const { count: done  } = await supabaseAdmin
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'done')
        .gte('completed_at', new Date(Date.now() - 7 * 86400000).toISOString());
      await sendSlack(
        `📊 *Weekly digest* — ${done ?? 0} tasks completed last week · ${tasks.length} currently overdue · ${total ?? 0} total tasks`
      );
    }
  }

  /* ── 2. Monthly leave credit + attendance recap (1st of month) ── */
  const isFirstOfMonth = nowIST.getUTCDate() === 1;
  if (isFirstOfMonth) {
    const currentYear = nowIST.getUTCFullYear();

    // Previous month working days and days-worked recap
    const prevMonthDate = new Date(nowIST.getTime());
    prevMonthDate.setUTCDate(0); // last day of previous month
    const prevYear  = prevMonthDate.getUTCFullYear();
    const prevMonth = prevMonthDate.getUTCMonth() + 1;
    const prevYM    = `${prevYear}-${String(prevMonth).padStart(2, '0')}`;
    const daysInPrevMonth = new Date(prevYear, prevMonth, 0).getDate();

    let workingDays = 0;
    for (let d = 1; d <= daysInPrevMonth; d++) {
      if (new Date(prevYear, prevMonth - 1, d).getDay() !== 0) workingDays++;
    }

    const { data: prevEntries } = await supabaseAdmin
      .from('timesheets')
      .select('user_id, check_in, users!user_id(name, department)')
      .like('date', `${prevYM}-%`)
      .not('check_in', 'is', null);

    const byUser = new Map<string, { name: string; dept: string; days: number }>();
    for (const e of (prevEntries || [])) {
      const u = e.users as any;
      const uid = e.user_id;
      if (!byUser.has(uid)) byUser.set(uid, { name: u?.name || uid, dept: u?.department || '', days: 0 });
      byUser.get(uid)!.days++;
    }

    const recapLines = [`📊 *Monthly Attendance Recap — ${prevYM}* (${workingDays} working days)`];
    for (const [, info] of byUser) {
      const tag = info.dept ? ` [${info.dept}]` : '';
      recapLines.push(`• ${info.name}${tag}: ${info.days}/${workingDays} days`);
    }
    await sendAttendanceSlack(recapLines.join('\n'));

    const { data: activeUsers } = await supabaseAdmin.from('users').select('id').eq('active', true);

    if (activeUsers) {
      for (const u of activeUsers) {
        const { data: bal } = await supabaseAdmin
          .from('leave_balances')
          .select('*')
          .eq('user_id', u.id)
          .eq('year', currentYear)
          .maybeSingle();

        if (bal) {
          await supabaseAdmin
            .from('leave_balances')
            .update({
              sick_balance:      Math.min(6,  Number(bal.sick_balance)      + 0.5),
              privilege_balance: Math.min(12, Number(bal.privilege_balance) + 1.0),
            })
            .eq('id', bal.id);
        } else {
          await supabaseAdmin
            .from('leave_balances')
            .insert({ user_id: u.id, year: currentYear, sick_balance: 0.5, privilege_balance: 1.0 });
        }
      }
    }
  }

  /* ── 3. Assignee-estimate delay alerts ── */
  const fourHoursAgo = new Date(Date.now() - 4 * 3600000).toISOString()
  const { data: delayedTasks } = await supabaseAdmin
    .from('tasks')
    .select('id, title, expected_done_at, expected_hours_self, in_progress_at, department, delay_notified_at, assignee:assignee_id(name)')
    .not('expected_done_at', 'is', null)
    .lt('expected_done_at', new Date().toISOString())
    .not('status', 'in', '("done","review")')

  for (const t of (delayedTasks || [])) {
    if (t.delay_notified_at && t.delay_notified_at > fourHoursAgo) continue // already notified recently
    const overdue = ((Date.now() - new Date(t.expected_done_at).getTime()) / 3600000).toFixed(1)
    const msg = `⏰ *Task #${t.id}* "${t.title}" is *${overdue}h past* the assignee's estimate of ${t.expected_hours_self}h.\nAssignee: ${(t.assignee as any)?.name || 'Unassigned'} — not in review yet.`
    await sendSlackToDept(t.department, msg)
    await supabaseAdmin.from('tasks').update({ delay_notified_at: new Date().toISOString() }).eq('id', t.id)
  }

  /* ── 4. Stalled review alerts (tasks in review > 24 h) ── */
  const reviewCutoff     = new Date(Date.now() - 24 * 3600000).toISOString()
  const fourHoursAgoRev  = new Date(Date.now() - 4  * 3600000).toISOString()
  const { data: stalledReviews } = await supabaseAdmin
    .from('tasks')
    .select('id, title, in_review_at, department, review_notified_at, assignee:assignee_id(name)')
    .eq('status', 'review')
    .not('in_review_at', 'is', null)
    .lt('in_review_at', reviewCutoff)

  for (const t of (stalledReviews || [])) {
    if (t.review_notified_at && t.review_notified_at > fourHoursAgoRev) continue
    const hrs = ((Date.now() - new Date(t.in_review_at).getTime()) / 3600000).toFixed(1)
    const assignee = (t.assignee as any)?.name || 'Unassigned'
    const msg = `🔍 *Task #${t.id}* "${t.title}" has been *in review for ${hrs}h* — review may be stalled.\nAssignee: ${assignee}`
    await sendSlackToDept(t.department, msg)
    await supabaseAdmin.from('tasks').update({ review_notified_at: new Date().toISOString() }).eq('id', t.id)
  }

  /* ── 5. Evening report at 8 PM IST ── */
  if (hourIST >= 20 && hourIST < 21) {
    await sendEveningReport(today);
  }

  /* ── 6. Timesheet cleanup: delete entries older than 2 months ── */
  const cutoff = new Date();
  cutoff.setDate(1);
  cutoff.setMonth(cutoff.getMonth() - 2);
  const cutoffDate = cutoff.toISOString().slice(0, 10);

  const { count: deletedTs } = await supabaseAdmin
    .from('timesheets')
    .delete({ count: 'exact' })
    .lt('date', cutoffDate);

  return NextResponse.json({
    ok:             true,
    date:           today,
    overdue:        tasks?.length ?? 0,
    escalated:      escalations.length,
    leavesCredited: isFirstOfMonth,
    tsDeleted:      deletedTs ?? 0,
  });
}
