import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getSessionFromRequest } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);

  let query = supabaseAdmin.from('tasks').select('*').order('created_at', { ascending: false });

  // Non-admin users only see tasks for their department
  if (session && session.role !== 'admin') {
    query = query.eq('department', session.department);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ tasks: data });
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  const body = await req.json();

  // Determine department: admin can pass it explicitly; others inherit from session
  let department: string | null = null;
  if (session?.role === 'admin') {
    department = body.department || null;
  } else if (session) {
    department = session.department;
  }

  const { data, error } = await supabaseAdmin
    .from('tasks')
    .insert({
      title: body.title,
      description: body.description || null,
      assignee_id: body.assignee_id || null,
      status: body.status || 'todo',
      priority: body.priority || 'medium',
      due_date: body.due_date || null,
      est_hours: body.est_hours || 0,
      source: body.source || 'manual',
      department,
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabaseAdmin.from('activity_log').insert({
    task_id: data.id,
    action: 'created',
    details: { source: body.source },
  });

  return NextResponse.json({ task: data });
}
