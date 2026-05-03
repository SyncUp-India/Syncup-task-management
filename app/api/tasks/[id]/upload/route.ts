import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

const BUCKET   = 'task-evidence';
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED  = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif'];

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const formData = await req.formData();
  const file = formData.get('file') as File | null;

  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  if (file.size > MAX_SIZE) return NextResponse.json({ error: 'File too large — max 10 MB' }, { status: 400 });
  if (!ALLOWED.includes(file.type)) {
    return NextResponse.json({ error: 'Only images are supported (JPEG, PNG, WebP, GIF)' }, { status: 400 });
  }

  // Auto-create bucket if it doesn't exist
  await supabaseAdmin.storage.createBucket(BUCKET, { public: true }).catch(() => {});

  const ext  = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const path = `${params.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const bytes = await file.arrayBuffer();

  const { error: uploadErr } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(path, bytes, { contentType: file.type });

  if (uploadErr) return NextResponse.json({ error: uploadErr.message }, { status: 500 });

  const { data: urlData } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path);

  // Append attachment to task
  const { data: task } = await supabaseAdmin
    .from('tasks').select('attachments').eq('id', params.id).single();

  const existing = (task?.attachments ?? []) as any[];
  const newItem = {
    id:          crypto.randomUUID(),
    url:         urlData.publicUrl,
    name:        file.name,
    type:        file.type,
    path,
    size:        file.size,
    uploaded_at: new Date().toISOString(),
  };

  await supabaseAdmin
    .from('tasks')
    .update({ attachments: [...existing, newItem] })
    .eq('id', params.id);

  return NextResponse.json({ attachment: newItem }, { status: 201 });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { path } = await req.json();
  if (!path) return NextResponse.json({ error: 'path required' }, { status: 400 });

  // Remove from storage (ignore error if file already gone)
  await supabaseAdmin.storage.from(BUCKET).remove([path]).catch(() => {});

  // Remove from task's attachments array
  const { data: task } = await supabaseAdmin
    .from('tasks').select('attachments').eq('id', params.id).single();

  const updated = ((task?.attachments ?? []) as any[]).filter(a => a.path !== path);
  await supabaseAdmin.from('tasks').update({ attachments: updated }).eq('id', params.id);

  return NextResponse.json({ ok: true });
}
