const pool = require('./src/config/db');

async function run() {
  try {
    console.log('Creating automation_versions table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS automation_versions (
          id INT AUTO_INCREMENT PRIMARY KEY,
          automation_id INT NOT NULL,
          version_number INT NOT NULL,
          workflow_graph JSON NOT NULL,
          created_by INT NULL,
          published_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (automation_id) REFERENCES automations(id) ON DELETE CASCADE
      );
    `);
    
    console.log('Migration Phase 2 completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error in Phase 2 migration:', error);
    process.exit(1);
  }
}

run();
