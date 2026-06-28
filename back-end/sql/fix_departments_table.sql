-- Create departments table (required by profiles and team views).
-- Safe to re-run.

USE lms;

CREATE TABLE IF NOT EXISTS departments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_department_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO departments (id, name) VALUES
  (1, 'Airport Branch'),
  (2, 'Baidoa Branch'),
  (3, 'Banking Operations Department'),
  (4, 'Business Group'),
  (5, 'Currency Department'),
  (6, 'Dhusamareb Branch'),
  (7, 'Executive'),
  (8, 'Financial Affairs Department'),
  (9, 'Financial Markets Department'),
  (10, 'Governor Office'),
  (11, 'Human Resource Department'),
  (12, 'Internal Audit Department'),
  (13, 'IT Department'),
  (14, 'Research & Statistics Department'),
  (15, 'Seaport Branch'),
  (16, 'Supervision & Licensing Department'),
  (17, 'Support Services Department')
ON DUPLICATE KEY UPDATE name = VALUES(name);
