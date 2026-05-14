import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSessionFromRequest } from '@/lib/auth'
import { sendAttendanceSlack } from '@/lib/slack'

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const today = new Date().toISOString().slice(0, 10)

  const body = await req.json().catch(() => ({}))
  const eod        = body.eod?.trim() || null
  const awaySecs   = Math.max(0, parseInt(body.away_seconds || '0', 10) || 0)

  if (!eod) {
    return NextResponse.json({ error: 'End of Day (EOD) report is required to check out' }, { status: 400 })
  }

  const { data: existing, error: fetchErr } = await supabaseAdmin
    .from('timesheets')
    .select('id, check_in, check_out, total_worked_seconds')
    .eq('user_id', session.userId)
    .eq('date', today)
    .maybeSingle()

  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 })
  if (!existing?.check_in) return NextResponse.json({ error: 'You have not checked in today' }, { status: 400 })
  if (existing.check_out)  return NextResponse.json({ error: 'Already checked out today' }, { status: 400 })

  const checkOut    = new Date()
  const sessionSecs = Math.max(0, Math.round((checkOut.getTime() - new Date(existing.check_in).getTime()) / 1000) - awaySecs)
  const prevSecs    = existing.total_worked_seconds || 0
  const totalSecs   = prevSecs + sessionSecs

  const { data, error } = await supabaseAdmin
    .from('timesheets')
    .update({ check_out: checkOut.toISOString(), eod, total_worked_seconds: totalSecs })
    .eq('id', existing.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const hrs  = Math.floor(totalSecs / 3600)
  const mins = Math.floor((totalSecs % 3600) / 60)
  const dept = session.department ? ` [${session.department}]` : ''
  sendAttendanceSlack(`🏁 *${session.name}${dept}* checked out | Total today: *${hrs}h ${mins}m*\n📝 *EOD:* ${eod}`)

  return NextResponse.json({ entry: data })
}
