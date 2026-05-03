'use client';
import { useRef, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { DEPT_META, TASK_DEPARTMENTS } from '@/lib/departments';

function Field({ label, children }: any) {
  return (
    <div>
      <p style={{ fontSize: '0.6875rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '600', marginBottom: '0.375rem' }}>{label}</p>
      <div style={{ color: 'var(--ink)', fontSize: '0.875rem' }}>{children}</div>
    </div>
  );
}

function humanSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function TaskDetail({ task, members, onClose, onUpdate }: any) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState({
    title:         task.title,
    description:   task.description || '',
    assignee_id:   task.assignee_id || '',
    status:        task.status,
    priority:      task.priority,
    due_date:      task.due_date || '',
    est_hours:     task.est_hours || 0,
    spent_hours:   task.spent_hours || 0,
    github_pr_url: task.github_pr_url || '',
    department:    task.department || '',
  });
  const [attachments, setAttachments] = useState<any[]>(task.attachments || []);
  const [uploading, setUploading]     = useState(false);
  const [uploadErr, setUploadErr]     = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const assignee = members.find((m: any) => m.id === task.assignee_id);
  const progress  = form.est_hours > 0 ? Math.min(100, Math.round((form.spent_hours / form.est_hours) * 100)) : 0;
  const today     = new Date().toISOString().slice(0, 10);
  const overdue   = task.status !== 'done' && task.due_date && task.due_date < today;

  const statusColors: any = {
    todo: 'var(--muted)', inprogress: 'var(--sky)', review: 'var(--amber)', done: 'var(--emerald)', blocked: 'var(--rose)',
  };

  async function deleteTask() {
    if (!confirm('Delete this task?')) return;
    await fetch(`/api/tasks/${task.id}`, { method: 'DELETE' });
    onClose();
    location.reload();
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadErr('');
    setUploading(true);

    const fd = new FormData();
    fd.append('file', file);

    const res  = await fetch(`/api/tasks/${task.id}/upload`, { method: 'POST', body: fd });
    const data = await res.json();

    if (res.ok) {
      setAttachments(prev => [...prev, data.attachment]);
    } else {
      setUploadErr(data.error || 'Upload failed');
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleDeleteAttachment(item: any) {
    if (!confirm(`Delete "${item.name}"?`)) return;
    const res = await fetch(`/api/tasks/${task.id}/upload`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: item.path }),
    });
    if (res.ok) setAttachments(prev => prev.filter(a => a.id !== item.id));
  }

  return (
    <div className="tb-modal-bg" onClick={onClose}>
      <div className="tb-modal" style={{ width: '100%', maxWidth: '640px' }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--border)',
          background: 'linear-gradient(180deg, rgba(59,130,246,0.05) 0%, transparent 100%)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
            {edit ? (
              <input className="tb-input" style={{ fontSize: '1rem', fontWeight: '600' }}
                value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
            ) : (
              <h2 style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--ink)', margin: 0, lineHeight: 1.4 }}>{task.title}</h2>
            )}
            <button onClick={onClose} style={{ background: 'var(--elevated)', border: '1px solid var(--border)', borderRadius: '6px', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, color: 'var(--muted)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Task ID — use this in PR title: TASK-{id} */}
            <span
              title="Use this ID in your PR title: TASK-{id}"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', fontWeight: '700', color: 'var(--accent)', background: 'rgba(59,130,246,0.1)', padding: '3px 10px', borderRadius: '999px', fontFamily: 'monospace', cursor: 'default', letterSpacing: '0.01em' }}>
              # {task.id}
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', color: statusColors[task.status] || 'var(--muted)', background: `${statusColors[task.status]}18`, padding: '3px 10px', borderRadius: '999px' }}>
              <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: statusColors[task.status], display: 'inline-block' }}/>
              {task.status}
            </span>
            {overdue && <span style={{ fontSize: '0.75rem', color: 'var(--rose)', background: 'rgba(244,63,94,0.1)', padding: '3px 10px', borderRadius: '999px' }}>overdue</span>}
            <span style={{ fontSize: '0.75rem', color: 'var(--muted)', background: 'rgba(15,23,42,0.06)', padding: '3px 10px', borderRadius: '999px' }}>{task.source || 'manual'}</span>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '1.25rem 1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.125rem' }}>
            <Field label="Assignee">
              {edit ? (
                <select className="tb-input" value={form.assignee_id} onChange={e => setForm({ ...form, assignee_id: e.target.value })}>
                  <option value="">Unassigned</option>
                  {members.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              ) : (
                <span>{assignee?.name || 'Unassigned'}{assignee && <span style={{ color: 'var(--muted)', fontSize: '0.75rem' }}> · {assignee.role}</span>}</span>
              )}
            </Field>
            <Field label="Status">
              {edit ? (
                <select className="tb-input" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                  {['todo','inprogress','review','done','blocked'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              ) : <span style={{ color: statusColors[task.status] }}>{task.status}</span>}
            </Field>
            <Field label="Priority">
              {edit ? (
                <select className="tb-input" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
                  {['high','medium','low'].map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              ) : <span>{task.priority}</span>}
            </Field>
            <Field label="Due date">
              {edit ? (
                <input type="date" className="tb-input" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} />
              ) : <span style={{ color: overdue ? 'var(--rose)' : 'var(--ink)' }}>{task.due_date || '—'}</span>}
            </Field>
            <Field label="Est. hours">
              {edit ? (
                <input type="number" step="0.5" className="tb-input" value={form.est_hours}
                  onChange={e => setForm({ ...form, est_hours: parseFloat(e.target.value) || 0 })} />
              ) : <span>{task.est_hours}h</span>}
            </Field>
            <Field label="Spent hours">
              {edit ? (
                <input type="number" step="0.5" className="tb-input" value={form.spent_hours}
                  onChange={e => setForm({ ...form, spent_hours: parseFloat(e.target.value) || 0 })} />
              ) : <span>{task.spent_hours}h</span>}
            </Field>
          </div>

          {/* Progress */}
          <div style={{ marginBottom: '1.125rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
              <p style={{ fontSize: '0.6875rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '600' }}>Progress</p>
              <span style={{ fontSize: '0.6875rem', color: 'var(--accent)' }}>{progress}%</span>
            </div>
            <div className="progress-track"><div className="progress-fill" style={{ width: `${progress}%` }} /></div>
          </div>

          {/* Description */}
          <div style={{ marginBottom: '1.125rem' }}>
            <Field label="Description">
              {edit ? (
                <textarea className="tb-input" style={{ minHeight: '80px', resize: 'vertical' }}
                  value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              ) : (
                <p style={{ color: task.description ? 'var(--ink)' : 'var(--muted)', fontSize: '0.875rem', lineHeight: 1.6 }}>
                  {task.description || 'No description'}
                </p>
              )}
            </Field>
          </div>

          {/* GitHub PR */}
          <div style={{ marginBottom: '1.25rem' }}>
            <Field label="GitHub PR">
              {edit ? (
                <input type="url" className="tb-input" placeholder="https://github.com/org/repo/pull/123"
                  value={form.github_pr_url} onChange={e => setForm({ ...form, github_pr_url: e.target.value })} />
              ) : task.github_pr_url ? (
                <a href={task.github_pr_url} target="_blank" rel="noreferrer"
                  style={{ color: 'var(--sky)', fontSize: '0.8125rem', wordBreak: 'break-all' }}>
                  {task.github_pr_url}
                  {task.github_pr_status && <span style={{ color: 'var(--muted)', marginLeft: '0.375rem' }}>· {task.github_pr_status}</span>}
                </a>
              ) : (
                <span style={{ color: 'var(--muted)' }}>No PR linked</span>
              )}
            </Field>
          </div>

          {/* Department (admin only) */}
          {isAdmin && (
            <div style={{ marginBottom: '1.25rem' }}>
              <Field label="Department">
                {edit ? (
                  <select className="tb-input" value={form.department} onChange={e => setForm({ ...form, department: e.target.value })}>
                    <option value="">None</option>
                    {TASK_DEPARTMENTS.map(d => (
                      <option key={d} value={d}>{DEPT_META[d]?.label ?? d}</option>
                    ))}
                  </select>
                ) : task.department && DEPT_META[task.department] ? (
                  <span style={{
                    display: 'inline-block', fontSize: '0.75rem', fontWeight: '600',
                    padding: '3px 10px', borderRadius: '999px',
                    background: DEPT_META[task.department].bg, color: DEPT_META[task.department].color,
                  }}>
                    {DEPT_META[task.department].label}
                  </span>
                ) : (
                  <span style={{ color: 'var(--muted)' }}>None</span>
                )}
              </Field>
            </div>
          )}

          {/* Evidence */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.625rem' }}>
              <p style={{ fontSize: '0.6875rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '600' }}>
                Evidence · {attachments.length}
              </p>
              <label style={{ cursor: uploading ? 'not-allowed' : 'pointer' }}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleUpload}
                  disabled={uploading}
                />
                <span
                  className="tb-btn"
                  style={{ fontSize: '0.75rem', padding: '0.25rem 0.75rem', pointerEvents: uploading ? 'none' : 'auto', opacity: uploading ? 0.6 : 1 }}
                >
                  {uploading ? (
                    <>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                      Uploading…
                    </>
                  ) : (
                    <>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                      Upload image
                    </>
                  )}
                </span>
              </label>
            </div>

            {uploadErr && (
              <p style={{ fontSize: '0.75rem', color: 'var(--rose)', marginBottom: '0.625rem' }}>{uploadErr}</p>
            )}

            {attachments.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
                {attachments.map((item: any) => (
                  <div
                    key={item.id}
                    style={{ position: 'relative', borderRadius: '0.5rem', overflow: 'hidden', border: '1px solid var(--border)', aspectRatio: '1', background: 'var(--elevated)' }}
                    title={`${item.name} · ${humanSize(item.size)}`}
                  >
                    <a href={item.url} target="_blank" rel="noreferrer" style={{ display: 'block', width: '100%', height: '100%' }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.url}
                        alt={item.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                      />
                    </a>
                    <button
                      onClick={() => handleDeleteAttachment(item)}
                      title="Delete"
                      style={{
                        position: 'absolute', top: '4px', right: '4px',
                        width: '20px', height: '20px',
                        background: 'rgba(15,23,42,0.65)', border: 'none',
                        borderRadius: '50%', cursor: 'pointer', color: '#fff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '13px', lineHeight: 1,
                      }}
                    >
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                    <div style={{
                      position: 'absolute', bottom: 0, left: 0, right: 0,
                      padding: '2px 5px',
                      background: 'linear-gradient(transparent, rgba(15,23,42,0.6))',
                      fontSize: '9px', color: '#fff',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {item.name}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{
                border: '1.5px dashed var(--border)',
                borderRadius: '0.625rem',
                padding: '1.25rem',
                textAlign: 'center',
                color: 'var(--muted)',
                fontSize: '0.8125rem',
              }}>
                No evidence uploaded — click <strong>Upload image</strong> to attach screenshots or photos
              </div>
            )}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'space-between', paddingTop: '0.25rem', borderTop: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {edit ? (
                <>
                  <button className="tb-btn tb-btn-primary" onClick={() => onUpdate(form)}>Save changes</button>
                  <button className="tb-btn" onClick={() => setEdit(false)}>Cancel</button>
                </>
              ) : (
                <button className="tb-btn tb-btn-primary" onClick={() => setEdit(true)}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  Edit task
                </button>
              )}
            </div>
            <button className="tb-btn" style={{ color: 'var(--rose)', borderColor: 'rgba(244,63,94,0.2)' }} onClick={deleteTask}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
