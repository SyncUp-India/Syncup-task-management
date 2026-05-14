'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { DEPT_META } from '@/lib/departments'

const TITLES = ['dev', 'qa', 'pm', 'design', 'marketing', 'ops', 'other']

const TITLE_META: Record<string, { bg: string; color: string; label: string }> = {
  dev:       { bg: 'rgba(14,165,233,0.1)',  color: '#0ea5e9', label: 'Dev' },
  qa:        { bg: 'rgba(16,185,129,0.1)',  color: '#10b981', label: 'QA' },
  pm:        { bg: 'rgba(99,102,241,0.1)',  color: '#6366f1', label: 'PM' },
  design:    { bg: 'rgba(245,158,11,0.1)',  color: '#f59e0b', label: 'Design' },
  marketing: { bg: 'rgba(244,63,94,0.1)',   color: '#f43f5e', label: 'Marketing' },
  ops:       { bg: 'rgba(167,139,250,0.1)', color: '#a78bfa', label: 'Ops' },
  other:     { bg: 'rgba(100,116,139,0.1)', color: '#64748b', label: 'Other' },
}

const AVATAR_COLORS = ['#3b82f6','#0ea5e9','#10b981','#f59e0b','#f43f5e','#a78bfa','#6366f1']

export default function MembersPage() {
  const { user: me } = useAuth()
  const isAdmin = me?.role === 'admin'

  const [members, setMembers]   = useState<any[]>([])
  const [loading, setLoading]   = useState(true)
  const [editing, setEditing]   = useState<any>(null)
  const [editForm, setEditForm] = useState({ name: '', title: 'other' })
  const [saving, setSaving]     = useState(false)

  async function load() {
    const res = await fetch('/api/members').then(r => r.json())
    setMembers(res.members || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  function openEdit(m: any) {
    setEditing(m)
    setEditForm({ name: m.name, title: m.title || 'other' })
  }

  async function handleSaveEdit() {
    if (!editForm.name.trim()) return
    setSaving(true)
    await fetch(`/api/members/${editing.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editForm),
    })
    setSaving(false)
    setEditing(null)
    load()
  }

  async function handleDeactivate(m: any) {
    if (!confirm(`Deactivate "${m.name}"? They will no longer appear in the team or task assignments.`)) return
    await fetch(`/api/members/${m.id}`, { method: 'DELETE' })
    load()
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '0.25rem', color: 'var(--ink)' }}>Team</h1>
          <p style={{ fontSize: '0.8125rem', color: 'var(--muted)' }}>
            {members.length} member{members.length !== 1 ? 's' : ''}{members.filter(m => !m.active).length > 0 ? ` (${members.filter(m => !m.active).length} inactive)` : ''}
          </p>
        </div>
        {isAdmin && (
          <Link href="/admin/users" className="tb-btn tb-btn-primary" style={{ textDecoration: 'none' }}>
            + Add Member
          </Link>
        )}
      </div>

      {/* Edit modal (admin only) */}
      {editing && (
        <div className="tb-modal-bg" onClick={e => { if (e.target === e.currentTarget) setEditing(null) }}>
          <div className="tb-modal" style={{ width: '100%', maxWidth: '420px', padding: '1.75rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--ink)', marginBottom: '1.25rem' }}>
              Edit {editing.name}
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              <div>
                <label style={lbl}>Display Name</label>
                <input className="tb-input" value={editForm.name}
                  onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} autoFocus />
              </div>
              <div>
                <label style={lbl}>Job Title</label>
                <select className="tb-input" value={editForm.title}
                  onChange={e => setEditForm(p => ({ ...p, title: e.target.value }))}>
                  {TITLES.map(t => <option key={t} value={t}>{TITLE_META[t]?.label || t}</option>)}
                </select>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                To change email, password, department or role go to{' '}
                <Link href="/admin/users" style={{ color: 'var(--accent)' }}>Admin → Users</Link>.
              </p>
              <div style={{ display: 'flex', gap: '0.625rem', marginTop: '0.25rem' }}>
                <button className="tb-btn tb-btn-primary" onClick={handleSaveEdit} disabled={saving}
                  style={{ flex: 1, justifyContent: 'center' }}>
                  {saving ? 'Saving…' : 'Save'}
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
        <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>No members found.</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '0.875rem' }}>
          {members.map((m, i) => {
            const tm       = TITLE_META[m.title] || TITLE_META.other
            const color    = AVATAR_COLORS[i % AVATAR_COLORS.length]
            const initials = m.name.split(' ').map((p: string) => p[0]).join('').toUpperCase().slice(0, 2)

            const dm = m.department ? DEPT_META[m.department] : null

            return (
              <div key={m.id} className="tb-card" style={{ padding: '1.125rem 1.125rem 1rem', opacity: m.active ? 1 : 0.6 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <div style={{
                    width: '44px', height: '44px', borderRadius: '12px',
                    background: color + '18', border: `1.5px solid ${color}30`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '14px', fontWeight: '700', color,
                  }}>
                    {initials}
                  </div>
                  {isAdmin && (
                    <div style={{ display: 'flex', gap: '0.375rem' }}>
                      <button onClick={() => openEdit(m)} title="Edit job title"
                        style={iconBtn}
                        onMouseEnter={e => Object.assign((e.currentTarget as HTMLElement).style, iconBtnHover)}
                        onMouseLeave={e => Object.assign((e.currentTarget as HTMLElement).style, iconBtn)}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                      </button>
                      {m.id !== me?.userId && (
                        <button onClick={() => handleDeactivate(m)} title="Deactivate member"
                          style={iconBtn}
                          onMouseEnter={e => Object.assign((e.currentTarget as HTMLElement).style, iconBtnDanger)}
                          onMouseLeave={e => Object.assign((e.currentTarget as HTMLElement).style, iconBtn)}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6l-1 14H6L5 6"/>
                            <path d="M10 11v6"/><path d="M14 11v6"/>
                            <path d="M9 6V4h6v2"/>
                          </svg>
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <p style={{ fontWeight: '600', fontSize: '0.9rem', color: 'var(--ink)', marginBottom: '0.25rem' }}>
                  {m.name}
                  {m.role === 'admin' && (
                    <span style={{ marginLeft: '6px', fontSize: '0.625rem', background: 'rgba(124,92,252,0.12)', color: '#7c5cfc', padding: '1px 6px', borderRadius: '999px', fontWeight: '700', verticalAlign: 'middle' }}>Admin</span>
                  )}
                  {!m.active && (
                    <span style={{ marginLeft: '6px', fontSize: '0.625rem', background: 'rgba(244,63,94,0.1)', color: '#f43f5e', padding: '1px 6px', borderRadius: '999px', fontWeight: '700', verticalAlign: 'middle' }}>Inactive</span>
                  )}
                </p>
                <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '0.5rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {m.email || '—'}
                </p>
                <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
                  <span style={{ display: 'inline-block', fontSize: '0.6875rem', fontWeight: '600', padding: '3px 10px', borderRadius: '999px', background: tm.bg, color: tm.color }}>
                    {tm.label}
                  </span>
                  {dm && (
                    <span style={{ display: 'inline-block', fontSize: '0.6875rem', fontWeight: '600', padding: '3px 10px', borderRadius: '999px', background: dm.bg, color: dm.color }}>
                      {dm.label}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

const lbl: React.CSSProperties = {
  display: 'block', fontSize: '0.8125rem', color: 'var(--muted)', marginBottom: '0.375rem', fontWeight: '500',
}

const iconBtn: React.CSSProperties = {
  width: '30px', height: '30px',
  border: '1px solid var(--border)', borderRadius: '8px',
  background: 'transparent', cursor: 'pointer', color: 'var(--muted)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  transition: 'all 0.15s',
}

const iconBtnHover: React.CSSProperties = {
  ...iconBtn, color: 'var(--accent)',
  borderColor: 'rgba(59,130,246,0.4)', background: 'rgba(59,130,246,0.06)',
}

const iconBtnDanger: React.CSSProperties = {
  ...iconBtn, color: 'var(--rose)',
  borderColor: 'rgba(244,63,94,0.35)', background: 'rgba(244,63,94,0.06)',
}
