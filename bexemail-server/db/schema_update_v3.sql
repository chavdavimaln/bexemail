-- Phase 11-14 Schema Updates

-- Phase 11: Automations
CREATE TABLE IF NOT EXISTS `automations` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `trigger_type` VARCHAR(100) NOT NULL, -- e.g., 'welcome', 'birthday', 'tag_added'
  `status` ENUM('active', 'inactive') DEFAULT 'inactive',
  `workflow_json` JSON, -- stores the graph of steps
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Phase 13: Advanced Campaigns
ALTER TABLE `campaigns` 
MODIFY COLUMN `status` ENUM('draft', 'scheduled', 'sending', 'sent', 'submitted_for_review') DEFAULT 'draft',
ADD COLUMN `is_ab_test` BOOLEAN DEFAULT FALSE,
ADD COLUMN `variant_b_subject` VARCHAR(255) NULL,
ADD COLUMN `variant_b_html` LONGTEXT NULL,
ADD COLUMN `ab_test_winner` ENUM('A', 'B') NULL,
ADD COLUMN `ab_split_percent` INT DEFAULT 10;
