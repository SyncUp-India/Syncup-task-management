-- Run in Supabase SQL Editor

-- 1. Fix storage RLS so the service role key (or anon key used as service key) can upload
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename  = 'objects'
      AND policyname = 'task-evidence all access'
  ) THEN
    CREATE POLICY "task-evidence all access"
      ON storage.objects FOR ALL
      USING (bucket_id = 'task-evidence')
      WITH CHECK (bucket_id = 'task-evidence');
  END IF;
END $$;

-- 2. Add department to users (admin / sales / marketing / developer)
ALTER TABLE users ADD COLUMN IF NOT EXISTS department TEXT DEFAULT 'developer'
  CHECK (department IN ('admin', 'sales', 'marketing', 'developer'));

-- Seed existing super admin with 'admin' department
UPDATE users SET department = 'admin' WHERE email = 'super@admin.com';

-- 3. Add department to tasks (sales / marketing / developer; null = unassigned)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS department TEXT
  CHECK (department IN ('sales', 'marketing', 'developer'));
