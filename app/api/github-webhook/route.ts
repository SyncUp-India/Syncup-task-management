import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendSlack } from '@/lib/slack';
import crypto from 'crypto';

function verifySignature(body: string, signature: string | null): boolean {
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  const hmac = crypto.createHmac('sha256', secret);
  const digest = 'sha256=' + hmac.update(body).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
  } catch { return false; }
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get('x-hub-signature-256');

  if (!verifySignature(rawBody, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const event = req.headers.get('x-github-event');
  if (event !== 'pull_request') return NextResponse.json({ ok: true, ignored: true });

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    // GitHub sent application/x-www-form-urlencoded — decode the payload field
    const params = new URLSearchParams(rawBody);
    const raw = params.get('payload');
    if (!raw) return NextResponse.json({ error: 'Empty payload' }, { status: 400 });
    payload = JSON.parse(raw);
  }
  const action = payload.action;
  const pr = payload.pull_request;

  // Find TASK-### reference in title or body
  const text = `${pr.title} ${pr.body || ''}`;
  const match = text.match(/TASK-(\d+)/i);
  if (!match) return NextResponse.json({ ok: true, noMatch: true });

  const taskId = parseInt(match[1]);
  const prUrl = pr.html_url;

  // Determine PR status
  let prStatus = 'open';
  let newTaskStatus: string | null = null;

  if (action === 'opened' || action === 'reopened' || action === 'edited') {
    prStatus = 'open';
    newTaskStatus = 'inprogress';
  } else if (action === 'review_requested' || action === 'ready_for_review') {
    prStatus = 'review';
    newTaskStatus = 'review';
  } else if (action === 'closed' && pr.merged) {
    prStatus = 'merged';
    newTaskStatus = 'done';
  } else if (action === 'closed') {
    prStatus = 'closed';
  }

  const update: any = { github_pr_url: prUrl, github_pr_status: prStatus };
  if (newTaskStatus) update.status = newTaskStatus;
  if (newTaskStatus === 'done') update.completed_at = new Date().toISOString();

  const { data: task, error } = await supabaseAdmin
    .from('tasks')
    .update(update)
    .eq('id', taskId)
    .select()
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!task) return NextResponse.json({ ok: false, error: `Task #${taskId} not found` }, { status: 404 });

  await supabaseAdmin.from('activity_log').insert({
    task_id: taskId,
    action: `github_pr_${action}`,
    details: { pr_url: prUrl, pr_status: prStatus },
  });

  if (action === 'closed' && pr.merged) {
    await sendSlack(`✅ Task #${taskId} "${task?.title}" — PR merged: ${prUrl}`);
  } else if (action === 'opened') {
    await sendSlack(`🔵 Task #${taskId} "${task?.title}" — PR opened: ${prUrl}`);
  }

  return NextResponse.json({ ok: true, taskId, action });
}
