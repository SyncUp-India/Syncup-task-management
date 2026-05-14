'use client'
import { useState } from 'react'

interface Props {
  task: any
  newStatus: string
  onConfirm: (patch: Record<string, any>) => void
  onCancel: () => void
}

function fmt(ts: string | null) {
  if (!ts) return '—'
  return new Date(ts).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true,
    timeZone: 'Asia/Kolkata',
  })
}

function hoursAgo(ts: string) {
  return ((Date.now() - new Date(ts).getTime()) / 3600000).toFixed(1)
}

export default function StatusChangeModal({ task, newStatus, onConfirm, onCancel }: Props) {
  const now              = new Date()
  const isFirstStart     = newStatus === 'inprogress' && !task.in_progress_at
  const isDelayed        = task.expected_done_at && new Date(task.expected_done_at) < now &&
                           (newStatus === 'inprogress' || newStatus === 'review')
  const needsEstimate    = isFirstStart
  const needsDelayReason = isDelayed && !isFirstStart

  const [hours,  setHours]  = useState('')
  const [reason, setReason] = useState('')
  const [error,  setError]  = useState('')

  function handleSubmit() {
    const patch: Record<string, any> = { status: newStatus }

    if (needsEstimate) {
      const h = parseFloat(hours)
      if (!hours || isNaN(h) || h <= 0) { setError('Enter a valid number of hours'); return }
      patch.in_progress_at      = now.toISOString()
      patch.expected_hours_self = h
      patch.expected_done_at    = new Date(now.getTime() + h * 3600000).toISOString()
    }

    if (needsDelayReason) {
      if (!reason.trim()) { setError('Please provide a reason for the delay'); return }
      patch.delay_reason = reason.trim()
    }

    onConfirm(patch)
  }

  const overdueSince = task.expected_done_at && new Date(task.expected_done_at) < now
    ? hoursAgo(task.expected_done_at)
    : null

  return (
    <div className="tb-modal-bg" onClick={e => { if (e.target === e.currentTarget) onCancel() }}>
      <div className="tb-modal" style={{ width: '100%', maxWidth: '440px', padding: '1.75rem' }}>

        {/* Title */}
        {needsEstimate && (
          <div style={{ marginBottom: '1.25rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--ink)', marginBottom: '0.25rem' }}>
              🚀 Starting Task
            </h2>
            <p style={{ fontSize: '0.8125rem', color: 'var(--muted)' }}>
              "{task.title}"
            </p>
          </div>
        )}
        {needsDelayReason && (
          <div style={{ marginBottom: '1.25rem', padding: '0.75rem 1rem', background: 'rgba(244,63,94,0.07)', border: '1px solid rgba(244,63,94,0.25)', borderRadius: '0.625rem' }}>
            <p style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--rose)', marginBottom: '0.25rem' }}>
              ⚠️ Task is overdue by {overdueSince}h
            </p>
            <p style={{ fontSize: '0.8125rem', color: 'var(--muted)' }}>
              Expected by: {fmt(task.expected_done_at)} · Moving to <strong>{newStatus === 'inprogress' ? 'In Progress' : 'In Review'}</strong>
            </p>
          </div>
        )}
        {!needsEstimate && !needsDelayReason && (
          <div style={{ marginBottom: '1.25rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--ink)', marginBottom: '0.25rem' }}>
              Move to {newStatus === 'inprogress' ? 'In Progress' : 'In Review'}
            </h2>
            <p style={{ fontSize: '0.8125rem', color: 'var(--muted)' }}>"{task.title}"</p>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>

          {/* Estimate input */}
          {needsEstimate && (
            <>
              <div>
                <label style={lbl}>How long do you think this will take? <span style={{ color: 'var(--rose)' }}>*</span></label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    className="tb-input"
                    type="number"
                    min="0.5"
                    step="0.5"
                    placeholder="e.g. 4"
                    value={hours}
                    onChange={e => { setHours(e.target.value); setError('') }}
                    autoFocus
                    style={{ flex: 1 }}
                  />
                  <span style={{ fontSize: '0.875rem', color: 'var(--muted)', whiteSpace: 'nowrap' }}>hours</span>
                </div>
                {hours && !isNaN(parseFloat(hours)) && parseFloat(hours) > 0 && (
                  <p style={{ fontSize: '0.75rem', color: 'var(--sky)', marginTop: '4px' }}>
                    Expected done by: {fmt(new Date(Date.now() + parseFloat(hours) * 3600000).toISOString())}
                  </p>
                )}
              </div>
              {task.est_hours > 0 && (
                <div style={{ padding: '0.625rem 0.875rem', background: 'rgba(59,130,246,0.06)', borderRadius: '0.5rem', fontSize: '0.8125rem', color: 'var(--muted)' }}>
                  📋 Task was originally estimated at <strong style={{ color: 'var(--ink)' }}>{task.est_hours}h</strong> during creation.
                  You can set your own timeline above.
                </div>
              )}
            </>
          )}

          {/* Delay reason */}
          {needsDelayReason && (
            <div>
              <label style={lbl}>Reason for delay <span style={{ color: 'var(--rose)' }}>*</span></label>
              <textarea
                className="tb-input"
                style={{ minHeight: '90px', resize: 'vertical' }}
                placeholder="e.g. Blocked by dependency, scope changed, found additional complexity…"
                value={reason}
                onChange={e => { setReason(e.target.value); setError('') }}
                autoFocus
              />
            </div>
          )}

          {error && (
            <p style={{ fontSize: '0.8125rem', color: 'var(--rose)' }}>{error}</p>
          )}

          <div style={{ display: 'flex', gap: '0.625rem' }}>
            <button className="tb-btn tb-btn-primary" onClick={handleSubmit} style={{ flex: 1, justifyContent: 'center' }}>
              {needsEstimate ? 'Start Task' : needsDelayReason ? 'Submit & Move' : 'Confirm'}
            </button>
            <button className="tb-btn" onClick={onCancel} style={{ flex: 1, justifyContent: 'center' }}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

const lbl: React.CSSProperties = {
  display: 'block', fontSize: '0.8125rem', color: 'var(--muted)', marginBottom: '0.375rem', fontWeight: '500',
}
