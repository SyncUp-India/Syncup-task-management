'use client';
import { useEffect, useState } from 'react';

const ROLES = ['dev','qa','pm','design','marketing','ops','other'];

const ROLE_META: Record<string, { bg: string; color: string; label: string }> = {
  dev:       { bg: 'rgba(14,165,233,0.1)',  color: '#0ea5e9', label: 'Dev' },
  qa:        { bg: 'rgba(16,185,129,0.1)',  color: '#10b981', label: 'QA' },
  pm:        { bg: 'rgba(99,102,241,0.1)',  color: '#6366f1', label: 'PM' },
  design:    { bg: 'rgba(245,158,11,0.1)',  color: '#f59e0b', label: 'Design' },
  marketing: { bg: 'rgba(244,63,94,0.1)',   color: '#f43f5e', label: 'Marketing' },
  ops:       { bg: 'rgba(167,139,250,0.1)', color: '#a78bfa', label: 'Ops' },
  other:     { bg: 'rgba(100,116,139,0.1)', color: '#64748b', label: 'Other' },
};

const AVATAR_COLORS = [
  '#3b82f6','#0ea5e9','#10b981','#f59e0b','#f43f5e','#a78bfa','#6366f1',
];

const EMPTY = { name: '', email: '', role: 'dev' };

export default function MembersPage() {
  const [members, setMembers]   = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [form, setForm]         = useState(EMPTY);
  const [adding, setAdding]     = useState(false);
  const [editing, setEditing]   = useState<any>(null);
  const [editForm, setEditForm] = useState(EMPTY);

  async function load() {
    const res = await fetch('/api/members').then(r => r.json());
    setMembers(res.members || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function handleAdd() {
    if (!form.name.trim()) return;
    setAdding(true);
    await fetch('/api/members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setForm(EMPTY);
    setAdding(false);
    load();
  }

  function openEdit(m: any) {
    setEditing(m);
    setEditForm({ name: m.name, email: m.email || '', role: m.role });
  }

  async function handleSaveEdit() {
    if (!editForm.name.trim()) return;
    await fetch(`/api/members/${editing.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editForm),
    });
    setEditing(null);
    load();
  }

  async function handleDelete(m: any) {
    if (!confirm(`Remove "${m.name}" from the team? Their tasks will remain.`)) return;
    await fetch(`/api/members/${m.id}`, { method: 'DELETE' });
    load();
  }

  const Lbl = ({ children }: any) => (
    <p style={{ fontSize: '0.6875rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '600', marginBottom: '0.375rem' }}>
      {children}
    </p>
  );

  return (
    <div>
      <h1 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '0.25rem', color: 'var(--ink)' }}>
        Members
      </h1>
      <p style={{ fontSize: '0.8125rem', color: 'var(--muted)', marginBottom: '1.75rem' }}>
        Manage your team — {members.length} active member{members.length !== 1 ? 's' : ''}
      </p>

      {/* Add form */}
      <div className="tb-card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '1rem', color: 'var(--ink)' }}>
          Add member
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '0.75rem', alignItems: 'flex-end' }}>
          <div>
            <Lbl>Name</Lbl>
            <input className="tb-input" placeholder="Full name" value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              onKeyDown={e => e.key === 'Enter' && handleAdd()} />
          </div>
          <div>
            <Lbl>Email</Lbl>
            <input type="email" className="tb-input" placeholder="email@company.com" value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <Lbl>Role</Lbl>
            <select className="tb-input" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
              {ROLES.map(r => <option key={r} value={r}>{ROLE_META[r]?.label || r}</option>)}
            </select>
          </div>
          <button className="tb-btn tb-btn-primary" onClick={handleAdd} disabled={adding}
            style={{ height: '38px', alignSelf: 'flex-end' }}>
            {adding ? 'Adding…' : '+ Add'}
          </button>
        </div>
      </div>

      {/* Edit modal */}
      {editing && (
        <div className="tb-modal-bg" onClick={e => { if (e.target === e.currentTarget) setEditing(null) }}>
          <div className="tb-modal" style={{ width: '100%', maxWidth: '420px', padding: '1.75rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--ink)', marginBottom: '1.25rem' }}>
              Edit Member
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              <div>
                <Lbl>Name</Lbl>
                <input className="tb-input" value={editForm.name}
                  onChange={e => setEditForm({ ...editForm, name: e.target.value })} autoFocus />
              </div>
              <div>
                <Lbl>Email</Lbl>
                <input type="email" className="tb-input" value={editForm.email}
                  onChange={e => setEditForm({ ...editForm, email: e.target.value })} />
              </div>
              <div>
                <Lbl>Role</Lbl>
                <select className="tb-input" value={editForm.role}
                  onChange={e => setEditForm({ ...editForm, role: e.target.value })}>
                  {ROLES.map(r => <option key={r} value={r}>{ROLE_META[r]?.label || r}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: '0.625rem', marginTop: '0.375rem' }}>
                <button className="tb-btn tb-btn-primary" onClick={handleSaveEdit}
                  style={{ flex: 1, justifyContent: 'center' }}>
                  Save changes
                </button>
                <button className="tb-btn" onClick={() => setEditing(null)}
                  style={{ flex: 1, justifyContent: 'center' }}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Members grid */}
      {loading ? (
        <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>Loading…</p>
      ) : members.length === 0 ? (
        <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>No members yet. Add one above.</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '0.875rem' }}>
          {members.map((m, i) => {
            const role   = ROLE_META[m.role] || ROLE_META.other;
            const color  = AVATAR_COLORS[i % AVATAR_COLORS.length];
            const initials = m.name.split(' ').map((p: string) => p[0]).join('').toUpperCase().slice(0, 2);

            return (
              <div key={m.id} className="tb-card" style={{ padding: '1.125rem 1.125rem 1rem' }}>
                {/* Top row: avatar + actions */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <div style={{
                    width: '44px', height: '44px', borderRadius: '12px',
                    background: color + '18',
                    border: `1.5px solid ${color}30`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '14px', fontWeight: '700', color,
                  }}>
                    {initials}
                  </div>
                  <div style={{ display: 'flex', gap: '0.375rem' }}>
                    {/* Edit */}
                    <button
                      onClick={() => openEdit(m)}
                      title="Edit member"
                      style={{
                        width: '30px', height: '30px',
                        border: '1px solid var(--border)', borderRadius: '8px',
                        background: '#fff', cursor: 'pointer', color: 'var(--muted)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.15s',
                      }}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLElement).style.color = 'var(--accent)'
                        ;(e.currentTarget as HTMLElement).style.borderColor = 'rgba(59,130,246,0.4)'
                        ;(e.currentTarget as HTMLElement).style.background = 'rgba(59,130,246,0.06)'
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLElement).style.color = 'var(--muted)'
                        ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'
                        ;(e.currentTarget as HTMLElement).style.background = '#fff'
                      }}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                    </button>
                    {/* Delete */}
                    <button
                      onClick={() => handleDelete(m)}
                      title="Remove member"
                      style={{
                        width: '30px', height: '30px',
                        border: '1px solid var(--border)', borderRadius: '8px',
                        background: '#fff', cursor: 'pointer', color: 'var(--muted)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.15s',
                      }}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLElement).style.color = 'var(--rose)'
                        ;(e.currentTarget as HTMLElement).style.borderColor = 'rgba(244,63,94,0.35)'
                        ;(e.currentTarget as HTMLElement).style.background = 'rgba(244,63,94,0.06)'
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLElement).style.color = 'var(--muted)'
                        ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'
                        ;(e.currentTarget as HTMLElement).style.background = '#fff'
                      }}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6l-1 14H6L5 6"/>
                        <path d="M10 11v6"/><path d="M14 11v6"/>
                        <path d="M9 6V4h6v2"/>
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Info */}
                <p style={{ fontWeight: '600', fontSize: '0.9rem', color: 'var(--ink)', marginBottom: '0.25rem' }}>
                  {m.name}
                </p>
                <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '0.625rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {m.email || '—'}
                </p>
                <span style={{
                  display: 'inline-block', fontSize: '0.6875rem', fontWeight: '600',
                  padding: '3px 10px', borderRadius: '999px',
                  background: role.bg, color: role.color,
                }}>
                  {role.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
