# System Mapping — CBS LMS

This file maps backend endpoints to the primary database tables and the frontend pages/hooks that use them.

## Endpoint → Tables → Frontend

- `GET /api/courses` → `courses` → `Courses.tsx`, `useCourses`
- `GET /api/courses/:id` → `courses`, `course_modules` → `CourseDetail.tsx`, `useCourseById`, `useCourseModules`
- `POST /api/lms/enrollments` → `enrollments`, `user_points` → `CourseDetail.tsx` (Enroll button), `useEnrollInCourse`
- `PUT /api/lms/enrollments/:id/progress` → `enrollments`, `training_history`, `user_points` → progress updates in `CourseDetail.tsx`, `useUpdateProgress`
- `GET /api/lms/course-modules/:courseId` → `course_modules`, `assessments`, `assessment_questions` → `CourseDetail.tsx`, modules sidebar, `useCourseModules`
- `GET /api/lms/assessments/course/:courseId` → `assessments` → final assessment check, `CourseDetail.tsx`, `useAssessmentForCourse`
- `GET /api/lms/assessment-questions/:assessmentId` → `assessment_questions` → `CourseQuiz` component, `useAssessmentQuestions`
- `POST /api/lms/assessment-results` → `assessment_results`, `certifications`, `enrollments` (on pass) → assessment submission flow, `CourseQuiz` and `CourseDetail`
- `POST /api/certificates/course/:courseId/generate` → `assessment_results`, `certifications`, `profiles`, `courses` → `CourseDetail` certificate button and `useCertifications`
- `GET/POST /api/auth/*` → `users`, `profiles`, `user_roles`, `password_resets` → `Auth.tsx`, `ForgotPassword.tsx`, `ResetPassword.tsx`
- `GET /api/lms/profiles` → `profiles`, `departments`, `users` → `Profile.tsx`, `AdminPanel.tsx`
- `GET /api/lms/training-assignments/me` → `training_assignments` → `MyLearning.tsx`, `UseMyTrainingAssignments`
- `POST /api/lms/training-assignments` → `training_assignments`, `notifications` → `AssignTraining.tsx`
- `GET /api/lms/certifications/me` → `certifications`, `courses` → `MyLearning.tsx`, `useCertifications`
- `GET /api/lms/announcements/active` → `announcements` → front page, `Index.tsx`
- `Audit & Logs` → `audit_logs` → `AuditLogs.tsx`

## Notes
- Many endpoints use JOINs to return related course/profile/course_module data in one response.
- Certificate generation uses Puppeteer (React-rendered templates) with PDF fallback (PDFKit); generated files are saved under `uploads/certificates` and path stored in `certifications.pdf_path`.
- Gamification writes to `user_points` and `user_badges` on enrollment, assessment, and course completion.

