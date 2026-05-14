import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSessionFromRequest } from '@/lib/auth'
import { sendAttendanceSlack } from '@/lib/slack'

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const today = new Date().toISOString().slice(0, 10)
  const now   = new Date().toISOString()

  const body = await req.json().catch(() => ({}))
  const pod  = body.pod?.trim() || null

  if (!pod) {
    return NextResponse.json({ error: 'Plan of Day (POD) is required to check in' }, { status: 400 })
  }

  const { data: existing } = await supabaseAdmin
    .from('timesheets')
    .select('id, check_in, check_out')
    .eq('user_id', session.userId)
    .eq('date', today)
    .maybeSingle()

  const dept    = session.department ? ` [${session.department}]` : ''
  const timeStr = new Date(now).toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata',
  })

  // Already checked in but not yet checked out
  if (existing?.check_in && !existing.check_out) {
    return NextResponse.json({ error: 'Already checked in today' }, { status: 400 })
  }

  // Re-check-in after a previous checkout — reset record for new session
  if (existing?.check_in && existing.check_out) {
    const { data, error } = await supabaseAdmin
      .from('timesheets')
      .update({ check_in: now, check_out: null, pod })
      .eq('id', existing.id)
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    sendAttendanceSlack(`✅ *${session.name}${dept}* checked in again at *${timeStr}*\n📋 *POD:* ${pod}`)
    return NextResponse.json({ entry: data })
  }

  // First check-in of the day
  const { data, error } = await supabaseAdmin
    .from('timesheets')
    .upsert(
      { user_id: session.userId, date: today, check_in: now, pod },
      { onConflict: 'user_id,date' }
    )
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  sendAttendanceSlack(`✅ *${session.name}${dept}* checked in at *${timeStr}*\n📋 *POD:* ${pod}`)

  return NextResponse.json({ entry: data })
}
