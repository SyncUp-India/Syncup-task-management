import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  const { email } = await request.json()

  if (!email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 })
  }

  const { data: user } = await supabaseAdmin
    .from('users')
    .select('id, name, email, recovery_email')
    .eq('email', email.toLowerCase().trim())
    .single()

  // Always return success to prevent email enumeration
  if (!user) {
    return NextResponse.json({ message: 'If that account exists, a reset link has been sent.' })
  }

  const token = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60) // 1 hour

  await supabaseAdmin
    .from('users')
    .update({ reset_token: token, reset_token_expires_at: expiresAt.toISOString() })
    .eq('id', user.id)

  const host = request.headers.get('host') || 'localhost:3000'
  const protocol = host.startsWith('localhost') ? 'http' : 'https'
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${protocol}://${host}`
  const resetUrl = `${baseUrl}/reset-password?token=${token}`

  const toEmail = user.recovery_email || user.email
  const resendKey = process.env.RESEND_API_KEY

  if (resendKey) {
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM || 'noreply@syncup.in',
          to: [toEmail],
          subject: 'Reset your Team Board password',
          html: `
            <div style="font-family:sans-serif;max-width:480px;padding:24px;">
              <h2 style="margin-bottom:8px;">Reset your password</h2>
              <p>Hi ${user.name},</p>
              <p>Click the button below to reset your Team Board password. This link expires in <strong>1 hour</strong>.</p>
              <a href="${resetUrl}"
                 style="display:inline-block;margin:16px 0;padding:12px 24px;background:#7c5cfc;color:#fff;border-radius:8px;text-decoration:none;font-weight:500;">
                Reset Password
              </a>
              <p style="color:#888;font-size:12px;">
                If you didn't request this, ignore this email — your password won't change.
              </p>
            </div>
          `,
        }),
      })
    } catch (err) {
      console.error('Email send error:', err)
    }
  } else {
    // Dev mode: log and expose the URL in the response
    console.log(`\n🔐 Password reset link for ${email}:\n${resetUrl}\n`)
  }

  return NextResponse.json({
    message: 'If that account exists, a reset link has been sent.',
    ...(process.env.NODE_ENV !== 'production' && !resendKey && { resetUrl }),
  })
}
