import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSessionFromRequest } from '@/lib/auth'

const SICK_MAX = 6
const PRIVILEGE_MAX = 12

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const year    = parseInt(req.nextUrl.searchParams.get('year') || '') || new Date().getFullYear()
  const fetchAll = req.nextUrl.searchParams.get('all') === 'true' && session.role === 'admin'

  // Admin: return all users' balances
  if (fetchAll) {
    const { data } = await supabaseAdmin
      .from('leave_balances')
      .select('*')
      .eq('year', year)
    return NextResponse.json({ balances: data ?? [], limits: { sick: SICK_MAX, privilege: PRIVILEGE_MAX } })
  }

  // Regular user: return own balance, creating it if missing
  let { data } = await supabaseAdmin
    .from('leave_balances')
    .select('*')
    .eq('user_id', session.userId)
    .eq('year', year)
    .maybeSingle()

  if (!data) {
    // For 2026: Jan–Apr forfeited; seed with May's credit (0.5 sick + 1.0 privilege)
    const initialSick      = year === 2026 ? 0.5 : 0
    const initialPrivilege = year === 2026 ? 1.0 : 0
    const { data: created } = await supabaseAdmin
      .from('leave_balances')
      .insert({ user_id: session.userId, year, sick_balance: initialSick, privilege_balance: initialPrivilege })
      .select()
      .single()
    data = created
  }

  return NextResponse.json({
    balance: data,
    limits: { sick: SICK_MAX, privilege: PRIVILEGE_MAX },
  })
}

export async function PATCH(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }

  const body = await req.json()
  const { user_id, sick_adjustment, privilege_adjustment } = body
  const year = body.year || new Date().getFullYear()

  if (!user_id) return NextResponse.json({ error: 'user_id required' }, { status: 400 })
  if (sick_adjustment === undefined && privilege_adjustment === undefined) {
    return NextResponse.json({ error: 'At least one adjustment required' }, { status: 400 })
  }

  const { data: bal } = await supabaseAdmin
    .from('leave_balances')
    .select('*')
    .eq('user_id', user_id)
    .eq('year', year)
    .maybeSingle()

  if (!bal) return NextResponse.json({ error: 'No balance record found' }, { status: 404 })

  const updates: any = {}
  if (sick_adjustment !== undefined) {
    updates.sick_balance = Math.max(0, Number(bal.sick_balance) + Number(sick_adjustment))
  }
  if (privilege_adjustment !== undefined) {
    updates.privilege_balance = Math.max(0, Number(bal.privilege_balance) + Number(privilege_adjustment))
  }

  const { data, error } = await supabaseAdmin
    .from('leave_balances')
    .update(updates)
    .eq('id', bal.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ balance: data })
}
