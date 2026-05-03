import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { hashPassword } from '@/lib/password'

// One-time endpoint to seed the Super Admin account.
// Self-locks after the first admin exists — safe to leave deployed.
export async function POST() {
  const { data: existing } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('role', 'admin')
    .limit(1)

  if (existing && existing.length > 0) {
    return NextResponse.json({ error: 'Admin already exists. Setup is locked.' }, { status: 400 })
  }

  const hash = await hashPassword('Password@123')

  const { error } = await supabaseAdmin.from('users').insert({
    name: 'Super Admin',
    email: 'super@admin.com',
    recovery_email: 'tech@syncup.in',
    password_hash: hash,
    role: 'admin',
    department: 'admin',
  })

  if (error) {
    console.error('Setup error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    message: 'Admin created successfully.',
    credentials: { email: 'super@admin.com', password: 'Password@123' },
    recoveryEmail: 'tech@syncup.in',
  })
}
