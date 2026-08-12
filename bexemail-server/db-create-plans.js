const pool = require('./src/config/db');

async function initPlansDb() {
  try {
    console.log('--- Initializing Plans & Subscriptions Database Tables ---');
    
    // 1. Create `plans` table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS plans (
        id INT AUTO_INCREMENT PRIMARY KEY,
        plan_code VARCHAR(50) NOT NULL UNIQUE,
        name VARCHAR(100) NOT NULL,
        tagline VARCHAR(255),
        monthly_price DECIMAL(10,2) DEFAULT 0.00,
        discount_percent INT DEFAULT 50,
        trial_days INT DEFAULT 14,
        contacts_limit INT DEFAULT 350,
        emails_limit INT DEFAULT 1000,
        is_popular TINYINT(1) DEFAULT 0,
        features JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 2. Create `user_subscriptions` table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_subscriptions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        plan_id INT NOT NULL,
        plan_code VARCHAR(50) NOT NULL,
        trial_days INT DEFAULT 14,
        trial_start DATETIME DEFAULT CURRENT_TIMESTAMP,
        trial_end DATETIME,
        status VARCHAR(30) DEFAULT 'trialing',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX (user_id),
        INDEX (plan_code)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Run column alterations for existing installations
    const alterQueries = [
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
      "ALTER TABLE admin_users ADD COLUMN domain VARCHAR(255) NULL",
      "ALTER TABLE admin_users ADD COLUMN custom_seats_limit INT NULL",
      "ALTER TABLE admin_users ADD COLUMN custom_contacts_limit INT NULL",
      "ALTER TABLE admin_users ADD COLUMN custom_emails_limit INT NULL",
      "ALTER TABLE admin_users ADD COLUMN custom_campaigns_limit INT NULL",
      "ALTER TABLE admin_users ADD COLUMN custom_admins_limit INT NULL",
      "ALTER TABLE admin_users ADD COLUMN custom_associates_limit INT NULL",
      "ALTER TABLE admin_users ADD COLUMN configured_modules JSON NULL",
      "ALTER TABLE admin_users ADD COLUMN avatar LONGTEXT NULL"
    ];
    for (const q of alterQueries) {
      try { await pool.query(q); } catch (e) {}
    }

    // 3. Insert or update default 4 plans matching PDF Page 2 specification
    const defaultPlans = [
      {
        plan_code: 'free',
        name: 'Free Plan',
        tagline: 'Basic tools for businesses getting started with email marketing.',
        monthly_price: 0.00,
        discount_percent: 0,
        trial_days: 0,
        contacts_limit: 250,
        emails_limit: 1000,
        seats_limit: 1,
        price_detail: '0/month',
        role_access_info: '1 Seat - admin only',
        contacts_limit_info: 'Up to 250 contacts',
        is_popular: 0,
        features: JSON.stringify([
          'Up to 250 contacts',
          '1 Seat - admin only',
          '0/month standard plan',
          'Pre-built email templates',
          'Basic email automation workflows',
          '24/7 Email customer support'
        ])
      },
      {
        plan_code: 'essentials',
        name: 'Essentials Plan',
        tagline: 'Great for small teams needing core automations & support.',
        monthly_price: 300.00,
        discount_percent: 45,
        trial_days: 14,
        contacts_limit: 50000,
        emails_limit: 5000,
        seats_limit: 3,
        price_detail: '300/mo for 12 months Then, starts at ₹550/month',
        role_access_info: '3 Seats (admin/associates)',
        contacts_limit_info: 'Up to 50,000 contacts with our $300/mo tier',
        is_popular: 0,
        features: JSON.stringify([
          'Up to 50,000 contacts ($300/mo tier)',
          '3 Seats (admin/associates)',
          '300/mo for 12 months (then ₹550/mo)',
          '24/7 Email & Chat Support',
          'A/B Testing & Custom Branding'
        ])
      },
      {
        plan_code: 'standard',
        name: 'Standard Plan',
        tagline: 'Advanced AI tools, deeper insights & higher email delivery speed.',
        monthly_price: 525.00,
        discount_percent: 34,
        trial_days: 14,
        contacts_limit: 100000,
        emails_limit: 6000,
        seats_limit: 5,
        price_detail: '525/mo for 12 months Then, starts at ₹800/month',
        role_access_info: '5 Seats (admin/associates)',
        contacts_limit_info: 'Up to 100,000 contacts with our $800/mo tier',
        is_popular: 1,
        features: JSON.stringify([
          'Up to 100,000 contacts ($800/mo tier)',
          '5 Seats (admin/associates)',
          '525/mo for 12 months (then ₹800/mo)',
          'Advanced Generative AI features',
          'Actionable growth insights & funnels',
          'Enhanced email automations'
        ])
      },
      {
        plan_code: 'premium',
        name: 'Premium Plan',
        tagline: 'Enterprise-grade capabilities, dedicated IP & priority phone support.',
        monthly_price: 10000.00,
        discount_percent: 33,
        trial_days: 14,
        contacts_limit: 1000000,
        emails_limit: 150000,
        seats_limit: 10,
        price_detail: '10,000/mo for 12 months Then, starts at ₹15,000/month',
        role_access_info: '10 role (admin/associates)',
        contacts_limit_info: 'Contact us for a custom plan',
        is_popular: 0,
        features: JSON.stringify([
          'Contact us for a custom plan',
          '10 role (admin/associates)',
          '10,000/mo for 12 months (then ₹15,000/mo)',
          'Dedicated IP address & custom DKIM',
          'Priority phone & 24/7 live chat',
          'Custom role-based permissions'
        ])
      }
    ];

    for (const p of defaultPlans) {
      await pool.query(`
        INSERT INTO plans (plan_code, name, tagline, monthly_price, discount_percent, trial_days, contacts_limit, emails_limit, seats_limit, price_detail, role_access_info, contacts_limit_info, is_popular, features)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          name = VALUES(name),
          tagline = VALUES(tagline),
          monthly_price = VALUES(monthly_price),
          discount_percent = VALUES(discount_percent),
          contacts_limit = VALUES(contacts_limit),
          emails_limit = VALUES(emails_limit),
          seats_limit = VALUES(seats_limit),
          price_detail = VALUES(price_detail),
          role_access_info = VALUES(role_access_info),
          contacts_limit_info = VALUES(contacts_limit_info),
          is_popular = VALUES(is_popular),
          features = VALUES(features);
      `, [p.plan_code, p.name, p.tagline, p.monthly_price, p.discount_percent, p.trial_days, p.contacts_limit, p.emails_limit, p.seats_limit, p.price_detail, p.role_access_info, p.contacts_limit_info, p.is_popular, p.features]);
    }

    console.log('✅ Plans & Subscriptions tables initialized successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error initializing plans db:', err);
    process.exit(1);
  }
}

initPlansDb();
