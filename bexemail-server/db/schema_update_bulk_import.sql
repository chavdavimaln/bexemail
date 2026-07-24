-- Schema Updates for Multi-Site Bifurcation and Bulk Import

CREATE TABLE IF NOT EXISTS `subscriber_origins` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `subscriber_id` INT NOT NULL,
  `origin_site` VARCHAR(255) NOT NULL,
  `name` VARCHAR(255) NULL,
  `status` VARCHAR(50) DEFAULT 'subscribed',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `sub_origin` (`subscriber_id`, `origin_site`),
  FOREIGN KEY (`subscriber_id`) REFERENCES `subscribers`(`id`) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS `subscriber_list_origins` (
  `subscriber_id` INT NOT NULL,
  `list_id` INT NOT NULL,
  `origin_site` VARCHAR(255) NOT NULL,
  PRIMARY KEY (`subscriber_id`, `list_id`, `origin_site`),
  FOREIGN KEY (`subscriber_id`) REFERENCES `subscribers`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`list_id`) REFERENCES `lists`(`id`) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS `contact_import_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `filename` VARCHAR(255) NULL,
  `origin_site` VARCHAR(255) NOT NULL,
  `import_type` ENUM('csv', 'txt', 'manual', 'api') NOT NULL,
  `contacts_json` LONGTEXT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
