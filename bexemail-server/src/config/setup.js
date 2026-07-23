const pool = require('./db');
const setupAutomationDB = require('./setupAutomations');

async function setupDB() {
  try {
    // 1. Create senders table (from update-db-senders.js)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS senders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        is_default BOOLEAN DEFAULT FALSE,
        smtp_host VARCHAR(255) NULL,
        smtp_port INT NULL,
        smtp_user VARCHAR(255) NULL,
        smtp_pass VARCHAR(255) NULL,
        smtp_secure VARCHAR(50) DEFAULT 'tls',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add SMTP columns to senders if not existing
    const smtpCols = [
      "ALTER TABLE senders ADD COLUMN smtp_host VARCHAR(255) NULL",
      "ALTER TABLE senders ADD COLUMN smtp_port INT NULL",
      "ALTER TABLE senders ADD COLUMN smtp_user VARCHAR(255) NULL",
      "ALTER TABLE senders ADD COLUMN smtp_pass VARCHAR(255) NULL",
      "ALTER TABLE senders ADD COLUMN smtp_secure VARCHAR(50) DEFAULT 'tls'"
    ];
    for (const colQuery of smtpCols) {
      try { await pool.query(colQuery); } catch (e) { /* ignore existing column error */ }
    }

    // Add sender_id to campaigns if not exists
    try {
      await pool.query('ALTER TABLE campaigns ADD COLUMN sender_id INT NULL AFTER list_id');
      const [defaultSender] = await pool.query('SELECT id FROM senders WHERE is_default = TRUE LIMIT 1');
      if (defaultSender.length > 0) {
        await pool.query('UPDATE campaigns SET sender_id = ? WHERE sender_id IS NULL', [defaultSender[0].id]);
      }
    } catch (e) {
      // Column might already exist, ignore error
    }

    // Add target_email to campaigns if not exists
    try {
      await pool.query('ALTER TABLE campaigns ADD COLUMN target_email VARCHAR(255) NULL AFTER list_id');
    } catch (e) {
      // Column might already exist, ignore error
    }

    // Add is_deleted to lists if not exists
    try {
      await pool.query('ALTER TABLE lists ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE');
    } catch (e) {
      // Column might already exist, ignore error
    }

    // 2. Create data_history table for Audit Logs
    await pool.query(`
      CREATE TABLE IF NOT EXISTS data_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        table_name VARCHAR(255) NOT NULL,
        record_id INT NOT NULL,
        action ENUM('add', 'edit', 'delete', 'restore') NOT NULL,
        old_data JSON,
        new_data JSON,
        changed_by VARCHAR(255) DEFAULT 'System',
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await setupAutomationDB();

    console.log('Database setup complete (core and automation tables).');
  } catch (error) {
    console.error('Database setup failed:', error);
  }
}

module.exports = setupDB;
