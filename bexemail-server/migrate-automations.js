const pool = require('./src/config/db');

async function run() {
  try {
    console.log('Altering automations table...');
    await pool.query(`
      ALTER TABLE automations 
      MODIFY COLUMN status ENUM('draft', 'active', 'paused', 'stopped', 'completed', 'archived', 'error') DEFAULT 'draft',
      ADD COLUMN IF NOT EXISTS audience_id INT NULL,
      ADD COLUMN IF NOT EXISTS reentry_policy JSON NULL;
    `);

    console.log('Altering automation_contacts table...');
    await pool.query(`
      ALTER TABLE automation_contacts
      MODIFY COLUMN status ENUM('waiting', 'processing', 'paused', 'completed', 'exited', 'failed', 'goal_achieved', 'removed', 'suppressed') DEFAULT 'processing',
      ADD COLUMN IF NOT EXISTS entered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP NULL,
      ADD COLUMN IF NOT EXISTS exit_reason VARCHAR(255) NULL,
      ADD COLUMN IF NOT EXISTS context_json JSON NULL;
    `);

    console.log('Altering automation_logs table...');
    await pool.query(`
      ALTER TABLE automation_logs
      ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'success',
      ADD COLUMN IF NOT EXISTS input_data JSON NULL,
      ADD COLUMN IF NOT EXISTS output_data JSON NULL,
      ADD COLUMN IF NOT EXISTS error_message TEXT NULL;
    `);

    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error altering tables:', error);
    process.exit(1);
  }
}

run();
