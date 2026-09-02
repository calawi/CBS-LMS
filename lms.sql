-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Sep 02, 2026 at 08:20 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `lms`
--

-- --------------------------------------------------------

--
-- Table structure for table `announcements`
--

CREATE TABLE `announcements` (
  `id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `body` text NOT NULL,
  `audience` enum('all','learners','managers') NOT NULL DEFAULT 'all',
  `starts_at` datetime DEFAULT NULL,
  `ends_at` datetime DEFAULT NULL,
  `created_by_user_id` int(11) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `approval_requests`
--

CREATE TABLE `approval_requests` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `type` varchar(64) NOT NULL,
  `status` varchar(32) DEFAULT 'pending',
  `details` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`details`)),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `assessments`
--

CREATE TABLE `assessments` (
  `id` int(11) NOT NULL,
  `course_id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `passing_score` int(11) DEFAULT 70,
  `time_limit_minutes` int(11) DEFAULT 20,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `module_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `assessments`
--

INSERT INTO `assessments` (`id`, `course_id`, `title`, `description`, `passing_score`, `time_limit_minutes`, `created_at`, `updated_at`, `module_id`) VALUES
(13, 15, 'Onboarding Assessment', '3 questions, 15 total marks, 11 pass marks.', 70, 30, '2026-06-10 11:26:23', '2026-06-10 11:26:23', NULL),
(14, 16, 'HR Policy Training Assessment', '3 questions, 15 total marks, 11 pass marks.', 70, 30, '2026-06-10 13:39:17', '2026-06-10 13:39:17', NULL),
(15, 17, 'Introduction Quiz', 'Quiz for module: Introduction', 80, 15, '2026-06-11 06:23:08', '2026-06-11 06:23:08', 38),
(16, 17, 'Lesson 1 Quiz', 'Quiz for module: Lesson 1', 80, 15, '2026-06-11 06:23:08', '2026-06-11 06:23:08', 39),
(17, 17, 'Lesson 2 Quiz', 'Quiz for module: Lesson 2', 80, 15, '2026-06-11 06:23:08', '2026-06-11 06:23:08', 40),
(18, 17, 'Legal & Regulatory Assessment', '3 questions, 15 total marks, 11 pass marks.', 70, 30, '2026-06-11 06:23:08', '2026-06-11 06:23:08', NULL),
(19, 18, 'Introduction Quiz', 'Quiz for module: Introduction', 80, 15, '2026-06-29 12:06:00', '2026-06-29 12:06:00', 41),
(20, 18, 'Security Compliance Assessment', '1 questions, 5 total marks, 4 pass marks.', 70, 30, '2026-06-29 12:06:00', '2026-06-29 12:06:00', NULL),
(21, 19, 'Introduction Quiz', 'Quiz for module: Introduction', 80, 15, '2026-07-05 08:21:45', '2026-07-05 08:21:45', 42),
(22, 19, 'Code of Conduct Assessment', '3 questions, 130 total marks, 91 pass marks.', 70, 30, '2026-07-05 08:21:45', '2026-07-05 08:21:45', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `assessment_questions`
--

CREATE TABLE `assessment_questions` (
  `id` int(11) NOT NULL,
  `assessment_id` int(11) NOT NULL,
  `question` text NOT NULL,
  `options` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`options`)),
  `correct_answer` varchar(255) NOT NULL,
  `order_index` int(11) DEFAULT 0,
  `points` int(11) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `assessment_questions`
--

INSERT INTO `assessment_questions` (`id`, `assessment_id`, `question`, `options`, `correct_answer`, `order_index`, `points`, `created_at`, `updated_at`) VALUES
(35, 13, 'What is Onboarding ?', '[\"Test 1\",\"Test 2\",\"Test 3\"]', 'Test 1', 0, 5, '2026-06-10 11:26:23', '2026-06-10 11:26:23'),
(36, 13, 'What is hr ?', '[\"Test 1\",\"Test 2\",\"Test 3\"]', 'Test 2', 1, 5, '2026-06-10 11:26:23', '2026-06-10 11:26:23'),
(37, 13, 'What is policy ?', '[\"Test 1\",\"Test 2\",\"Test 3\"]', 'Test 3', 2, 5, '2026-06-10 11:26:23', '2026-06-10 11:26:23'),
(38, 14, 'What is hr ?', '[\"Test 1\",\"Test 2\",\"Test 3\"]', 'Test 1', 0, 5, '2026-06-10 13:39:17', '2026-06-10 13:39:17'),
(39, 14, 'What is CMS ?', '[\"Test 1\",\"Test 2\",\"Test 3\"]', 'Test 2', 1, 5, '2026-06-10 13:39:17', '2026-06-10 13:39:17'),
(40, 14, 'What CRM ?', '[\"Test 1\",\"Test 2\",\"Test 3\"]', 'Test 3', 2, 5, '2026-06-10 13:39:17', '2026-06-10 13:39:17'),
(41, 15, 'What is Legal ?', '[\"Test 1\",\"Test 2\",\"Test 3\"]', 'Test 1', 0, 5, '2026-06-11 06:23:08', '2026-06-11 06:23:08'),
(42, 16, 'What is Hr ?', '[\"Test 1\",\"Test 2\",\"Test 3\"]', 'Test 1', 0, 5, '2026-06-11 06:23:08', '2026-06-11 06:23:08'),
(43, 17, 'What is short ?', '[\"Test 1\",\"Test 2\",\"Test 3\"]', 'Test 1', 0, 5, '2026-06-11 06:23:08', '2026-06-11 06:23:08'),
(44, 18, 'What is the best ?', '[\"Test 1\",\"Test 2\",\"Test 3\"]', 'Test 1', 0, 5, '2026-06-11 06:23:08', '2026-06-11 06:23:08'),
(45, 18, 'What is HCM ?', '[\"Test 1\",\"Test 2\",\"Test 3\"]', 'Test 2', 1, 5, '2026-06-11 06:23:08', '2026-06-11 06:23:08'),
(46, 18, 'What HCI ?', '[\"Test 1\",\"Test 2\",\"Test 3\"]', 'Test 3', 2, 5, '2026-06-11 06:23:08', '2026-06-11 06:23:08'),
(47, 19, 'What is', '[\"Test 1\",\"Test 2\"]', 'Test 2', 0, 5, '2026-06-29 12:06:00', '2026-06-29 12:06:00'),
(48, 20, 'Tes', '[\"test 1\",\"Tets\",\"Tes \"]', 'Tes ', 0, 5, '2026-06-29 12:06:00', '2026-06-29 12:06:00'),
(49, 21, 'What is policy?', '[\"Test 1\",\"Test 2\",\"Test 3\"]', 'Test 3', 0, 5, '2026-07-05 08:21:45', '2026-07-05 08:21:45'),
(50, 22, 'What is policy ?', '[\"Test 1\",\"Test 2\",\"Test 3\"]', 'Test 1', 0, 120, '2026-07-05 08:21:45', '2026-07-05 08:21:45'),
(51, 22, 'What is code ?', '[\"Test 1\",\"Test 2\",\"Test 3\"]', 'Test 2', 1, 5, '2026-07-05 08:21:45', '2026-07-05 08:21:45'),
(52, 22, 'What is conduct ?', '[\"Test 1\",\"Test 2\",\"Test 3\"]', 'Test 3', 2, 5, '2026-07-05 08:21:45', '2026-07-05 08:21:45');

-- --------------------------------------------------------

--
-- Table structure for table `assessment_results`
--

CREATE TABLE `assessment_results` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `assessment_id` int(11) NOT NULL,
  `score` decimal(5,2) DEFAULT 0.00,
  `passed` tinyint(1) DEFAULT 0,
  `answers` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`answers`)),
  `completed_at` datetime DEFAULT current_timestamp(),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `assessment_results`
--

INSERT INTO `assessment_results` (`id`, `user_id`, `assessment_id`, `score`, `passed`, `answers`, `completed_at`, `created_at`) VALUES
(36, 14, 15, 100.00, 1, '{\"41\":\"Test 1\"}', '2026-08-24 11:09:00', '2026-08-24 08:09:00'),
(37, 14, 16, 100.00, 1, '{\"42\":\"Test 1\"}', '2026-08-24 11:09:26', '2026-08-24 08:09:26'),
(38, 14, 17, 100.00, 1, '{\"43\":\"Test 1\"}', '2026-08-24 11:09:41', '2026-08-24 08:09:41'),
(39, 14, 18, 100.00, 1, '{\"44\":\"Test 1\",\"45\":\"Test 2\",\"46\":\"Test 3\"}', '2026-08-24 11:09:55', '2026-08-24 08:09:55'),
(40, 14, 14, 100.00, 1, '{\"38\":\"Test 1\",\"39\":\"Test 2\",\"40\":\"Test 3\"}', '2026-08-24 11:12:20', '2026-08-24 08:12:20');

-- --------------------------------------------------------

--
-- Table structure for table `audit_logs`
--

CREATE TABLE `audit_logs` (
  `id` bigint(20) NOT NULL,
  `actor_user_id` int(11) DEFAULT NULL,
  `action` varchar(128) NOT NULL,
  `entity_type` varchar(64) DEFAULT NULL,
  `entity_id` varchar(64) DEFAULT NULL,
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metadata`)),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `audit_logs`
--

INSERT INTO `audit_logs` (`id`, `actor_user_id`, `action`, `entity_type`, `entity_id`, `metadata`, `created_at`) VALUES
(1, 2, 'training_assigned', 'training_assignment', '1', '{\"course_id\":4,\"target_user_id\":3}', '2026-05-31 07:19:06'),
(2, 2, 'profile_updated', 'profile', '2', NULL, '2026-06-08 08:22:56'),
(3, 1, 'profile_updated', 'profile', '1', NULL, '2026-06-08 12:32:53'),
(4, 3, 'profile_updated', 'profile', '3', NULL, '2026-06-08 12:33:18'),
(5, 1, 'profile_updated', 'profile', '1', NULL, '2026-06-08 12:35:39'),
(6, 1, 'profile_updated', 'profile', '1', NULL, '2026-06-08 12:35:56'),
(7, 3, 'profile_updated', 'profile', '3', NULL, '2026-06-08 12:36:53'),
(8, 1, 'user_created', 'user', '8', '{\"email\":\"calawi@cbs.gov.so\",\"role\":\"learner\"}', '2026-06-09 08:53:33'),
(9, 1, 'profile_updated', 'profile', '1', NULL, '2026-06-10 06:08:04'),
(10, 1, 'user_created', 'user', '9', '{\"email\":\"barkhad@gmail.com\",\"role\":\"learner\"}', '2026-06-10 06:45:38'),
(11, 1, 'user_created', 'user', '10', '{\"email\":\"yakub@gmail.com\",\"role\":\"learner\"}', '2026-06-10 08:06:00'),
(12, 10, 'profile_updated', 'profile', '10', NULL, '2026-06-10 08:08:45'),
(13, 1, 'user_created', 'user', '12', '{\"email\":\"abdirahman.hanafi@centralbank.gov.so\",\"role\":\"learner\"}', '2026-08-24 07:30:24'),
(14, 1, 'user_created', 'user', '13', '{\"email\":\"abdirahman.hanafi@centralbank.gov.so\",\"role\":\"learner\"}', '2026-08-24 07:34:34'),
(15, 13, 'password_reset_completed', 'user', '13', NULL, '2026-08-24 07:35:54'),
(16, 1, 'user_created', 'user', '14', '{\"email\":\"abdirahman.hanafi@centralbank.gov.so\",\"role\":\"learner\"}', '2026-08-24 07:57:47'),
(17, 14, 'password_reset_completed', 'user', '14', NULL, '2026-08-24 08:01:42');

-- --------------------------------------------------------

--
-- Table structure for table `certifications`
--

CREATE TABLE `certifications` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `course_id` int(11) NOT NULL,
  `issued_at` datetime DEFAULT current_timestamp(),
  `expires_at` datetime DEFAULT NULL,
  `certificate_no` varchar(128) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `pdf_path` varchar(500) DEFAULT NULL,
  `pdf_generated_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `certifications`
--

INSERT INTO `certifications` (`id`, `user_id`, `course_id`, `issued_at`, `expires_at`, `certificate_no`, `created_at`, `pdf_path`, `pdf_generated_at`) VALUES
(34, 14, 17, '2026-08-24 11:09:55', '2027-08-24 11:09:55', 'CBS-14-17-1787558995859', '2026-08-24 08:09:55', '/uploads/certificates/certificate-34.pdf', '2026-08-24 11:10:04'),
(35, 14, 16, '2026-08-24 11:12:20', '2027-08-24 11:12:20', 'CBS-14-16-1787559140238', '2026-08-24 08:12:20', '/uploads/certificates/certificate-35.pdf', '2026-08-24 11:12:24');

-- --------------------------------------------------------

--
-- Table structure for table `courses`
--

CREATE TABLE `courses` (
  `id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `category` varchar(128) DEFAULT NULL,
  `level` varchar(64) DEFAULT NULL,
  `duration_hours` decimal(6,2) DEFAULT 0.00,
  `modules_count` int(11) DEFAULT 0,
  `status` varchar(64) DEFAULT 'Published',
  `thumbnail_url` varchar(512) DEFAULT NULL,
  `created_by_user_id` int(11) DEFAULT NULL,
  `is_mandatory` tinyint(1) NOT NULL DEFAULT 0,
  `is_prerequisite_for_overseas` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `courses`
--

INSERT INTO `courses` (`id`, `title`, `description`, `category`, `level`, `duration_hours`, `modules_count`, `status`, `thumbnail_url`, `created_by_user_id`, `is_mandatory`, `is_prerequisite_for_overseas`, `created_at`, `updated_at`) VALUES
(15, 'Onboarding', 'This course onboarding course', 'Onboarding', NULL, 0.50, 3, 'Published', 'http://localhost:5000/uploads/1781090783271-shared_image__8_.jpg', 2, 1, 0, '2026-06-10 11:26:23', '2026-06-10 11:26:23'),
(16, 'HR Policy Training', 'This test course which is hr', 'HR Policy Training', NULL, 0.50, 3, 'Published', 'http://localhost:5000/uploads/1781098757185-shared_image__8_.jpg', 2, 1, 0, '2026-06-10 13:39:17', '2026-06-10 13:39:17'),
(17, 'Legal & Regulatory', 'This is test legal Course', 'Legal & Regulatory', NULL, 0.50, 3, 'Published', 'http://localhost:5000/uploads/1781158988525-shared_image__8_.jpg', 2, 1, 0, '2026-06-11 06:23:08', '2026-06-11 06:23:08'),
(18, 'Security Compliance', 'Test', 'Security Compliance', NULL, 1.00, 1, 'Published', 'http://localhost:5000/uploads/1782734760385-image__8_.png', 2, 1, 0, '2026-06-29 12:06:00', '2026-06-29 12:06:00'),
(19, 'Code of Conduct', 'This is test course', 'Code of Conduct', NULL, 1.00, 2, 'Published', 'http://localhost:5000/uploads/1783239705728-image__7_.png', 2, 1, 0, '2026-07-05 08:21:45', '2026-07-05 08:21:45');

-- --------------------------------------------------------

--
-- Table structure for table `course_modules`
--

CREATE TABLE `course_modules` (
  `id` int(11) NOT NULL,
  `course_id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `content` longtext DEFAULT NULL,
  `duration_minutes` int(11) DEFAULT 0,
  `order_index` int(11) DEFAULT 0,
  `video_url` text DEFAULT NULL,
  `resource_url` text DEFAULT NULL,
  `resource_name` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `course_modules`
--

INSERT INTO `course_modules` (`id`, `course_id`, `title`, `content`, `duration_minutes`, `order_index`, `video_url`, `resource_url`, `resource_name`, `created_at`, `updated_at`) VALUES
(32, 15, 'Introduction', 'This is Introduction', 30, 0, 'http://localhost:5000/uploads/1781090656310-Module_1.mp4', 'http://localhost:5000/uploads/1781090661401-STARS_NPS_Architecture_25_Slides.pptx', 'STARS_NPS_Architecture_25_Slides.pptx', '2026-06-10 11:26:23', '2026-06-10 11:26:23'),
(33, 15, 'Lesson 1', 'Test ', 30, 1, 'http://localhost:5000/uploads/1781090686148-Module_1.mp4', 'http://localhost:5000/uploads/1781090689940-STARS_NPS_Architecture_25_Slides.pptx', 'STARS_NPS_Architecture_25_Slides.pptx', '2026-06-10 11:26:23', '2026-06-10 11:26:23'),
(34, 15, 'Lesson 2', 'Test', 30, 2, 'http://localhost:5000/uploads/1781090706473-Module_1.mp4', 'http://localhost:5000/uploads/1781090710558-CertyQ_PL-300.pdf', 'CertyQ PL-300.pdf', '2026-06-10 11:26:23', '2026-06-10 11:26:23'),
(35, 16, 'Introduction', 'This is the most common types ', 30, 0, 'http://localhost:5000/uploads/1781098310072-Module_1.mp4', 'http://localhost:5000/uploads/1781098314242-STARS_NPS_Architecture_25_Slides.pptx', 'STARS_NPS_Architecture_25_Slides.pptx', '2026-06-10 13:39:17', '2026-06-10 13:39:17'),
(36, 16, 'Lesson 1', 'This is Lesson 1', 30, 1, 'http://localhost:5000/uploads/1781098332473-Module_1.mp4', 'http://localhost:5000/uploads/1781098337167-STARS_NPS_Architecture_25_Slides.pptx', 'STARS_NPS_Architecture_25_Slides.pptx', '2026-06-10 13:39:17', '2026-06-10 13:39:17'),
(37, 16, 'Lesson 2', 'This is Lesson 2', 30, 2, 'http://localhost:5000/uploads/1781098406662-Module_2.mp4', 'http://localhost:5000/uploads/1781098410655-STARS_NPS_Architecture_25_Slides.pptx', 'STARS_NPS_Architecture_25_Slides.pptx', '2026-06-10 13:39:17', '2026-06-10 13:39:17'),
(38, 17, 'Introduction', 'This module is for introduction', 30, 0, 'http://localhost:5000/uploads/1781158755803-Module_1.mp4', 'http://localhost:5000/uploads/1781158759860-STARS_NPS_Architecture_25_Slides.pptx', 'STARS_NPS_Architecture_25_Slides.pptx', '2026-06-11 06:23:08', '2026-06-11 06:23:08'),
(39, 17, 'Lesson 1', 'This is lesson 1', 30, 1, 'http://localhost:5000/uploads/1781158824379-Module_1.mp4', 'http://localhost:5000/uploads/1781158828878-STARS_NPS_Architecture_25_Slides.pptx', 'STARS_NPS_Architecture_25_Slides.pptx', '2026-06-11 06:23:08', '2026-06-11 06:23:08'),
(40, 17, 'Lesson 2', 'This is Lesson 2', 30, 2, 'http://localhost:5000/uploads/1781158873683-Module_2.mp4', 'http://localhost:5000/uploads/1781158877833-STARS_NPS_Architecture_25_Slides.pptx', 'STARS_NPS_Architecture_25_Slides.pptx', '2026-06-11 06:23:08', '2026-06-11 06:23:08'),
(41, 18, 'Introduction', 'Test', 60, 0, 'http://localhost:5000/uploads/1782734678999-Module_1.mp4', 'http://localhost:5000/uploads/1782734685348-STARS_NPS_Architecture_25_Slides.pptx', 'STARS_NPS_Architecture_25_Slides.pptx', '2026-06-29 12:06:00', '2026-06-29 12:06:00'),
(42, 19, 'Introduction', 'Test ', 60, 0, 'http://localhost:5000/uploads/1783239476835-Module_1.mp4', 'http://localhost:5000/uploads/1783239487684-STARS_NPS_Architecture_25_Slides.pptx', 'STARS_NPS_Architecture_25_Slides.pptx', '2026-07-05 08:21:45', '2026-07-05 08:21:45'),
(43, 19, 'Module 2', 'Tewst', 60, 1, 'http://localhost:5000/uploads/1783239554176-Module_2.mp4', 'http://localhost:5000/uploads/1783239559927-CertyQ_PL-300.pdf', 'CertyQ PL-300.pdf', '2026-07-05 08:21:45', '2026-07-05 08:21:45');

-- --------------------------------------------------------

--
-- Table structure for table `departments`
--

CREATE TABLE `departments` (
  `id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `departments`
--

INSERT INTO `departments` (`id`, `name`, `created_at`) VALUES
(1, 'Airport Branch', '2026-06-08 08:21:20'),
(2, 'Baidoa Branch', '2026-06-08 08:21:20'),
(3, 'Banking Operations Department', '2026-06-08 08:21:20'),
(4, 'Business Group', '2026-06-08 08:21:20'),
(5, 'Currency Department', '2026-06-08 08:21:20'),
(6, 'Dhusamareb Branch', '2026-06-08 08:21:20'),
(7, 'Executive', '2026-06-08 08:21:20'),
(8, 'Financial Affairs Department', '2026-06-08 08:21:20'),
(9, 'Financial Markets Department', '2026-06-08 08:21:20'),
(10, 'Governor Office', '2026-06-08 08:21:20'),
(11, 'Human Resource Department', '2026-06-08 08:21:20'),
(12, 'Internal Audit Department', '2026-06-08 08:21:20'),
(13, 'IT Department', '2026-06-08 08:21:20'),
(14, 'Research & Statistics Department', '2026-06-08 08:21:20'),
(15, 'Seaport Branch', '2026-06-08 08:21:20'),
(16, 'Supervision & Licensing Department', '2026-06-08 08:21:20'),
(17, 'Support Services Department', '2026-06-08 08:21:20');

-- --------------------------------------------------------

--
-- Table structure for table `enrollments`
--

CREATE TABLE `enrollments` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `course_id` int(11) NOT NULL,
  `status` varchar(32) DEFAULT 'not_started',
  `progress` decimal(5,2) DEFAULT 0.00,
  `score` decimal(5,2) DEFAULT NULL,
  `enrolled_at` datetime DEFAULT current_timestamp(),
  `completed_at` datetime DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `enrollments`
--

INSERT INTO `enrollments` (`id`, `user_id`, `course_id`, `status`, `progress`, `score`, `enrolled_at`, `completed_at`, `updated_at`) VALUES
(37, 14, 15, 'enrolled', 0.00, NULL, '2026-08-24 11:02:11', NULL, '2026-08-24 08:02:11'),
(38, 14, 16, 'completed', 100.00, NULL, '2026-08-24 11:05:58', '2026-08-24 11:12:20', '2026-08-24 08:12:20'),
(39, 14, 17, 'completed', 100.00, NULL, '2026-08-24 11:06:59', '2026-08-24 11:09:55', '2026-08-24 08:09:55');

-- --------------------------------------------------------

--
-- Table structure for table `notifications`
--

CREATE TABLE `notifications` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `message` text NOT NULL,
  `is_read` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `password_resets`
--

CREATE TABLE `password_resets` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `token_hash` char(64) NOT NULL,
  `expires_at` datetime NOT NULL,
  `used_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `password_resets`
--

INSERT INTO `password_resets` (`id`, `user_id`, `token_hash`, `expires_at`, `used_at`, `created_at`) VALUES
(2, 14, '586ae5b7f1f0b3e736d102dd91fe6904ca3d48319eea11d6cfa69cebbdd78e73', '2026-08-25 10:57:47', '2026-08-24 11:01:42', '2026-08-24 07:57:47');

-- --------------------------------------------------------

--
-- Table structure for table `profiles`
--

CREATE TABLE `profiles` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `full_name` varchar(255) NOT NULL,
  `job_title` varchar(255) DEFAULT NULL,
  `employee_id` varchar(128) DEFAULT NULL,
  `department_id` int(11) DEFAULT NULL,
  `location` varchar(255) DEFAULT NULL,
  `phone` varchar(64) DEFAULT NULL,
  `date_of_joining` date DEFAULT NULL,
  `manager_user_id` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `profiles`
--

INSERT INTO `profiles` (`id`, `user_id`, `full_name`, `job_title`, `employee_id`, `department_id`, `location`, `phone`, `date_of_joining`, `manager_user_id`, `created_at`, `updated_at`) VALUES
(1, 1, 'CBS Admin', 'Officer', 'CBS-002', 11, 'Mogadishu', '+252615486020', '2025-06-29', NULL, '2026-05-09 09:05:09', '2026-06-10 06:08:04'),
(2, 2, 'Demo Instructor', 'Officer', 'CBS-001', 13, 'Mogadishu', '+252615486020', '2026-07-01', NULL, '2026-05-09 09:05:09', '2026-06-08 08:22:56'),
(3, 3, 'Demo Employee', 'Officer', 'CBS-003', 15, 'Mogadishu', '+252615486020', '2025-01-01', NULL, '2026-05-09 09:05:09', '2026-06-08 12:36:53'),
(21, 14, 'Abdirahman Abdikani Hanafi', 'Officer', '296', 13, 'Mogadishu-HQ', '615486020', '2026-07-01', NULL, '2026-08-24 07:57:47', '2026-08-24 07:57:47');

-- --------------------------------------------------------

--
-- Table structure for table `training_assignments`
--

CREATE TABLE `training_assignments` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `course_id` int(11) NOT NULL,
  `assigned_by_user_id` int(11) DEFAULT NULL,
  `due_at` datetime DEFAULT NULL,
  `is_required` tinyint(1) NOT NULL DEFAULT 1,
  `status` varchar(32) NOT NULL DEFAULT 'pending',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `training_history`
--

CREATE TABLE `training_history` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `course_id` int(11) NOT NULL,
  `completed_at` datetime DEFAULT NULL,
  `score` decimal(5,2) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `training_plans`
--

CREATE TABLE `training_plans` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `status` varchar(32) DEFAULT 'pending',
  `target_date` date DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `full_name` varchar(255) NOT NULL,
  `role` varchar(64) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `mfa_secret` varchar(128) DEFAULT NULL,
  `mfa_enabled` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `email`, `password_hash`, `full_name`, `role`, `is_active`, `mfa_secret`, `mfa_enabled`, `created_at`, `updated_at`) VALUES
(1, 'admin@cbs.gov.so', '$2a$10$AhdAQUJhFjcq2zMwMl30weMvaUHYZuERKYTtHE5OWRh9iv4G0Ma6S', 'CBS Admin', 'sysadmin', 1, NULL, 0, '2026-05-09 09:05:09', '2026-05-09 09:05:09'),
(2, 'instructor@cbs.gov.so', '$2a$10$AhdAQUJhFjcq2zMwMl30weMvaUHYZuERKYTtHE5OWRh9iv4G0Ma6S', 'Demo Instructor', 'instructor', 1, NULL, 0, '2026-05-09 09:05:09', '2026-05-09 09:05:09'),
(3, 'learner@cbs.gov.so', '$2a$10$AhdAQUJhFjcq2zMwMl30weMvaUHYZuERKYTtHE5OWRh9iv4G0Ma6S', 'Demo Employee', 'learner', 1, NULL, 0, '2026-05-09 09:05:09', '2026-08-24 07:27:56'),
(14, 'abdirahman.hanafi@centralbank.gov.so', '$2a$10$t4BEarsvsdjgFLSi1ZEgK.IPJ7uEishYf4Q2D2KeEkEZ7nXjvqr36', 'Abdirahman Abdikani Hanafi', 'learner', 1, NULL, 0, '2026-08-24 07:57:47', '2026-08-24 08:01:42');

-- --------------------------------------------------------

--
-- Table structure for table `user_badges`
--

CREATE TABLE `user_badges` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `badge_name` varchar(128) NOT NULL,
  `badge_icon` varchar(64) DEFAULT NULL,
  `awarded_at` datetime DEFAULT current_timestamp(),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `user_badges`
--

INSERT INTO `user_badges` (`id`, `user_id`, `badge_name`, `badge_icon`, `awarded_at`, `created_at`) VALUES
(14, 14, 'Perfect Score', 'target', '2026-08-24 11:09:00', '2026-08-24 08:09:00'),
(15, 14, 'First Steps', 'rocket', '2026-08-24 11:09:55', '2026-08-24 08:09:55');

-- --------------------------------------------------------

--
-- Table structure for table `user_points`
--

CREATE TABLE `user_points` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `points` int(11) NOT NULL DEFAULT 0,
  `reason` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `user_points`
--

INSERT INTO `user_points` (`id`, `user_id`, `points`, `reason`, `created_at`, `updated_at`) VALUES
(85, 14, 525, 'Passed assessment', '2026-08-24 08:02:11', '2026-08-24 08:12:23');

-- --------------------------------------------------------

--
-- Table structure for table `user_roles`
--

CREATE TABLE `user_roles` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `role` varchar(64) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `user_roles`
--

INSERT INTO `user_roles` (`id`, `user_id`, `role`, `created_at`) VALUES
(1, 1, 'sysadmin', '2026-05-09 09:05:09'),
(2, 2, 'instructor', '2026-05-09 09:05:09'),
(3, 3, 'learner', '2026-05-09 09:05:09'),
(13, 14, 'learner', '2026-08-24 07:57:47');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `announcements`
--
ALTER TABLE `announcements`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `approval_requests`
--
ALTER TABLE `approval_requests`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_approval_user` (`user_id`);

--
-- Indexes for table `assessments`
--
ALTER TABLE `assessments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_assessments_course` (`course_id`),
  ADD KEY `fk_assessments_module` (`module_id`);

--
-- Indexes for table `assessment_questions`
--
ALTER TABLE `assessment_questions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_questions_assessment` (`assessment_id`);

--
-- Indexes for table `assessment_results`
--
ALTER TABLE `assessment_results`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_results_user` (`user_id`),
  ADD KEY `idx_results_assessment` (`assessment_id`);

--
-- Indexes for table `audit_logs`
--
ALTER TABLE `audit_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_audit_actor` (`actor_user_id`),
  ADD KEY `idx_audit_action` (`action`),
  ADD KEY `idx_audit_created` (`created_at`);

--
-- Indexes for table `certifications`
--
ALTER TABLE `certifications`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uniq_cert_user_course` (`user_id`,`course_id`),
  ADD KEY `idx_cert_course` (`course_id`);

--
-- Indexes for table `courses`
--
ALTER TABLE `courses`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `course_modules`
--
ALTER TABLE `course_modules`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_modules_course` (`course_id`);

--
-- Indexes for table `departments`
--
ALTER TABLE `departments`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uniq_department_name` (`name`);

--
-- Indexes for table `enrollments`
--
ALTER TABLE `enrollments`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uniq_enrollment` (`user_id`,`course_id`),
  ADD KEY `idx_enrollment_user` (`user_id`),
  ADD KEY `idx_enrollment_course` (`course_id`);

--
-- Indexes for table `notifications`
--
ALTER TABLE `notifications`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_notifications_user` (`user_id`);

--
-- Indexes for table `password_resets`
--
ALTER TABLE `password_resets`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_password_resets_user` (`user_id`),
  ADD KEY `idx_password_resets_token` (`token_hash`);

--
-- Indexes for table `profiles`
--
ALTER TABLE `profiles`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uniq_profiles_user` (`user_id`),
  ADD KEY `idx_profiles_employee` (`employee_id`);

--
-- Indexes for table `training_assignments`
--
ALTER TABLE `training_assignments`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uniq_user_course_assignment` (`user_id`,`course_id`),
  ADD KEY `idx_assignments_user` (`user_id`),
  ADD KEY `idx_assignments_due` (`due_at`),
  ADD KEY `fk_assignments_course` (`course_id`);

--
-- Indexes for table `training_history`
--
ALTER TABLE `training_history`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_training_history_user` (`user_id`),
  ADD KEY `fk_training_history_course` (`course_id`);

--
-- Indexes for table `training_plans`
--
ALTER TABLE `training_plans`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_training_plans_user` (`user_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- Indexes for table `user_badges`
--
ALTER TABLE `user_badges`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_badges_user` (`user_id`);

--
-- Indexes for table `user_points`
--
ALTER TABLE `user_points`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uniq_user_points` (`user_id`),
  ADD KEY `idx_points_user` (`user_id`);

--
-- Indexes for table `user_roles`
--
ALTER TABLE `user_roles`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uniq_user_role` (`user_id`,`role`),
  ADD KEY `idx_user_roles_user` (`user_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `announcements`
--
ALTER TABLE `announcements`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `approval_requests`
--
ALTER TABLE `approval_requests`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `assessments`
--
ALTER TABLE `assessments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=23;

--
-- AUTO_INCREMENT for table `assessment_questions`
--
ALTER TABLE `assessment_questions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=53;

--
-- AUTO_INCREMENT for table `assessment_results`
--
ALTER TABLE `assessment_results`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=41;

--
-- AUTO_INCREMENT for table `audit_logs`
--
ALTER TABLE `audit_logs`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=18;

--
-- AUTO_INCREMENT for table `certifications`
--
ALTER TABLE `certifications`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=36;

--
-- AUTO_INCREMENT for table `courses`
--
ALTER TABLE `courses`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=20;

--
-- AUTO_INCREMENT for table `course_modules`
--
ALTER TABLE `course_modules`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=44;

--
-- AUTO_INCREMENT for table `departments`
--
ALTER TABLE `departments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=18;

--
-- AUTO_INCREMENT for table `enrollments`
--
ALTER TABLE `enrollments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=40;

--
-- AUTO_INCREMENT for table `notifications`
--
ALTER TABLE `notifications`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `password_resets`
--
ALTER TABLE `password_resets`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `profiles`
--
ALTER TABLE `profiles`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=22;

--
-- AUTO_INCREMENT for table `training_assignments`
--
ALTER TABLE `training_assignments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `training_history`
--
ALTER TABLE `training_history`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `training_plans`
--
ALTER TABLE `training_plans`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

--
-- AUTO_INCREMENT for table `user_badges`
--
ALTER TABLE `user_badges`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

--
-- AUTO_INCREMENT for table `user_points`
--
ALTER TABLE `user_points`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=95;

--
-- AUTO_INCREMENT for table `user_roles`
--
ALTER TABLE `user_roles`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `approval_requests`
--
ALTER TABLE `approval_requests`
  ADD CONSTRAINT `fk_approval_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `assessments`
--
ALTER TABLE `assessments`
  ADD CONSTRAINT `fk_assessments_course` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_assessments_module` FOREIGN KEY (`module_id`) REFERENCES `course_modules` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `assessment_questions`
--
ALTER TABLE `assessment_questions`
  ADD CONSTRAINT `fk_questions_assessment` FOREIGN KEY (`assessment_id`) REFERENCES `assessments` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `assessment_results`
--
ALTER TABLE `assessment_results`
  ADD CONSTRAINT `fk_results_assessment` FOREIGN KEY (`assessment_id`) REFERENCES `assessments` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_results_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `certifications`
--
ALTER TABLE `certifications`
  ADD CONSTRAINT `fk_cert_course` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_cert_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `course_modules`
--
ALTER TABLE `course_modules`
  ADD CONSTRAINT `fk_modules_course` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `enrollments`
--
ALTER TABLE `enrollments`
  ADD CONSTRAINT `fk_enrollments_course` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_enrollments_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `notifications`
--
ALTER TABLE `notifications`
  ADD CONSTRAINT `fk_notifications_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `password_resets`
--
ALTER TABLE `password_resets`
  ADD CONSTRAINT `fk_password_resets_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `profiles`
--
ALTER TABLE `profiles`
  ADD CONSTRAINT `fk_profiles_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `training_assignments`
--
ALTER TABLE `training_assignments`
  ADD CONSTRAINT `fk_assignments_course` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_assignments_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `training_history`
--
ALTER TABLE `training_history`
  ADD CONSTRAINT `fk_training_history_course` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_training_history_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `training_plans`
--
ALTER TABLE `training_plans`
  ADD CONSTRAINT `fk_training_plans_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `user_badges`
--
ALTER TABLE `user_badges`
  ADD CONSTRAINT `fk_badges_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `user_points`
--
ALTER TABLE `user_points`
  ADD CONSTRAINT `fk_points_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `user_roles`
--
ALTER TABLE `user_roles`
  ADD CONSTRAINT `fk_user_roles_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
