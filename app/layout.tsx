import './globals.css'
import { AuthProvider } from '@/context/AuthContext'
import AppShell from '@/components/AppShell'

export const metadata = {
  title: 'SyncUp',
  description: 'Team task management & GitHub PR sync',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ display: 'flex', minHeight: '100vh' }}>
        <AuthProvider>
          <AppShell>
            {children}
          </AppShell>
        </AuthProvider>
      </body>
    </html>
  )
}
