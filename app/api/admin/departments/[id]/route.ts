import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSessionFromRequest } from '@/lib/auth'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSessionFromRequest(req)
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }

  const body = await req.json()
  const updates: Record<string, string> = {}
  if (body.label)    updates.label    = body.label.trim()
  if (body.color)    updates.color    = body.color
  if (body.bg_color) updates.bg_color = body.bg_color

  const { data, error } = await supabaseAdmin
    .from('departments')
    .update(updates)
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ department: data })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSessionFromRequest(req)
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }

  const { data: dept } = await supabaseAdmin
    .from('departments')
    .select('name')
    .eq('id', params.id)
    .maybeSingle()

  if (!dept) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { count } = await supabaseAdmin
    .from('users')
    .select('*', { count: 'exact', head: true })
    .eq('department', dept.name)

  if (count && count > 0) {
    return NextResponse.json({ error: `Cannot delete: ${count} user(s) are assigned to this department` }, { status: 400 })
  }

  await supabaseAdmin.from('departments').delete().eq('id', params.id)
  return NextResponse.json({ ok: true })
}
