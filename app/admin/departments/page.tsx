'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'

const COLOR_PALETTE = [
  { color: '#3b82f6', bg: 'rgba(59,130,246,0.12)',  label: 'Blue' },
  { color: '#7c5cfc', bg: 'rgba(124,92,252,0.12)', label: 'Purple' },
  { color: '#10b981', bg: 'rgba(16,185,129,0.12)', label: 'Green' },
  { color: '#f43f5e', bg: 'rgba(244,63,94,0.12)',  label: 'Red' },
  { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', label: 'Amber' },
  { color: '#0ea5e9', bg: 'rgba(14,165,233,0.12)', label: 'Sky' },
  { color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)', label: 'Violet' },
  { color: '#ec4899', bg: 'rgba(236,72,153,0.12)', label: 'Pink' },
]

const emptyForm = { name: '', label: '', color: '#3b82f6', bg_color: 'rgba(59,130,246,0.12)' }

export default function AdminDepartmentsPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  const [depts,   setDepts]   = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [modal,   setModal]   = useState<'create' | { id: number; label: string; color: string; bg_color: string } | null>(null)
  const [form,    setForm]    = useState(emptyForm)
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState('')

  useEffect(() => {
    if (!authLoading && user?.role !== 'admin') router.push('/')
  }, [user, authLoading, router])

  async function loadDepts() {
    const res = await fetch('/api/admin/departments')
    const data = await res.json()
    setDepts(data.departments || [])
    setLoading(false)
  }

  useEffect(() => { if (user?.role === 'admin') loadDepts() }, [user])

  function openCreate() {
    setForm(emptyForm)
    setError('')
    setModal('create')
  }

  function openEdit(d: any) {
    setForm({ name: d.name, label: d.label, color: d.color, bg_color: d.bg_color })
    setError('')
    setModal({ id: d.id, label: d.label, color: d.color, bg_color: d.bg_color })
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setSaving(true)

    if (modal === 'create') {
      const res = await fetch('/api/admin/departments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed to create'); setSaving(false); return }
    } else if (modal && typeof modal === 'object') {
      const res = await fetch(`/api/admin/departments/${modal.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: form.label, color: form.color, bg_color: form.bg_color }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed to update'); setSaving(false); return }
    }

    setSaving(false)
    setModal(null)
    loadDepts()
  }

  async function handleDelete(d: any) {
    if (!confirm(`Delete "${d.label}" department?`)) return
    const res = await fetch(`/api/admin/departments/${d.id}`, { method: 'DELETE' })
    const data = await res.json()
    if (!res.ok) { alert(data.error); return }
    loadDepts()
  }

  function pickColor(c: typeof COLOR_PALETTE[0]) {
    setForm(p => ({ ...p, color: c.color, bg_color: c.bg }))
  }

  const isEditing = modal !== null && typeof modal === 'object'
  const protectedNames = ['admin', 'sales', 'marketing', 'developer']

  if (authLoading || user?.role !== 'admin') return null

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--ink)', marginBottom: '0.25rem' }}>Departments</h1>
          <p style={{ fontSize: '0.8125rem', color: 'var(--muted)' }}>Manage team departments and assign colors</p>
        </div>
        <button className="tb-btn tb-btn-primary" onClick={openCreate}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New Department
        </button>
      </div>

      {loading ? (
        <div style={{ color: 'var(--muted)', padding: '2rem 0' }}>Loading…</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '0.875rem' }}>
          {depts.map(d => (
            <div key={d.id} className="tb-card" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: d.bg_color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: d.color }} />
                  </div>
                  <div>
                    <p style={{ fontSize: '0.9375rem', fontWeight: '700', color: 'var(--ink)' }}>{d.label}</p>
                    <p style={{ fontSize: '0.6875rem', color: 'var(--muted)', fontFamily: 'monospace' }}>{d.name}</p>
                  </div>
                </div>
                <span className="tb-chip" style={{ background: d.bg_color, color: d.color, fontSize: '0.625rem' }}>
                  {d.name}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '0.375rem' }}>
                <button className="tb-btn" style={{ flex: 1, justifyContent: 'center', fontSize: '0.75rem', padding: '0.25rem 0' }} onClick={() => openEdit(d)}>
                  Edit
                </button>
                {!protectedNames.includes(d.name) && (
                  <button className="tb-btn" style={{ flex: 1, justifyContent: 'center', fontSize: '0.75rem', padding: '0.25rem 0', color: 'var(--rose)', borderColor: 'rgba(244,63,94,0.25)' }} onClick={() => handleDelete(d)}>
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      {modal !== null && (
        <div className="tb-modal-bg" onClick={e => { if (e.target === e.currentTarget) setModal(null) }}>
          <div className="tb-modal" style={{ width: '100%', maxWidth: '420px' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
              <h2 style={{ fontSize: '1rem', fontWeight: '600', margin: 0 }}>
                {isEditing ? `Edit ${(modal as any).label}` : 'New Department'}
              </h2>
            </div>
            <form onSubmit={handleSave} style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              {!isEditing && (
                <div>
                  <label style={lbl}>Name (slug) *</label>
                  <input className="tb-input" required placeholder="e.g. qa_team"
                    value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
                  <p style={{ fontSize: '0.6875rem', color: 'var(--muted)', marginTop: '3px' }}>Lowercase, no spaces. Used internally.</p>
                </div>
              )}
              <div>
                <label style={lbl}>Display Label *</label>
                <input className="tb-input" required placeholder="e.g. QA Team"
                  value={form.label} onChange={e => setForm(p => ({ ...p, label: e.target.value }))} />
              </div>
              <div>
                <label style={lbl}>Color</label>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {COLOR_PALETTE.map(c => (
                    <button
                      key={c.color}
                      type="button"
                      title={c.label}
                      onClick={() => pickColor(c)}
                      style={{
                        width: '28px', height: '28px', borderRadius: '8px',
                        background: c.color, border: form.color === c.color ? '3px solid var(--ink)' : '2px solid transparent',
                        cursor: 'pointer',
                      }}
                    />
                  ))}
                </div>
                <div style={{ marginTop: '8px' }}>
                  <span className="tb-chip" style={{ background: form.bg_color, color: form.color }}>
                    {form.label || 'Preview'}
                  </span>
                </div>
              </div>

              {error && (
                <div style={{ padding: '0.5rem 0.75rem', background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.25)', borderRadius: '0.5rem', fontSize: '0.8125rem', color: 'var(--rose)' }}>
                  {error}
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button type="button" className="tb-btn" onClick={() => setModal(null)}>Cancel</button>
                <button type="submit" className="tb-btn tb-btn-primary" disabled={saving}>
                  {saving ? 'Saving…' : isEditing ? 'Save Changes' : 'Create Department'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

const lbl: React.CSSProperties = {
  display: 'block', fontSize: '0.8125rem', color: 'var(--muted)', marginBottom: '0.375rem', fontWeight: '500',
}
