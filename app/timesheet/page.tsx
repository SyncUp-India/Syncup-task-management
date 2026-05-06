'use client'

import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { useAuth } from '@/context/AuthContext'
import { DEPT_META } from '@/lib/departments'

/* ─── helpers ──────────────────────────────────────────────── */
function fmtTime(ts: string | null) {
  if (!ts) return '—'
  return new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
}

function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function fmtMonthLabel(ym: string) {
  const [y, m] = ym.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

function calcMs(ci: string | null, co: string | null) {
  if (!ci || !co) return 0
  return new Date(co).getTime() - new Date(ci).getTime()
}

function fmtDuration(ms: number) {
  if (ms <= 0) return '—'
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  return `${h}h ${String(m).padStart(2, '0')}m`
}

function fmtElapsed(ms: number) {
  const s = Math.floor(ms / 1000)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sc = s % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sc).padStart(2, '0')}`
}

function pad(n: number) { return String(n).padStart(2, '0') }

function emptyManual(today: string) {
  return { date: today, check_in: '', check_out: '', is_holiday: false, holiday_reason: '', notes: '', pod: '', eod: '' }
}

/* ─── Attendance Calendar ──────────────────────────────────── */
function AttendanceCalendar({
  viewMonth, entries, holidays, today,
}: {
  viewMonth: string; entries: any[]; holidays: any[]; today: string
}) {
  const [year, month] = viewMonth.split('-').map(Number)
  const firstDay   = new Date(year, month - 1, 1)
  const totalDays  = new Date(year, month, 0).getDate()
  const startOff   = (firstDay.getDay() + 6) % 7 // Mon = 0

  const entryByDate = useMemo(() => new Map(entries.map(e => [e.date, e])), [entries])
  const pubHoliByDate = useMemo(() => {
    const map = new Map<string, any>()
    for (const h of holidays) {
      if (h.date.startsWith(viewMonth) && !map.has(h.date)) map.set(h.date, h)
    }
    return map
  }, [holidays, viewMonth])

  const cells: (number | null)[] = Array(startOff).fill(null)
  for (let d = 1; d <= totalDays; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)

  const LEGEND = [
    { color: 'rgba(16,185,129,0.25)', label: 'Present' },
    { color: 'rgba(245,158,11,0.18)', label: 'Absent' },
    { color: 'rgba(14,165,233,0.2)',  label: 'Leave' },
    { color: 'rgba(139,92,246,0.18)', label: 'Public Holiday' },
  ]

  return (
    <div className="tb-card" style={{ marginBottom: '1.25rem', padding: '1.25rem 1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.875rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <p style={{ fontSize: '0.875rem', fontWeight: '700', color: 'var(--ink)' }}>Attendance Calendar</p>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {LEGEND.map(({ color, label }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.625rem', color: 'var(--muted)' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '3px', background: color }} />
              {label}
            </div>
          ))}
        </div>
      </div>

      {/* Day headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', marginBottom: '4px' }}>
        {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: '0.625rem', color: 'var(--muted)', fontWeight: '600', padding: '3px 0' }}>{d}</div>
        ))}
      </div>

      {/* Day cells */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
        {cells.map((d, i) => {
          if (!d) return <div key={`e-${i}`} />
          const dateStr  = `${viewMonth}-${pad(d)}`
          const isToday  = dateStr === today
          const isFuture = dateStr > today
          const dow      = new Date(year, month - 1, d).getDay()
          const isWknd   = dow === 0 || dow === 6
          const entry    = entryByDate.get(dateStr)
          const pub      = pubHoliByDate.get(dateStr)

          let bg = 'transparent', color = 'var(--ink)', border = '1px solid transparent', title = ''

          if (pub)              { bg = 'rgba(139,92,246,0.15)'; color = '#7c3aed'; title = pub.name }
          else if (isWknd)      { bg = 'rgba(15,23,42,0.04)';  color = 'var(--muted)' }
          else if (!isFuture)   {
            if (entry?.is_holiday) { bg = 'rgba(14,165,233,0.15)'; color = 'var(--sky)'; title = entry.holiday_reason || 'Leave' }
            else if (entry?.check_in) { bg = 'rgba(16,185,129,0.15)'; color = 'var(--emerald)' }
            else                   { bg = 'rgba(245,158,11,0.12)'; color = 'var(--amber)' }
          }

          if (isToday) border = '2px solid var(--accent)'

          return (
            <div
              key={dateStr}
              title={title || undefined}
              style={{
                borderRadius: '6px', background: bg, border, color,
                fontWeight: isToday ? '700' : '500',
                fontSize: '0.8125rem',
                aspectRatio: '1',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: title ? 'help' : undefined,
              }}
            >
              {d}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ─── Main component ───────────────────────────────────────── */
export default function TimesheetPage() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'

  const todayStr   = new Date().toISOString().slice(0, 10)
  const thisMonth  = todayStr.slice(0, 7)

  const [todayEntry,   setTodayEntry]   = useState<any>(null)
  const [entries,      setEntries]      = useState<any[]>([])
  const [holidays,     setHolidays]     = useState<any[]>([])
  const [allUsers,     setAllUsers]     = useState<any[]>([])
  const [selectedUser, setSelectedUser] = useState('mine')
  const [viewMonth,    setViewMonth]    = useState(thisMonth)
  const [loading,      setLoading]      = useState(true)
  const [elapsed,      setElapsed]      = useState(0)
  const [checking,     setChecking]     = useState<'in' | 'out' | null>(null)

  // POD / EOD modals
  const [showPOD, setShowPOD] = useState(false)
  const [podText, setPodText] = useState('')
  const [showEOD, setShowEOD] = useState(false)
  const [eodText, setEodText] = useState('')

  // Manual entry modal
  const [showManual,   setShowManual]   = useState(false)
  const [manual,       setManual]       = useState(() => emptyManual(todayStr))
  const [savingManual, setSavingManual] = useState(false)

  const timerRef = useRef<ReturnType<typeof setInterval>>()

  /* ── data fetches ── */
  const loadToday = useCallback(async () => {
    const res = await fetch('/api/timesheet/today')
    const data = await res.json()
    setTodayEntry(data.entry)
  }, [])

  const loadEntries = useCallback(async () => {
    setLoading(true)
    let url = '/api/timesheet'
    if (isAdmin && selectedUser !== 'mine') url += `?user_id=${selectedUser}`
    const res = await fetch(url)
    const data = await res.json()
    setEntries(data.entries ?? [])
    setLoading(false)
  }, [isAdmin, selectedUser])

  useEffect(() => {
    loadToday()
    fetch('/api/holidays?year=2026').then(r => r.json()).then(d => setHolidays(d.holidays || []))
    if (isAdmin) {
      fetch('/api/admin/users').then(r => r.json()).then(d => setAllUsers(d.users ?? []))
    }
  }, [isAdmin, loadToday])

  useEffect(() => { loadEntries() }, [loadEntries])

  /* ── live timer ── */
  useEffect(() => {
    clearInterval(timerRef.current)
    if (todayEntry?.check_in && !todayEntry.check_out) {
      const start = new Date(todayEntry.check_in).getTime()
      const tick = () => setElapsed(Date.now() - start)
      tick(); timerRef.current = setInterval(tick, 1000)
    } else if (todayEntry?.check_in && todayEntry.check_out) {
      setElapsed(calcMs(todayEntry.check_in, todayEntry.check_out))
    } else {
      setElapsed(0)
    }
    return () => clearInterval(timerRef.current)
  }, [todayEntry])

  /* ── check in (with POD) ── */
  async function submitCheckIn() {
    setChecking('in')
    const res = await fetch('/api/timesheet/checkin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pod: podText.trim() || null }),
    })
    const data = await res.json()
    if (!res.ok) { alert(data.error || 'Check-in failed') }
    else { setTodayEntry(data.entry); loadEntries() }
    setShowPOD(false); setPodText(''); setChecking(null)
  }

  /* ── check out (with EOD) ── */
  async function submitCheckOut() {
    setChecking('out')
    const res = await fetch('/api/timesheet/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eod: eodText.trim() || null }),
    })
    const data = await res.json()
    if (!res.ok) { alert(data.error || 'Check-out failed') }
    else { setTodayEntry(data.entry); loadEntries() }
    setShowEOD(false); setEodText(''); setChecking(null)
  }

  /* ── manual entry save ── */
  async function saveManual(e: React.FormEvent) {
    e.preventDefault()
    if (!manual.date) { alert('Date is required'); return }
    if (manual.is_holiday && !manual.holiday_reason.trim()) { alert('Please provide a reason for holiday/leave'); return }
    setSavingManual(true)
    const body = {
      date:           manual.date,
      check_in:       manual.check_in  ? `${manual.date}T${manual.check_in}:00`  : null,
      check_out:      manual.check_out ? `${manual.date}T${manual.check_out}:00` : null,
      is_holiday:     manual.is_holiday,
      holiday_reason: manual.holiday_reason || null,
      notes:          manual.notes || null,
      pod:            manual.pod || null,
      eod:            manual.eod || null,
    }
    const res = await fetch('/api/timesheet', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const data = await res.json()
    setSavingManual(false)
    if (!res.ok) { alert(data.error || 'Failed to save'); return }
    setShowManual(false)
    setManual(emptyManual(todayStr))
    loadEntries(); loadToday()
  }

  /* ── month navigation ── */
  const twoMonthsAgoYM = (() => {
    const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - 2)
    return d.toISOString().slice(0, 7)
  })()

  function prevMonth() {
    const [y, m] = viewMonth.split('-').map(Number)
    const prev = m === 1 ? `${y - 1}-12` : `${y}-${pad(m - 1)}`
    if (prev >= twoMonthsAgoYM) setViewMonth(prev)
  }

  function nextMonth() {
    const [y, m] = viewMonth.split('-').map(Number)
    const next = m === 12 ? `${y + 1}-01` : `${y}-${pad(m + 1)}`
    if (next <= thisMonth) setViewMonth(next)
  }

  /* ── computed stats ── */
  const viewEntries = entries.filter(e => e.date.startsWith(viewMonth))

  const statsEntries = useMemo(() => {
    return isAdmin && selectedUser === 'all'
      ? entries.filter(e => e.date.startsWith(thisMonth))
      : entries.filter(e => e.date.startsWith(thisMonth) && (selectedUser === 'mine' || !isAdmin || e.user?.id === selectedUser))
  }, [entries, isAdmin, selectedUser, thisMonth])

  const workedDays = statsEntries.filter(e => !e.is_holiday && e.check_in).length
  const leaveDays  = statsEntries.filter(e => e.is_holiday).length
  const totalMs    = statsEntries.reduce((s, e) => s + calcMs(e.check_in, e.check_out), 0)
  const totalHrs   = (totalMs / 3600000).toFixed(1)
  const avgHrs     = workedDays > 0 ? (totalMs / workedDays / 3600000).toFixed(1) : '0.0'

  const workingDaysThisMonth = useMemo(() => {
    const [y, m] = thisMonth.split('-').map(Number)
    const today  = new Date()
    const endDay = today.getMonth() === m - 1 && today.getFullYear() === y
      ? today.getDate()
      : new Date(y, m, 0).getDate()
    let count = 0
    for (let d = 1; d <= endDay; d++) {
      const dow = new Date(y, m - 1, d).getDay()
      if (dow !== 0 && dow !== 6) count++
    }
    return count
  }, [thisMonth])

  const completedDays = statsEntries.filter(e => e.check_in && e.check_out && !e.is_holiday).length
  const attendanceRate  = workingDaysThisMonth > 0 ? Math.round((workedDays / workingDaysThisMonth) * 100) : 0
  const completionRate  = workedDays > 0 ? Math.round((completedDays / workedDays) * 100) : 0

  const showCheckinAlert = !todayEntry?.check_in && new Date().getHours() >= 9
  const isViewingOwn = selectedUser === 'mine' || !isAdmin

  return (
    <div>
      {/* Page header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--ink)', marginBottom: '0.25rem' }}>Time Tracker</h1>
          <p style={{ fontSize: '0.8125rem', color: 'var(--muted)' }}>Track daily check-in, check-out and attendance</p>
        </div>
        {isAdmin && (
          <select className="tb-input" style={{ maxWidth: '200px' }} value={selectedUser} onChange={e => setSelectedUser(e.target.value)}>
            <option value="mine">My Timesheet</option>
            <option value="all">All Users</option>
            {allUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        )}
      </div>

      {/* ── Timer card ── */}
      {isViewingOwn && (
        <div className="tb-card" style={{ marginBottom: '1.25rem', overflow: 'hidden' }}>
          <div style={{
            height: '4px',
            background: todayEntry?.check_out ? 'linear-gradient(90deg,var(--emerald),#34d399)'
              : todayEntry?.check_in ? 'linear-gradient(90deg,var(--accent),var(--sky))'
              : showCheckinAlert ? 'linear-gradient(90deg,var(--amber),#fbbf24)'
              : 'linear-gradient(90deg,var(--border),var(--border))',
          }} />
          <div style={{ padding: '1.5rem 1.75rem' }}>

            {/* Not checked in */}
            {!todayEntry?.check_in && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: showCheckinAlert ? 'rgba(245,158,11,0.12)' : 'rgba(15,23,42,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={showCheckinAlert ? 'var(--amber)' : 'var(--muted)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                    </svg>
                  </div>
                  <div>
                    {showCheckinAlert
                      ? <p style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--amber)', marginBottom: '2px' }}>You haven't checked in yet!</p>
                      : <p style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--ink)', marginBottom: '2px' }}>Not checked in</p>}
                    <p style={{ fontSize: '0.8125rem', color: 'var(--muted)' }}>
                      {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                    </p>
                  </div>
                </div>
                <button className="tb-btn tb-btn-primary" onClick={() => setShowPOD(true)} style={{ padding: '0.625rem 1.5rem', fontSize: '0.9375rem' }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '4px' }}>
                    <polyline points="5 12 12 5 19 12"/><line x1="12" y1="5" x2="12" y2="19"/>
                  </svg>
                  Check In
                </button>
              </div>
            )}

            {/* Checked in, running */}
            {todayEntry?.check_in && !todayEntry.check_out && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1.5rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--emerald)', animation: 'pulse-live 1.5s ease-in-out infinite' }} />
                    <span style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--emerald)' }}>Live · Checked in at {fmtTime(todayEntry.check_in)}</span>
                  </div>
                  <p style={{ fontSize: '3rem', fontWeight: '700', color: 'var(--ink)', letterSpacing: '-1px', lineHeight: 1, marginBottom: '0.25rem', fontVariantNumeric: 'tabular-nums' }}>
                    {fmtElapsed(elapsed)}
                  </p>
                  {todayEntry.pod && (
                    <p style={{ fontSize: '0.8125rem', color: 'var(--muted)', marginTop: '0.375rem' }}>
                      📋 <strong>POD:</strong> {todayEntry.pod}
                    </p>
                  )}
                </div>
                <button className="tb-btn" onClick={() => setShowEOD(true)} style={{ padding: '0.625rem 1.5rem', fontSize: '0.9375rem', borderColor: 'rgba(244,63,94,0.3)', color: 'var(--rose)' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(244,63,94,0.06)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '' }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '4px' }}>
                    <polyline points="19 12 12 19 5 12"/><line x1="12" y1="5" x2="12" y2="19"/>
                  </svg>
                  Check Out
                </button>
              </div>
            )}

            {/* Done */}
            {todayEntry?.check_in && todayEntry.check_out && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'rgba(16,185,129,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--emerald)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--emerald)', marginBottom: '3px' }}>Day completed</p>
                  <p style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>
                    {fmtTime(todayEntry.check_in)} – {fmtTime(todayEntry.check_out)}
                    &nbsp;·&nbsp;
                    <strong style={{ color: 'var(--ink)' }}>{fmtDuration(calcMs(todayEntry.check_in, todayEntry.check_out))}</strong>
                  </p>
                  {todayEntry.pod && <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '2px' }}>📋 {todayEntry.pod}</p>}
                  {todayEntry.eod && <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '1px' }}>📝 {todayEntry.eod}</p>}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Attendance Calendar ── */}
      <AttendanceCalendar viewMonth={viewMonth} entries={viewEntries} holidays={holidays} today={todayStr} />

      {/* ── Stats ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.875rem', marginBottom: '1rem' }}>
        {[
          { label: 'Days Worked',     value: String(workedDays), color: 'var(--accent)' },
          { label: 'Total Hours',     value: `${totalHrs}h`,     color: 'var(--sky)' },
          { label: 'Avg / Day',       value: `${avgHrs}h`,       color: 'var(--emerald)' },
          { label: 'Leave / Holiday', value: String(leaveDays),  color: leaveDays > 0 ? 'var(--amber)' : 'var(--muted)' },
        ].map(s => (
          <div key={s.label} className="tb-card stat-glow" style={{ padding: '1rem 1.125rem' }}>
            <p style={{ fontSize: '0.6875rem', color: 'var(--muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.375rem' }}>{s.label}</p>
            <p style={{ fontSize: '1.625rem', fontWeight: '700', color: s.color, lineHeight: 1 }}>{s.value}</p>
            <p style={{ fontSize: '0.6875rem', color: 'var(--muted)', marginTop: '0.25rem' }}>this month</p>
          </div>
        ))}
      </div>

      {/* ── Productivity row ── */}
      {(() => {
        const avgN = parseFloat(avgHrs)
        const avgColor = avgN >= 6 && avgN <= 8 ? 'var(--emerald)' : avgN >= 5 ? 'var(--amber)' : 'var(--rose)'
        const avgSub   = avgN >= 6 && avgN <= 8 ? 'on target (6h – 8h)' : avgN > 8 ? `${(avgN - 8).toFixed(1)}h above 8h` : `${(6 - avgN).toFixed(1)}h below 6h target`
        return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.875rem', marginBottom: '1.75rem' }}>
        {[
          { label: 'Attendance Rate', value: `${attendanceRate}%`, sub: `${workedDays} / ${workingDaysThisMonth} working days`, color: attendanceRate >= 80 ? 'var(--emerald)' : attendanceRate >= 60 ? 'var(--amber)' : 'var(--rose)' },
          { label: 'Avg Hours / Day', value: `${avgHrs}h`,         sub: avgSub,                                                 color: avgColor },
          { label: 'Completion Rate', value: `${completionRate}%`, sub: `${completedDays} full days (with checkout)`,           color: completionRate >= 80 ? 'var(--emerald)' : completionRate >= 60 ? 'var(--amber)' : 'var(--rose)' },
        ].map(s => (
          <div key={s.label} className="tb-card" style={{ padding: '1rem 1.125rem' }}>
            <p style={{ fontSize: '0.6875rem', color: 'var(--muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.375rem' }}>{s.label}</p>
            <p style={{ fontSize: '1.5rem', fontWeight: '700', color: s.color, lineHeight: 1, marginBottom: '0.25rem' }}>{s.value}</p>
            <p style={{ fontSize: '0.6875rem', color: 'var(--muted)' }}>{s.sub}</p>
          </div>
        ))}
      </div>
        )
      })()}

      {/* ── Table toolbar ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.875rem', flexWrap: 'wrap', gap: '0.625rem' }}>
        <button className="tb-btn tb-btn-primary" onClick={() => { setManual(emptyManual(todayStr)); setShowManual(true) }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Entry
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button className="tb-btn" style={{ padding: '0.4rem 0.625rem' }} onClick={prevMonth} disabled={viewMonth <= twoMonthsAgoYM}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <span style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--ink)', minWidth: '130px', textAlign: 'center' }}>{fmtMonthLabel(viewMonth)}</span>
          <button className="tb-btn" style={{ padding: '0.4rem 0.625rem' }} onClick={nextMonth} disabled={viewMonth >= thisMonth}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>
      </div>

      {/* ── Entries table ── */}
      <div className="tb-card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--muted)' }}>Loading…</div>
        ) : viewEntries.length === 0 ? (
          <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--muted)' }}>No entries for {fmtMonthLabel(viewMonth)}</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {[
                  ...(isAdmin && selectedUser === 'all' ? ['User'] : []),
                  'Date', 'Check In', 'Check Out', 'Duration', 'Status', 'POD / EOD',
                ].map(h => (
                  <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.6875rem', fontWeight: '600', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {viewEntries.map(e => {
                const ms      = calcMs(e.check_in, e.check_out)
                const active  = e.check_in && !e.check_out
                const holiday = e.is_holiday

                return (
                  <tr key={e.id} style={{ borderBottom: '1px solid var(--border)', background: holiday ? 'rgba(245,158,11,0.02)' : undefined }}>
                    {isAdmin && selectedUser === 'all' && (
                      <td style={{ padding: '0.875rem 1rem' }}>
                        <span style={{ fontSize: '0.8125rem', fontWeight: '500', color: 'var(--ink)' }}>{e.user?.name ?? '—'}</span>
                        {e.user?.department && DEPT_META[e.user.department] && (
                          <span className="tb-chip" style={{ background: DEPT_META[e.user.department].bg, color: DEPT_META[e.user.department].color, marginLeft: '6px' }}>
                            {DEPT_META[e.user.department].label}
                          </span>
                        )}
                      </td>
                    )}
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <p style={{ fontSize: '0.875rem', fontWeight: '500', color: 'var(--ink)', marginBottom: '1px' }}>{fmtDate(e.date)}</p>
                      <p style={{ fontSize: '0.6875rem', color: 'var(--muted)' }}>{e.date}</p>
                    </td>
                    <td style={{ padding: '0.875rem 1rem', fontSize: '0.875rem', color: holiday ? 'var(--muted)' : 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}>
                      {holiday ? '—' : fmtTime(e.check_in)}
                    </td>
                    <td style={{ padding: '0.875rem 1rem', fontSize: '0.875rem', color: holiday ? 'var(--muted)' : active ? 'var(--sky)' : 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}>
                      {holiday ? '—' : active ? 'active' : fmtTime(e.check_out)}
                    </td>
                    <td style={{ padding: '0.875rem 1rem', fontSize: '0.875rem', fontWeight: '500', color: ms > 0 ? 'var(--ink)' : 'var(--muted)' }}>
                      {holiday ? '—' : active ? <span style={{ color: 'var(--sky)' }}>Live</span> : fmtDuration(ms)}
                    </td>
                    <td style={{ padding: '0.875rem 1rem' }}>
                      {holiday ? (
                        <span className="tb-chip" style={{ background: 'rgba(245,158,11,0.12)', color: 'var(--amber)' }}>🏖 {e.holiday_reason || 'Leave'}</span>
                      ) : active ? (
                        <span className="tb-chip" style={{ background: 'rgba(14,165,233,0.12)', color: 'var(--sky)' }}>In progress</span>
                      ) : e.check_in ? (
                        <span className="tb-chip" style={{ background: 'rgba(16,185,129,0.12)', color: 'var(--emerald)' }}>Completed</span>
                      ) : (
                        <span className="tb-chip" style={{ background: 'rgba(244,63,94,0.1)', color: 'var(--rose)' }}>Absent</span>
                      )}
                    </td>
                    <td style={{ padding: '0.875rem 1rem', maxWidth: '200px' }}>
                      {e.pod && <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>📋 {e.pod}</p>}
                      {e.eod && <p style={{ fontSize: '0.75rem', color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>📝 {e.eod}</p>}
                      {!e.pod && !e.eod && <span style={{ fontSize: '0.75rem', opacity: 0.35, color: 'var(--muted)' }}>—</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── POD Modal ── */}
      {showPOD && (
        <div className="tb-modal-bg" onClick={e => { if (e.target === e.currentTarget) setShowPOD(false) }}>
          <div className="tb-modal" style={{ width: '100%', maxWidth: '460px' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', background: 'linear-gradient(180deg,rgba(16,185,129,0.05) 0%,transparent 100%)' }}>
              <h2 style={{ fontSize: '1rem', fontWeight: '600', margin: 0 }}>📋 Plan of Day</h2>
              <p style={{ fontSize: '0.8125rem', color: 'var(--muted)', marginTop: '0.25rem' }}>What are you planning to work on today?</p>
            </div>
            <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <textarea
                className="tb-input"
                style={{ minHeight: '100px', resize: 'vertical' }}
                placeholder="e.g. Fix login bug, review PR #42, team standup at 10am…"
                value={podText}
                onChange={e => setPodText(e.target.value)}
                autoFocus
              />
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button className="tb-btn" onClick={() => { setPodText(''); submitCheckIn() }}>Skip</button>
                <button className="tb-btn tb-btn-primary" onClick={submitCheckIn} disabled={checking === 'in'}>
                  {checking === 'in' ? 'Checking in…' : 'Check In'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── EOD Modal ── */}
      {showEOD && (
        <div className="tb-modal-bg" onClick={e => { if (e.target === e.currentTarget) setShowEOD(false) }}>
          <div className="tb-modal" style={{ width: '100%', maxWidth: '460px' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', background: 'linear-gradient(180deg,rgba(59,130,246,0.05) 0%,transparent 100%)' }}>
              <h2 style={{ fontSize: '1rem', fontWeight: '600', margin: 0 }}>📝 End of Day Report</h2>
              <p style={{ fontSize: '0.8125rem', color: 'var(--muted)', marginTop: '0.25rem' }}>What did you accomplish today?</p>
            </div>
            <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <textarea
                className="tb-input"
                style={{ minHeight: '100px', resize: 'vertical' }}
                placeholder="e.g. Fixed login bug, reviewed 2 PRs, completed API docs…"
                value={eodText}
                onChange={e => setEodText(e.target.value)}
                autoFocus
              />
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button className="tb-btn" onClick={() => { setEodText(''); submitCheckOut() }}>Skip</button>
                <button className="tb-btn tb-btn-primary" onClick={submitCheckOut} disabled={checking === 'out'}>
                  {checking === 'out' ? 'Checking out…' : 'Check Out'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Manual entry modal ── */}
      {showManual && (
        <div className="tb-modal-bg" onClick={e => { if (e.target === e.currentTarget) setShowManual(false) }}>
          <div className="tb-modal" style={{ width: '100%', maxWidth: '500px' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', background: 'linear-gradient(180deg,rgba(59,130,246,0.05) 0%,transparent 100%)' }}>
              <h2 style={{ fontSize: '1rem', fontWeight: '600', margin: 0 }}>Add Timesheet Entry</h2>
              <p style={{ fontSize: '0.8125rem', color: 'var(--muted)', marginTop: '0.25rem' }}>Manually fill in attendance or mark leave</p>
            </div>
            <form onSubmit={saveManual} style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              <div>
                <label style={lbl}>Date *</label>
                <input type="date" className="tb-input" required max={todayStr}
                  value={manual.date}
                  onChange={e => setManual(p => ({ ...p, date: e.target.value }))} />
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', cursor: 'pointer', userSelect: 'none' as const }}>
                <input type="checkbox" checked={manual.is_holiday} onChange={e => setManual(p => ({ ...p, is_holiday: e.target.checked }))}
                  style={{ width: '16px', height: '16px', accentColor: 'var(--amber)', cursor: 'pointer' }} />
                <span style={{ fontSize: '0.875rem', color: 'var(--ink)', fontWeight: '500' }}>Holiday / Leave</span>
              </label>

              {manual.is_holiday ? (
                <div>
                  <label style={lbl}>Reason *</label>
                  <input className="tb-input" placeholder="e.g. Sick leave, National holiday, Annual leave…"
                    value={manual.holiday_reason}
                    onChange={e => setManual(p => ({ ...p, holiday_reason: e.target.value }))} />
                </div>
              ) : (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div>
                      <label style={lbl}>Check In</label>
                      <input type="time" className="tb-input" value={manual.check_in} onChange={e => setManual(p => ({ ...p, check_in: e.target.value }))} />
                    </div>
                    <div>
                      <label style={lbl}>Check Out</label>
                      <input type="time" className="tb-input" value={manual.check_out} onChange={e => setManual(p => ({ ...p, check_out: e.target.value }))} />
                    </div>
                  </div>
                  <div>
                    <label style={lbl}>Plan of Day (POD)</label>
                    <input className="tb-input" placeholder="What did you plan to do?" value={manual.pod} onChange={e => setManual(p => ({ ...p, pod: e.target.value }))} />
                  </div>
                  <div>
                    <label style={lbl}>End of Day (EOD)</label>
                    <input className="tb-input" placeholder="What did you accomplish?" value={manual.eod} onChange={e => setManual(p => ({ ...p, eod: e.target.value }))} />
                  </div>
                </>
              )}

              <div>
                <label style={lbl}>Notes</label>
                <textarea className="tb-input" style={{ minHeight: '60px', resize: 'vertical' }} placeholder="Optional notes…"
                  value={manual.notes} onChange={e => setManual(p => ({ ...p, notes: e.target.value }))} />
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', paddingTop: '0.25rem' }}>
                <button type="button" className="tb-btn" onClick={() => setShowManual(false)}>Cancel</button>
                <button type="submit" className="tb-btn tb-btn-primary" disabled={savingManual}>
                  {savingManual ? 'Saving…' : 'Save Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse-live {
          0%,100% { box-shadow: 0 0 0 3px rgba(16,185,129,0.2); }
          50%      { box-shadow: 0 0 0 6px rgba(16,185,129,0.08); }
        }
      `}</style>
    </div>
  )
}

const lbl: React.CSSProperties = {
  display: 'block', fontSize: '0.8125rem', color: 'var(--muted)', marginBottom: '0.375rem', fontWeight: '500',
}
