-- Run this in your Supabase SQL Editor

-- Ensure escalation columns exist on tasks (may already be present)
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS escalation_level   INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_escalated_at  TIMESTAMPTZ;

-- Timesheet table: tracks check-in / check-out per user per day
CREATE TABLE IF NOT EXISTS timesheets (
  id              BIGSERIAL PRIMARY KEY,
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date            DATE NOT NULL,
  check_in        TIMESTAMPTZ,
  check_out       TIMESTAMPTZ,
  is_holiday      BOOLEAN NOT NULL DEFAULT FALSE,
  holiday_reason  TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, date)
);

CREATE INDEX IF NOT EXISTS timesheets_user_date_idx ON timesheets (user_id, date DESC);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS timesheets_updated_at ON timesheets;
CREATE TRIGGER timesheets_updated_at
  BEFORE UPDATE ON timesheets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
