const pool = require('./src/config/db');

async function run() {
  try {
    console.log('Creating automations table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS automations (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          status ENUM('draft', 'active', 'paused', 'stopped', 'completed', 'archived', 'error') DEFAULT 'draft',
          trigger_type VARCHAR(100),
          audience_id INT NULL,
          reentry_policy JSON NULL,
          workflow_graph JSON,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );
    `);

    console.log('Creating automation_contacts table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS automation_contacts (
          id BIGINT AUTO_INCREMENT PRIMARY KEY,
          automation_id INT NOT NULL,
          subscriber_id INT NOT NULL, 
          current_node_id VARCHAR(100) NOT NULL,
          status ENUM('waiting', 'processing', 'paused', 'completed', 'exited', 'failed', 'goal_achieved', 'removed', 'suppressed') DEFAULT 'processing',
          next_execution_time TIMESTAMP NULL,
          entered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          completed_at TIMESTAMP NULL,
          exit_reason VARCHAR(255) NULL,
          context_json JSON NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (automation_id) REFERENCES automations(id) ON DELETE CASCADE,
          FOREIGN KEY (subscriber_id) REFERENCES subscribers(id) ON DELETE CASCADE
      );
    `);

    console.log('Creating automation_logs table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS automation_logs (
          id BIGINT AUTO_INCREMENT PRIMARY KEY,
          automation_id INT NOT NULL,
          subscriber_id INT NOT NULL,
          node_id VARCHAR(100) NOT NULL,
          action_taken VARCHAR(255) NOT NULL,
          status VARCHAR(50) DEFAULT 'success',
          input_data JSON NULL,
          output_data JSON NULL,
          error_message TEXT NULL,
          timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (automation_id) REFERENCES automations(id) ON DELETE CASCADE,
          FOREIGN KEY (subscriber_id) REFERENCES subscribers(id) ON DELETE CASCADE
      );
    `);

    console.log('Automation tables created successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error creating tables:', error);
    process.exit(1);
  }
}

run();
