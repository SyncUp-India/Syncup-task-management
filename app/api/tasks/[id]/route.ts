import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const id = parseInt(params.id);
  const patch: any = {};
  const fields = ['title', 'description', 'assignee_id', 'status', 'priority', 'due_date', 'est_hours', 'spent_hours', 'github_pr_url', 'department'];
  for (const f of fields) if (f in body) patch[f] = body[f] || null;
  if (patch.status === 'done' && !patch.completed_at) patch.completed_at = new Date().toISOString();

  const { data, error } = await supabaseAdmin.from('tasks').update(patch).eq('id', id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabaseAdmin.from('activity_log').insert({
    task_id: id,
    action: 'updated',
    details: patch,
  });

  return NextResponse.json({ task: data });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const id = parseInt(params.id);
  const { error } = await supabaseAdmin.from('tasks').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
