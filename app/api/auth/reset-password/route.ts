import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { hashPassword } from '@/lib/password'

export async function POST(request: NextRequest) {
  const { token, password } = await request.json()

  if (!token || !password) {
    return NextResponse.json({ error: 'Token and password are required' }, { status: 400 })
  }

  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
  }

  const { data: user } = await supabaseAdmin
    .from('users')
    .select('id, reset_token_expires_at')
    .eq('reset_token', token)
    .single()

  if (!user) {
    return NextResponse.json({ error: 'Invalid or expired reset link' }, { status: 400 })
  }

  if (new Date(user.reset_token_expires_at) < new Date()) {
    return NextResponse.json({ error: 'Reset link has expired. Please request a new one.' }, { status: 400 })
  }

  const hash = await hashPassword(password)

  await supabaseAdmin
    .from('users')
    .update({ password_hash: hash, reset_token: null, reset_token_expires_at: null })
    .eq('id', user.id)

  return NextResponse.json({ message: 'Password updated successfully' })
}
