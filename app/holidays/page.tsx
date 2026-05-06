'use client'

import { useEffect, useMemo, useState } from 'react'

const YEAR = 2026
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']
const TYPE_LABELS: Record<string, string> = { national: 'National', regional: 'Regional', optional: 'Optional' }
const TYPE_COLORS: Record<string, { bg: string; color: string }> = {
  national: { bg: 'rgba(139,92,246,0.12)', color: '#7c3aed' },
  regional: { bg: 'rgba(14,165,233,0.12)', color: 'var(--sky)' },
  optional: { bg: 'rgba(245,158,11,0.12)', color: 'var(--amber)' },
}

function MonthMini({
  year, month, holidaysByDate, today,
}: {
  year: number; month: number; holidaysByDate: Map<string, any[]>; today: string
}) {
  const firstDay  = new Date(year, month - 1, 1)
  const totalDays = new Date(year, month, 0).getDate()
  const offset    = (firstDay.getDay() + 6) % 7 // Mon = 0

  const cells: (number | null)[] = Array(offset).fill(null)
  for (let d = 1; d <= totalDays; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)

  const pad = (n: number) => String(n).padStart(2, '0')
  const monthStr = `${year}-${pad(month)}`

  return (
    <div className="tb-card" style={{ padding: '0.875rem' }}>
      <p style={{ fontSize: '0.8125rem', fontWeight: '700', color: 'var(--ink)', textAlign: 'center', marginBottom: '0.5rem' }}>
        {MONTH_NAMES[month - 1]}
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '1px', marginBottom: '2px' }}>
        {['M','T','W','T','F','S','S'].map((d, i) => (
          <div key={i} style={{ textAlign: 'center', fontSize: '0.5rem', color: 'var(--muted)', fontWeight: '600' }}>{d}</div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
        {cells.map((d, i) => {
          if (!d) return <div key={i} />
          const dateStr = `${monthStr}-${pad(d)}`
          const holidays = holidaysByDate.get(dateStr) || []
          const isHoliday = holidays.length > 0
          const isToday   = dateStr === today
          const isWeekend = new Date(year, month - 1, d).getDay() % 6 === 0
          const title = holidays.map((h: any) => h.name).join(', ')

          return (
            <div
              key={i}
              title={title || undefined}
              style={{
                textAlign: 'center',
                fontSize: '0.5625rem',
                fontWeight: isToday || isHoliday ? '700' : '400',
                padding: '2px 0',
                borderRadius: '3px',
                background: isToday ? 'var(--accent)' : isHoliday ? 'rgba(139,92,246,0.18)' : 'transparent',
                color: isToday ? '#fff' : isHoliday ? '#7c3aed' : isWeekend ? 'var(--muted)' : 'var(--ink)',
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

export default function HolidaysPage() {
  const [holidays, setHolidays] = useState<any[]>([])
  const [loading, setLoading]   = useState(true)
  const today = new Date().toISOString().slice(0, 10)

  useEffect(() => {
    fetch(`/api/holidays?year=${YEAR}`)
      .then(r => r.json())
      .then(d => { setHolidays(d.holidays || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const holidaysByDate = useMemo(() => {
    const map = new Map<string, any[]>()
    for (const h of holidays) {
      const arr = map.get(h.date) || []
      arr.push(h)
      map.set(h.date, arr)
    }
    return map
  }, [holidays])

  const nextHoliday = useMemo(
    () => holidays.find(h => h.date >= today),
    [holidays, today]
  )

  const daysUntilNext = nextHoliday
    ? Math.ceil((new Date(nextHoliday.date + 'T00:00:00').getTime() - new Date(today + 'T00:00:00').getTime()) / 86400000)
    : null

  const byMonth = useMemo(() => {
    const groups: Record<number, any[]> = {}
    for (const h of holidays) {
      const m = parseInt(h.date.slice(5, 7))
      if (!groups[m]) groups[m] = []
      groups[m].push(h)
    }
    return groups
  }, [holidays])

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--ink)', marginBottom: '0.25rem' }}>
          {YEAR} Public Holidays
        </h1>
        <p style={{ fontSize: '0.8125rem', color: 'var(--muted)' }}>
          Indian national and regional holidays · {holidays.length} holidays this year
        </p>
      </div>

      {/* Next holiday banner */}
      {nextHoliday && (
        <div className="tb-card" style={{
          marginBottom: '1.5rem', padding: '1rem 1.25rem',
          background: 'linear-gradient(135deg, rgba(139,92,246,0.08), rgba(59,130,246,0.06))',
          borderColor: 'rgba(139,92,246,0.2)',
          display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap',
        }}>
          <div style={{ fontSize: '1.75rem' }}>🎉</div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '0.6875rem', color: 'var(--muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>
              Next Holiday
            </p>
            <p style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--ink)', marginBottom: '2px' }}>
              {nextHoliday.name}
            </p>
            <p style={{ fontSize: '0.8125rem', color: 'var(--muted)' }}>
              {new Date(nextHoliday.date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '2rem', fontWeight: '700', color: '#7c3aed', lineHeight: 1 }}>{daysUntilNext}</p>
            <p style={{ fontSize: '0.6875rem', color: 'var(--muted)' }}>{daysUntilNext === 1 ? 'day away' : 'days away'}</p>
          </div>
        </div>
      )}

      {/* Legend */}
      <div style={{ display: 'flex', gap: '0.875rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        {Object.entries(TYPE_LABELS).map(([type, label]) => (
          <div key={type} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--muted)' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '3px', background: TYPE_COLORS[type].bg, border: `1px solid ${TYPE_COLORS[type].color}`, opacity: 0.8 }} />
            {label} Holiday
          </div>
        ))}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--muted)' }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '3px', background: 'var(--accent)', opacity: 0.8 }} />
          Today
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '3rem' }}>Loading holidays…</div>
      ) : (
        <>
          {/* Year calendar grid — 3 × 4 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.875rem', marginBottom: '2rem' }}>
            {Array.from({ length: 12 }, (_, i) => (
              <MonthMini
                key={i + 1}
                year={YEAR}
                month={i + 1}
                holidaysByDate={holidaysByDate}
                today={today}
              />
            ))}
          </div>

          {/* Holiday list by month */}
          <div>
            <h2 style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--ink)', marginBottom: '1rem' }}>Full Holiday List</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {Array.from({ length: 12 }, (_, i) => i + 1)
                .filter(m => byMonth[m]?.length)
                .map(m => (
                  <div key={m}>
                    <p style={{ fontSize: '0.6875rem', fontWeight: '700', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>
                      {MONTH_NAMES[m - 1]}
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                      {byMonth[m].map((h: any) => {
                        const c = TYPE_COLORS[h.type] || TYPE_COLORS.optional
                        const dateObj = new Date(h.date + 'T00:00:00')
                        return (
                          <div key={h.id} className="tb-card" style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div style={{ minWidth: '48px', textAlign: 'center' }}>
                              <p style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--ink)', lineHeight: 1 }}>
                                {dateObj.getDate()}
                              </p>
                              <p style={{ fontSize: '0.5625rem', color: 'var(--muted)', textTransform: 'uppercase', fontWeight: '600' }}>
                                {dateObj.toLocaleDateString('en-US', { weekday: 'short' })}
                              </p>
                            </div>
                            <div style={{ flex: 1 }}>
                              <p style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--ink)' }}>{h.name}</p>
                              <p style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                                {dateObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                              </p>
                            </div>
                            <span className="tb-chip" style={{ background: c.bg, color: c.color, fontSize: '0.6875rem' }}>
                              {TYPE_LABELS[h.type]}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
