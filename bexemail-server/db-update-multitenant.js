const pool = require('./src/config/db');

async function runMultiTenantMigration() {
  console.log('--- Starting Multi-Tenant & Dynamic Plan Limit DB Migration ---');
  let connection;
  try {
    connection = await pool.getConnection();

    // 1. Create `companies` table if not exists
    await connection.query(`
      CREATE TABLE IF NOT EXISTS companies (
        id INT AUTO_INCREMENT PRIMARY KEY,
        company_name VARCHAR(255) NOT NULL,
        domain_name VARCHAR(255) UNIQUE NULL,
        plan_code VARCHAR(50) DEFAULT 'free',
        max_domains INT DEFAULT 1,
        max_smtps INT DEFAULT 1,
        max_seats INT DEFAULT 1,
        status ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('✅ `companies` table ensured.');

    // 2. Safe Alter Queries for dynamic limits and tenant bindings
    const alterQueries = [
      "ALTER TABLE plans ADD COLUMN max_domains INT DEFAULT 1",
      "ALTER TABLE plans ADD COLUMN max_smtps INT DEFAULT 1",
      "ALTER TABLE user_subscriptions ADD COLUMN custom_domains_limit INT NULL",
      "ALTER TABLE user_subscriptions ADD COLUMN custom_smtps_limit INT NULL",
      "ALTER TABLE admin_users ADD COLUMN company_id INT NULL",
      "ALTER TABLE admin_users ADD COLUMN custom_domains_limit INT NULL",
      "ALTER TABLE admin_users ADD COLUMN custom_smtps_limit INT NULL",
      "ALTER TABLE registered_domains ADD COLUMN company_id INT NULL",
      "ALTER TABLE registered_domains ADD COLUMN environment VARCHAR(20) DEFAULT 'live'",
      "ALTER TABLE senders ADD COLUMN company_id INT NULL",
      "ALTER TABLE senders ADD COLUMN is_active TINYINT DEFAULT 1",
      "ALTER TABLE senders ADD COLUMN status VARCHAR(20) DEFAULT 'active'"
    ];

    for (const q of alterQueries) {
      try {
        await connection.query(q);
      } catch (err) {
        // Column might already exist, ignore duplicate column error
      }
    }
    console.log('✅ Database columns updated for multi-tenancy & plan limits.');

    // 3. Update plan limits dynamically in `plans` table
    const planLimits = [
      { code: 'free', domains: 1, smtps: 1, seats: 1 },
      { code: 'essentials', domains: 3, smtps: 3, seats: 3 },
      { code: 'standard', domains: 5, smtps: 5, seats: 5 },
      { code: 'premium', domains: 10, smtps: 10, seats: 10 }
    ];

    for (const p of planLimits) {
      await connection.query(
        `UPDATE plans SET max_domains = ?, max_smtps = ?, seats_limit = ? WHERE LOWER(plan_code) = ?`,
        [p.domains, p.smtps, p.seats, p.code]
      );
    }
    console.log('✅ Default plan limits updated in database (Free:1, Essentials:3, Standard:5, Premium:10).');

    // 4. Ensure default company exists for default admin
    const [existingCompany] = await connection.query('SELECT id FROM companies LIMIT 1');
    let defaultCompanyId = existingCompany[0]?.id;

    if (!defaultCompanyId) {
      const [newComp] = await connection.query(
        'INSERT INTO companies (company_name, domain_name, plan_code, max_domains, max_smtps, max_seats) VALUES (?, ?, ?, ?, ?, ?)',
        ['Bexcode Services', 'localhost', 'premium', 10, 10, 10]
      );
      defaultCompanyId = newComp.insertId;
      console.log(`✅ Created default tenant company with ID ${defaultCompanyId}.`);
    }

    // Associate existing admin users, domains, senders to default company if null
    await connection.query('UPDATE admin_users SET company_id = ? WHERE company_id IS NULL', [defaultCompanyId]);
    await connection.query('UPDATE registered_domains SET company_id = ? WHERE company_id IS NULL', [defaultCompanyId]);
    await connection.query('UPDATE senders SET company_id = ? WHERE company_id IS NULL', [defaultCompanyId]);

    // 5. Enforce STRICT SINGLE PRIMARY for registered domains
    const [dRows] = await connection.query('SELECT id FROM registered_domains ORDER BY is_primary DESC, id ASC');
    if (dRows.length > 0) {
      const primaryDomainId = dRows[0].id;
      await connection.query('UPDATE registered_domains SET is_primary = 0');
      await connection.query('UPDATE registered_domains SET is_primary = 1 WHERE id = ?', [primaryDomainId]);
      console.log(`✅ Single Primary Domain enforced in DB (Domain ID ${primaryDomainId}).`);
    }

    // 6. Enforce STRICT SINGLE PRIMARY for SMTP senders
    const [sRows] = await connection.query('SELECT id FROM senders ORDER BY is_default DESC, id ASC');
    if (sRows.length > 0) {
      const defaultSenderId = sRows[0].id;
      await connection.query('UPDATE senders SET is_default = 0');
      await connection.query('UPDATE senders SET is_default = 1 WHERE id = ?', [defaultSenderId]);
      console.log(`✅ Single Primary SMTP Sender enforced in DB (Sender ID ${defaultSenderId}).`);
    }

    console.log('✅ Existing records successfully linked to default company context.');
    console.log('🎉 Multi-Tenant Migration Completed Successfully!');

  } catch (error) {
    console.error('❌ Error executing multi-tenant migration:', error);
  } finally {
    if (connection) connection.release();
  }
}

if (require.main === module) {
  runMultiTenantMigration().then(() => process.exit(0));
}

module.exports = runMultiTenantMigration;
