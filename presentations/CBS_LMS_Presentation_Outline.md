# CBS LMS - Concise Presentation Outline

## 1. CBS LMS - Business Process Overview
- Three roles: Learner, Instructor, Sysadmin.
- The LMS manages training delivery, progress tracking, assessments, certificates, reports, and audit records.

## 2. LMS Workflow
1. Login - user accesses the LMS.
2. Publish Course - instructor creates course content, modules, and assessments.
3. Enroll - learner joins a course or starts assigned training.
4. Learn - learner completes modules and learning resources.
5. Assess - learner submits quiz or assessment.
6. Complete - progress and training history are recorded.
7. Certificate - PDF certificate is generated after passing.
8. Report - results are visible in reports and audit records.

## 3. People Who Use The System
- Learner: browse courses, enroll, complete modules, take assessments, download certificates.
- Instructor: create courses, add modules and assessments, publish training, track learner progress.
- Sysadmin: manage users and roles, configure settings, review reports and audit logs, maintain system data.

## 4. What The LMS Does
- Stores courses, modules, assessments, enrollments, results, certificates, and training history.
- Guides learners from enrollment to course completion.
- Automatically records progress and completion status.
- Issues PDF certificates after successful assessment.
- Provides reporting, notifications, announcements, leaderboard, and audit visibility.

## 5. Database Tables Used By The System
- Identity: users, profiles, user_roles, departments.
- Content: courses, course_modules, assessments, assessment_questions.
- Activity: enrollments, assessment_results, training_assignments, training_history.
- Operations: certifications, notifications, announcements, approval_requests, audit_logs.

## 6. Controls, Technology, and Next Steps
- Security: JWT authentication, role-based access, MFA-ready user model, audit logs.
- Technology: React + TypeScript, Node.js + Express, MySQL, PDF certificates.
- Next steps: confirm final workflow, test all 3 roles, verify reports, prepare demo data.
