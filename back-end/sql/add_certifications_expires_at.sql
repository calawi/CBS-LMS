USE lms;

-- Add expires_at only if it is missing (safe to re-run; avoids #1060 duplicate column).
SET @col_exists := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'certifications'
    AND COLUMN_NAME = 'expires_at'
);

SET @ddl := IF(
  @col_exists = 0,
  'ALTER TABLE certifications ADD COLUMN expires_at DATETIME NULL AFTER issued_at',
  'SELECT 1 AS expires_at_already_present'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Backfill rows that still have no expiry: 12 months from issue date.
UPDATE certifications
SET expires_at = DATE_ADD(issued_at, INTERVAL 12 MONTH)
WHERE expires_at IS NULL AND issued_at IS NOT NULL;
