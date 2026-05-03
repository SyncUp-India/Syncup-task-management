'use client'

import { useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const params = useSearchParams()
  const router = useRouter()
  const token = params.get('token')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMessage('')

    if (password !== confirm) {
      setStatus('error')
      setMessage('Passwords do not match')
      return
    }
    if (password.length < 8) {
      setStatus('error')
      setMessage('Password must be at least 8 characters')
      return
    }

    setStatus('loading')
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password }),
    })
    const data = await res.json()

    if (res.ok) {
      setStatus('done')
      setTimeout(() => router.push('/login'), 2500)
    } else {
      setStatus('error')
      setMessage(data.error || 'Failed to reset password')
    }
  }

  if (!token) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', background: 'var(--base)', padding: '1.5rem',
      }}>
        <div className="tb-card" style={{ padding: '2rem', textAlign: 'center', maxWidth: '360px', width: '100%' }}>
          <p style={{ color: 'var(--rose)', marginBottom: '1.25rem' }}>
            Invalid reset link. The token is missing or malformed.
          </p>
          <Link href="/forgot-password" className="tb-btn tb-btn-primary"
            style={{ display: 'inline-flex', justifyContent: 'center' }}>
            Request a new link
          </Link>
        </div>
      </div>
    )
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
            New Password
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>Choose a strong password for your account</p>
        </div>

        <div className="tb-card" style={{ padding: '1.75rem' }}>
          {status === 'done' ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2.25rem', marginBottom: '0.875rem' }}>✅</div>
              <p style={{ color: 'var(--ink)', fontWeight: '500', marginBottom: '0.5rem' }}>Password updated!</p>
              <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>Redirecting you to login…</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', color: 'var(--muted)', marginBottom: '0.4rem' }}>
                  New Password
                </label>
                <input
                  type="password"
                  className="tb-input"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Min 8 characters"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', color: 'var(--muted)', marginBottom: '0.4rem' }}>
                  Confirm Password
                </label>
                <input
                  type="password"
                  className="tb-input"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="Repeat password"
                  required
                />
              </div>

              {status === 'error' && (
                <div style={{
                  padding: '0.625rem 0.875rem',
                  background: 'rgba(244,63,94,0.1)',
                  border: '1px solid rgba(244,63,94,0.3)',
                  borderRadius: '0.5rem',
                  fontSize: '0.8125rem',
                  color: 'var(--rose)',
                }}>
                  {message}
                </div>
              )}

              <button
                type="submit"
                className="tb-btn tb-btn-primary"
                disabled={status === 'loading'}
                style={{ width: '100%', justifyContent: 'center', padding: '0.625rem', marginTop: '0.25rem' }}
              >
                {status === 'loading' ? 'Updating…' : 'Update Password'}
              </button>

              <Link href="/login" style={{ textAlign: 'center', fontSize: '0.8125rem', color: 'var(--muted)', textDecoration: 'none' }}>
                ← Back to login
              </Link>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
