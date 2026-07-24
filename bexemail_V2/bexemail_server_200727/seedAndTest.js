require('dotenv').config();
const pool = require('./src/config/db');

async function seedAndTest() {
  const targetEmail = process.argv[2] || process.env.SMTP_USER || 'test@example.com';
  console.log(`Starting End-to-End Test Seed for ${targetEmail}...`);

  let connection;
  try {
    connection = await pool.getConnection();

    // 1. Create a dummy list
    const [listResult] = await connection.query(
      `INSERT INTO lists (name, description) VALUES ('E2E Test List', 'List for End-to-End testing')`
    );
    const listId = listResult.insertId;

    // 2. Create a dummy subscriber
    const [subResult] = await connection.query(
      `INSERT INTO subscribers (email, first_name, status) VALUES (?, 'TestUser', 'subscribed') 
       ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)`,
      [targetEmail]
    );
    const subscriberId = subResult.insertId;

    // 3. Assign subscriber to list
    await connection.query(
      `INSERT IGNORE INTO subscriber_lists (subscriber_id, list_id) VALUES (?, ?)`,
      [subscriberId, listId]
    );

    // 4. Create a dummy campaign
    const [campResult] = await connection.query(
      `INSERT INTO campaigns (name, subject, html_content, list_id, status) 
       VALUES ('E2E Test Campaign', 'E2E Delivery Test', '<h1>This is a test email</h1><p>Testing the background worker queue rate limit.</p>', ?, 'processing')`,
      [listId]
    );
    const campaignId = campResult.insertId;

    // 5. Seed the email_queue with 10 identical dummy emails pointing to the same address
    console.log(`Seeding 10 emails into the queue for Campaign ID: ${campaignId}`);
    for (let i = 1; i <= 10; i++) {
      await connection.query(
        `INSERT INTO email_queue (campaign_id, recipient_id, status) VALUES (?, ?, 'pending')`,
        [campaignId, subscriberId]
      );
    }

    console.log('\n✅ Successfully seeded 10 emails into the email_queue!');
    console.log('To test the 3-second rate limit, open a new terminal and run:');
    console.log('  node src/workers/worker.js');

  } catch (error) {
    console.error('Error during seed:', error);
  } finally {
    if (connection) connection.release();
    process.exit(0);
  }
}

seedAndTest();
