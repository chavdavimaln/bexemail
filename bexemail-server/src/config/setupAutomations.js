const pool = require('./db');

const templates = [
  {
    slug: 'welcome-series', name: 'Welcome Series', description: 'Greet new subscribers and introduce your brand over an automated email series.', category: 'Engagement', icon: 'users', color: 'blue', popular: 1, triggerType: 'subscriber_joins_list',
    graph: {
      nodes: [
        { id: 'welcome_1', type: 'triggerNode', position: { x: 250, y: 50 }, data: { label: 'Subscriber joins list' } },
        { id: 'welcome_2', type: 'emailNode', position: { x: 250, y: 190 }, data: { label: 'Send Welcome Email', subject: 'Welcome to the family!' } },
        { id: 'welcome_3', type: 'delayNode', position: { x: 250, y: 330 }, data: { label: 'Wait 2 days', delayTime: 2, delayUnit: 'days' } },
        { id: 'welcome_4', type: 'emailNode', position: { x: 250, y: 470 }, data: { label: 'Send Product Highlights', subject: 'See what we have for you' } }
      ],
      edges: [
        { id: 'welcome_e1', source: 'welcome_1', target: 'welcome_2' },
        { id: 'welcome_e2', source: 'welcome_2', target: 'welcome_3' },
        { id: 'welcome_e3', source: 'welcome_3', target: 'welcome_4' }
      ]
    }
  },
  {
    slug: 'abandoned-cart', name: 'Abandoned Cart', description: 'Recover sales by reminding customers about products left in their cart.', category: 'E-commerce', icon: 'shopping-cart', color: 'green', popular: 1, triggerType: 'abandoned_cart',
    graph: {
      nodes: [
        { id: 'cart_1', type: 'triggerNode', position: { x: 250, y: 50 }, data: { label: 'Abandoned cart' } },
        { id: 'cart_2', type: 'delayNode', position: { x: 250, y: 190 }, data: { label: 'Wait 1 hour', delayTime: 1, delayUnit: 'hours' } },
        { id: 'cart_3', type: 'emailNode', position: { x: 250, y: 330 }, data: { label: 'Send Cart Reminder', subject: 'You left something behind!' } },
        { id: 'cart_4', type: 'goalNode', position: { x: 250, y: 470 }, data: { label: 'Made a purchase', conversionValue: 0 } }
      ],
      edges: [
        { id: 'cart_e1', source: 'cart_1', target: 'cart_2' },
        { id: 'cart_e2', source: 'cart_2', target: 'cart_3' },
        { id: 'cart_e3', source: 'cart_3', target: 'cart_4' }
      ]
    }
  },
  {
    slug: 're-engagement', name: 'Re-engagement', description: 'Win back inactive subscribers with a targeted message and offer.', category: 'Retention', icon: 'zap', color: 'purple', popular: 0, triggerType: 'tag_added',
    graph: {
      nodes: [
        { id: 're_1', type: 'triggerNode', position: { x: 250, y: 50 }, data: { label: 'Tag added' } },
        { id: 're_2', type: 'emailNode', position: { x: 250, y: 190 }, data: { label: 'We miss you!', subject: "It's been a while..." } }
      ],
      edges: [{ id: 're_e1', source: 're_1', target: 're_2' }]
    }
  },
  {
    slug: 'post-purchase', name: 'Post-Purchase Follow Up', description: 'Request a review or recommend related products after a purchase.', category: 'E-commerce', icon: 'star', color: 'yellow', popular: 0, triggerType: 'purchase',
    graph: {
      nodes: [
        { id: 'post_1', type: 'triggerNode', position: { x: 250, y: 50 }, data: { label: 'Buys a specific product' } },
        { id: 'post_2', type: 'delayNode', position: { x: 250, y: 190 }, data: { label: 'Wait 7 days', delayTime: 7, delayUnit: 'days' } },
        { id: 'post_3', type: 'emailNode', position: { x: 250, y: 330 }, data: { label: 'Request a review', subject: 'How do you like your purchase?' } }
      ],
      edges: [
        { id: 'post_e1', source: 'post_1', target: 'post_2' },
        { id: 'post_e2', source: 'post_2', target: 'post_3' }
      ]
    }
  },
  {
    slug: 'birthday-special', name: 'Birthday Special', description: 'Send subscribers a birthday offer to encourage loyalty.', category: 'Retention', icon: 'gift', color: 'pink', popular: 0, triggerType: 'tag_added',
    graph: {
      nodes: [
        { id: 'birthday_1', type: 'triggerNode', position: { x: 250, y: 50 }, data: { label: 'Tag added', tag: 'birthday_today' } },
        { id: 'birthday_2', type: 'emailNode', position: { x: 250, y: 190 }, data: { label: 'Happy Birthday!', subject: 'A special birthday gift for you' } },
        { id: 'birthday_3', type: 'delayNode', position: { x: 250, y: 330 }, data: { label: 'Wait 3 days', delayTime: 3, delayUnit: 'days' } },
        { id: 'birthday_4', type: 'emailNode', position: { x: 250, y: 470 }, data: { label: 'Offer reminder', subject: 'Your birthday offer expires soon!' } }
      ],
      edges: [
        { id: 'birthday_e1', source: 'birthday_1', target: 'birthday_2' },
        { id: 'birthday_e2', source: 'birthday_2', target: 'birthday_3' },
        { id: 'birthday_e3', source: 'birthday_3', target: 'birthday_4' }
      ]
    }
  },
  {
    slug: 'vip-nurture', name: 'VIP Lead Nurturing', description: 'Nurture high-value leads and update their CRM status.', category: 'Engagement', icon: 'award', color: 'orange', popular: 0, triggerType: 'tag_added',
    graph: {
      nodes: [
        { id: 'vip_1', type: 'triggerNode', position: { x: 250, y: 50 }, data: { label: 'Tag added', tag: 'high_value_lead' } },
        { id: 'vip_2', type: 'emailNode', position: { x: 250, y: 190 }, data: { label: 'VIP Welcome', subject: 'Welcome to the inner circle' } },
        { id: 'vip_3', type: 'actionNode', position: { x: 250, y: 330 }, data: { label: 'Create Lead', actionType: 'crmCreateLead', crmProvider: 'salesforce' } }
      ],
      edges: [
        { id: 'vip_e1', source: 'vip_1', target: 'vip_2' },
        { id: 'vip_e2', source: 'vip_2', target: 'vip_3' }
      ]
    }
  }
];

async function setupAutomationDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS automation_templates (
      id INT AUTO_INCREMENT PRIMARY KEY,
      slug VARCHAR(100) NOT NULL UNIQUE,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      category VARCHAR(100) NOT NULL,
      icon_key VARCHAR(50) DEFAULT 'workflow',
      color_key VARCHAR(30) DEFAULT 'blue',
      is_popular BOOLEAN DEFAULT FALSE,
      trigger_type VARCHAR(100) DEFAULT 'custom',
      workflow_json LONGTEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS automation_products (
      id INT AUTO_INCREMENT PRIMARY KEY,
      external_id VARCHAR(100) NULL UNIQUE,
      name VARCHAR(255) NOT NULL,
      price DECIMAL(12,2) DEFAULT 0,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS automation_generation_history (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      prompt TEXT NOT NULL,
      workflow_json LONGTEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS automations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      status VARCHAR(50) DEFAULT 'draft',
      trigger_type VARCHAR(100) NULL,
      workflow_json LONGTEXT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS automation_steps (
      id INT AUTO_INCREMENT PRIMARY KEY,
      automation_id INT NULL,
      step_type VARCHAR(100) NULL,
      step_data JSON NULL,
      position_order INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS automation_subscribers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      automation_id INT NOT NULL,
      subscriber_id INT NOT NULL,
      status VARCHAR(50) DEFAULT 'active',
      current_step_id INT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS automation_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      automation_id INT NOT NULL,
      subscriber_id INT NOT NULL,
      action VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  for (const template of templates) {
    await pool.query(
      `INSERT IGNORE INTO automation_templates
       (slug, name, description, category, icon_key, color_key, is_popular, trigger_type, workflow_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [template.slug, template.name, template.description, template.category, template.icon, template.color, template.popular, template.triggerType, JSON.stringify(template.graph)]
    );
  }

  const products = [
    ['galaxy-sneakers', 'Galaxy sneakers', 60000],
    ['sample-tshirt', 'Sample T-shirt', 100],
    ['anon-tote', 'Anon Tote', 11.84]
  ];
  for (const product of products) {
    await pool.query(
      'INSERT IGNORE INTO automation_products (external_id, name, price) VALUES (?, ?, ?)',
      product
    );
  }
}

module.exports = setupAutomationDB;
