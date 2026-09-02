-- CBS LMS full database recreation script
-- Use this in phpMyAdmin SQL tab, then run.

DROP DATABASE IF EXISTS lms;
CREATE DATABASE lms CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE lms;

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  role VARCHAR(64) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  mfa_secret VARCHAR(128) NULL,
  mfa_enabled TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE departments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_department_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE profiles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  job_title VARCHAR(255) NULL,
  employee_id VARCHAR(128) NULL,
  department_id INT NULL,
  location VARCHAR(255) NULL,
  phone VARCHAR(64) NULL,
  date_of_joining DATE NULL,
  manager_user_id INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_profiles_user (user_id),
  KEY idx_profiles_employee (employee_id),
  CONSTRAINT fk_profiles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE user_roles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  role VARCHAR(64) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_user_role (user_id, role),
  KEY idx_user_roles_user (user_id),
  CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE courses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT NULL,
  category VARCHAR(128) NULL,
  level VARCHAR(64) NULL,
  duration_hours DECIMAL(6,2) DEFAULT 0,
  modules_count INT DEFAULT 0,
  status VARCHAR(64) DEFAULT 'Published',
  is_mandatory TINYINT(1) NOT NULL DEFAULT 0,
  is_prerequisite_for_overseas TINYINT(1) NOT NULL DEFAULT 0,
  thumbnail_url VARCHAR(512) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE course_modules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  course_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  content LONGTEXT NULL,
  duration_minutes INT DEFAULT 0,
  order_index INT DEFAULT 0,
  video_url TEXT NULL,
  resource_url TEXT NULL,
  resource_name VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_modules_course (course_id),
  CONSTRAINT fk_modules_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE enrollments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  course_id INT NOT NULL,
  status VARCHAR(32) DEFAULT 'not_started',
  progress DECIMAL(5,2) DEFAULT 0,
  enrolled_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_enrollment (user_id, course_id),
  KEY idx_enrollment_user (user_id),
  KEY idx_enrollment_course (course_id),
  CONSTRAINT fk_enrollments_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_enrollments_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE assessments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  course_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NULL,
  passing_score INT DEFAULT 70,
  time_limit_minutes INT DEFAULT 20,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_assessments_course (course_id),
  CONSTRAINT fk_assessments_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE assessment_questions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  assessment_id INT NOT NULL,
  question TEXT NOT NULL,
  options JSON NOT NULL,
  correct_answer VARCHAR(255) NOT NULL,
  order_index INT DEFAULT 0,
  points INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_questions_assessment (assessment_id),
  CONSTRAINT fk_questions_assessment FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE assessment_results (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  assessment_id INT NOT NULL,
  score DECIMAL(5,2) DEFAULT 0,
  passed TINYINT(1) DEFAULT 0,
  answers JSON NULL,
  completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_results_user (user_id),
  KEY idx_results_assessment (assessment_id),
  CONSTRAINT fk_results_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_results_assessment FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE certifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  course_id INT NOT NULL,
  issued_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NULL,
  certificate_no VARCHAR(128) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_cert_user_course (user_id, course_id),
  KEY idx_cert_course (course_id),
  CONSTRAINT fk_cert_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_cert_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE training_plans (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NULL,
  status VARCHAR(32) DEFAULT 'pending',
  target_date DATE NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_training_plans_user (user_id),
  CONSTRAINT fk_training_plans_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE training_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  course_id INT NOT NULL,
  completed_at DATETIME NULL,
  score DECIMAL(5,2) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_training_history_user (user_id),
  CONSTRAINT fk_training_history_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_training_history_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE approval_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  type VARCHAR(64) NOT NULL,
  status VARCHAR(32) DEFAULT 'pending',
  details JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_approval_user (user_id),
  CONSTRAINT fk_approval_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE user_points (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  points INT NOT NULL DEFAULT 0,
  reason VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_points_user (user_id),
  CONSTRAINT fk_points_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE user_badges (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  badge_name VARCHAR(128) NOT NULL,
  badge_icon VARCHAR(64) NULL,
  awarded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_badges_user (user_id),
  CONSTRAINT fk_badges_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_notifications_user (user_id),
  CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE password_resets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  token_hash CHAR(64) NOT NULL,
  expires_at DATETIME NOT NULL,
  used_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_password_resets_user (user_id),
  KEY idx_password_resets_token (token_hash),
  CONSTRAINT fk_password_resets_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE training_assignments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  course_id INT NOT NULL,
  assigned_by_user_id INT NULL,
  due_at DATETIME NULL,
  is_required TINYINT(1) NOT NULL DEFAULT 1,
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_user_course_assignment (user_id, course_id),
  KEY idx_assignments_user (user_id),
  KEY idx_assignments_due (due_at),
  CONSTRAINT fk_assignments_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_assignments_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE announcements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  audience ENUM('all','learners','managers') NOT NULL DEFAULT 'all',
  starts_at DATETIME NULL,
  ends_at DATETIME NULL,
  created_by_user_id INT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE audit_logs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  actor_user_id INT NULL,
  action VARCHAR(128) NOT NULL,
  entity_type VARCHAR(64) NULL,
  entity_id VARCHAR(64) NULL,
  metadata JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_audit_actor (actor_user_id),
  KEY idx_audit_action (action),
  KEY idx_audit_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Demo users; password for all is: 123456
INSERT INTO users (id, email, password_hash, full_name, role, is_active, mfa_enabled)
VALUES
  (1, 'admin@cbs.gov.so', '$2a$10$AhdAQUJhFjcq2zMwMl30weMvaUHYZuERKYTtHE5OWRh9iv4G0Ma6S', 'CBS Admin', 'sysadmin', 1, 0),
  (2, 'instructor@cbs.gov.so', '$2a$10$AhdAQUJhFjcq2zMwMl30weMvaUHYZuERKYTtHE5OWRh9iv4G0Ma6S', 'Demo Instructor', 'instructor', 1, 0),
  (3, 'employee@cbs.gov.so', '$2a$10$AhdAQUJhFjcq2zMwMl30weMvaUHYZuERKYTtHE5OWRh9iv4G0Ma6S', 'Demo Employee', 'learner', 1, 0);

INSERT INTO departments (id, name) VALUES
  (1, 'Airport Branch'),
  (2, 'Baidoa Branch'),
  (3, 'Banking Operations Department'),
  (4, 'Business Group'),
  (5, 'Currency Department'),
  (6, 'Dhusamareb Branch'),
  (7, 'Executive'),
  (8, 'Financial Affairs Department'),
  (9, 'Financial Markets Department'),
  (10, 'Governor Office'),
  (11, 'Human Resource Department'),
  (12, 'Internal Audit Department'),
  (13, 'IT Department'),
  (14, 'Research & Statistics Department'),
  (15, 'Seaport Branch'),
  (16, 'Supervision & Licensing Department'),
  (17, 'Support Services Department');

INSERT INTO profiles (user_id, full_name, job_title, employee_id, department_id)
VALUES
  (1, 'CBS Admin', 'System Administrator', 'CBS-ADM-001', 4),
  (2, 'Demo Instructor', 'Training Manager', 'CBS-INS-001', 1),
  (3, 'Demo Employee', 'Analyst', 'CBS-EMP-001', 2);

INSERT INTO user_roles (user_id, role)
VALUES
  (1, 'sysadmin'),
  (2, 'instructor'),
  (3, 'learner');

INSERT INTO courses (id, title, description, category, level, duration_hours, modules_count, status, is_mandatory)
VALUES
  (1, 'Central Banking Fundamentals', 'Core central banking concepts for CBS staff.', 'Onboarding', 'Beginner', 3, 3, 'Published', 1),
  (2, 'AML Essentials', 'AML regulatory and practical essentials.', 'Compliance', 'Intermediate', 2, 2, 'Published', 1),
  (3, 'Leadership Development', 'Leadership skills for teams and managers.', 'Leadership', 'Intermediate', 4, 4, 'Published', 0);

INSERT INTO course_modules (course_id, title, content, duration_minutes, order_index)
VALUES
  (1, 'Mandate and Objectives', 'CBS mandate and price stability.', 45, 0),
  (1, 'Policy Instruments', 'OMO, reserve requirements, policy rate.', 60, 1),
  (1, 'Governance and Structure', 'CBS governance and departments.', 45, 2),
  (2, 'AML Legal Framework', 'FATF standards and local regulations.', 45, 0),
  (2, 'CDD and Reporting', 'CDD, EDD, suspicious transaction reporting.', 45, 1),
  (3, 'Leading Teams', 'Practical people leadership methods.', 60, 0);

INSERT INTO enrollments (user_id, course_id, status, progress, enrolled_at)
VALUES
  (3, 1, 'in_progress', 40, NOW()),
  (3, 2, 'not_started', 0, NOW());

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

INSERT INTO announcements (title, body, audience, is_active)
VALUES
  ('Welcome to CBS LMS', 'Your onboarding and compliance learning is ready.', 'all', 1),
  ('Compliance Reminder', 'Complete mandatory compliance courses before deadlines.', 'learners', 1);

