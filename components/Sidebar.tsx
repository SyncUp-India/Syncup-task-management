'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { DEPT_META } from '@/lib/departments'

const NAV = [
  {
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
        <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
      </svg>
    ),
    label: 'Board', href: '/',
  },
  {
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
    label: 'Members', href: '/members',
  },
  {
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
        <line x1="6" y1="20" x2="6" y2="14"/>
      </svg>
    ),
    label: 'Insights', href: '/insights',
  },
  {
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
      </svg>
    ),
    label: 'Timesheet', href: '/timesheet',
  },
  {
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
        <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
        <circle cx="12" cy="16" r="2"/>
      </svg>
    ),
    label: 'Holidays', href: '/holidays',
  },
  {
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="5"/>
        <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
        <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
      </svg>
    ),
    label: 'Leaves', href: '/leaves',
  },
]

export default function Sidebar() {
  const path = usePathname()
  const { user, logout } = useAuth()

  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : '?'

  return (
    <aside style={{
      width: '220px',
      position: 'fixed',
      top: 0, left: 0, bottom: 0,
      background: 'var(--surface)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      padding: '1.25rem 0.875rem',
      zIndex: 40,
      boxShadow: '2px 0 12px rgba(15,23,42,0.05)',
    }}>
      {/* Logo */}
      <div style={{ padding: '0.25rem 0.75rem 1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.25rem' }}>
          <div style={{
            width: '28px', height: '28px', borderRadius: '8px',
            background: 'linear-gradient(135deg, #3b82f6, #0ea5e9)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '14px', fontWeight: '700', color: '#fff', flexShrink: 0,
            boxShadow: '0 2px 8px rgba(59,130,246,0.4)',
          }}>S</div>
          <span style={{ fontSize: '0.9375rem', fontWeight: '700', color: 'var(--ink)' }}>SyncUp</span>
        </div>
        <p style={{ fontSize: '0.6875rem', color: 'var(--muted)', paddingLeft: '0.25rem' }}>Workspace · v2.0</p>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <p style={{
          fontSize: '0.6875rem', fontWeight: '600', color: 'var(--muted)',
          letterSpacing: '0.06em', padding: '0 0.75rem',
          marginBottom: '0.375rem', textTransform: 'uppercase',
        }}>Navigation</p>
        {NAV.map(item => {
          const active = path === item.href
          return (
            <Link key={item.href} href={item.href} className={`nav-item ${active ? 'active' : ''}`}>
              {item.icon}
              {item.label}
            </Link>
          )
        })}

        {user?.role === 'admin' && (
          <>
            <p style={{
              fontSize: '0.6875rem', fontWeight: '600', color: 'var(--muted)',
              letterSpacing: '0.06em', padding: '0 0.75rem',
              margin: '0.875rem 0 0.375rem', textTransform: 'uppercase',
            }}>Admin</p>
            <Link
              href="/admin/users"
              className={`nav-item ${path.startsWith('/admin/users') ? 'active' : ''}`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <line x1="19" y1="8" x2="19" y2="14"/>
                <line x1="22" y1="11" x2="16" y2="11"/>
              </svg>
              Users
            </Link>
            <Link
              href="/admin/departments"
              className={`nav-item ${path.startsWith('/admin/departments') ? 'active' : ''}`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
              Departments
            </Link>
            <Link
              href="/admin/leaves"
              className={`nav-item ${path.startsWith('/admin/leaves') ? 'active' : ''}`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="11" y2="17"/>
              </svg>
              Leave Requests
            </Link>
            <Link
              href="/admin/leave-balances"
              className={`nav-item ${path.startsWith('/admin/leave-balances') ? 'active' : ''}`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
              </svg>
              Leave Balances
            </Link>
            <Link
              href="/import"
              className={`nav-item ${path.startsWith('/import') ? 'active' : ''}`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              Import Excel
            </Link>
          </>
        )}
      </nav>

      {/* User info + logout */}
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.875rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.375rem 0.75rem', marginBottom: '0.375rem' }}>
          <div style={{
            width: '28px', height: '28px', borderRadius: '50%',
            background: 'rgba(59,130,246,0.1)',
            border: '1.5px solid rgba(59,130,246,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '11px', fontWeight: '600', color: 'var(--accent)',
            flexShrink: 0,
          }}>
            {initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: '0.8125rem', fontWeight: '600', color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.name ?? '…'}
            </p>
            {user?.department && (() => {
              const dm = DEPT_META[user.department]
              return dm ? (
                <span style={{
                  display: 'inline-block', fontSize: '0.625rem', fontWeight: '600',
                  padding: '1px 7px', borderRadius: '999px',
                  background: dm.bg, color: dm.color, marginTop: '2px',
                }}>
                  {dm.label}
                </span>
              ) : null
            })()}
          </div>
        </div>
        <button
          onClick={logout}
          style={{
            width: '100%', padding: '0.4375rem 0.75rem',
            background: 'transparent',
            border: '1px solid var(--border)',
            borderRadius: '0.5rem', fontSize: '0.8125rem', color: 'var(--muted)',
            cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
            transition: 'all 0.15s',
            display: 'flex', alignItems: 'center', gap: '0.5rem',
          }}
          onMouseEnter={e => {
            const b = e.currentTarget as HTMLButtonElement
            b.style.color = 'var(--rose)'
            b.style.borderColor = 'rgba(244,63,94,0.3)'
            b.style.background = 'rgba(244,63,94,0.05)'
          }}
          onMouseLeave={e => {
            const b = e.currentTarget as HTMLButtonElement
            b.style.color = 'var(--muted)'
            b.style.borderColor = 'var(--border)'
            b.style.background = 'transparent'
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          Sign out
        </button>
      </div>
    </aside>
  )
}
