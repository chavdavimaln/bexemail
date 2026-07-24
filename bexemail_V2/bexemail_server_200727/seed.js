const pool = require('./src/config/db');

async function seed() {
  try {
    await pool.query(`INSERT IGNORE INTO lists (id, name, description) VALUES (1, 'All Subscribers (Mock)', 'Default list for campaigns'), (2, 'VIP Customers (Mock)', 'VIP list')`);
    await pool.query(`INSERT IGNORE INTO subscribers (id, email, first_name) VALUES (1, 'test@example.com', 'TestUser')`);
    await pool.query(`INSERT IGNORE INTO subscriber_lists (subscriber_id, list_id) VALUES (1, 1)`);
    console.log("Database seeded successfully with dummy lists and subscribers for testing.");
  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}

seed();
