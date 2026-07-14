-- Phase 7-10 Schema Updates
-- Run this in phpMyAdmin for db_bex_email

-- Phase 7: Templates
CREATE TABLE IF NOT EXISTS `templates` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `template_name` VARCHAR(255) NOT NULL,
  `category` VARCHAR(100) NULL,
  `html_content` LONGTEXT,
  `plain_text_content` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Phase 8: Campaign Events (Tracking)
CREATE TABLE IF NOT EXISTS `campaign_events` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `campaign_id` INT NOT NULL,
  `subscriber_id` INT NOT NULL,
  `event_type` ENUM('open', 'click', 'bounce', 'unsubscribe') NOT NULL,
  `url` VARCHAR(255) NULL, -- for clicks
  `timestamp` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`campaign_id`) REFERENCES `campaigns`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`subscriber_id`) REFERENCES `subscribers`(`id`) ON DELETE CASCADE
);

-- Phase 9: Subscribers Alter
ALTER TABLE `subscribers` 
ADD COLUMN `unsubscribe_reason` VARCHAR(255) NULL;

-- Phase 10: Settings & RBAC
CREATE TABLE IF NOT EXISTS `settings` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `setting_key` VARCHAR(255) NOT NULL UNIQUE,
  `setting_value` TEXT,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

ALTER TABLE `admin_users` 
MODIFY COLUMN `role` ENUM('Super Admin', 'Campaign Manager', 'Audience Manager') DEFAULT 'Super Admin';

-- Default Settings
INSERT IGNORE INTO `settings` (`setting_key`, `setting_value`) VALUES 
('company_name', 'BexEmail Inc.'),
('smtp_host', 'smtp.example.com'),
('smtp_port', '587'),
('smtp_user', 'user'),
('smtp_pass', 'pass');
