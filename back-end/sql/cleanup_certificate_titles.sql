USE lms;

-- Replace certificate titles that ended with "Quiz" using the course title.
UPDATE certifications cert
JOIN courses c ON c.id = cert.course_id
SET cert.title = c.title
WHERE cert.title LIKE '%Quiz';

