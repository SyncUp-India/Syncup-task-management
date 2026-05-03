-- Evidence / attachments for tasks
-- Run in Supabase SQL Editor

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]';

-- Each attachment object looks like:
-- {
--   "id": "uuid",
--   "url": "https://…/task-evidence/42/1234-photo.jpg",
--   "name": "photo.jpg",
--   "type": "image/jpeg",
--   "path": "42/1234-photo.jpg",   -- storage path for deletion
--   "size": 204800,
--   "uploaded_at": "2025-01-01T00:00:00Z"
-- }

-- Also create the storage bucket via Supabase Dashboard:
--   Storage → New bucket → Name: "task-evidence" → Public: ON
-- The upload route will auto-create it too if it doesn't exist.
