import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSessionFromRequest } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const userIdParam = searchParams.get('user_id') // 'all' | specific UUID | null

  // Default range: 1st of the month two months ago → today
  const twoMonthsAgo = new Date()
  twoMonthsAgo.setDate(1)
  twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2)
  const from = twoMonthsAgo.toISOString().slice(0, 10)
  const to   = new Date().toISOString().slice(0, 10)

  let query = supabaseAdmin
    .from('timesheets')
    .select('*, user:users!user_id(id, name, email, department)')
    .gte('date', from)
    .lte('date', to)
    .order('date', { ascending: false })

  if (session.role === 'admin' && userIdParam && userIdParam !== 'all') {
    query = query.eq('user_id', userIdParam)
  } else if (session.role !== 'admin' || !userIdParam) {
    query = query.eq('user_id', session.userId)
  }
  // admin + 'all' → no filter

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ entries: data ?? [] })
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { date, check_in, check_out, is_holiday, holiday_reason, notes, pod, eod } = body

  if (!date) return NextResponse.json({ error: 'date is required' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('timesheets')
    .upsert(
      {
        user_id:        session.userId,
        date,
        check_in:       check_in       || null,
        check_out:      check_out      || null,
        is_holiday:     is_holiday     ?? false,
        holiday_reason: holiday_reason || null,
        notes:          notes          || null,
        pod:            pod            || null,
        eod:            eod            || null,
      },
      { onConflict: 'user_id,date' }
    )
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ entry: data })
}
