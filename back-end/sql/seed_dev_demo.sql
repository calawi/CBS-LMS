-- CBS LMS repeatable dev/demo seed
-- Run on the `lms` database.

SET FOREIGN_KEY_CHECKS = 0;

TRUNCATE TABLE assessment_results;
TRUNCATE TABLE assessment_questions;
TRUNCATE TABLE assessments;
TRUNCATE TABLE certifications;
TRUNCATE TABLE enrollments;
TRUNCATE TABLE approval_requests;
TRUNCATE TABLE training_history;
TRUNCATE TABLE training_plans;
TRUNCATE TABLE course_modules;
TRUNCATE TABLE courses;
TRUNCATE TABLE user_badges;
TRUNCATE TABLE user_points;
TRUNCATE TABLE user_roles;
TRUNCATE TABLE profiles;
TRUNCATE TABLE users;

SET FOREIGN_KEY_CHECKS = 1;

INSERT INTO users (id, email, password_hash, full_name, is_active)
VALUES
  (1, 'admin@cbs.gov.so', '$2a$10$OtWnzg1x2VtAEbG/nmmOFuEiN7E6vC9K07tXGSWYryfiXrcavG9BO', 'CBS Admin', 1),
  (2, 'hr@cbs.gov.so', '$2a$10$OtWnzg1x2VtAEbG/nmmOFuEiN7E6vC9K07tXGSWYryfiXrcavG9BO', 'HR Manager', 1),
  (3, 'employee@cbs.gov.so', '$2a$10$OtWnzg1x2VtAEbG/nmmOFuEiN7E6vC9K07tXGSWYryfiXrcavG9BO', 'Demo Employee', 1);

-- Password for all seeded users: 123456

INSERT INTO profiles (user_id, full_name, job_title, employee_id, department_id)
VALUES
  (1, 'CBS Admin', 'System Administrator', 'CBS-ADM-001', NULL),
  (2, 'HR Manager', 'HR Manager', 'CBS-HR-001', NULL),
  (3, 'Demo Employee', 'Analyst', 'CBS-EMP-001', NULL);

INSERT INTO user_roles (user_id, role)
VALUES
  (1, 'sysadmin'),
  (2, 'instructor'),
  (3, 'learner');

INSERT INTO courses (id, title, description, category, level, duration_hours, modules_count, status)
VALUES
  (1, 'Central Banking Fundamentals', 'Core central banking concepts for CBS staff.', 'Banking', 'Beginner', 3, 3, 'Published'),
  (2, 'AML Essentials', 'AML regulatory and practical essentials.', 'Compliance', 'Intermediate', 2, 2, 'Published');

INSERT INTO course_modules (course_id, title, content, duration_minutes, order_index)
VALUES
  (1, 'Mandate and Objectives', 'CBS mandate and price stability.', 45, 0),
  (1, 'Policy Instruments', 'OMO, reserve requirements, policy rate.', 60, 1),
  (1, 'Governance and Structure', 'CBS governance and departments.', 45, 2),
  (2, 'AML Legal Framework', 'FATF standards and local regulations.', 45, 0),
  (2, 'CDD and Reporting', 'CDD, EDD, suspicious transaction reporting.', 45, 1);

INSERT INTO assessments (id, course_id, title, description, passing_score, time_limit_minutes)
VALUES
  (1, 1, 'Central Banking Fundamentals Quiz', 'Core concepts test.', 70, 20),
  (2, 2, 'AML Essentials Quiz', 'AML obligations test.', 70, 20);

INSERT INTO assessment_questions (assessment_id, question, options, correct_answer, order_index, points)
VALUES
  (1, 'Primary objective of a central bank?', '["Price stability","Bank profits","Tax policy","Eliminate all risk"]', 'Price stability', 0, 5),
  (1, 'Common monetary policy instrument?', '["Open market operations","Corporate tax","Tariffs","Minimum wage"]', 'Open market operations', 1, 5),
  (2, 'CDD stands for?', '["Customer Due Diligence","Cash Deposit Directive","Credit Default Data","Customer Data Dashboard"]', 'Customer Due Diligence', 0, 5),
  (2, 'Suspicious transactions should be reported to?', '["FIU/competent authority","Only customer","Media","No one"]', 'FIU/competent authority', 1, 5);
