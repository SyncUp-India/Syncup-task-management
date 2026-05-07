-- ============================================================
-- SyncUp — Merge members → users
-- Run in Supabase SQL Editor
-- ============================================================

-- 1. Add job-title + slack fields to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS title        TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS slack_user_id TEXT;

-- 2. Copy title (members.role) + slack_user_id to matching users
UPDATE users u
SET title          = m.role,
    slack_user_id  = m.slack_user_id
FROM members m
WHERE lower(u.email) = lower(m.email)
  AND m.email IS NOT NULL;

-- 3. Migrate tasks.assignee_id  (members.id → users.id)
-- Pass 1: match by email
UPDATE tasks t
SET assignee_id = u.id
FROM members m
JOIN users u ON lower(u.email) = lower(m.email)
WHERE t.assignee_id = m.id AND m.email IS NOT NULL;

-- Pass 2: match remaining by name
UPDATE tasks t
SET assignee_id = u.id
FROM members m
JOIN users u ON lower(u.name) = lower(m.name)
WHERE t.assignee_id = m.id;

-- Pass 3: null out any still-unmatched (old member IDs that have no user)
UPDATE tasks SET assignee_id = NULL
WHERE assignee_id IS NOT NULL
  AND assignee_id NOT IN (SELECT id FROM users);

-- 4. Migrate tasks.created_by_id the same way
UPDATE tasks t
SET created_by_id = u.id
FROM members m
JOIN users u ON lower(u.email) = lower(m.email)
WHERE t.created_by_id = m.id AND m.email IS NOT NULL;

UPDATE tasks t
SET created_by_id = u.id
FROM members m
JOIN users u ON lower(u.name) = lower(m.name)
WHERE t.created_by_id = m.id;

UPDATE tasks SET created_by_id = NULL
WHERE created_by_id IS NOT NULL
  AND created_by_id NOT IN (SELECT id FROM users);

-- 5. Migrate activity_log.actor_id
UPDATE activity_log al
SET actor_id = u.id
FROM members m
JOIN users u ON lower(u.email) = lower(m.email)
WHERE al.actor_id = m.id AND m.email IS NOT NULL;

UPDATE activity_log SET actor_id = NULL
WHERE actor_id IS NOT NULL
  AND actor_id NOT IN (SELECT id FROM users);

-- 6. Migrate time_entries.member_id
UPDATE time_entries te
SET member_id = u.id
FROM members m
JOIN users u ON lower(u.email) = lower(m.email)
WHERE te.member_id = m.id AND m.email IS NOT NULL;

UPDATE time_entries SET member_id = NULL
WHERE member_id IS NOT NULL
  AND member_id NOT IN (SELECT id FROM users);

-- 7. Drop old FKs pointing to members
ALTER TABLE tasks         DROP CONSTRAINT IF EXISTS tasks_assignee_id_fkey;
ALTER TABLE tasks         DROP CONSTRAINT IF EXISTS tasks_created_by_id_fkey;
ALTER TABLE activity_log  DROP CONSTRAINT IF EXISTS activity_log_actor_id_fkey;
ALTER TABLE time_entries  DROP CONSTRAINT IF EXISTS time_entries_member_id_fkey;

-- 8. Add new FKs pointing to users
ALTER TABLE tasks ADD CONSTRAINT tasks_assignee_id_fkey
  FOREIGN KEY (assignee_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE tasks ADD CONSTRAINT tasks_created_by_id_fkey
  FOREIGN KEY (created_by_id) REFERENCES users(id) ON DELETE SET NULL;

-- 9. Drop members table (CASCADE removes any remaining dependent objects)
DROP TABLE IF EXISTS members CASCADE;

-- 10. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- ============================================================
-- DONE. /api/members now reads from users table.
-- Job title stored in users.title (dev/qa/pm/design/marketing/ops/other)
-- Access role stays in users.role (admin/user)
-- ============================================================
