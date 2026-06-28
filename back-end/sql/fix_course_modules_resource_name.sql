-- Add resource_name for course file uploads (safe to re-run).
USE lms;

SET @schema = DATABASE();
SET @t = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @schema AND TABLE_NAME = 'course_modules' AND COLUMN_NAME = 'resource_name'
);
SET @sql = IF(
  @t = 0,
  'ALTER TABLE course_modules ADD COLUMN resource_name VARCHAR(255) NULL AFTER resource_url',
  'SELECT 1'
);
PREPARE s FROM @sql;
EXECUTE s;
DEALLOCATE PREPARE s;
