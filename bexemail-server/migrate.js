const pool = require('./src/config/db');

async function migrate() {
  try {
    // 1. templates
    await pool.query(`
      CREATE TABLE IF NOT EXISTS templates (
        id INT AUTO_INCREMENT PRIMARY KEY,
        template_name VARCHAR(255) NOT NULL,
        category VARCHAR(100) DEFAULT 'General',
        html_content LONGTEXT,
        plain_text_content LONGTEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log("Created templates table");

    // 2. automations
    await pool.query(`
      CREATE TABLE IF NOT EXISTS automations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        trigger_type VARCHAR(100) NOT NULL,
        workflow_json JSON,
        status ENUM('active', 'inactive', 'draft') DEFAULT 'draft',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log("Created automations table");

    // 3. api_keys
    await pool.query(`
      CREATE TABLE IF NOT EXISTS api_keys (
        id INT AUTO_INCREMENT PRIMARY KEY,
        key_hash VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        admin_id INT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        last_used_at DATETIME NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (admin_id) REFERENCES admin_users(id) ON DELETE SET NULL
      )
    `);
    console.log("Created api_keys table");

    // 4. campaign_events
    await pool.query(`
      CREATE TABLE IF NOT EXISTS campaign_events (
        id INT AUTO_INCREMENT PRIMARY KEY,
        campaign_id INT NOT NULL,
        subscriber_id INT NOT NULL,
        event_type ENUM('open', 'click', 'bounce', 'complaint', 'unsubscribe') NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
        FOREIGN KEY (subscriber_id) REFERENCES subscribers(id) ON DELETE CASCADE
      )
    `);
    console.log("Created campaign_events table");

  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}

migrate();
