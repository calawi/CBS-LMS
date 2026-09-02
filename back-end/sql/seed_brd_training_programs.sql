-- BRD training programs: Onboarding, HR Policy, Legal & Regulatory, Code of Conduct, Compliance
-- Run in phpMyAdmin on database `lms` (safe to re-run: clears demo courses 1-20 only)

USE lms;

SET FOREIGN_KEY_CHECKS = 0;

DELETE FROM assessment_results WHERE assessment_id IN (SELECT id FROM assessments WHERE course_id BETWEEN 1 AND 50);
DELETE FROM assessment_questions WHERE assessment_id IN (SELECT id FROM assessments WHERE course_id BETWEEN 1 AND 50);
DELETE FROM assessments WHERE course_id BETWEEN 1 AND 50;
DELETE FROM course_modules WHERE course_id BETWEEN 1 AND 50;
DELETE FROM enrollments WHERE course_id BETWEEN 1 AND 50;
DELETE FROM certifications WHERE course_id BETWEEN 1 AND 50;
DELETE FROM training_assignments WHERE course_id BETWEEN 1 AND 50;
DELETE FROM courses WHERE id BETWEEN 1 AND 50;

SET FOREIGN_KEY_CHECKS = 1;

INSERT INTO courses (id, title, description, category, level, duration_hours, modules_count, status, is_mandatory) VALUES
-- A. Onboarding
(1, 'Company Overview', 'Introduction to CBS mandate, history, and strategic role.', 'Onboarding', 'Beginner', 1.5, 2, 'Published', 1),
(2, 'Organizational Structure', 'Departments, reporting lines, and key functions.', 'Onboarding', 'Beginner', 1.5, 2, 'Published', 1),
(3, 'Vision, Mission and Values', 'CBS vision, mission, and core values for all staff.', 'Onboarding', 'Beginner', 1, 2, 'Published', 1),
(4, 'Key Policies Introduction', 'Overview of essential workplace and operational policies.', 'Onboarding', 'Beginner', 2, 2, 'Published', 0),
-- B. HR Policy Training
(5, 'Leave Policies', 'Annual leave, sick leave, and approval procedures.', 'HR Policy Training', 'Beginner', 1, 2, 'Published', 1),
(6, 'Attendance Rules', 'Working hours, punctuality, and attendance reporting.', 'HR Policy Training', 'Beginner', 1, 2, 'Published', 1),
(7, 'Workplace Conduct', 'Professional behavior and disciplinary framework.', 'HR Policy Training', 'Beginner', 1.5, 2, 'Published', 1),
(8, 'Compensation & Benefits Overview', 'Pay structure, allowances, and staff benefits.', 'HR Policy Training', 'Beginner', 1.5, 2, 'Published', 0),
-- C. Legal & Regulatory
(9, 'CBS Act Overview', 'Core provisions of the CBS Act and supervisory role.', 'Legal & Regulatory', 'Intermediate', 2, 2, 'Published', 1),
(10, 'Industry Compliance Requirements', 'Sector regulations and supervisory expectations.', 'Legal & Regulatory', 'Intermediate', 2, 2, 'Published', 1),
-- D. Code of Conduct
(11, 'Ethical Behavior', 'Ethics standards and decision-making for CBS staff.', 'Code of Conduct', 'Beginner', 1.5, 2, 'Published', 1),
(12, 'Anti-Harassment Policies', 'Prevention, reporting, and support mechanisms.', 'Code of Conduct', 'Beginner', 1.5, 2, 'Published', 1),
(13, 'Workplace Professionalism', 'Professional communication and conduct expectations.', 'Code of Conduct', 'Beginner', 1, 2, 'Published', 1),
-- E. Compliance
(14, 'Information Security Awareness', 'Protecting systems, data, and access credentials.', 'Compliance', 'Intermediate', 2, 2, 'Published', 1),
(15, 'Data Privacy & Protection', 'Personal data handling and privacy obligations.', 'Compliance', 'Intermediate', 1.5, 2, 'Published', 1),
(16, 'Anti-Money Laundering (AML)', 'AML obligations, CDD, and suspicious activity reporting.', 'Compliance', 'Intermediate', 2.5, 3, 'Published', 1),
(17, 'Anti-Bribery & Corruption', 'ABC policies, gifts, and conflicts of interest.', 'Compliance', 'Intermediate', 1.5, 2, 'Published', 1),
(18, 'Risk Management Basics', 'Operational risk awareness and escalation.', 'Compliance', 'Beginner', 2, 2, 'Published', 1);

INSERT INTO course_modules (course_id, title, content, duration_minutes, order_index) VALUES
(1, 'Who We Are', 'CBS role in the national economy.', 45, 0),
(1, 'How We Operate', 'High-level operating model.', 45, 1),
(2, 'Departments & Units', 'Overview of CBS departments.', 45, 0),
(2, 'Roles & Responsibilities', 'How teams collaborate.', 45, 1),
(3, 'Vision & Mission', 'Strategic direction.', 30, 0),
(3, 'Core Values', 'Expected behaviors and culture.', 30, 1),
(4, 'HR & Admin Policies', 'Key HR policy summary.', 60, 0),
(4, 'Security & IT Policies', 'Acceptable use and security basics.', 60, 1),
(5, 'Types of Leave', 'Leave categories and entitlements.', 30, 0),
(5, 'Request Process', 'How to apply and approvals.', 30, 1),
(6, 'Working Hours', 'Standard hours and flexibility.', 30, 0),
(6, 'Absence Reporting', 'Procedures for unplanned absence.', 30, 1),
(7, 'Standards of Conduct', 'Expected workplace behavior.', 45, 0),
(7, 'Disciplinary Process', 'Fair process overview.', 45, 1),
(8, 'Pay & Allowances', 'Compensation structure.', 45, 0),
(8, 'Benefits Package', 'Health, pension, and other benefits.', 45, 1),
(9, 'CBS Act Foundations', 'Legal mandate and powers.', 60, 0),
(9, 'Supervisory Framework', 'Regulation and oversight.', 60, 1),
(10, 'Regulatory Landscape', 'Key laws and guidelines.', 60, 0),
(10, 'Compliance Obligations', 'What staff must know.', 60, 1),
(11, 'Ethics Principles', 'Integrity and accountability.', 45, 0),
(11, 'Ethical Dilemmas', 'How to raise concerns.', 45, 1),
(12, 'Harassment Definitions', 'What constitutes harassment.', 45, 0),
(12, 'Reporting Channels', 'Safe reporting and support.', 45, 1),
(13, 'Professional Communication', 'Email, meetings, and conduct.', 30, 0),
(13, 'Dress & Representation', 'Professional appearance.', 30, 1),
(14, 'Passwords & Access', 'Credential hygiene.', 60, 0),
(14, 'Phishing & Social Engineering', 'Recognizing threats.', 60, 1),
(15, 'Data Classification', 'Sensitive vs public data.', 45, 0),
(15, 'Privacy Rights', 'Handling personal information.', 45, 1),
(16, 'AML Legal Framework', 'Laws and FATF alignment.', 50, 0),
(16, 'CDD & Monitoring', 'Customer due diligence.', 50, 1),
(16, 'Suspicious Reporting', 'When and how to report.', 50, 2),
(17, 'Bribery Risks', 'Red flags and prohibited conduct.', 45, 0),
(17, 'Gifts & Hospitality', 'Approval thresholds.', 45, 1),
(18, 'Risk Types', 'Operational, credit, market overview.', 60, 0),
(18, 'Escalation & Controls', 'When to escalate issues.', 60, 1);

INSERT INTO assessments (id, course_id, title, description, passing_score, time_limit_minutes) VALUES
(1, 1, 'Company Overview Quiz', 'Check understanding of CBS overview.', 70, 15),
(2, 16, 'AML Essentials Quiz', 'AML knowledge check.', 70, 20);

INSERT INTO assessment_questions (assessment_id, question, options, correct_answer, order_index, points) VALUES
(1, 'What is a primary role of the central bank?', '["Price stability","Retail banking","Tax collection","Trade licensing"]', 'Price stability', 0, 5),
(1, 'Staff should report security incidents to?', '["IT/Security team","Social media","External vendors only","No one"]', 'IT/Security team', 1, 5),
(2, 'CDD stands for?', '["Customer Due Diligence","Cash Deposit Directive","Credit Default Data","Customer Data Dashboard"]', 'Customer Due Diligence', 0, 5),
(2, 'Suspicious transactions should be reported to?', '["FIU/competent authority","Only the customer","Media","No one"]', 'FIU/competent authority', 1, 5);

-- Sample enrollments for demo employee (user id 3)
INSERT INTO enrollments (user_id, course_id, status, progress, enrolled_at) VALUES
(3, 1, 'in_progress', 50, NOW()),
(3, 5, 'not_started', 0, NOW()),
(3, 16, 'not_started', 0, NOW())
ON DUPLICATE KEY UPDATE status = VALUES(status), progress = VALUES(progress);
