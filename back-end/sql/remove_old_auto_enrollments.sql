-- Remove old auto-created learner enrollments from before course publish stopped auto-enrolling learners.
-- Safe guardrails:
-- - only zero-progress / in-progress / not-started rows
-- - keep assigned training rows
-- - keep rows with certifications
-- - keep rows with assessment results

DELETE e
FROM enrollments e
LEFT JOIN training_assignments ta
  ON ta.user_id = e.user_id
  AND ta.course_id = e.course_id
LEFT JOIN certifications cert
  ON cert.user_id = e.user_id
  AND cert.course_id = e.course_id
LEFT JOIN assessments a
  ON a.course_id = e.course_id
LEFT JOIN assessment_results ar
  ON ar.user_id = e.user_id
  AND ar.assessment_id = a.id
WHERE COALESCE(e.progress, 0) = 0
  AND COALESCE(e.status, 'in_progress') IN ('in_progress', 'not_started', 'pending')
  AND ta.id IS NULL
  AND cert.id IS NULL
  AND ar.id IS NULL;
