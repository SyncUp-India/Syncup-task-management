import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSessionFromRequest } from '@/lib/auth'
import { sendSlack } from '@/lib/slack'

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const today = new Date().toISOString().slice(0, 10)
  const now   = new Date().toISOString()

  const body = await req.json().catch(() => ({}))
  const pod  = body.pod?.trim() || null

  const { data: existing } = await supabaseAdmin
    .from('timesheets')
    .select('id, check_in')
    .eq('user_id', session.userId)
    .eq('date', today)
    .maybeSingle()

  if (existing?.check_in) {
    return NextResponse.json({ error: 'Already checked in today' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('timesheets')
    .upsert(
      { user_id: session.userId, date: today, check_in: now, pod },
      { onConflict: 'user_id,date' }
    )
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const timeStr = new Date(now).toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata',
  })
  sendSlack(`✅ *${session.name}* checked in at *${timeStr}*${pod ? `\n📋 *POD:* ${pod}` : ''}`)

  return NextResponse.json({ entry: data })
}
