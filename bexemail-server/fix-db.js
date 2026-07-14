const pool = require('./src/config/db');

async function fixDB() {
  try {
    await pool.query('ALTER TABLE campaigns ADD COLUMN scheduled_at DATETIME NULL DEFAULT NULL AFTER status');
    console.log('Added scheduled_at column');
  } catch (e) {
    console.log('Column might already exist:', e.message);
  }

  try {
    await pool.query(`UPDATE campaigns SET status = 'completed' WHERE status = 'sending'`);
    console.log('Fixed stuck campaigns');
  } catch (e) {
    console.error('Failed to fix campaigns:', e);
  }
  
  process.exit(0);
}

fixDB();
