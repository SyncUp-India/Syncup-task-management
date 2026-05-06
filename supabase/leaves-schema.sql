-- ============================================================
-- SyncUp — Leaves & Holidays Migration
-- Run in Supabase SQL Editor AFTER running SETUP-ALL.sql
-- ============================================================

-- 1. Add POD (Plan of Day) and EOD (End of Day) to timesheets
ALTER TABLE timesheets ADD COLUMN IF NOT EXISTS pod TEXT;
ALTER TABLE timesheets ADD COLUMN IF NOT EXISTS eod TEXT;

-- 2. Public holidays table
CREATE TABLE IF NOT EXISTS public_holidays (
  id    SERIAL PRIMARY KEY,
  date  DATE NOT NULL,
  name  TEXT NOT NULL,
  type  TEXT NOT NULL DEFAULT 'national'
        CHECK (type IN ('national', 'regional', 'optional')),
  UNIQUE(date, name)
);

CREATE INDEX IF NOT EXISTS holidays_date_idx ON public_holidays(date);

-- Seed 2026 Indian public holidays
-- Note: dates for moon-based festivals are approximate
INSERT INTO public_holidays (date, name, type) VALUES
  ('2026-01-01', 'New Year''s Day',            'optional'),
  ('2026-01-14', 'Makar Sankranti / Pongal',   'regional'),
  ('2026-01-26', 'Republic Day',               'national'),
  ('2026-02-14', 'Maha Shivaratri',            'regional'),
  ('2026-03-03', 'Holi',                       'national'),
  ('2026-04-03', 'Good Friday',                'national'),
  ('2026-04-04', 'Mahavir Jayanti',            'national'),
  ('2026-04-14', 'Dr. B.R. Ambedkar Jayanti', 'national'),
  ('2026-04-14', 'Baisakhi',                   'regional'),
  ('2026-05-01', 'International Labour Day',   'national'),
  ('2026-05-04', 'Buddha Purnima',             'national'),
  ('2026-08-15', 'Independence Day',           'national'),
  ('2026-08-23', 'Janmashtami',                'national'),
  ('2026-10-02', 'Gandhi Jayanti',             'national'),
  ('2026-10-21', 'Dussehra (Vijayadashami)',   'national'),
  ('2026-10-31', 'Diwali (Lakshmi Puja)',      'national'),
  ('2026-11-13', 'Guru Nanak Jayanti',         'national'),
  ('2026-12-25', 'Christmas Day',              'national')
ON CONFLICT (date, name) DO NOTHING;

-- 3. Leave balances (per user per year; credits accumulate monthly)
CREATE TABLE IF NOT EXISTS leave_balances (
  id                SERIAL          PRIMARY KEY,
  user_id           UUID            NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  year              INT             NOT NULL,
  sick_balance      NUMERIC(4,1)    NOT NULL DEFAULT 0,
  sick_used         NUMERIC(4,1)    NOT NULL DEFAULT 0,
  privilege_balance NUMERIC(4,1)    NOT NULL DEFAULT 0,
  privilege_used    NUMERIC(4,1)    NOT NULL DEFAULT 0,
  UNIQUE(user_id, year)
);

CREATE INDEX IF NOT EXISTS leave_balances_user_year_idx ON leave_balances(user_id, year);

-- 4. Leave requests
CREATE TABLE IF NOT EXISTS leave_requests (
  id          SERIAL       PRIMARY KEY,
  user_id     UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  leave_type  TEXT         NOT NULL CHECK (leave_type IN ('sick', 'privilege')),
  start_date  DATE         NOT NULL,
  end_date    DATE         NOT NULL,
  days        NUMERIC(4,1) NOT NULL,
  reason      TEXT,
  status      TEXT         NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_id    UUID         REFERENCES users(id),
  admin_note  TEXT,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS leave_requests_user_idx   ON leave_requests(user_id);
CREATE INDEX IF NOT EXISTS leave_requests_status_idx ON leave_requests(status);
CREATE INDEX IF NOT EXISTS leave_requests_date_idx   ON leave_requests(start_date);

DROP TRIGGER IF EXISTS leave_requests_updated_at ON leave_requests;
CREATE TRIGGER leave_requests_updated_at
  BEFORE UPDATE ON leave_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- DONE.
-- Leave credits (0.5 sick + 1.0 privilege/month) are applied
-- automatically by the /api/cron job on the 1st of each month.
-- Users visit /leaves to apply; admins use /admin/leaves.
-- ============================================================
