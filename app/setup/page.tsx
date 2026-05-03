'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Status = 'idle' | 'loading' | 'done' | 'already' | 'error'

export default function SetupPage() {
  const [status, setStatus] = useState<Status>('idle')
  const [message, setMessage] = useState('')
  const router = useRouter()

  async function handleSetup() {
    setStatus('loading')
    try {
      const res = await fetch('/api/auth/setup', { method: 'POST' })
      const data = await res.json()

      if (res.ok) {
        setStatus('done')
        setMessage(data.message)
        setTimeout(() => router.push('/login'), 3000)
      } else if (res.status === 400) {
        setStatus('already')
        setMessage(data.error)
      } else {
        setStatus('error')
        setMessage(data.error || 'Something went wrong')
      }
    } catch {
      setStatus('error')
      setMessage('Network error — is the dev server running?')
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--base)',
      padding: '1.5rem',
    }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: '52px', height: '52px', borderRadius: '14px',
            background: 'linear-gradient(135deg, #3b82f6, #0ea5e9)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '24px', fontWeight: '700', color: '#fff',
            margin: '0 auto 1rem',
            boxShadow: '0 8px 32px rgba(59,130,246,0.3)',
          }}>T</div>
          <h1 style={{ fontSize: '1.375rem', fontWeight: '700', color: 'var(--ink)', marginBottom: '0.375rem' }}>
            SyncUp · Setup
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>
            Initialize the Super Admin account
          </p>
        </div>

        <div className="tb-card" style={{ padding: '1.875rem' }}>

          {status === 'done' && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2.25rem', marginBottom: '0.875rem' }}>✅</div>
              <p style={{ color: 'var(--ink)', fontWeight: '600', marginBottom: '0.75rem' }}>
                Admin created!
              </p>
              <div style={{
                background: 'rgba(124,92,252,0.08)',
                border: '1px solid rgba(124,92,252,0.2)',
                borderRadius: '0.625rem',
                padding: '1rem',
                marginBottom: '1.25rem',
                textAlign: 'left',
              }}>
                <p style={{ fontSize: '0.8125rem', color: 'var(--muted)', marginBottom: '0.5rem' }}>Login credentials:</p>
                <p style={{ fontSize: '0.875rem', color: 'var(--ink)', fontWeight: '500' }}>super@admin.com</p>
                <p style={{ fontSize: '0.875rem', color: 'var(--ink)', fontWeight: '500' }}>Password@123</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.5rem' }}>
                  Recovery email: tech@syncup.in
                </p>
              </div>
              <p style={{ fontSize: '0.8125rem', color: 'var(--muted)' }}>Redirecting to login…</p>
            </div>
          )}

          {status === 'already' && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2.25rem', marginBottom: '0.875rem' }}>🔒</div>
              <p style={{ color: 'var(--ink)', fontWeight: '600', marginBottom: '0.5rem' }}>Setup already done</p>
              <p style={{ color: 'var(--muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                An admin account already exists. This page is now locked.
              </p>
              <a
                href="/login"
                className="tb-btn tb-btn-primary"
                style={{ display: 'flex', justifyContent: 'center', padding: '0.625rem', textDecoration: 'none' }}
              >
                Go to Login
              </a>
            </div>
          )}

          {status === 'error' && (
            <div>
              <div style={{
                padding: '0.75rem 1rem',
                background: 'rgba(244,63,94,0.1)',
                border: '1px solid rgba(244,63,94,0.3)',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                color: 'var(--rose)',
                marginBottom: '1.25rem',
              }}>
                {message}
              </div>
              <button
                className="tb-btn"
                onClick={() => setStatus('idle')}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                Try Again
              </button>
            </div>
          )}

          {(status === 'idle' || status === 'loading') && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* What this does */}
              <div style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid var(--border)',
                borderRadius: '0.625rem',
                padding: '1rem',
              }}>
                <p style={{ fontSize: '0.8125rem', color: 'var(--muted)', marginBottom: '0.625rem', fontWeight: '500' }}>
                  This will create:
                </p>
                {[
                  ['Login email', 'super@admin.com'],
                  ['Password', 'Password@123'],
                  ['Recovery email', 'tech@syncup.in'],
                  ['Role', 'Admin (full access)'],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0', fontSize: '0.8125rem' }}>
                    <span style={{ color: 'var(--muted)' }}>{k}</span>
                    <span style={{ color: 'var(--ink)', fontWeight: '500' }}>{v}</span>
                  </div>
                ))}
              </div>

              <button
                className="tb-btn tb-btn-primary"
                onClick={handleSetup}
                disabled={status === 'loading'}
                style={{ width: '100%', justifyContent: 'center', padding: '0.625rem' }}
              >
                {status === 'loading' ? 'Creating admin…' : 'Initialize Admin Account'}
              </button>

              <p style={{ fontSize: '0.75rem', color: 'var(--muted)', textAlign: 'center' }}>
                This page locks itself after first use
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
