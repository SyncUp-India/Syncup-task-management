'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'

interface AppUser {
  id: string; name: string; email: string; recovery_email: string | null
  role: 'admin' | 'user'; department: string; extra_departments: string[]; active: boolean; created_at: string
}

const EMPTY_CREATE = { name: '', email: '', password: '', recovery_email: '', department: '', role: 'user', extra_departments: [] as string[] }
const EMPTY_EDIT   = { name: '', email: '', department: '', role: 'user' as 'admin' | 'user', active: true, password: '', extra_departments: [] as string[] }

export default function AdminUsersPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  const [users,       setUsers]       = useState<AppUser[]>([])
  const [depts,       setDepts]       = useState<any[]>([])
  const [fetching,    setFetching]    = useState(true)
  const [showCreate,  setShowCreate]  = useState(false)
  const [editTarget,  setEditTarget]  = useState<AppUser | null>(null)
  const [createForm,  setCreateForm]  = useState(EMPTY_CREATE)
  const [editForm,    setEditForm]    = useState(EMPTY_EDIT)
  const [creating,    setCreating]    = useState(false)
  const [saving,      setSaving]      = useState(false)
  const [createError, setCreateError] = useState('')
  const [editError,   setEditError]   = useState('')

  useEffect(() => {
    if (!loading && user?.role !== 'admin') router.push('/')
  }, [user, loading, router])

  const loadData = useCallback(async () => {
    const [uRes, dRes] = await Promise.all([
      fetch('/api/admin/users').then(r => r.json()),
      fetch('/api/admin/departments').then(r => r.json()),
    ])
    setUsers(uRes.users || [])
    setDepts(dRes.departments || [])
    setFetching(false)
  }, [])

  useEffect(() => {
    if (!loading && user?.role === 'admin') loadData()
  }, [user, loading, loadData])

  function openEdit(u: AppUser) {
    setEditTarget(u)
    setEditForm({ name: u.name, email: u.email, department: u.department, role: u.role, active: u.active, password: '', extra_departments: u.extra_departments || [] })
    setEditError('')
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setCreateError(''); setCreating(true)
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(createForm),
    })
    const data = await res.json()
    if (res.ok) {
      setUsers(prev => [data.user, ...prev])
      setShowCreate(false)
      setCreateForm(EMPTY_CREATE)
    } else {
      setCreateError(data.error || 'Failed to create user')
    }
    setCreating(false)
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editTarget) return
    setEditError(''); setSaving(true)
    const body: any = {
      name:              editForm.name,
      email:             editForm.email,
      department:        editForm.department,
      role:              editForm.role,
      active:            editForm.active,
      extra_departments: editForm.extra_departments,
    }
    if (editForm.password) body.password = editForm.password
    const res = await fetch(`/api/admin/users/${editTarget.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (res.ok) {
      setUsers(prev => prev.map(u => u.id === editTarget.id ? { ...u, ...data.user } : u))
      setEditTarget(null)
    } else {
      setEditError(data.error || 'Failed to update')
    }
    setSaving(false)
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

  function getDeptMeta(name: string) {
    return depts.find(d => d.name === name) || { label: name, bg: 'rgba(15,23,42,0.06)', color: 'var(--muted)' }
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.375rem', fontWeight: '700', color: 'var(--ink)', marginBottom: '0.25rem' }}>User Management</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>Create, edit and manage workspace users</p>
        </div>
        <button className="tb-btn tb-btn-primary" onClick={() => { setCreateForm(EMPTY_CREATE); setCreateError(''); setShowCreate(true) }}>
          + New User
        </button>
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="tb-modal-bg" onClick={e => { if (e.target === e.currentTarget) setShowCreate(false) }}>
          <div className="tb-modal" style={{ width: '100%', maxWidth: '460px', padding: '1.875rem' }}>
            <h2 style={{ fontSize: '1.0625rem', fontWeight: '600', color: 'var(--ink)', marginBottom: '1.375rem' }}>Create User</h2>
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              <div><label style={lbl}>Full Name</label><input className="tb-input" required placeholder="Jane Doe" value={createForm.name} onChange={e => setCreateForm(p => ({ ...p, name: e.target.value }))} /></div>
              <div><label style={lbl}>Login Email</label><input type="email" className="tb-input" required placeholder="jane@company.com" value={createForm.email} onChange={e => setCreateForm(p => ({ ...p, email: e.target.value }))} /></div>
              <div>
                <label style={lbl}>Recovery Email <span style={{ fontWeight: 400, opacity: 0.6 }}>(optional)</span></label>
                <input type="email" className="tb-input" placeholder="jane@personal.com" value={createForm.recovery_email} onChange={e => setCreateForm(p => ({ ...p, recovery_email: e.target.value }))} />
              </div>
              <div><label style={lbl}>Password</label><input type="password" className="tb-input" required placeholder="Min 8 characters" value={createForm.password} onChange={e => setCreateForm(p => ({ ...p, password: e.target.value }))} /></div>
              <div>
                <label style={lbl}>Department</label>
                <select className="tb-input" value={createForm.department} onChange={e => {
                  const newDept = e.target.value
                  setCreateForm(p => ({ ...p, department: newDept, extra_departments: p.extra_departments.filter(x => x !== newDept) }))
                }}>
                  <option value="">— No department —</option>
                  {depts.map(d => <option key={d.name} value={d.name}>{d.label}</option>)}
                </select>
              </div>
              {createForm.role !== 'admin' && (() => {
                const otherDepts = depts.filter(d => d.name !== createForm.department)
                if (otherDepts.length === 0) return null
                return (
                  <div>
                    <label style={lbl}>Can also see tasks from</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '0.625rem 0.75rem', background: 'var(--elevated)', border: '1px solid var(--border)', borderRadius: '0.5rem' }}>
                      {otherDepts.map(d => {
                        const checked = createForm.extra_departments.includes(d.name)
                        return (
                          <label key={d.name} style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={e => setCreateForm(p => ({
                                ...p,
                                extra_departments: e.target.checked
                                  ? [...p.extra_departments, d.name]
                                  : p.extra_departments.filter(x => x !== d.name),
                              }))}
                              style={{ accentColor: 'var(--accent)', width: '15px', height: '15px' }}
                            />
                            <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '999px', fontSize: '0.75rem', fontWeight: '600', background: d.bg_color, color: d.color }}>
                              {d.label}
                            </span>
                          </label>
                        )
                      })}
                    </div>
                    <p style={{ fontSize: '0.6875rem', color: 'var(--muted)', marginTop: '4px' }}>
                      Tasks from checked departments will also appear on this user's board
                    </p>
                  </div>
                )
              })()}
              <div>
                <label style={lbl}>Role</label>
                <select className="tb-input" value={createForm.role} onChange={e => setCreateForm(p => ({ ...p, role: e.target.value, extra_departments: [] }))}>
                  <option value="user">User — standard access</option>
                  <option value="admin">Admin — full access to all departments and settings</option>
                </select>
              </div>
              {createError && <div style={{ padding: '0.5rem 0.75rem', background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.3)', borderRadius: '0.5rem', fontSize: '0.8125rem', color: 'var(--rose)' }}>{createError}</div>}
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
                <button type="submit" className="tb-btn tb-btn-primary" disabled={creating} style={{ flex: 1, justifyContent: 'center' }}>{creating ? 'Creating…' : 'Create User'}</button>
                <button type="button" className="tb-btn" onClick={() => setShowCreate(false)} style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editTarget && (
        <div className="tb-modal-bg" onClick={e => { if (e.target === e.currentTarget) setEditTarget(null) }}>
          <div className="tb-modal" style={{ width: '100%', maxWidth: '460px', padding: '1.875rem' }}>
            <h2 style={{ fontSize: '1.0625rem', fontWeight: '600', color: 'var(--ink)', marginBottom: '1.375rem' }}>Edit {editTarget.name}</h2>
            <form onSubmit={handleEdit} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              <div><label style={lbl}>Full Name</label><input className="tb-input" required value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} /></div>
              <div><label style={lbl}>Login Email</label><input type="email" className="tb-input" required value={editForm.email} onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))} /></div>
              <div>
                <label style={lbl}>Department</label>
                <select className="tb-input" value={editForm.department} onChange={e => {
                  const newDept = e.target.value
                  setEditForm(p => ({ ...p, department: newDept, extra_departments: p.extra_departments.filter(x => x !== newDept) }))
                }}>
                  {depts.map(d => <option key={d.name} value={d.name}>{d.label}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Role</label>
                <select className="tb-input" value={editForm.role} onChange={e => setEditForm(p => ({ ...p, role: e.target.value as 'admin' | 'user', extra_departments: [] }))}>
                  <option value="user">User — standard access</option>
                  <option value="admin">Admin — full access</option>
                </select>
                {editForm.role === 'admin' && (
                  <p style={{ fontSize: '0.6875rem', color: 'var(--amber)', marginTop: '3px' }}>
                    ⚠ Admin users can see all departments, manage users, and approve leaves.
                  </p>
                )}
              </div>
              {/* Extra department access */}
              {editForm.role !== 'admin' && (() => {
                const otherDepts = depts.filter(d => d.name !== editForm.department)
                if (otherDepts.length === 0) return null
                return (
                  <div>
                    <label style={lbl}>Can also see tasks from</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '0.625rem 0.75rem', background: 'var(--elevated)', border: '1px solid var(--border)', borderRadius: '0.5rem' }}>
                      {otherDepts.map(d => {
                        const checked = editForm.extra_departments.includes(d.name)
                        return (
                          <label key={d.name} style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={e => setEditForm(p => ({
                                ...p,
                                extra_departments: e.target.checked
                                  ? [...p.extra_departments, d.name]
                                  : p.extra_departments.filter(x => x !== d.name),
                              }))}
                              style={{ accentColor: 'var(--accent)', width: '15px', height: '15px' }}
                            />
                            <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '999px', fontSize: '0.75rem', fontWeight: '600', background: d.bg_color, color: d.color }}>
                              {d.label}
                            </span>
                          </label>
                        )
                      })}
                    </div>
                    <p style={{ fontSize: '0.6875rem', color: 'var(--muted)', marginTop: '4px' }}>
                      Tasks from checked departments will appear on this user's board
                    </p>
                  </div>
                )
              })()}

              <div>
                <label style={lbl}>Status</label>
                <select className="tb-input" value={editForm.active ? 'active' : 'inactive'} onChange={e => setEditForm(p => ({ ...p, active: e.target.value === 'active' }))}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div>
                <label style={lbl}>New Password <span style={{ fontWeight: 400, opacity: 0.6 }}>(leave blank to keep)</span></label>
                <input type="password" className="tb-input" placeholder="Min 8 characters" value={editForm.password} onChange={e => setEditForm(p => ({ ...p, password: e.target.value }))} />
              </div>
              {editError && <div style={{ padding: '0.5rem 0.75rem', background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.3)', borderRadius: '0.5rem', fontSize: '0.8125rem', color: 'var(--rose)' }}>{editError}</div>}
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
                <button type="submit" className="tb-btn tb-btn-primary" disabled={saving} style={{ flex: 1, justifyContent: 'center' }}>{saving ? 'Saving…' : 'Save Changes'}</button>
                <button type="button" className="tb-btn" onClick={() => setEditTarget(null)} style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
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
                {['Name', 'Email', 'Department', 'Role', 'Status', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.6875rem', fontWeight: '600', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map(u => {
                const dm = getDeptMeta(u.department)
                return (
                  <tr key={u.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '0.875rem 1rem', fontSize: '0.875rem', fontWeight: '600', color: 'var(--ink)' }}>{u.name}</td>
                    <td style={{ padding: '0.875rem 1rem', fontSize: '0.8125rem', color: 'var(--muted)' }}>{u.email}</td>
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
                        <span className="tb-chip" style={{ background: dm.bg_color || dm.bg, color: dm.color }}>{dm.label}</span>
                        {(u.extra_departments || []).map(d => {
                          const edm = getDeptMeta(d)
                          return <span key={d} className="tb-chip" style={{ background: edm.bg_color || edm.bg, color: edm.color, opacity: 0.7, fontSize: '0.625rem' }}>+{edm.label}</span>
                        })}
                      </div>
                    </td>
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <span className="tb-chip" style={{
                        background: u.role === 'admin' ? 'rgba(124,92,252,0.12)' : 'rgba(15,23,42,0.06)',
                        color: u.role === 'admin' ? '#7c5cfc' : 'var(--muted)',
                        fontWeight: u.role === 'admin' ? '700' : '500',
                      }}>
                        {u.role === 'admin' ? '⚡ Admin' : 'User'}
                      </span>
                    </td>
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <span className="tb-chip" style={{ background: u.active ? 'rgba(16,185,129,0.12)' : 'rgba(244,63,94,0.1)', color: u.active ? 'var(--emerald)' : 'var(--rose)' }}>
                        {u.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
                        <button className="tb-btn" style={{ fontSize: '0.75rem', padding: '0.25rem 0.625rem' }} onClick={() => openEdit(u)}>Edit</button>
                        <button className="tb-btn" style={{ fontSize: '0.75rem', padding: '0.25rem 0.625rem' }} onClick={() => toggleActive(u.id, u.active)}>
                          {u.active ? 'Deactivate' : 'Activate'}
                        </button>
                        {u.id !== user?.userId && (
                          <button className="tb-btn" style={{ fontSize: '0.75rem', padding: '0.25rem 0.625rem', color: 'var(--rose)', borderColor: 'rgba(244,63,94,0.25)' }} onClick={() => handleDelete(u.id, u.email)}>Delete</button>
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
  display: 'block', fontSize: '0.8125rem', color: 'var(--muted)', marginBottom: '0.375rem', fontWeight: '500',
}
