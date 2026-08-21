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
      await pool.query('ALTER TABLE campaigns ADD COLUMN target_email TEXT NULL AFTER list_id');
    } catch (e) {
      // Column might already exist, try to modify it to TEXT just in case
      try {
        await pool.query('ALTER TABLE campaigns MODIFY COLUMN target_email TEXT NULL');
      } catch (modErr) {
        // ignore
      }
    }

    // Ensure campaigns.sender_id is VARCHAR(255) with matching collation for multi-sender selection
    try {
      await pool.query('ALTER TABLE campaigns MODIFY COLUMN sender_id VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL');
    } catch (e) {
      // Column might already be VARCHAR(255), ignore error
    }

    // Add sender_mode and sender_mapping columns to campaigns for Multi-SMTP configuration
    try {
      await pool.query("ALTER TABLE campaigns ADD COLUMN sender_mode VARCHAR(50) DEFAULT 'broadcast' AFTER sender_id");
    } catch (e) { /* ignore existing column */ }
    try {
      await pool.query("ALTER TABLE campaigns ADD COLUMN sender_mapping JSON NULL AFTER sender_mode");
    } catch (e) { /* ignore existing column */ }

    // Add sender_id column to email_queue for per-email SMTP assignment
    try {
      await pool.query("ALTER TABLE email_queue ADD COLUMN sender_id INT NULL AFTER campaign_id");
    } catch (e) { /* ignore existing column */ }

    // Align core table collations to prevent collation mismatch errors
    try {
      await pool.query('ALTER TABLE campaigns CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci');
      await pool.query('ALTER TABLE senders CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci');
      await pool.query('ALTER TABLE email_queue CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci');
      await pool.query('ALTER TABLE subscribers CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci');
    } catch (collErr) {
      // Ignore if tables don't exist yet
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

    // Add footer and industry/predesign columns to templates
    const footerCols = [
      "ALTER TABLE templates ADD COLUMN include_footer TINYINT DEFAULT 1",
      "ALTER TABLE templates ADD COLUMN footer_editor_type VARCHAR(50) DEFAULT 'html'",
      "ALTER TABLE templates ADD COLUMN footer_html LONGTEXT NULL",
      "ALTER TABLE templates ADD COLUMN footer_design_json LONGTEXT NULL",
      "ALTER TABLE templates ADD COLUMN industry VARCHAR(100) DEFAULT 'General'",
      "ALTER TABLE templates ADD COLUMN is_predesigned TINYINT(1) DEFAULT 0",
      "ALTER TABLE templates ADD COLUMN thumbnail TEXT NULL"
    ];
    for (const colQuery of footerCols) {
      try { await pool.query(colQuery); } catch (err) { /* ignore existing column error */ }
    }

    const seedPredesignedTemplates = require('./seedPredesignedTemplates');
    await seedPredesignedTemplates();

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
    try {
      await pool.query('ALTER TABLE data_history ADD COLUMN admin_id INT NULL');
      await pool.query('ALTER TABLE data_history ADD COLUMN admin_email VARCHAR(255) NULL');
      await pool.query('UPDATE data_history SET admin_id = 1 WHERE admin_id IS NULL OR admin_id = 0');
    } catch (e) {}
    try {
      await pool.query('ALTER TABLE backup_schedules ADD COLUMN admin_id INT NULL');
      await pool.query('UPDATE backup_schedules SET admin_id = 1 WHERE admin_id IS NULL OR admin_id = 0');
    } catch (e) {}
    try {
      await pool.query('ALTER TABLE subscribers DROP INDEX email');
    } catch (e) {}
    try {
      await pool.query('ALTER TABLE subscribers ADD UNIQUE KEY unique_email_admin (email, admin_id)');
    } catch (e) {}

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

    // Create roles table matching roles_table.jpg specifications
    await pool.query(`
      CREATE TABLE IF NOT EXISTS roles (
        id VARCHAR(64) PRIMARY KEY,
        company_id INT NULL,
        name VARCHAR(100) NOT NULL,
        description TEXT NULL,
        color VARCHAR(20) DEFAULT '#d90a2c',
        is_system TINYINT(1) DEFAULT 1,
        is_active TINYINT(1) DEFAULT 1,
        system_key VARCHAR(50) NOT NULL,
        created_by INT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Seed default system roles if not present
    const defaultRoles = [
      {
        id: '5cf9166f-483f-4883-b6dd-6e15eda9c00a',
        name: 'Leader',
        description: 'Full workspace administrator.',
        color: '#DE350B',
        is_system: 1,
        is_active: 1,
        system_key: 'leader'
      },
      {
        id: '118844d7-87ce-4f19-9ae1-debb5a1b3cf5',
        name: 'Manager',
        description: 'Manages projects and team members.',
        color: '#0079BF',
        is_system: 1,
        is_active: 1,
        system_key: 'manager'
      },
      {
        id: '7b370a0a-3b89-44d8-ad06-12b98e74a402',
        name: 'Team Member',
        description: 'Contributes to assigned tasks.',
        color: '#519839',
        is_system: 1,
        is_active: 1,
        system_key: 'team'
      }
    ];

    for (const r of defaultRoles) {
      const [ex] = await pool.query('SELECT id FROM roles WHERE system_key = ? OR name = ?', [r.system_key, r.name]);
      if (ex.length === 0) {
        await pool.query(
          'INSERT INTO roles (id, name, description, color, is_system, is_active, system_key) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [r.id, r.name, r.description, r.color, r.is_system, r.is_active, r.system_key]
        );
      }
    }

    // Profile & User Management & CRM Domain & Plan migrations
    const migrationQueries = [
      "ALTER TABLE admin_users ADD COLUMN username VARCHAR(255) NULL",
      "ALTER TABLE admin_users ADD COLUMN permissions JSON NULL",
      "ALTER TABLE admin_users MODIFY COLUMN role VARCHAR(255) DEFAULT 'Team Member'",
      "UPDATE admin_users SET role = 'Leader' WHERE role IN ('Admin', 'Super Admin')",
      "UPDATE admin_users SET role = 'Manager' WHERE role IN ('Associates', 'Sub Admin', 'Subscriber')",
      "UPDATE admin_users SET role = 'Team Member' WHERE role IN ('Developers', 'Developer', 'User', 'user')",
      "ALTER TABLE admin_users ADD COLUMN admin_id INT NULL DEFAULT NULL",
      "ALTER TABLE senders ADD COLUMN admin_id INT NULL",
      "ALTER TABLE lists ADD COLUMN admin_id INT NULL",
      "ALTER TABLE subscribers ADD COLUMN admin_id INT NULL",
      "ALTER TABLE campaigns ADD COLUMN admin_id INT NULL",
      "ALTER TABLE admin_users ADD COLUMN domain VARCHAR(255) NULL",
      "ALTER TABLE admin_users ADD COLUMN custom_seats_limit INT NULL",
      "ALTER TABLE admin_users ADD COLUMN custom_contacts_limit INT NULL",
      "ALTER TABLE admin_users ADD COLUMN custom_emails_limit INT NULL",
      "ALTER TABLE admin_users ADD COLUMN custom_campaigns_limit INT NULL",
      "ALTER TABLE admin_users ADD COLUMN custom_admins_limit INT NULL",
      "ALTER TABLE admin_users ADD COLUMN custom_associates_limit INT NULL",
      "ALTER TABLE admin_users ADD COLUMN configured_modules JSON NULL",
      "ALTER TABLE plans ADD COLUMN seats_limit INT DEFAULT 1",
      "ALTER TABLE plans ADD COLUMN price_detail VARCHAR(255) NULL",
      "ALTER TABLE plans ADD COLUMN role_access_info VARCHAR(255) NULL",
      "ALTER TABLE plans ADD COLUMN contacts_limit_info VARCHAR(255) NULL",
      "ALTER TABLE plans ADD COLUMN allowed_modules JSON NULL",
      "ALTER TABLE user_subscriptions ADD COLUMN seats_limit INT DEFAULT 1",
      "ALTER TABLE user_subscriptions ADD COLUMN custom_seats_limit INT NULL",
      "ALTER TABLE user_subscriptions ADD COLUMN custom_contacts_limit INT NULL",
      "ALTER TABLE user_subscriptions ADD COLUMN custom_emails_limit INT NULL",
      "ALTER TABLE user_subscriptions ADD COLUMN custom_campaigns_limit INT NULL",
      "ALTER TABLE user_subscriptions ADD COLUMN custom_admins_limit INT NULL",
      "ALTER TABLE user_subscriptions ADD COLUMN custom_associates_limit INT NULL",

      // Explicit Admin Email, Domain & SMTP Tracking Columns Across Modules
      "ALTER TABLE subscribers ADD COLUMN admin_email VARCHAR(255) NULL",
      "ALTER TABLE subscribers ADD COLUMN domain_name VARCHAR(255) NULL",
      "ALTER TABLE subscribers ADD COLUMN smtp_email VARCHAR(255) NULL",

      "ALTER TABLE campaigns ADD COLUMN admin_email VARCHAR(255) NULL",
      "ALTER TABLE campaigns ADD COLUMN domain_name VARCHAR(255) NULL",
      "ALTER TABLE campaigns ADD COLUMN smtp_id INT NULL",
      "ALTER TABLE campaigns ADD COLUMN smtp_email VARCHAR(255) NULL",

      "ALTER TABLE templates ADD COLUMN admin_id INT NULL",
      "ALTER TABLE templates ADD COLUMN admin_email VARCHAR(255) NULL",
      "ALTER TABLE templates ADD COLUMN domain_name VARCHAR(255) NULL",

      "ALTER TABLE lists ADD COLUMN admin_email VARCHAR(255) NULL",
      "ALTER TABLE lists ADD COLUMN domain_name VARCHAR(255) NULL",

      "ALTER TABLE senders ADD COLUMN admin_email VARCHAR(255) NULL",
      "ALTER TABLE senders ADD COLUMN domain_name VARCHAR(255) NULL",

      "ALTER TABLE registered_domains ADD COLUMN admin_email VARCHAR(255) NULL",

      "ALTER TABLE automations ADD COLUMN admin_email VARCHAR(255) NULL",
      "ALTER TABLE automations ADD COLUMN domain_name VARCHAR(255) NULL"
    ];
    for (const q of migrationQueries) {
      try {
        await pool.query(q);
      } catch (err) {
        // Safe to ignore if column/enum value already exists
      }
    }

    try {
      await pool.query('UPDATE admin_users SET admin_id = id WHERE role IN ("Admin", "Super Admin") AND (admin_id IS NULL OR admin_id = 0)');
      await pool.query('UPDATE admin_users SET admin_id = 1 WHERE role NOT IN ("Admin", "Super Admin") AND (admin_id IS NULL OR admin_id = 0)');
      await pool.query('UPDATE senders SET admin_id = 1 WHERE admin_id IS NULL OR admin_id = 0');
      await pool.query('UPDATE registered_domains SET admin_id = 1 WHERE admin_id IS NULL OR admin_id = 0');
      await pool.query('UPDATE subscribers SET admin_id = 1 WHERE admin_id IS NULL OR admin_id = 0');
      await pool.query('UPDATE lists SET admin_id = 1 WHERE admin_id IS NULL OR admin_id = 0');
      await pool.query('UPDATE campaigns SET admin_id = 1 WHERE admin_id IS NULL OR admin_id = 0');
      await pool.query('UPDATE templates SET admin_id = 1 WHERE is_predesigned = 0 AND (admin_id IS NULL OR admin_id = 0)');

      // Sync admin_email for all tables
      await pool.query(`UPDATE subscribers s JOIN admin_users u ON s.admin_id = u.id SET s.admin_email = u.email WHERE s.admin_email IS NULL OR s.admin_email = ''`);
      await pool.query(`UPDATE campaigns c JOIN admin_users u ON c.admin_id = u.id SET c.admin_email = u.email WHERE c.admin_email IS NULL OR c.admin_email = ''`);
      await pool.query(`UPDATE templates t JOIN admin_users u ON t.admin_id = u.id SET t.admin_email = u.email WHERE t.admin_email IS NULL OR t.admin_email = ''`);
      await pool.query(`UPDATE lists l JOIN admin_users u ON l.admin_id = u.id SET l.admin_email = u.email WHERE l.admin_email IS NULL OR l.admin_email = ''`);
      await pool.query(`UPDATE senders snd JOIN admin_users u ON snd.admin_id = u.id SET snd.admin_email = u.email WHERE snd.admin_email IS NULL OR snd.admin_email = ''`);
      await pool.query(`UPDATE registered_domains d JOIN admin_users u ON d.admin_id = u.id SET d.admin_email = u.email WHERE d.admin_email IS NULL OR d.admin_email = ''`);
    } catch (e) {}

    await setupAutomationDB();

    // Create db_backups table if not exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS db_backups (
        id INT AUTO_INCREMENT PRIMARY KEY,
        module_type VARCHAR(50) DEFAULT 'all',
        description VARCHAR(255) NOT NULL,
        backup_data LONGTEXT NOT NULL,
        tables_included TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    try {
      await pool.query("ALTER TABLE db_backups ADD COLUMN admin_id INT NULL");
      await pool.query("ALTER TABLE db_backups ADD COLUMN admin_email VARCHAR(255) NULL");
      await pool.query('UPDATE db_backups SET admin_id = 1 WHERE admin_id IS NULL OR admin_id = 0');
    } catch (e) {}

    // Add module_type column if not exists
    try {
      await pool.query("ALTER TABLE db_backups ADD COLUMN module_type VARCHAR(50) DEFAULT 'all'");
    } catch (e) {
      // Column might already exist
    }

    // Create backup_schedules table if not exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS backup_schedules (
        id INT AUTO_INCREMENT PRIMARY KEY,
        module_type VARCHAR(50) NOT NULL DEFAULT 'all',
        frequency ENUM('daily', 'weekly', 'monthly', 'yearly') NOT NULL DEFAULT 'weekly',
        status ENUM('active', 'paused') NOT NULL DEFAULT 'active',
        reminder_enabled TINYINT(1) DEFAULT 1,
        reminder_email VARCHAR(255) NULL,
        last_run_at TIMESTAMP NULL,
        next_run_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Dedicated Domain Configurations Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS registered_domains (
        id INT AUTO_INCREMENT PRIMARY KEY,
        company_name VARCHAR(255) NOT NULL,
        domain_name VARCHAR(255) NOT NULL UNIQUE,
        support_email VARCHAR(255) NULL,
        is_primary TINYINT(1) DEFAULT 0,
        status VARCHAR(50) DEFAULT 'active',
        dkim_status VARCHAR(50) DEFAULT 'valid',
        spf_status VARCHAR(50) DEFAULT 'valid',
        dmarc_status VARCHAR(50) DEFAULT 'valid',
        admin_id INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    try {
      await pool.query("ALTER TABLE registered_domains ADD COLUMN admin_id INT NULL");
    } catch (e) { /* ignore existing column error */ }

    // Seed default initial domain 'bexcodeservices'
    await pool.query(`
      INSERT IGNORE INTO registered_domains (id, company_name, domain_name, support_email, is_primary, status)
      VALUES (1, 'Bexcode Services', 'bexcodeservices', 'info@bexcodeservices.com', 1, 'active')
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS contacts_ui_config (
        id INT AUTO_INCREMENT PRIMARY KEY,
        config_key VARCHAR(100) DEFAULT 'contacts_settings',
        config_json JSON NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS automations_ui_config (
        id INT AUTO_INCREMENT PRIMARY KEY,
        config_key VARCHAR(100) DEFAULT 'automations_settings',
        config_json JSON NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS campaigns_ui_config (
        id INT AUTO_INCREMENT PRIMARY KEY,
        config_key VARCHAR(100) DEFAULT 'campaigns_settings',
        config_json JSON NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS ui_programming (
        id INT AUTO_INCREMENT PRIMARY KEY,
        config_key VARCHAR(100) DEFAULT 'system_ui_settings',
        config_json JSON NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Dedicated Payment Gateway Tables
    await pool.query(`
      CREATE TABLE IF NOT EXISTS payment_gateways (
        id INT AUTO_INCREMENT PRIMARY KEY,
        gateway_code VARCHAR(50) NOT NULL UNIQUE,
        gateway_name VARCHAR(100) NOT NULL,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        mode VARCHAR(20) NOT NULL DEFAULT 'sandbox',
        api_key_public VARCHAR(255) NULL,
        api_key_secret VARCHAR(255) NULL,
        webhook_secret VARCHAR(255) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await pool.query(`
      INSERT IGNORE INTO payment_gateways (gateway_code, gateway_name, is_active, mode) VALUES
      ('dummy', 'Dummy Gateway (Sandbox Test)', 1, 'sandbox'),
      ('razorpay', 'Razorpay Payment Gateway', 0, 'sandbox'),
      ('stripe', 'Stripe Payments', 0, 'sandbox'),
      ('paypal', 'PayPal Express Checkout', 0, 'sandbox')
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS payment_transactions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        transaction_id VARCHAR(100) NOT NULL UNIQUE,
        user_id INT NOT NULL,
        plan_code VARCHAR(50) NOT NULL,
        amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        currency VARCHAR(10) NOT NULL DEFAULT 'INR',
        payment_method VARCHAR(50) NOT NULL DEFAULT 'card',
        gateway_name VARCHAR(50) NOT NULL DEFAULT 'dummy',
        gateway_payment_id VARCHAR(150) NULL,
        gateway_order_id VARCHAR(150) NULL,
        gateway_signature VARCHAR(255) NULL,
        card_last4 VARCHAR(4) NULL,
        card_brand VARCHAR(50) NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'completed',
        ip_address VARCHAR(45) NULL,
        notes TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS payment_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        transaction_id VARCHAR(100) NULL,
        user_id INT NULL,
        event_type VARCHAR(100) NOT NULL DEFAULT 'checkout',
        payload JSON NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'info',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

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
