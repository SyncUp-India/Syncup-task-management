import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSessionFromRequest } from '@/lib/auth'
import { sendSlackToDept } from '@/lib/slack'

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req)

  let query = supabaseAdmin.from('tasks').select('*').order('created_at', { ascending: false })

  if (session && session.role !== 'admin') {
    const { data: userRecord } = await supabaseAdmin
      .from('users')
      .select('extra_departments')
      .eq('id', session.userId)
      .single()

    const extra = (userRecord?.extra_departments || []).filter(Boolean) as string[]

    if (extra.length > 0 && session.department) {
      query = query.in('department', [session.department, ...extra])
    } else {
      query = query.eq('department', session.department)
    }
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ tasks: data })
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  const body = await req.json()

  let department: string | null = null
  if (session?.role === 'admin') {
    department = body.department || null
  } else if (session) {
    department = session.department
  }

  const { data, error } = await supabaseAdmin
    .from('tasks')
    .insert({
      title:              body.title,
      description:        body.description        || null,
      assignee_id:        body.assignee_id        || null,
      status:             body.status             || 'todo',
      priority:           body.priority           || 'medium',
      due_date:           body.due_date           || null,
      est_hours:          body.est_hours          || 0,
      source:             body.source             || 'manual',
      department,
      // QA fields
      test_id:            body.test_id            || null,
      steps_to_reproduce: body.steps_to_reproduce || null,
      expected_result:    body.expected_result    || null,
      actual_result:      body.actual_result      || null,
      pass_fail:          body.pass_fail          || null,
      // Dev fields
      github_pr_url:      body.github_pr_url      || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabaseAdmin.from('activity_log').insert({
    task_id: data.id,
    action: 'created',
    details: { source: body.source },
  })

  // Slack notification
  let assigneeName = 'Unassigned'
  if (body.assignee_id) {
    const { data: u } = await supabaseAdmin.from('users').select('name').eq('id', body.assignee_id).maybeSingle()
    if (u) assigneeName = u.name
  }
  const priorityEmoji: Record<string, string> = { high: '🔴', medium: '🟡', low: '🟢' }
  sendSlackToDept(
    department,
    `📋 *New task:* ${data.title}\n` +
    `${priorityEmoji[data.priority] || '⚪'} *${data.priority}* priority | 👤 ${assigneeName}` +
    `${data.due_date ? ` | 📅 Due: ${data.due_date}` : ''}` +
    `${department ? ` | 🏢 ${department}` : ''}`
  )

  return NextResponse.json({ task: data })
}
