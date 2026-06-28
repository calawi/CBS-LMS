-- Reset ALL users to password: 123456
-- Run in phpMyAdmin on database `lms` after selecting the lms database.
-- Hash generated with bcrypt cost 10 (matches back-end bcryptjs).

USE lms;

UPDATE users
SET password_hash = '$2a$10$OtWnzg1x2VtAEbG/nmmOFuEiN7E6vC9K07tXGSWYryfiXrcavG9BO'
WHERE email IN ('admin@cbs.gov.so', 'instructor@cbs.gov.so', 'employee@cbs.gov.so');

-- Optional: reset every user (uncomment if you want all accounts same password)
-- UPDATE users SET password_hash = '$2a$10$OtWnzg1x2VtAEbG/nmmOFuEiN7E6vC9K07tXGSWYryfiXrcavG9BO';
