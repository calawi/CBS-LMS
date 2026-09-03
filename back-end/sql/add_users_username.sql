-- Adds a dedicated "username" column to users, separate from profiles.employee_id
-- (employee_id already holds a different value - the internal CBS employee code, e.g. "CBS296" -
-- while username is the AD/miniOrange login name, e.g. "abdirahman.hanafi").
SET @schema = DATABASE();

SET @has_column = (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @schema
    AND TABLE_NAME = 'users'
    AND COLUMN_NAME = 'username'
);

SET @sql = IF(
  @has_column = 0,
  'ALTER TABLE users ADD COLUMN username VARCHAR(191) NULL AFTER email',
  'SELECT 1'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_index = (
  SELECT COUNT(*)
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = @schema
    AND TABLE_NAME = 'users'
    AND INDEX_NAME = 'uq_users_username'
);

SET @sql = IF(
  @has_index = 0,
  'ALTER TABLE users ADD UNIQUE KEY uq_users_username (username)',
  'SELECT 1'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
