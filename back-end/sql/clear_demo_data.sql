-- Remove all sample/demo LMS content. Keeps 3 login accounts (admin, instructor, learner).
--
-- phpMyAdmin: select ALL lines below and click Go (do not run one statement at a time).

USE lms;

SET FOREIGN_KEY_CHECKS = 0;

DELETE FROM assessment_results;
DELETE FROM assessment_questions;
DELETE FROM assessments;
DELETE FROM certifications;
DELETE FROM enrollments;
DELETE FROM training_assignments;
DELETE FROM training_history;
DELETE FROM training_plans;
DELETE FROM approval_requests;
DELETE FROM course_modules;
DELETE FROM courses;
DELETE FROM user_badges;
DELETE FROM user_points;
DELETE FROM notifications;
DELETE FROM announcements;
DELETE FROM audit_logs;
DELETE FROM password_resets;

-- course_ratings (if table exists)
SET @has_ratings = (
  SELECT COUNT(*) FROM information_schema.TABLES
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'course_ratings'
);
SET @sql = IF(@has_ratings > 0, 'DELETE FROM course_ratings', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

DELETE FROM departments;

ALTER TABLE assessment_results AUTO_INCREMENT = 1;
ALTER TABLE assessment_questions AUTO_INCREMENT = 1;
ALTER TABLE assessments AUTO_INCREMENT = 1;
ALTER TABLE certifications AUTO_INCREMENT = 1;
ALTER TABLE enrollments AUTO_INCREMENT = 1;
ALTER TABLE training_assignments AUTO_INCREMENT = 1;
ALTER TABLE training_history AUTO_INCREMENT = 1;
ALTER TABLE training_plans AUTO_INCREMENT = 1;
ALTER TABLE approval_requests AUTO_INCREMENT = 1;
ALTER TABLE course_modules AUTO_INCREMENT = 1;
ALTER TABLE courses AUTO_INCREMENT = 1;
ALTER TABLE user_badges AUTO_INCREMENT = 1;
ALTER TABLE user_points AUTO_INCREMENT = 1;
ALTER TABLE notifications AUTO_INCREMENT = 1;
ALTER TABLE announcements AUTO_INCREMENT = 1;
ALTER TABLE audit_logs AUTO_INCREMENT = 1;
ALTER TABLE password_resets AUTO_INCREMENT = 1;
ALTER TABLE departments AUTO_INCREMENT = 1;

SET @sql = IF(@has_ratings > 0, 'ALTER TABLE course_ratings AUTO_INCREMENT = 1', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET FOREIGN_KEY_CHECKS = 1;

-- Reset profiles for the 3 system accounts
UPDATE profiles SET
  job_title = NULL,
  employee_id = NULL,
  department_id = NULL,
  location = NULL,
  phone = NULL,
  date_of_joining = NULL,
  manager_user_id = NULL
WHERE user_id IN (1, 2, 3);
