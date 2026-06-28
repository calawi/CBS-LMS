USE lms;

-- Keep one role per user based on priority:
-- sysadmin > instructor > learner

DROP TEMPORARY TABLE IF EXISTS role_choice;
CREATE TEMPORARY TABLE role_choice AS
SELECT
  ur.user_id,
  CASE
    WHEN SUM(CASE WHEN LOWER(TRIM(ur.role)) IN ('sysadmin', 'admin', 'sys_admin', 'systemadmin') THEN 1 ELSE 0 END) > 0 THEN 'sysadmin'
    WHEN SUM(CASE WHEN LOWER(TRIM(ur.role)) IN ('instructor', 'hr', 'supervisor', 'teacher') THEN 1 ELSE 0 END) > 0 THEN 'instructor'
    ELSE 'learner'
  END AS final_role
FROM user_roles ur
GROUP BY ur.user_id;

DELETE FROM user_roles;

INSERT INTO user_roles (user_id, role)
SELECT user_id, final_role
FROM role_choice;

DROP TEMPORARY TABLE role_choice;

