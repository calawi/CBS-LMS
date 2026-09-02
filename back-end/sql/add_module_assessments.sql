-- Add module_id to assessments table if it does not already exist
SET @dbname = DATABASE();
SET @tablename = 'assessments';
SET @columnname = 'module_id';
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = @dbname
     AND TABLE_NAME = @tablename
     AND COLUMN_NAME = @columnname) > 0,
  'SELECT 1',
  'ALTER TABLE assessments ADD COLUMN module_id INT NULL, ADD CONSTRAINT fk_assessments_module FOREIGN KEY (module_id) REFERENCES course_modules(id) ON DELETE CASCADE'
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
