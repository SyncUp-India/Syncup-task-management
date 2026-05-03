import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { hashPassword } from '@/lib/password'
import { getSessionFromRequest } from '@/lib/auth'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSessionFromRequest(request)
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const updates: Record<string, unknown> = {}

  if (body.name !== undefined) updates.name = body.name.trim()
  if (body.email !== undefined) updates.email = body.email.toLowerCase().trim()
  if (body.recovery_email !== undefined) {
    updates.recovery_email = body.recovery_email?.toLowerCase().trim() || null
  }
  if (body.department !== undefined) {
    updates.department = body.department
    // Keep role in sync with department
    updates.role = body.department === 'admin' ? 'admin' : 'user'
  }
  if (body.role !== undefined && body.department === undefined) updates.role = body.role
  if (body.active !== undefined) updates.active = body.active
  if (body.password) updates.password_hash = await hashPassword(body.password)

  const { data, error } = await supabaseAdmin
    .from('users')
    .update(updates)
    .eq('id', params.id)
    .select('id, name, email, recovery_email, role, department, active')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ user: data })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSessionFromRequest(request)
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (params.id === session.userId) {
    return NextResponse.json({ error: 'You cannot delete your own account' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('users')
    .delete()
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
