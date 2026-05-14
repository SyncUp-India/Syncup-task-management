'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'
import { DEPT_META } from '@/lib/departments'

const YEAR = new Date().getFullYear()

const lbl: React.CSSProperties = {
  display: 'block', fontSize: '0.8125rem', color: 'var(--muted)', marginBottom: '0.375rem', fontWeight: '500',
}

export default function LeaveBalancesPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  const [balances,  setBalances]  = useState<any[]>([])
  const [users,     setUsers]     = useState<any[]>([])
  const [loading,   setLoading]   = useState(true)

  // Adjustment modal
  const [adjTarget, setAdjTarget] = useState<any>(null) // { user, balance }
  const [sickAdj,   setSickAdj]   = useState('')
  const [privAdj,   setPrivAdj]   = useState('')
  const [saving,    setSaving]    = useState(false)
  const [adjError,  setAdjError]  = useState('')

  useEffect(() => {
    if (!authLoading && user?.role !== 'admin') router.push('/')
  }, [user, authLoading, router])

  const loadData = useCallback(async () => {
    const [uData, bData] = await Promise.all([
      fetch('/api/admin/users').then(r => r.json()),
      fetch(`/api/leaves/balance?year=${YEAR}&all=true`).then(r => r.json()),
    ])
    setUsers(uData.users || [])
    setBalances(bData.balances || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    if (user?.role === 'admin') loadData()
  }, [user, loadData])

  if (authLoading || user?.role !== 'admin') return null

  const balMap     = new Map(balances.map((b: any) => [b.user_id, b]))
  const activeUsers = users.filter((u: any) => u.active)

  function openAdj(u: any, b: any) {
    setAdjTarget({ user: u, balance: b })
    setSickAdj(''); setPrivAdj(''); setAdjError('')
  }

  async function submitAdj() {
    if (!adjTarget) return
    const sick = parseFloat(sickAdj)
    const priv = parseFloat(privAdj)
    if (sickAdj && isNaN(sick)) { setAdjError('Sick adjustment must be a number'); return }
    if (privAdj && isNaN(priv)) { setAdjError('Privilege adjustment must be a number'); return }
    if (!sickAdj && !privAdj)   { setAdjError('Enter at least one adjustment'); return }

    setSaving(true); setAdjError('')
    const body: any = { user_id: adjTarget.user.id, year: YEAR }
    if (sickAdj) body.sick_adjustment = sick
    if (privAdj) body.privilege_adjustment = priv

    const res = await fetch('/api/leaves/balance', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (!res.ok) { setAdjError(data.error || 'Failed'); setSaving(false); return }
    setSaving(false)
    setAdjTarget(null)
    loadData()
  }

  return (
    <div>
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--ink)', marginBottom: '0.25rem' }}>Leave Balances</h1>
        <p style={{ fontSize: '0.8125rem', color: 'var(--muted)' }}>View and adjust leave for all active members — {YEAR}</p>
      </div>

      {/* Adjustment modal */}
      {adjTarget && (
        <div className="tb-modal-bg" onClick={e => { if (e.target === e.currentTarget) setAdjTarget(null) }}>
          <div className="tb-modal" style={{ width: '100%', maxWidth: '420px', padding: '1.75rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--ink)', marginBottom: '0.25rem' }}>
              Adjust Leave — {adjTarget.user.name}
            </h2>
            <p style={{ fontSize: '0.8125rem', color: 'var(--muted)', marginBottom: '1.25rem' }}>
              Use positive numbers to add days, negative to deduct. Leave blank to skip that type.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              <div>
                <label style={lbl}>🤒 Sick Leave Adjustment</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="tb-btn" style={{ padding: '0.4rem 0.75rem' }} onClick={() => setSickAdj(v => v === '' ? '-1' : String(parseFloat(v || '0') - 1))}>−</button>
                  <input
                    className="tb-input"
                    type="number"
                    step="0.5"
                    placeholder="e.g. +2 or -1"
                    value={sickAdj}
                    onChange={e => setSickAdj(e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <button className="tb-btn" style={{ padding: '0.4rem 0.75rem' }} onClick={() => setSickAdj(v => v === '' ? '1' : String(parseFloat(v || '0') + 1))}>+</button>
                </div>
                {adjTarget.balance && (
                  <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '4px' }}>
                    Current: {(Number(adjTarget.balance.sick_balance) - Number(adjTarget.balance.sick_used)).toFixed(1)} remaining of {Number(adjTarget.balance.sick_balance).toFixed(1)}
                  </p>
                )}
              </div>
              <div>
                <label style={lbl}>🌴 Privilege Leave Adjustment</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="tb-btn" style={{ padding: '0.4rem 0.75rem' }} onClick={() => setPrivAdj(v => v === '' ? '-1' : String(parseFloat(v || '0') - 1))}>−</button>
                  <input
                    className="tb-input"
                    type="number"
                    step="0.5"
                    placeholder="e.g. +2 or -1"
                    value={privAdj}
                    onChange={e => setPrivAdj(e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <button className="tb-btn" style={{ padding: '0.4rem 0.75rem' }} onClick={() => setPrivAdj(v => v === '' ? '1' : String(parseFloat(v || '0') + 1))}>+</button>
                </div>
                {adjTarget.balance && (
                  <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '4px' }}>
                    Current: {(Number(adjTarget.balance.privilege_balance) - Number(adjTarget.balance.privilege_used)).toFixed(1)} remaining of {Number(adjTarget.balance.privilege_balance).toFixed(1)}
                  </p>
                )}
              </div>
              {adjError && (
                <div style={{ padding: '0.5rem 0.75rem', background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.3)', borderRadius: '0.5rem', fontSize: '0.8125rem', color: 'var(--rose)' }}>
                  {adjError}
                </div>
              )}
              <div style={{ display: 'flex', gap: '0.625rem', marginTop: '0.25rem' }}>
                <button className="tb-btn tb-btn-primary" onClick={submitAdj} disabled={saving} style={{ flex: 1, justifyContent: 'center' }}>
                  {saving ? 'Saving…' : 'Apply Adjustment'}
                </button>
                <button className="tb-btn" onClick={() => setAdjTarget(null)} style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ color: 'var(--muted)', padding: '2rem 0' }}>Loading…</div>
      ) : (
        <div className="tb-card" style={{ overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Employee', 'Department', 'Sick (Used/Total)', 'Privilege (Used/Total)', 'Sick Left', 'Privilege Left', ''].map(h => (
                  <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.6875rem', fontWeight: '600', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {activeUsers.map((u: any) => {
                const b        = balMap.get(u.id)
                const dm       = u.department ? DEPT_META[u.department] : null
                const sickBal  = b ? Number(b.sick_balance)      : 0
                const sickUsed = b ? Number(b.sick_used)         : 0
                const privBal  = b ? Number(b.privilege_balance) : 0
                const privUsed = b ? Number(b.privilege_used)    : 0
                const sickLeft = sickBal  - sickUsed
                const privLeft = privBal  - privUsed
                const sickPct  = sickBal > 0 ? Math.min(100, (sickLeft / sickBal) * 100) : 0
                const privPct  = privBal > 0 ? Math.min(100, (privLeft / privBal) * 100) : 0

                return (
                  <tr key={u.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '0.875rem 1rem', fontSize: '0.875rem', fontWeight: '600', color: 'var(--ink)' }}>{u.name}</td>
                    <td style={{ padding: '0.875rem 1rem' }}>
                      {dm ? (
                        <span className="tb-chip" style={{ background: dm.bg, color: dm.color }}>{dm.label}</span>
                      ) : (
                        <span style={{ color: 'var(--muted)', fontSize: '0.8125rem' }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: '0.875rem 1rem', fontSize: '0.8125rem', color: 'var(--ink)' }}>
                      {b ? `${sickUsed.toFixed(1)} / ${sickBal.toFixed(1)}` : '—'}
                    </td>
                    <td style={{ padding: '0.875rem 1rem', fontSize: '0.8125rem', color: 'var(--ink)' }}>
                      {b ? `${privUsed.toFixed(1)} / ${privBal.toFixed(1)}` : '—'}
                    </td>
                    <td style={{ padding: '0.875rem 1rem' }}>
                      {b ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{ flex: 1, height: '6px', background: 'var(--border)', borderRadius: '999px', overflow: 'hidden', minWidth: '60px' }}>
                            <div style={{ height: '100%', width: `${sickPct}%`, background: sickLeft <= 1 ? 'var(--rose)' : 'var(--emerald)', borderRadius: '999px' }} />
                          </div>
                          <span style={{ fontSize: '0.8125rem', fontWeight: '600', color: sickLeft <= 1 ? 'var(--rose)' : 'var(--emerald)', minWidth: '32px' }}>
                            {sickLeft.toFixed(1)}d
                          </span>
                        </div>
                      ) : <span style={{ color: 'var(--muted)', fontSize: '0.8125rem' }}>No record</span>}
                    </td>
                    <td style={{ padding: '0.875rem 1rem' }}>
                      {b ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{ flex: 1, height: '6px', background: 'var(--border)', borderRadius: '999px', overflow: 'hidden', minWidth: '60px' }}>
                            <div style={{ height: '100%', width: `${privPct}%`, background: privLeft <= 2 ? 'var(--amber)' : 'var(--accent)', borderRadius: '999px' }} />
                          </div>
                          <span style={{ fontSize: '0.8125rem', fontWeight: '600', color: privLeft <= 2 ? 'var(--amber)' : 'var(--accent)', minWidth: '32px' }}>
                            {privLeft.toFixed(1)}d
                          </span>
                        </div>
                      ) : <span style={{ color: 'var(--muted)', fontSize: '0.8125rem' }}>No record</span>}
                    </td>
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <button
                        className="tb-btn"
                        style={{ fontSize: '0.75rem', padding: '0.25rem 0.625rem' }}
                        onClick={() => openAdj(u, b)}
                      >
                        Adjust
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
