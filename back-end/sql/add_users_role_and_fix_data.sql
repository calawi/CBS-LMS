USE lms;

-- 1) Add role column to users table (single primary role)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS role VARCHAR(30) NULL AFTER full_name;

-- 2) Backfill users.role from user_roles with priority
UPDATE users u
LEFT JOIN (
  SELECT
    ur.user_id,
    CASE
      WHEN SUM(CASE WHEN LOWER(TRIM(ur.role)) IN ('sysadmin','admin','sys_admin','systemadmin') THEN 1 ELSE 0 END) > 0 THEN 'sysadmin'
      WHEN SUM(CASE WHEN LOWER(TRIM(ur.role)) IN ('instructor','hr','supervisor','teacher') THEN 1 ELSE 0 END) > 0 THEN 'instructor'
      ELSE 'learner'
    END AS resolved_role
  FROM user_roles ur
  GROUP BY ur.user_id
) rr ON rr.user_id = u.id
SET u.role = COALESCE(rr.resolved_role, 'learner');

-- 3) Force known demo accounts exactly as requested
UPDATE users SET role = 'sysadmin' WHERE email = 'admin@cbs.gov.so';
UPDATE users SET role = 'instructor' WHERE email IN ('instructor@cbs.gov.so', 'hr@cbs.gov.so');
UPDATE users SET role = 'learner' WHERE email = 'employee@cbs.gov.so';

-- 4) Keep user_roles in sync (single role per user)
DELETE FROM user_roles;
INSERT INTO user_roles (user_id, role)
SELECT id, role FROM users;

