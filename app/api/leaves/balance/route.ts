import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSessionFromRequest } from '@/lib/auth'

const SICK_MAX = 6
const PRIVILEGE_MAX = 12

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const year = new Date().getFullYear()

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
