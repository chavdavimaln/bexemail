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

    // 3. Insert or update default 4 plans
    const defaultPlans = [
      {
        plan_code: 'free',
        name: 'Under 350 contacts? It\'s free',
        tagline: 'Basic tools for senders getting started with email marketing.',
        monthly_price: 0.00,
        discount_percent: 0,
        trial_days: 0,
        contacts_limit: 350,
        emails_limit: 1000,
        is_popular: 0,
        features: JSON.stringify([
          'Up to 350 contacts & 1,000 email sends',
          'Pre-built email templates',
          'Basic email automation workflows',
          'Standard reporting & analytics',
          '24/7 Email customer support'
        ])
      },
      {
        plan_code: 'essentials',
        name: 'Essentials',
        tagline: 'Great for senders who need support and core automation features.',
        monthly_price: 775.00,
        discount_percent: 50,
        trial_days: 14,
        contacts_limit: 500,
        emails_limit: 5000,
        is_popular: 0,
        features: JSON.stringify([
          '24/7 Email & Chat Support',
          'A/B Testing for email subject lines & content',
          'Custom branding on emails & forms',
          'Basic Audience Segmentation',
          'Automated customer journeys'
        ])
      },
      {
        plan_code: 'standard',
        name: 'Standard',
        tagline: 'Advanced AI tools, deeper insights & higher email delivery speed.',
        monthly_price: 1150.00,
        discount_percent: 50,
        trial_days: 14,
        contacts_limit: 500,
        emails_limit: 6000,
        is_popular: 1,
        features: JSON.stringify([
          'Advanced Generative AI features for your email campaigns',
          'Actionable insights into audience growth & conversion funnels',
          'Enhanced email automations to engage your subscribers on autopilot',
          'Custom-coded email templates tailored to your brand identity',
          'Customizable popup forms designed to capture more leads effortlessly',
          'Personalized onboarding to get your email campaigns running smoothly'
        ])
      },
      {
        plan_code: 'premium',
        name: 'Premium',
        tagline: 'Enterprise-grade capabilities, dedicated IP & priority phone support.',
        monthly_price: 23000.00,
        discount_percent: 50,
        trial_days: 14,
        contacts_limit: 10000,
        emails_limit: 150000,
        is_popular: 0,
        features: JSON.stringify([
          'Unlimited contacts & high-volume sending rate',
          'Dedicated IP address & custom DKIM authentication',
          'Advanced multivariate testing & predictive analytics',
          'Priority phone & live chat 24/7 support',
          'Custom role-based permissions & multi-user collaboration'
        ])
      }
    ];

    for (const p of defaultPlans) {
      await pool.query(`
        INSERT INTO plans (plan_code, name, tagline, monthly_price, discount_percent, trial_days, contacts_limit, emails_limit, is_popular, features)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          name = VALUES(name),
          tagline = VALUES(tagline),
          is_popular = VALUES(is_popular);
      `, [p.plan_code, p.name, p.tagline, p.monthly_price, p.discount_percent, p.trial_days, p.contacts_limit, p.emails_limit, p.is_popular, p.features]);
    }

    console.log('✅ Plans & Subscriptions tables initialized successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error initializing plans db:', err);
    process.exit(1);
  }
}

initPlansDb();
