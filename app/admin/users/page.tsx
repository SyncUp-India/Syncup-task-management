'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'
import { DEPT_META, USER_DEPARTMENTS } from '@/lib/departments'

interface AppUser {
  id: string
  name: string
  email: string
  recovery_email: string | null
  role: 'admin' | 'user'
  department: string
  active: boolean
  created_at: string
}

const EMPTY_FORM = { name: '', email: '', password: '', recovery_email: '', department: 'developer' }

export default function AdminUsersPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [users, setUsers] = useState<AppUser[]>([])
  const [fetching, setFetching] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')

  useEffect(() => {
    if (!loading && user?.role !== 'admin') router.push('/')
  }, [user, loading, router])

  useEffect(() => {
    if (!loading && user?.role === 'admin') {
      fetch('/api/admin/users')
        .then(r => r.json())
        .then(data => { setUsers(data.users || []); setFetching(false) })
    }
  }, [user, loading])

  function openCreate() {
    setForm(EMPTY_FORM)
    setCreateError('')
    setShowCreate(true)
  }

  async function toggleActive(id: string, active: boolean) {
    const res = await fetch(`/api/admin/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !active }),
    })
    if (res.ok) setUsers(prev => prev.map(u => u.id === id ? { ...u, active: !active } : u))
  }

  async function handleDelete(id: string, email: string) {
    if (!confirm(`Delete user "${email}"? This cannot be undone.`)) return
    const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' })
    if (res.ok) setUsers(prev => prev.filter(u => u.id !== id))
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setCreateError('')
    setCreating(true)

    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()

    if (res.ok) {
      setUsers(prev => [data.user, ...prev])
      setShowCreate(false)
      setForm(EMPTY_FORM)
    } else {
      setCreateError(data.error || 'Failed to create user')
    }
    setCreating(false)
  }

  const inp = (field: keyof typeof EMPTY_FORM) => ({
    value: form[field],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(p => ({ ...p, [field]: e.target.value })),
  })

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.375rem', fontWeight: '600', color: 'var(--ink)', marginBottom: '0.25rem' }}>
            User Management
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>
            Create and manage workspace users
          </p>
        </div>
        <button className="tb-btn tb-btn-primary" onClick={openCreate}>
          + New User
        </button>
      </div>

      {/* Create modal */}
      {showCreate && (
        <div
          className="tb-modal-bg"
          onClick={e => { if (e.target === e.currentTarget) setShowCreate(false) }}
        >
          <div className="tb-modal" style={{ width: '100%', maxWidth: '460px', padding: '1.875rem' }}>
            <h2 style={{ fontSize: '1.0625rem', fontWeight: '600', color: 'var(--ink)', marginBottom: '1.375rem' }}>
              Create User
            </h2>
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              <div>
                <label style={lbl}>Full Name</label>
                <input className="tb-input" placeholder="Jane Doe" required {...inp('name')} />
              </div>
              <div>
                <label style={lbl}>Login Email</label>
                <input type="email" className="tb-input" placeholder="jane@company.com" required {...inp('email')} />
              </div>
              <div>
                <label style={lbl}>
                  Recovery Email{' '}
                  <span style={{ fontWeight: 400, opacity: 0.6 }}>(optional — where resets are sent)</span>
                </label>
                <input type="email" className="tb-input" placeholder="jane@personal.com" {...inp('recovery_email')} />
              </div>
              <div>
                <label style={lbl}>Password</label>
                <input type="password" className="tb-input" placeholder="Min 8 characters" required {...inp('password')} />
              </div>
              <div>
                <label style={lbl}>Department</label>
                <select className="tb-input" {...inp('department')}>
                  {USER_DEPARTMENTS.map(d => (
                    <option key={d} value={d}>{DEPT_META[d]?.label ?? d}</option>
                  ))}
                </select>
                <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.25rem' }}>
                  "Admin" department grants admin access. All others are regular users.
                </p>
              </div>

              {createError && (
                <div style={{
                  padding: '0.625rem 0.875rem',
                  background: 'rgba(244,63,94,0.1)',
                  border: '1px solid rgba(244,63,94,0.3)',
                  borderRadius: '0.5rem',
                  fontSize: '0.8125rem',
                  color: 'var(--rose)',
                }}>
                  {createError}
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="submit"
                  className="tb-btn tb-btn-primary"
                  disabled={creating}
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  {creating ? 'Creating…' : 'Create User'}
                </button>
                <button
                  type="button"
                  className="tb-btn"
                  onClick={() => setShowCreate(false)}
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="tb-card" style={{ overflow: 'hidden' }}>
        {fetching ? (
          <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--muted)' }}>Loading users…</div>
        ) : users.length === 0 ? (
          <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--muted)' }}>No users yet</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Name', 'Login Email', 'Recovery Email', 'Department', 'Status', 'Actions'].map(h => (
                  <th key={h} style={{
                    padding: '0.75rem 1rem', textAlign: 'left',
                    fontSize: '0.6875rem', fontWeight: '600',
                    color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map(u => {
                const deptMeta = DEPT_META[u.department] || DEPT_META.developer
                return (
                  <tr key={u.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '0.875rem 1rem', fontSize: '0.875rem', fontWeight: '500', color: 'var(--ink)' }}>
                      {u.name}
                    </td>
                    <td style={{ padding: '0.875rem 1rem', fontSize: '0.8125rem', color: 'var(--muted)' }}>
                      {u.email}
                    </td>
                    <td style={{ padding: '0.875rem 1rem', fontSize: '0.8125rem', color: 'var(--muted)' }}>
                      {u.recovery_email || <span style={{ opacity: 0.4 }}>—</span>}
                    </td>
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <span className="tb-chip" style={{ background: deptMeta.bg, color: deptMeta.color }}>
                        {deptMeta.label}
                      </span>
                    </td>
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <span className="tb-chip" style={{
                        background: u.active ? 'rgba(16,185,129,0.12)' : 'rgba(244,63,94,0.1)',
                        color: u.active ? 'var(--emerald)' : 'var(--rose)',
                      }}>
                        {u.active ? 'active' : 'inactive'}
                      </span>
                    </td>
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          className="tb-btn"
                          onClick={() => toggleActive(u.id, u.active)}
                          style={{ fontSize: '0.75rem', padding: '0.25rem 0.625rem' }}
                        >
                          {u.active ? 'Deactivate' : 'Activate'}
                        </button>
                        {u.id !== user?.userId && (
                          <button
                            className="tb-btn"
                            onClick={() => handleDelete(u.id, u.email)}
                            style={{
                              fontSize: '0.75rem', padding: '0.25rem 0.625rem',
                              color: 'var(--rose)', borderColor: 'rgba(244,63,94,0.25)',
                            }}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

const lbl: React.CSSProperties = {
  display: 'block',
  fontSize: '0.8125rem',
  color: 'var(--muted)',
  marginBottom: '0.375rem',
}
