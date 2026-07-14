-- Phase 14-16 Schema Updates

-- Phase 15: Global Delivery & Localization
ALTER TABLE `subscribers`
ADD COLUMN `timezone` VARCHAR(100) DEFAULT 'UTC',
ADD COLUMN `language` VARCHAR(10) DEFAULT 'en';

ALTER TABLE `campaigns`
ADD COLUMN `is_timezone_delivery` BOOLEAN DEFAULT FALSE,
ADD COLUMN `multi_language_json` JSON NULL;

-- Phase 16: API Access & Advanced Analytics
ALTER TABLE `campaign_events`
ADD COLUMN `device_type` VARCHAR(100) NULL,
ADD COLUMN `browser` VARCHAR(100) NULL;

CREATE TABLE IF NOT EXISTS `api_keys` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `key_hash` VARCHAR(255) NOT NULL UNIQUE,
  `name` VARCHAR(255) NOT NULL,
  `admin_id` INT NOT NULL,
  `is_active` BOOLEAN DEFAULT TRUE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `last_used_at` TIMESTAMP NULL,
  FOREIGN KEY (`admin_id`) REFERENCES `admin_users`(`id`) ON DELETE CASCADE
);
