import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSessionFromRequest } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabaseAdmin
    .from('departments')
    .select('*')
    .order('created_at')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ departments: data ?? [] })
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }

  const { name, label, color, bg_color } = await req.json()

  if (!name?.trim() || !label?.trim()) {
    return NextResponse.json({ error: 'name and label are required' }, { status: 400 })
  }

  const slug = name.trim().toLowerCase().replace(/\s+/g, '_')

  const { data, error } = await supabaseAdmin
    .from('departments')
    .insert({ name: slug, label: label.trim(), color: color || '#3b82f6', bg_color: bg_color || 'rgba(59,130,246,0.1)' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ department: data }, { status: 201 })
}
