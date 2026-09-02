-- Fix gamification tables for leaderboard (missing columns / wrong schema).
-- Safe to re-run.

USE lms;

SET @schema = DATABASE();

-- user_points: allow multiple events per user + reason + created_at
SET @t = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @schema AND TABLE_NAME = 'user_points' AND COLUMN_NAME = 'reason');
SET @sql = IF(@t = 0, 'ALTER TABLE user_points ADD COLUMN reason VARCHAR(255) NULL AFTER points', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @t = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @schema AND TABLE_NAME = 'user_points' AND COLUMN_NAME = 'created_at');
SET @sql = IF(@t = 0, 'ALTER TABLE user_points ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP AFTER reason', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @t = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = @schema AND TABLE_NAME = 'user_points' AND INDEX_NAME = 'idx_points_user');
SET @sql = IF(@t = 0, 'ALTER TABLE user_points ADD KEY idx_points_user (user_id)', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- user_badges: badge_icon for leaderboard display
SET @t = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @schema AND TABLE_NAME = 'user_badges' AND COLUMN_NAME = 'badge_icon');
SET @sql = IF(@t = 0, 'ALTER TABLE user_badges ADD COLUMN badge_icon VARCHAR(64) NULL AFTER badge_name', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- Ensure tables exist (older DBs)
CREATE TABLE IF NOT EXISTS user_points (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  points INT NOT NULL DEFAULT 0,
  reason VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_points_user (user_id),
  CONSTRAINT fk_points_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS user_badges (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  badge_name VARCHAR(128) NOT NULL,
  badge_icon VARCHAR(64) NULL,
  awarded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_badges_user (user_id),
  CONSTRAINT fk_badges_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
