'use client'

import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/context/AuthContext'

function countWorkingDays(start: string, end: string): number {
  if (!start || !end || end < start) return 0
  const s = new Date(start + 'T00:00:00')
  const e = new Date(end + 'T00:00:00')
  let count = 0
  const cur = new Date(s)
  while (cur <= e) {
    const d = cur.getDay()
    if (d !== 0) count++ // Mon–Sat working week
    cur.setDate(cur.getDate() + 1)
  }
  return count
}

function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function BalanceBar({ used, total, color }: { used: number; total: number; color: string }) {
  const pct = total > 0 ? Math.min(100, (used / total) * 100) : 0
  return (
    <div style={{ height: '6px', background: 'var(--border)', borderRadius: '999px', overflow: 'hidden', marginTop: '6px' }}>
      <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: '999px', transition: 'width 0.4s' }} />
    </div>
  )
}

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  pending:  { bg: 'rgba(245,158,11,0.12)',  color: 'var(--amber)',   label: 'Pending' },
  approved: { bg: 'rgba(16,185,129,0.12)',  color: 'var(--emerald)', label: 'Approved' },
  rejected: { bg: 'rgba(244,63,94,0.1)',    color: 'var(--rose)',    label: 'Rejected' },
}

const emptyForm = { leave_type: 'sick', start_date: '', end_date: '', reason: '' }

export default function LeavesPage() {
  const { user } = useAuth()
  const today = new Date().toISOString().slice(0, 10)

  const [balance,   setBalance]   = useState<any>(null)
  const [limits,    setLimits]    = useState({ sick: 6, privilege: 12 })
  const [requests,  setRequests]  = useState<any[]>([])
  const [loading,   setLoading]   = useState(true)
  const [form,      setForm]      = useState(emptyForm)
  const [applying,  setApplying]  = useState(false)
  const [error,     setError]     = useState('')
  const [success,   setSuccess]   = useState('')
  const [showForm,  setShowForm]  = useState(false)

  const workingDays = useMemo(
    () => countWorkingDays(form.start_date, form.end_date),
    [form.start_date, form.end_date]
  )

  async function loadAll() {
    const [balRes, reqRes] = await Promise.all([
      fetch('/api/leaves/balance').then(r => r.json()),
      fetch('/api/leaves').then(r => r.json()),
    ])
    if (balRes.balance) { setBalance(balRes.balance); setLimits(balRes.limits) }
    setRequests(reqRes.requests || [])
    setLoading(false)
  }

  useEffect(() => { loadAll() }, [])

  async function handleApply(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setSuccess('')
    setApplying(true)
    const res = await fetch('/api/leaves', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    setApplying(false)
    if (!res.ok) { setError(data.error || 'Failed to apply'); return }
    setSuccess('Leave request submitted! Pending admin approval.')
    setForm(emptyForm)
    setShowForm(false)
    loadAll()
  }

  async function handleCancel(id: number) {
    if (!confirm('Cancel this leave request?')) return
    await fetch(`/api/leaves/${id}`, { method: 'DELETE' })
    loadAll()
  }

  const sickAvail = balance ? Number(balance.sick_balance) - Number(balance.sick_used) : 0
  const privAvail = balance ? Number(balance.privilege_balance) - Number(balance.privilege_used) : 0
  const yearEnd   = `Dec 31, ${new Date().getFullYear()}`

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--ink)', marginBottom: '0.25rem' }}>My Leaves</h1>
          <p style={{ fontSize: '0.8125rem', color: 'var(--muted)' }}>
            18 days/year · Credits accumulate monthly · Expires {yearEnd}
          </p>
        </div>
        <button className="tb-btn tb-btn-primary" onClick={() => { setShowForm(s => !s); setError(''); setSuccess('') }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Apply Leave
        </button>
      </div>

      {/* Balance cards */}
      {loading ? (
        <div style={{ color: 'var(--muted)', marginBottom: '1.5rem' }}>Loading balance…</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
          {/* Sick */}
          <div className="tb-card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
              <div>
                <p style={{ fontSize: '0.6875rem', fontWeight: '700', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Sick Leave</p>
                <p style={{ fontSize: '1.625rem', fontWeight: '700', color: 'var(--emerald)', lineHeight: 1.1 }}>
                  {sickAvail.toFixed(1)}
                  <span style={{ fontSize: '0.875rem', color: 'var(--muted)', fontWeight: '500' }}> / {limits.sick} days</span>
                </p>
              </div>
              <span style={{ fontSize: '1.5rem' }}>🤒</span>
            </div>
            <BalanceBar used={Number(balance?.sick_used ?? 0)} total={limits.sick} color="var(--emerald)" />
            <p style={{ fontSize: '0.6875rem', color: 'var(--muted)', marginTop: '6px' }}>
              {Number(balance?.sick_used ?? 0).toFixed(1)} used · Apply same day
            </p>
          </div>

          {/* Privilege */}
          <div className="tb-card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
              <div>
                <p style={{ fontSize: '0.6875rem', fontWeight: '700', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Privilege Leave</p>
                <p style={{ fontSize: '1.625rem', fontWeight: '700', color: 'var(--accent)', lineHeight: 1.1 }}>
                  {privAvail.toFixed(1)}
                  <span style={{ fontSize: '0.875rem', color: 'var(--muted)', fontWeight: '500' }}> / {limits.privilege} days</span>
                </p>
              </div>
              <span style={{ fontSize: '1.5rem' }}>🏖️</span>
            </div>
            <BalanceBar used={Number(balance?.privilege_used ?? 0)} total={limits.privilege} color="var(--accent)" />
            <p style={{ fontSize: '0.6875rem', color: 'var(--muted)', marginTop: '6px' }}>
              {Number(balance?.privilege_used ?? 0).toFixed(1)} used · 3 days advance notice required
            </p>
          </div>
        </div>
      )}

      {/* Info banner if balance is zero */}
      {!loading && balance && sickAvail === 0 && privAvail === 0 && (
        <div className="tb-card" style={{ padding: '0.875rem 1rem', marginBottom: '1.25rem', background: 'rgba(245,158,11,0.06)', borderColor: 'rgba(245,158,11,0.2)' }}>
          <p style={{ fontSize: '0.8125rem', color: 'var(--amber)' }}>
            💡 Leave credits accumulate on the 1st of each month (0.5 sick + 1.0 privilege). Check back next month!
          </p>
        </div>
      )}

      {/* Apply form */}
      {showForm && (
        <div className="tb-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--ink)', marginBottom: '1rem' }}>Apply for Leave</h2>
          <form onSubmit={handleApply} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            <div>
              <label style={lbl}>Leave Type *</label>
              <select className="tb-input" value={form.leave_type} onChange={e => setForm(p => ({ ...p, leave_type: e.target.value }))}>
                <option value="sick">🤒 Sick Leave (apply same day)</option>
                <option value="privilege">🏖️ Privilege Leave (3 days advance)</option>
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={lbl}>From *</label>
                <input type="date" className="tb-input" required min={today}
                  value={form.start_date}
                  onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))} />
              </div>
              <div>
                <label style={lbl}>To *</label>
                <input type="date" className="tb-input" required min={form.start_date || today}
                  value={form.end_date}
                  onChange={e => setForm(p => ({ ...p, end_date: e.target.value }))} />
              </div>
            </div>
            {form.start_date && form.end_date && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', background: 'rgba(59,130,246,0.06)', borderRadius: '0.5rem', border: '1px solid rgba(59,130,246,0.15)' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <p style={{ fontSize: '0.8125rem', color: 'var(--accent)' }}>
                  {workingDays > 0 ? `${workingDays} working day${workingDays > 1 ? 's' : ''} will be deducted upon approval` : 'No working days in selected range'}
                </p>
              </div>
            )}
            <div>
              <label style={lbl}>Reason</label>
              <textarea className="tb-input" style={{ minHeight: '72px', resize: 'vertical' }}
                placeholder="Optional — briefly describe your reason…"
                value={form.reason}
                onChange={e => setForm(p => ({ ...p, reason: e.target.value }))} />
            </div>
            {error && (
              <div style={{ padding: '0.625rem 0.875rem', background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.25)', borderRadius: '0.5rem', fontSize: '0.8125rem', color: 'var(--rose)' }}>
                {error}
              </div>
            )}
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button type="button" className="tb-btn" onClick={() => { setShowForm(false); setError('') }}>Cancel</button>
              <button type="submit" className="tb-btn tb-btn-primary" disabled={applying || workingDays === 0}>
                {applying ? 'Submitting…' : `Submit Request${workingDays > 0 ? ` (${workingDays}d)` : ''}`}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Success toast */}
      {success && (
        <div style={{ padding: '0.75rem 1rem', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: '0.5rem', fontSize: '0.875rem', color: 'var(--emerald)', marginBottom: '1rem' }}>
          ✅ {success}
        </div>
      )}

      {/* Leave history */}
      <div>
        <h2 style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--ink)', marginBottom: '0.875rem' }}>My Leave Requests</h2>
        {loading ? (
          <div style={{ color: 'var(--muted)', padding: '1.5rem 0' }}>Loading…</div>
        ) : requests.length === 0 ? (
          <div className="tb-card" style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--muted)' }}>
            No leave requests yet. Click <strong>Apply Leave</strong> to get started.
          </div>
        ) : (
          <div className="tb-card" style={{ overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Type','Dates','Days','Reason','Status',''].map(h => (
                    <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.6875rem', fontWeight: '600', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {requests.map(r => {
                  const s = STATUS_STYLES[r.status]
                  return (
                    <tr key={r.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '0.875rem 1rem' }}>
                        <span className="tb-chip" style={{ background: r.leave_type === 'sick' ? 'rgba(16,185,129,0.1)' : 'rgba(59,130,246,0.1)', color: r.leave_type === 'sick' ? 'var(--emerald)' : 'var(--accent)' }}>
                          {r.leave_type === 'sick' ? '🤒 Sick' : '🏖️ Privilege'}
                        </span>
                      </td>
                      <td style={{ padding: '0.875rem 1rem', fontSize: '0.875rem', color: 'var(--ink)' }}>
                        {fmtDate(r.start_date)}
                        {r.start_date !== r.end_date && <> – {fmtDate(r.end_date)}</>}
                      </td>
                      <td style={{ padding: '0.875rem 1rem', fontSize: '0.875rem', fontWeight: '600', color: 'var(--ink)' }}>
                        {Number(r.days).toFixed(1)}d
                      </td>
                      <td style={{ padding: '0.875rem 1rem', fontSize: '0.8125rem', color: 'var(--muted)', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {r.reason || <span style={{ opacity: 0.4 }}>—</span>}
                      </td>
                      <td style={{ padding: '0.875rem 1rem' }}>
                        <span className="tb-chip" style={{ background: s.bg, color: s.color }}>{s.label}</span>
                        {r.admin_note && (
                          <p style={{ fontSize: '0.6875rem', color: 'var(--muted)', marginTop: '3px' }}>{r.admin_note}</p>
                        )}
                      </td>
                      <td style={{ padding: '0.875rem 1rem' }}>
                        {r.status === 'pending' && (
                          <button className="tb-btn" style={{ padding: '0.25rem 0.625rem', fontSize: '0.75rem', color: 'var(--rose)', borderColor: 'rgba(244,63,94,0.25)' }}
                            onClick={() => handleCancel(r.id)}>
                            Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

const lbl: React.CSSProperties = {
  display: 'block', fontSize: '0.8125rem', color: 'var(--muted)', marginBottom: '0.375rem', fontWeight: '500',
}
