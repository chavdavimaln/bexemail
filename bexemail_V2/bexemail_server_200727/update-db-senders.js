const pool = require('./src/config/db');

async function updateDB() {
  try {
    console.log('Creating senders table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS senders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        is_default BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Insert default sender
    const [senders] = await pool.query('SELECT * FROM senders WHERE email = ?', ['info@bexcodeservices.com']);
    if (senders.length === 0) {
      await pool.query('INSERT INTO senders (name, email, is_default) VALUES (?, ?, ?)', ['BexEmail Team', 'info@bexcodeservices.com', true]);
      console.log('Default sender created.');
    }

    // Add sender_id to campaigns table
    try {
      await pool.query('ALTER TABLE campaigns ADD COLUMN sender_id INT NULL AFTER list_id');
      console.log('Added sender_id to campaigns.');
      
      // Update existing campaigns to use default sender
      const [defaultSender] = await pool.query('SELECT id FROM senders WHERE email = ?', ['info@bexcodeservices.com']);
      if (defaultSender.length > 0) {
        await pool.query('UPDATE campaigns SET sender_id = ? WHERE sender_id IS NULL', [defaultSender[0].id]);
        console.log('Updated existing campaigns with default sender_id.');
      }
    } catch (e) {
      console.log('sender_id column might already exist:', e.message);
    }

  } catch (error) {
    console.error('Database update failed:', error);
  } finally {
    process.exit(0);
  }
}

updateDB();
