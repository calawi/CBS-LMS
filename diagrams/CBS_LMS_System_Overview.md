# CBS LMS — System Overview

This document summarizes the database schema, backend API routes, and frontend pages/components to provide a clear understanding of the system and to inform DFD and architecture diagrams.

## Primary Database Tables (from `back-end/sql/recreate_lms_database.sql` & `brd_extended_schema.sql`)
- `users` — authentication accounts, MFA fields (`mfa_secret`, `mfa_enabled`).
- `profiles` — HR-style profile info (employee id, department, manager, contact, date_of_joining).
- `user_roles` — additional role assignments.
- `departments`
- `courses` — course metadata (title, description, status, mandatory flag, duration).
- `course_modules` — ordered modules for courses (content, video/resource links, duration).
- `enrollments` — user-course enrollment record, progress, status.
- `assessments` — course-linked assessments.
- `assessment_questions` — JSON options, correct answer, points.
- `assessment_results` — per-user assessment results and answers.
- `certifications` — issued certificates, expiry, `pdf_path` metadata.
- `training_plans` — personal training plans.
- `training_history` — completed courses / history records.
- `training_assignments` — assigned training tasks (due date, status).
- `approval_requests` — generic approval workflows.
- `user_points`, `user_badges` — gamification tables.
- `notifications` — in-app notifications.
- `password_resets` — password reset tokens (created by `brd_extended_schema.sql`).
- `announcements` — broadcast messages.
- `audit_logs` — system audit trail.
- `course_ratings` — course rating & feedback (from `brd_extended_schema.sql`).

## Key Backend Routes (file: `back-end/src/routes`)
- `auth.js` — register, login, MFA setup/enable/disable, forgot/reset password, `GET /api/auth/me`.
  - Tables used: `users`, `profiles`, `user_roles`, `password_resets`, `audit_logs`.

- `courses.js` — `GET /api/courses`, `GET /api/courses/:id` (staff sees all; learners see published only).
  - Tables used: `courses`, `course_modules`, `course_ratings` (ratings endpoints elsewhere).

- `certificates.js` — generate certificates: `POST /api/certificates/course/:courseId/generate` and `POST /api/certificates/:certificationId/generate`.
  - Flow: validate assessment passed → insert `certifications` → render PDF (Puppeteer or PDFKit) → save under `uploads/certificates` → update `certifications.pdf_path`.
  - Tables used: `assessment_results`, `assessments`, `certifications`, `courses`, `profiles`.

- `notifications.js` — create/list notifications (in-app + email enqueue).
  - Tables used: `notifications`.

- `lms.js` and `approvals.js` — various LMS admin workflows, enrollments, training assignments and approvals.
  - Tables used: `enrollments`, `training_assignments`, `approval_requests`, `training_history`.

- `departments.js`, `health.js`, `branding.js` — supporting endpoints.

## Frontend Pages & API usage (file: `front-end/src/pages` and `front-end/src/hooks/useData.ts`)
- `CourseDetail.tsx` — uses hooks: `useCourseById`, `useCourseModules`, `useEnrollmentForCourse`, `useEnrollInCourse`, `useAssessmentForCourse`, `useAssessmentQuestions`, `useAssessmentResults`, `useUpdateProgress`. Maps to endpoints:
  - `GET /api/courses/:id`
  - `GET /api/lms/course-modules/:courseId`
  - `GET /api/lms/enrollments/me/:courseId`
  - `POST /api/lms/enrollments`
  - `PUT /api/lms/enrollments/:enrollmentId/progress`
  - `GET /api/lms/assessments/course/:courseId`
  - `GET /api/lms/assessment-questions/:assessmentId`
  - `GET /api/lms/assessment-results/me?assessmentId=...`

- Authentication / account pages: `Auth.tsx`, `ForgotPassword.tsx`, `ResetPassword.tsx` map to `/api/auth/*`.

- Admin & reporting pages: `AdminPanel.tsx`, `AuditLogs.tsx`, `Reports.tsx`, `LmsSettings.tsx` use admin endpoints and `audit_logs`.

- Learning views: `MyLearning.tsx`, `TrainingHistory.tsx`, `AssignTraining.tsx`, `TeamTraining.tsx` map to `enrollments`, `training_history`, `training_assignments`.

- Other UI pieces: `Leaderboard.tsx` uses `user_points`/`user_badges` endpoints (gamification).

## System Flows — High Level
1. User registers/logs in → `users`, `profiles` created/queried → JWT issued.
2. Instructors create `courses` and `course_modules` → published to learners.
3. Learner enrolls (`enrollments`) → progress tracked; modules completed update `progress`.
4. Learner completes course → final `assessments` available → results stored in `assessment_results`.
5. If passed → certificate issued: create `certifications`, render PDF, save file, update `pdf_path` and `certifications.pdf_generated_at`.
6. Notifications/announcements use `notifications` and `announcements` tables; audit events written to `audit_logs`.
7. Admin workflows (approvals, assignments) use `approval_requests` and `training_assignments`.
8. Gamification updates `user_points` and awards `user_badges`.

## Suggested DFD / Diagram Improvements
- Level 0: show `Learners / Instructors / Admins` → `Web App (React)` → `API Server (Express)` → `Database (MySQL)` and `File Storage (uploads/certificates)` and `Email Service`.

- Level 1: expand `API Server` into processes: `Auth`, `Course Management`, `Enrollment & Progress`, `Assessments`, `Certificate Generation`, `Notifications`, `Gamification`, `Audit` and link to exact tables listed above.

- Level 2 (certificate generation): already created at `diagrams/certificate_generation.mmd` — confirms flow: assessment check → insert certifications → render (puppeteer/pdfkit) → save file → update DB → send notification.

## Files I created/updated
- `diagrams/CBS_LMS_Business_Process.mmd` — business process overview for CBS LMS.
- `diagrams/certificate_generation.mmd` — Level 2 certificate generation DFD.
- `diagrams/CBS_LMS_Business_Process.svg` and `@2x.png`, `certificate_generation.svg` and `@2x.png` — exported images.
- `diagrams/CBS_LMS_System_Overview.md` — this summary file.

## Next recommended actions
- I can convert the PNGs to JPG (confirm if you want me to install `sharp` and run conversion here).
- I can produce a Level 1 Mermaid DFD file auto-generated from the table/process mapping so it's exact and linkable to DB tables.
- I can produce a cleaned printable PNG matching the sample's styling (colors/rounded boxes) — tell me preferred color palette and size.

If you'd like, I will now:
- Convert the PNGs to JPG, or
- Generate the Level 1 DFD mermaid file (text) from this mapping.

Which should I do next?