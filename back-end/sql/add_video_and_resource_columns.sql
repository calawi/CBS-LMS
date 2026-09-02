USE lms;

ALTER TABLE course_modules
  ADD COLUMN video_url TEXT NULL AFTER content,
  ADD COLUMN resource_url TEXT NULL AFTER video_url,
  ADD COLUMN resource_name VARCHAR(255) NULL AFTER resource_url;

