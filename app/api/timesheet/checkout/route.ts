import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSessionFromRequest } from '@/lib/auth'
import { sendSlack } from '@/lib/slack'

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const today = new Date().toISOString().slice(0, 10)

  const body = await req.json().catch(() => ({}))
  const eod  = body.eod?.trim() || null

  const { data: existing, error: fetchErr } = await supabaseAdmin
    .from('timesheets')
    .select('id, check_in, check_out')
    .eq('user_id', session.userId)
    .eq('date', today)
    .maybeSingle()

  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 })
  if (!existing?.check_in) return NextResponse.json({ error: 'You have not checked in today' }, { status: 400 })
  if (existing.check_out)  return NextResponse.json({ error: 'Already checked out today' }, { status: 400 })

  const checkOut = new Date()
  const { data, error } = await supabaseAdmin
    .from('timesheets')
    .update({ check_out: checkOut.toISOString(), eod })
    .eq('id', existing.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const durationMs = checkOut.getTime() - new Date(existing.check_in).getTime()
  const hrs  = Math.floor(durationMs / 3600000)
  const mins = Math.floor((durationMs % 3600000) / 60000)
  sendSlack(`🏁 *${session.name}* checked out | Worked: *${hrs}h ${mins}m*${eod ? `\n📝 *EOD:* ${eod}` : ''}`)

  return NextResponse.json({ entry: data })
}
