-- ============================================================
-- SyncUp — Departments & Test Cases Migration
-- Run in Supabase SQL Editor
-- ============================================================

-- 1. Add test-case columns to tasks
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS test_id           TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS tag               TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS steps_to_reproduce TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS expected_result   TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS actual_result     TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS pass_fail         TEXT
  CHECK (pass_fail IN ('pass', 'fail', 'pending'));

-- 2. Create dynamic departments table
CREATE TABLE IF NOT EXISTS departments (
  id         SERIAL       PRIMARY KEY,
  name       TEXT         NOT NULL UNIQUE,
  label      TEXT         NOT NULL,
  color      TEXT         NOT NULL DEFAULT '#3b82f6',
  bg_color   TEXT         NOT NULL DEFAULT 'rgba(59,130,246,0.1)',
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Seed existing departments
INSERT INTO departments (name, label, color, bg_color) VALUES
  ('admin',     'Admin',     '#7c5cfc', 'rgba(124,92,252,0.12)'),
  ('sales',     'Sales',     '#10b981', 'rgba(16,185,129,0.12)'),
  ('marketing', 'Marketing', '#f43f5e', 'rgba(244,63,94,0.12)'),
  ('developer', 'Developer', '#3b82f6', 'rgba(59,130,246,0.12)')
ON CONFLICT (name) DO NOTHING;

-- 3. Drop hardcoded CHECK constraints to allow dynamic departments
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_department_check;
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_department_check;

-- Add a soft FK via trigger (optional — app validates instead)

-- ============================================================
-- DONE. New pages:
--   /admin/departments  — manage departments
--   Import Excel now supports multi-tab test case format
-- ============================================================
