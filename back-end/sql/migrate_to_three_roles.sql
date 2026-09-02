USE lms;

-- Convert legacy roles to new model
UPDATE user_roles SET role = 'sysadmin' WHERE role = 'admin';
UPDATE user_roles SET role = 'learner' WHERE role = 'employee';
UPDATE user_roles SET role = 'instructor' WHERE role IN ('hr', 'supervisor');

-- Optional: normalize demo instructor identity
UPDATE users
SET email = 'instructor@cbs.gov.so', full_name = 'Demo Instructor'
WHERE email = 'hr@cbs.gov.so';

UPDATE profiles
SET full_name = 'Demo Instructor', job_title = 'Instructor'
WHERE user_id IN (SELECT id FROM users WHERE email = 'instructor@cbs.gov.so');

