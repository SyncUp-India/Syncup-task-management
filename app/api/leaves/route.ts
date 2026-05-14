import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSessionFromRequest } from '@/lib/auth'
import { sendAttendanceSlack } from '@/lib/slack'

function countWorkingDays(start: string, end: string): number {
  const s = new Date(start + 'T00:00:00')
  const e = new Date(end + 'T00:00:00')
  let count = 0
  const cur = new Date(s)
  while (cur <= e) {
    const d = cur.getDay()
    if (d !== 0) count++ // Mon–Sat working week
    cur.setDate(cur.getDate() + 1)
  }
  return count
}

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const isAdmin = session.role === 'admin'
  const userId = req.nextUrl.searchParams.get('user_id')
  const status = req.nextUrl.searchParams.get('status')

  let query = supabaseAdmin
    .from('leave_requests')
    .select('*, user:users!user_id(id, name, email, department)')
    .order('created_at', { ascending: false })

  if (!isAdmin || !userId || userId === 'mine') {
    query = query.eq('user_id', session.userId)
  } else if (userId !== 'all') {
    query = query.eq('user_id', userId)
  }

  if (status) query = query.eq('status', status)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ requests: data ?? [] })
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { leave_type, start_date, end_date, reason } = body

  if (!leave_type || !start_date || !end_date) {
    return NextResponse.json({ error: 'leave_type, start_date and end_date are required' }, { status: 400 })
  }
  if (!['sick', 'privilege'].includes(leave_type)) {
    return NextResponse.json({ error: 'leave_type must be sick or privilege' }, { status: 400 })
  }

  const today = new Date().toISOString().slice(0, 10)

  if (start_date < today) {
    return NextResponse.json({ error: 'Leave start date cannot be in the past' }, { status: 400 })
  }
  if (end_date < start_date) {
    return NextResponse.json({ error: 'End date must be on or after start date' }, { status: 400 })
  }

  if (leave_type === 'privilege') {
    const startMs = new Date(start_date + 'T00:00:00').getTime()
    const todayMs = new Date(today + 'T00:00:00').getTime()
    const diffDays = Math.ceil((startMs - todayMs) / 86400000)
    if (diffDays < 3) {
      return NextResponse.json({ error: 'Privilege leave requires at least 3 days advance notice' }, { status: 400 })
    }
  }

  const days = countWorkingDays(start_date, end_date)
  if (days === 0) {
    return NextResponse.json({ error: 'No working days in the selected date range' }, { status: 400 })
  }

  // Check available balance
  const year = new Date(start_date).getFullYear()
  const { data: balance } = await supabaseAdmin
    .from('leave_balances')
    .select('*')
    .eq('user_id', session.userId)
    .eq('year', year)
    .maybeSingle()

  if (balance) {
    const available = leave_type === 'sick'
      ? Number(balance.sick_balance) - Number(balance.sick_used)
      : Number(balance.privilege_balance) - Number(balance.privilege_used)
    if (days > available) {
      return NextResponse.json({
        error: `Insufficient ${leave_type} leave. Available: ${available.toFixed(1)} day(s), Requested: ${days}`,
      }, { status: 400 })
    }
  }

  // Check for overlapping requests
  const { data: overlap } = await supabaseAdmin
    .from('leave_requests')
    .select('id')
    .eq('user_id', session.userId)
    .in('status', ['pending', 'approved'])
    .lte('start_date', end_date)
    .gte('end_date', start_date)

  if (overlap && overlap.length > 0) {
    return NextResponse.json({ error: 'A leave request already exists for this period' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('leave_requests')
    .insert({ user_id: session.userId, leave_type, start_date, end_date, days, reason: reason || null })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const leaveEmoji = leave_type === 'sick' ? '🤒' : '🌴'
  const dept = session.department ? ` [${session.department}]` : ''
  sendAttendanceSlack(
    `${leaveEmoji} *${session.name}${dept}* applied for *${leave_type} leave*\n` +
    `📅 ${start_date} → ${end_date} (${days} working day${days !== 1 ? 's' : ''})\n` +
    `${reason ? `💬 ${reason}` : ''}`
  )

  return NextResponse.json({ request: data }, { status: 201 })
}
