SET @schema = DATABASE();

SET @has_column = (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @schema
    AND TABLE_NAME = 'courses'
    AND COLUMN_NAME = 'created_by_user_id'
);

SET @sql = IF(
  @has_column = 0,
  'ALTER TABLE courses ADD COLUMN created_by_user_id INT NULL AFTER thumbnail_url',
  'SELECT 1'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
