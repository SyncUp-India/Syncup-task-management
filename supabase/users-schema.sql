-- Auth users table — run this in Supabase SQL Editor AFTER schema.sql
-- This adds login/auth capabilities to Team Board

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,          -- login email (e.g. super@admin.com)
  recovery_email TEXT,                  -- where password-reset emails are sent
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  reset_token TEXT,
  reset_token_expires_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS users_email_idx       ON users(email);
CREATE INDEX IF NOT EXISTS users_reset_token_idx ON users(reset_token);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS users_updated_at ON users;
CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_users_updated_at();

-- NOTE: The admin user is seeded via POST /api/auth/setup
-- (bcrypt hashing happens at runtime, not in SQL)
-- Hit that endpoint once after deploying, then it self-locks.
