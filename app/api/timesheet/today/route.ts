import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSessionFromRequest } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const today = new Date().toISOString().slice(0, 10)

  const { data } = await supabaseAdmin
    .from('timesheets')
    .select('*')
    .eq('user_id', session.userId)
    .eq('date', today)
    .maybeSingle()

  return NextResponse.json({ entry: data ?? null })
}
