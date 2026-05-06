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
    const { data: created } = await supabaseAdmin
      .from('leave_balances')
      .insert({ user_id: session.userId, year })
      .select()
      .single()
    data = created
  }

  return NextResponse.json({
    balance: data,
    limits: { sick: SICK_MAX, privilege: PRIVILEGE_MAX },
  })
}
