'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'
import { DEPT_META } from '@/lib/departments'

function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  pending:  { bg: 'rgba(245,158,11,0.12)',  color: 'var(--amber)',   label: 'Pending' },
  approved: { bg: 'rgba(16,185,129,0.12)',  color: 'var(--emerald)', label: 'Approved' },
  rejected: { bg: 'rgba(244,63,94,0.1)',    color: 'var(--rose)',    label: 'Rejected' },
}

export default function AdminLeavesPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  const [requests,   setRequests]   = useState<any[]>([])
  const [tab,        setTab]        = useState<'pending' | 'all'>('pending')
  const [loading,    setLoading]    = useState(true)
  const [actionId,   setActionId]   = useState<number | null>(null)
  const [noteModal,  setNoteModal]  = useState<{ id: number; status: 'approved' | 'rejected' } | null>(null)
  const [adminNote,  setAdminNote]  = useState('')
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    if (!authLoading && user?.role !== 'admin') router.push('/')
  }, [user, authLoading, router])

  async function loadRequests() {
    setLoading(true)
    const url = tab === 'pending' ? '/api/leaves?user_id=all&status=pending' : '/api/leaves?user_id=all'
    const res = await fetch(url)
    const data = await res.json()
    setRequests(data.requests || [])
    setLoading(false)
  }

  useEffect(() => { if (user?.role === 'admin') loadRequests() }, [tab, user])

  async function handleAction() {
    if (!noteModal) return
    setProcessing(true)
    await fetch(`/api/leaves/${noteModal.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: noteModal.status, admin_note: adminNote }),
    })
    setNoteModal(null)
    setAdminNote('')
    setProcessing(false)
    loadRequests()
  }

  if (authLoading || user?.role !== 'admin') return null

  const pending = requests.filter(r => r.status === 'pending')

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--ink)', marginBottom: '0.25rem' }}>Leave Requests</h1>
        <p style={{ fontSize: '0.8125rem', color: 'var(--muted)' }}>Review and approve team leave applications</p>
      </div>

      {/* Pending badge */}
      {pending.length > 0 && tab !== 'pending' && (
        <div style={{ marginBottom: '1rem', padding: '0.625rem 1rem', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '0.5rem', fontSize: '0.875rem', color: 'var(--amber)' }}>
          ⚠️ {pending.length} pending request{pending.length > 1 ? 's' : ''} awaiting approval
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1.25rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.625rem', padding: '3px', width: 'fit-content' }}>
        {([['pending', 'Pending'], ['all', 'All Requests']] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            style={{
              padding: '0.4rem 0.875rem', borderRadius: '0.5rem', fontSize: '0.8125rem', fontWeight: '500',
              background: tab === key ? 'var(--bg)' : 'transparent',
              color: tab === key ? 'var(--ink)' : 'var(--muted)',
              border: tab === key ? '1px solid var(--border)' : '1px solid transparent',
              cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '0.375rem',
            }}
          >
            {label}
            {key === 'pending' && pending.length > 0 && (
              <span style={{ background: 'var(--amber)', color: '#fff', fontSize: '0.625rem', fontWeight: '700', padding: '1px 6px', borderRadius: '999px' }}>
                {pending.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ color: 'var(--muted)', padding: '2rem 0' }}>Loading…</div>
      ) : requests.length === 0 ? (
        <div className="tb-card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--muted)' }}>
          {tab === 'pending' ? '🎉 No pending leave requests' : 'No leave requests found'}
        </div>
      ) : (
        <div className="tb-card" style={{ overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Employee','Type','Dates','Days','Reason','Requested','Status','Actions'].map(h => (
                  <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.6875rem', fontWeight: '600', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {requests.map(r => {
                const s = STATUS_STYLES[r.status]
                const dept = r.user?.department
                const dm = dept && DEPT_META[dept]
                return (
                  <tr key={r.id} style={{ borderBottom: '1px solid var(--border)', background: r.status === 'pending' ? 'rgba(245,158,11,0.02)' : undefined }}>
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <p style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--ink)' }}>{r.user?.name ?? '—'}</p>
                      {dm && (
                        <span className="tb-chip" style={{ background: dm.bg, color: dm.color, fontSize: '0.625rem', marginTop: '2px' }}>{dm.label}</span>
                      )}
                    </td>
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <span className="tb-chip" style={{ background: r.leave_type === 'sick' ? 'rgba(16,185,129,0.1)' : 'rgba(59,130,246,0.1)', color: r.leave_type === 'sick' ? 'var(--emerald)' : 'var(--accent)' }}>
                        {r.leave_type === 'sick' ? '🤒 Sick' : '🏖️ Privilege'}
                      </span>
                    </td>
                    <td style={{ padding: '0.875rem 1rem', fontSize: '0.875rem', color: 'var(--ink)', whiteSpace: 'nowrap' }}>
                      {fmtDate(r.start_date)}
                      {r.start_date !== r.end_date && <><br /><span style={{ color: 'var(--muted)' }}>to {fmtDate(r.end_date)}</span></>}
                    </td>
                    <td style={{ padding: '0.875rem 1rem', fontSize: '0.875rem', fontWeight: '600', color: 'var(--ink)' }}>
                      {Number(r.days).toFixed(1)}d
                    </td>
                    <td style={{ padding: '0.875rem 1rem', fontSize: '0.8125rem', color: 'var(--muted)', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.reason || <span style={{ opacity: 0.4 }}>—</span>}
                    </td>
                    <td style={{ padding: '0.875rem 1rem', fontSize: '0.8125rem', color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                      {fmtDate(r.created_at.slice(0, 10))}
                    </td>
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <span className="tb-chip" style={{ background: s.bg, color: s.color }}>{s.label}</span>
                      {r.admin_note && (
                        <p style={{ fontSize: '0.6875rem', color: 'var(--muted)', marginTop: '2px', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.admin_note}>
                          {r.admin_note}
                        </p>
                      )}
                    </td>
                    <td style={{ padding: '0.875rem 1rem' }}>
                      {r.status === 'pending' && (
                        <div style={{ display: 'flex', gap: '0.375rem' }}>
                          <button
                            className="tb-btn"
                            style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem', background: 'rgba(16,185,129,0.08)', color: 'var(--emerald)', borderColor: 'rgba(16,185,129,0.25)' }}
                            onClick={() => { setNoteModal({ id: r.id, status: 'approved' }); setAdminNote('') }}
                          >
                            Approve
                          </button>
                          <button
                            className="tb-btn"
                            style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem', color: 'var(--rose)', borderColor: 'rgba(244,63,94,0.25)' }}
                            onClick={() => { setNoteModal({ id: r.id, status: 'rejected' }); setAdminNote('') }}
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Confirm modal */}
      {noteModal && (
        <div className="tb-modal-bg" onClick={e => { if (e.target === e.currentTarget) setNoteModal(null) }}>
          <div className="tb-modal" style={{ width: '100%', maxWidth: '420px' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
              <h2 style={{ fontSize: '1rem', fontWeight: '600', margin: 0 }}>
                {noteModal.status === 'approved' ? '✅ Approve Leave' : '❌ Reject Leave'}
              </h2>
            </div>
            <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              <div>
                <label style={lbl}>Note for employee (optional)</label>
                <textarea
                  className="tb-input"
                  style={{ minHeight: '80px', resize: 'vertical' }}
                  placeholder={noteModal.status === 'approved' ? 'e.g. Approved. Have a good break!' : 'e.g. Please resubmit after discussing with your manager.'}
                  value={adminNote}
                  onChange={e => setAdminNote(e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button type="button" className="tb-btn" onClick={() => setNoteModal(null)}>Cancel</button>
                <button
                  type="button"
                  className="tb-btn tb-btn-primary"
                  disabled={processing}
                  style={noteModal.status === 'rejected' ? { background: 'var(--rose)', borderColor: 'var(--rose)' } : undefined}
                  onClick={handleAction}
                >
                  {processing ? 'Processing…' : noteModal.status === 'approved' ? 'Approve' : 'Reject'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const lbl: React.CSSProperties = {
  display: 'block', fontSize: '0.8125rem', color: 'var(--muted)', marginBottom: '0.375rem', fontWeight: '500',
}
