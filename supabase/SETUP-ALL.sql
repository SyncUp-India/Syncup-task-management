-- ============================================================
-- SyncUp — Full Database Setup
-- Run this ONCE in Supabase SQL Editor on a fresh project.
-- If already set up, scroll to the bottom for the "existing
-- project" patch queries.
-- ============================================================


-- ── 0. Extensions ───────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ── 1. Members (task assignees) ─────────────────────────────
CREATE TABLE IF NOT EXISTS members (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT NOT NULL,
  email         TEXT UNIQUE,
  role          TEXT CHECK (role IN ('dev','qa','pm','design','marketing','ops','other')),
  slack_user_id TEXT,
  manager_id    UUID REFERENCES members(id),
  active        BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);


-- ── 2. Tasks ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tasks (
  id                  SERIAL PRIMARY KEY,
  title               TEXT NOT NULL,
  description         TEXT,
  assignee_id         UUID REFERENCES members(id),
  created_by_id       UUID REFERENCES members(id),
  status              TEXT NOT NULL DEFAULT 'todo'
                        CHECK (status IN ('todo','inprogress','review','done','blocked')),
  priority            TEXT NOT NULL DEFAULT 'medium'
                        CHECK (priority IN ('high','medium','low')),
  due_date            DATE,
  est_hours           NUMERIC DEFAULT 0,
  spent_hours         NUMERIC DEFAULT 0,
  source              TEXT DEFAULT 'manual'
                        CHECK (source IN ('manual','excel','github')),
  github_pr_url       TEXT,
  github_pr_status    TEXT CHECK (github_pr_status IN ('open','review','merged','closed',NULL)),
  repo                TEXT,
  escalation_level    INTEGER NOT NULL DEFAULT 0,
  last_escalated_at   TIMESTAMPTZ,
  completed_at        TIMESTAMPTZ,
  attachments         JSONB DEFAULT '[]',
  department          TEXT CHECK (department IN ('sales','marketing','developer')),
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS tasks_assignee_idx  ON tasks(assignee_id);
CREATE INDEX IF NOT EXISTS tasks_status_idx    ON tasks(status);
CREATE INDEX IF NOT EXISTS tasks_due_date_idx  ON tasks(due_date);
CREATE INDEX IF NOT EXISTS tasks_dept_idx      ON tasks(department);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tasks_updated_at ON tasks;
CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ── 3. Activity log ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS activity_log (
  id         SERIAL PRIMARY KEY,
  task_id    INT REFERENCES tasks(id) ON DELETE CASCADE,
  actor_id   UUID REFERENCES members(id),
  action     TEXT NOT NULL,
  details    JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ── 4. Time entries (task-level hours) ──────────────────────
CREATE TABLE IF NOT EXISTS time_entries (
  id        SERIAL PRIMARY KEY,
  task_id   INT REFERENCES tasks(id) ON DELETE CASCADE,
  member_id UUID REFERENCES members(id),
  hours     NUMERIC NOT NULL,
  note      TEXT,
  logged_at TIMESTAMPTZ DEFAULT NOW()
);


-- ── 5. Users (login / auth) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                  TEXT NOT NULL,
  email                 TEXT UNIQUE NOT NULL,
  recovery_email        TEXT,
  password_hash         TEXT NOT NULL,
  role                  TEXT NOT NULL DEFAULT 'user'
                          CHECK (role IN ('admin','user')),
  department            TEXT NOT NULL DEFAULT 'developer'
                          CHECK (department IN ('admin','sales','marketing','developer')),
  active                BOOLEAN NOT NULL DEFAULT TRUE,
  reset_token           TEXT,
  reset_token_expires_at TIMESTAMPTZ,
  created_by            UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS users_email_idx       ON users(email);
CREATE INDEX IF NOT EXISTS users_reset_token_idx ON users(reset_token);

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


-- ── 6. Timesheets (check-in / check-out) ────────────────────
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

CREATE INDEX IF NOT EXISTS timesheets_user_date_idx ON timesheets(user_id, date DESC);

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


-- ── 7. Storage: allow service role to upload to task-evidence
--    (Also create the bucket manually: Storage → New bucket
--     → Name: task-evidence  → Public: ON)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename  = 'objects'
      AND policyname = 'task-evidence all access'
  ) THEN
    CREATE POLICY "task-evidence all access"
      ON storage.objects
      FOR ALL
      USING     (bucket_id = 'task-evidence')
      WITH CHECK (bucket_id = 'task-evidence');
  END IF;
END $$;


-- ============================================================
-- EXISTING PROJECT? Run only this section as a patch:
-- ============================================================

-- Add department to users if missing
ALTER TABLE users ADD COLUMN IF NOT EXISTS department TEXT
  NOT NULL DEFAULT 'developer'
  CHECK (department IN ('admin','sales','marketing','developer'));

-- Add department to tasks if missing
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS department TEXT
  CHECK (department IN ('sales','marketing','developer'));

-- Add attachments to tasks if missing
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]';

-- Add escalation columns to tasks if missing
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS escalation_level  INTEGER NOT NULL DEFAULT 0;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS last_escalated_at TIMESTAMPTZ;

-- Seed existing super admin's department
UPDATE users SET department = 'admin' WHERE role = 'admin';

-- ============================================================
-- DONE. Next step: hit POST /api/auth/setup to create the
-- first admin account (super@admin.com / Password@123).
-- Then log in and create department users from Admin → Users.
-- ============================================================
