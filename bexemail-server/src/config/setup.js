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

    // Add design_json to templates if not exists
    try {
      await pool.query('ALTER TABLE templates ADD COLUMN design_json LONGTEXT NULL');
    } catch (e) {
      // Column might already exist, ignore error
    }

    // Create campaign_opens table if not exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS campaign_opens (
        id INT AUTO_INCREMENT PRIMARY KEY,
        campaign_id INT NOT NULL,
        subscriber_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
        FOREIGN KEY (subscriber_id) REFERENCES subscribers(id) ON DELETE CASCADE
      )
    `);

    // Create campaign_clicks table if not exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS campaign_clicks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        campaign_id INT NOT NULL,
        subscriber_id INT NOT NULL,
        url VARCHAR(255) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
        FOREIGN KEY (subscriber_id) REFERENCES subscribers(id) ON DELETE CASCADE
      )
    `);

    // Add updated_at column to campaigns if not exists
    try {
      await pool.query('ALTER TABLE campaigns ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');
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

    // Create subscriber_origins table if not exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS subscriber_origins (
        id INT AUTO_INCREMENT PRIMARY KEY,
        subscriber_id INT NOT NULL,
        origin_site VARCHAR(255) NOT NULL,
        name VARCHAR(255) NULL,
        status VARCHAR(50) DEFAULT 'subscribed',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY sub_origin (subscriber_id, origin_site),
        FOREIGN KEY (subscriber_id) REFERENCES subscribers(id) ON DELETE CASCADE
      )
    `);

    // Create subscriber_list_origins table if not exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS subscriber_list_origins (
        subscriber_id INT NOT NULL,
        list_id INT NOT NULL,
        origin_site VARCHAR(255) NOT NULL,
        PRIMARY KEY (subscriber_id, list_id, origin_site),
        FOREIGN KEY (subscriber_id) REFERENCES subscribers(id) ON DELETE CASCADE,
        FOREIGN KEY (list_id) REFERENCES lists(id) ON DELETE CASCADE
      )
    `);

    // Create contact_import_logs table if not exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS contact_import_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        filename VARCHAR(255) NULL,
        origin_site VARCHAR(255) NOT NULL,
        import_type ENUM('csv', 'txt', 'manual', 'api') NOT NULL,
        contacts_json LONGTEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await setupAutomationDB();

    // Auto-assign any unassigned subscribers in the database to default list
    try {
      const [unassigned] = await pool.query(
        `SELECT s.id, s.first_name, s.status FROM subscribers s 
         LEFT JOIN subscriber_lists sl ON s.id = sl.subscriber_id 
         WHERE sl.subscriber_id IS NULL`
      );

      if (unassigned.length > 0) {
        const [defaultLists] = await pool.query('SELECT id FROM lists WHERE is_deleted = FALSE ORDER BY id ASC LIMIT 1');
        if (defaultLists.length > 0) {
          const defaultListId = defaultLists[0].id;
          for (const sub of unassigned) {
            await pool.query('INSERT IGNORE INTO subscriber_lists (subscriber_id, list_id) VALUES (?, ?)', [sub.id, defaultListId]);
            await pool.query('INSERT IGNORE INTO subscriber_origins (subscriber_id, origin_site, name, status) VALUES (?, ?, ?, ?)', [sub.id, 'localhost', sub.first_name || null, sub.status || 'subscribed']);
            await pool.query('INSERT IGNORE INTO subscriber_list_origins (subscriber_id, list_id, origin_site) VALUES (?, ?, ?)', [sub.id, defaultListId, 'localhost']);
          }
          console.log(`[Auto-Setup] Synchronized and assigned ${unassigned.length} unassigned contacts to target list ID ${defaultListId}`);
        }
      }
    } catch (e) {
      console.error('[Auto-Setup] Repair check error:', e);
    }

    console.log('Database setup complete (core and automation tables).');
  } catch (error) {
    console.error('Database setup failed:', error);
  }
}

module.exports = setupDB;
