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

  const id = parseInt(params.id)
  const body = await req.json()
  const { status, admin_note } = body

  if (!['approved', 'rejected'].includes(status)) {
    return NextResponse.json({ error: 'status must be approved or rejected' }, { status: 400 })
  }

  const { data: request } = await supabaseAdmin
    .from('leave_requests')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (!request) return NextResponse.json({ error: 'Request not found' }, { status: 404 })
  if (request.status !== 'pending') {
    return NextResponse.json({ error: 'Request has already been processed' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('leave_requests')
    .update({ status, admin_id: session.userId, admin_note: admin_note || null })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (status === 'approved') {
    const year = new Date(request.start_date).getFullYear()
    const usedField = request.leave_type === 'sick' ? 'sick_used' : 'privilege_used'

    const { data: bal } = await supabaseAdmin
      .from('leave_balances')
      .select('*')
      .eq('user_id', request.user_id)
      .eq('year', year)
      .maybeSingle()

    if (bal) {
      await supabaseAdmin
        .from('leave_balances')
        .update({ [usedField]: Number(bal[usedField]) + Number(request.days) })
        .eq('id', bal.id)
    } else {
      await supabaseAdmin
        .from('leave_balances')
        .insert({ user_id: request.user_id, year, [usedField]: Number(request.days) })
    }
  }

  return NextResponse.json({ request: data })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id = parseInt(params.id)

  const { data: request } = await supabaseAdmin
    .from('leave_requests')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (!request) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (session.role !== 'admin' && request.user_id !== session.userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (request.status !== 'pending' && session.role !== 'admin') {
    return NextResponse.json({ error: 'Cannot cancel a processed request' }, { status: 400 })
  }

  await supabaseAdmin.from('leave_requests').delete().eq('id', id)

  // If an approved leave is cancelled, credit the days back
  if (request.status === 'approved') {
    const year = new Date(request.start_date).getFullYear()
    const usedField = request.leave_type === 'sick' ? 'sick_used' : 'privilege_used'
    const { data: bal } = await supabaseAdmin
      .from('leave_balances')
      .select('*')
      .eq('user_id', request.user_id)
      .eq('year', year)
      .maybeSingle()
    if (bal) {
      await supabaseAdmin
        .from('leave_balances')
        .update({ [usedField]: Math.max(0, Number(bal[usedField]) - Number(request.days)) })
        .eq('id', bal.id)
    }
  }

  return NextResponse.json({ ok: true })
}
