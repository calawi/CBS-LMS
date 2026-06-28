-- Add columns expected by the API but missing from older lms schemas.
-- Safe to re-run in phpMyAdmin.

USE lms;

SET @schema = DATABASE();

SET @t = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @schema AND TABLE_NAME = 'courses' AND COLUMN_NAME = 'is_prerequisite_for_overseas');
SET @sql = IF(@t = 0, 'ALTER TABLE courses ADD COLUMN is_prerequisite_for_overseas TINYINT(1) NOT NULL DEFAULT 0 AFTER is_mandatory', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @t = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @schema AND TABLE_NAME = 'courses' AND COLUMN_NAME = 'thumbnail_url');
SET @sql = IF(@t = 0, 'ALTER TABLE courses ADD COLUMN thumbnail_url VARCHAR(512) NULL AFTER status', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
