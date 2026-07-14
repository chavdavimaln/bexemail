const pool = require('./src/config/db');

async function migrate() {
  try {
    const [tables] = await pool.query('SHOW TABLES');
    console.log("Current tables:", tables);
    
    // Explicitly create campaigns if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS campaigns (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        subject VARCHAR(255) NOT NULL,
        status ENUM('draft', 'scheduled', 'sending', 'sent', 'submitted_for_review') DEFAULT 'draft',
        html_content LONGTEXT,
        scheduled_time DATETIME NULL,
        list_id INT NULL,
        is_ab_test BOOLEAN DEFAULT FALSE,
        variant_b_subject VARCHAR(255) NULL,
        variant_b_html LONGTEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (list_id) REFERENCES lists(id) ON DELETE SET NULL
      )
    `);
    console.log("Created/Updated campaigns table.");

    // The other tables that were missing should be created just in case
    // We already created templates, automations, api_keys, campaign_events earlier
    
    // Create email_queue if it doesn't exist (since campaigns was missing, queue might be too)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS email_queue (
        id INT AUTO_INCREMENT PRIMARY KEY,
        recipient_id INT NOT NULL,
        campaign_id INT NOT NULL,
        status ENUM('pending', 'sent', 'failed') DEFAULT 'pending',
        error_message TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (recipient_id) REFERENCES subscribers(id) ON DELETE CASCADE,
        FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
      )
    `);
    console.log("Created email_queue table.");
    
  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}

migrate();
