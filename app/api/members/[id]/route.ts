import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await req.json();
  const updates: Record<string, unknown> = {};
  if (body.name  !== undefined) updates.name  = body.name.trim();
  if (body.email !== undefined) updates.email = body.email?.trim() || null;
  if (body.role  !== undefined) updates.role  = body.role;

  const { data, error } = await supabaseAdmin
    .from('members')
    .update(updates)
    .eq('id', params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ member: data });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  // Soft-delete: keeps task history intact
  const { error } = await supabaseAdmin
    .from('members')
    .update({ active: false })
    .eq('id', params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
