import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sendSlackToDept } from '@/lib/slack'

const STATUS_EMOJI: Record<string, string> = {
  todo: '⏳', inprogress: '🔵', review: '🟡', done: '✅', blocked: '🔴',
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const id = parseInt(params.id)
  const patch: any = {}

  const fields = [
    'title', 'description', 'assignee_id', 'status', 'priority',
    'due_date', 'est_hours', 'spent_hours', 'github_pr_url', 'department',
    'test_id', 'steps_to_reproduce', 'expected_result', 'actual_result', 'pass_fail',
    'in_progress_at', 'expected_hours_self', 'expected_done_at', 'delay_reason', 'delay_notified_at',
    'in_review_at', 'review_notified_at',
  ]
  for (const f of fields) if (f in body) patch[f] = body[f] || null
  // Numeric fields should not be nulled when 0
  if ('expected_hours_self' in body) patch.expected_hours_self = body.expected_hours_self || null
  if (patch.status === 'done' && !patch.completed_at) patch.completed_at = new Date().toISOString()

  // Auto-set in_review_at on first transition to review
  if (body.status === 'review' && !patch.in_review_at) {
    const { data: cur } = await supabaseAdmin.from('tasks').select('in_review_at').eq('id', id).single()
    if (!cur?.in_review_at) patch.in_review_at = new Date().toISOString()
  }

  const { data, error } = await supabaseAdmin.from('tasks').update(patch).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabaseAdmin.from('activity_log').insert({
    task_id: id, action: 'updated', details: patch,
  })

  // Slack: status change → route to the task's department channel
  if ('status' in body && data) {
    const emoji = STATUS_EMOJI[data.status] || '🔄'
    sendSlackToDept(data.department, `${emoji} *Task #${id}* "${data.title}" status → *${data.status}*`)
  }

  return NextResponse.json({ task: data })
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const id = parseInt(params.id)
  const { error } = await supabaseAdmin.from('tasks').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
