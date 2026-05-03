'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'done'>('idle')
  const [resetUrl, setResetUrl] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')

    const res = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    const data = await res.json()
    if (data.resetUrl) setResetUrl(data.resetUrl)
    setStatus('done')
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
      <div style={{ width: '100%', maxWidth: '400px' }}>

        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: '52px', height: '52px', borderRadius: '14px',
            background: 'linear-gradient(135deg, #3b82f6, #0ea5e9)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '24px', fontWeight: '700', color: '#fff',
            margin: '0 auto 1rem',
            boxShadow: '0 8px 32px rgba(59,130,246,0.3)',
          }}>T</div>
          <h1 style={{ fontSize: '1.375rem', fontWeight: '600', color: 'var(--ink)', marginBottom: '0.375rem' }}>
            Reset Password
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>
            Enter your login email — we&apos;ll send a reset link to your recovery address
          </p>
        </div>

        <div className="tb-card" style={{ padding: '1.75rem' }}>
          {status === 'done' ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2.25rem', marginBottom: '0.875rem' }}>✉️</div>
              <p style={{ color: 'var(--ink)', fontWeight: '500', marginBottom: '0.5rem' }}>Check your inbox</p>
              <p style={{ color: 'var(--muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                A password reset link was sent to your recovery email.
              </p>

              {resetUrl && (
                <div style={{
                  background: 'rgba(124,92,252,0.08)',
                  border: '1px solid rgba(124,92,252,0.2)',
                  borderRadius: '0.625rem',
                  padding: '1rem',
                  marginBottom: '1.5rem',
                  textAlign: 'left',
                }}>
                  <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '0.5rem', fontWeight: '500' }}>
                    Dev mode — no email configured. Copy this link:
                  </p>
                  <a href={resetUrl} style={{ fontSize: '0.75rem', color: 'var(--accent)', wordBreak: 'break-all', textDecoration: 'none' }}>
                    {resetUrl}
                  </a>
                </div>
              )}

              <Link
                href="/login"
                className="tb-btn tb-btn-primary"
                style={{ display: 'flex', width: '100%', justifyContent: 'center', padding: '0.625rem' }}
              >
                Back to Login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', color: 'var(--muted)', marginBottom: '0.4rem' }}>
                  Login Email
                </label>
                <input
                  type="email"
                  className="tb-input"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="super@admin.com"
                  required
                  autoFocus
                />
              </div>

              <button
                type="submit"
                className="tb-btn tb-btn-primary"
                disabled={status === 'loading'}
                style={{ width: '100%', justifyContent: 'center', padding: '0.625rem' }}
              >
                {status === 'loading' ? 'Sending…' : 'Send Reset Link'}
              </button>

              <Link
                href="/login"
                style={{ textAlign: 'center', fontSize: '0.8125rem', color: 'var(--muted)', textDecoration: 'none' }}
              >
                ← Back to login
              </Link>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
