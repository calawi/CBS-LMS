USE lms;

-- 1) Normalize legacy roles to new model
UPDATE user_roles SET role = 'sysadmin' WHERE role = 'admin';
UPDATE user_roles SET role = 'learner' WHERE role = 'employee';

-- Optional mapping if legacy roles exist
UPDATE user_roles SET role = 'instructor' WHERE role IN ('hr', 'supervisor');

-- 2) Add video support on modules
ALTER TABLE course_modules
  ADD COLUMN IF NOT EXISTS video_url TEXT NULL;

-- 3) Ensure only expected roles are present
-- (manual review query)
SELECT DISTINCT role FROM user_roles ORDER BY role;

