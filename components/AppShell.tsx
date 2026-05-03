'use client'

import { usePathname } from 'next/navigation'
import Sidebar from './Sidebar'

const NO_SHELL_PATHS = ['/login', '/forgot-password', '/reset-password', '/setup']

export default function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname()
  const noShell = NO_SHELL_PATHS.some(p => path.startsWith(p))

  // Stretch to fill the flex body so centering works correctly on auth pages
  if (noShell) return <div style={{ flex: 1, width: '100%' }}>{children}</div>

  return (
    <>
      <Sidebar />
      <main style={{
        flex: 1,
        marginLeft: '220px',
        padding: '2rem 2.5rem',
        minHeight: '100vh',
        background: 'var(--base)',
      }}>
        {children}
      </main>
    </>
  )
}
