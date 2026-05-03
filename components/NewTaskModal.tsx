'use client';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { DEPT_META, TASK_DEPARTMENTS } from '@/lib/departments';

export default function NewTaskModal({ members, onClose, onCreated }: any) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [form, setForm] = useState({
    title: '', description: '', assignee_id: '', priority: 'medium',
    due_date: '', est_hours: 0, status: 'todo', department: '',
  });
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!form.title.trim()) { alert('Title is required'); return; }
    setSaving(true);
    const body: any = { ...form, source: 'manual' };
    if (!isAdmin) delete body.department; // server will auto-assign from session
    const res = await fetch('/api/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    setSaving(false);
    if (res.ok) onCreated();
    else alert('Failed to create task');
  }

  const Label = ({ children }: any) => (
    <p style={{ fontSize: '0.6875rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '600', marginBottom: '0.375rem' }}>{children}</p>
  );

  return (
    <div className="tb-modal-bg" onClick={onClose}>
      <div className="tb-modal" style={{ width: '100%', maxWidth: '520px' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', background: 'linear-gradient(180deg, rgba(59,130,246,0.05) 0%, transparent 100%)' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: '600', margin: 0 }}>New task</h2>
          <p style={{ fontSize: '0.8125rem', color: 'var(--muted)', marginTop: '0.25rem' }}>Add a task manually</p>
        </div>
        <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <Label>Title *</Label>
            <input className="tb-input" placeholder="What needs to be done?" value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })} autoFocus />
          </div>
          <div>
            <Label>Description</Label>
            <textarea className="tb-input" style={{ minHeight: '72px', resize: 'vertical' }} placeholder="Optional details…"
              value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <Label>Assignee</Label>
              <select className="tb-input" value={form.assignee_id} onChange={e => setForm({ ...form, assignee_id: e.target.value })}>
                <option value="">Unassigned</option>
                {members.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div>
              <Label>Priority</Label>
              <select className="tb-input" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div>
              <Label>Due date</Label>
              <input type="date" className="tb-input" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} />
            </div>
            <div>
              <Label>Estimate (hrs)</Label>
              <input type="number" step="0.5" className="tb-input" placeholder="0" value={form.est_hours || ''}
                onChange={e => setForm({ ...form, est_hours: parseFloat(e.target.value) || 0 })} />
            </div>
            {isAdmin && (
              <div style={{ gridColumn: '1 / -1' }}>
                <Label>Department</Label>
                <select className="tb-input" value={form.department} onChange={e => setForm({ ...form, department: e.target.value })}>
                  <option value="">None</option>
                  {TASK_DEPARTMENTS.map(d => (
                    <option key={d} value={d}>{DEPT_META[d]?.label ?? d}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', paddingTop: '0.25rem' }}>
            <button className="tb-btn" onClick={onClose}>Cancel</button>
            <button className="tb-btn tb-btn-primary" onClick={submit} disabled={saving}>
              {saving ? 'Creating…' : 'Create task'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
