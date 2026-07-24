const cron = require('node-cron');
const pool = require('../config/db');

// This worker runs every 5 minutes
cron.schedule('*/5 * * * *', async () => {
  console.log('Running automation evaluation check...');
  let connection;
  try {
    connection = await pool.getConnection();

    // 1. Fetch active automations
    const [automations] = await connection.query(`SELECT * FROM automations WHERE status = 'active'`);

    for (let auto of automations) {
      if (auto.trigger_type === 'welcome') {
        // Find new subscribers (created in last hour) that haven't received this welcome email yet
        // In a real system, you'd track subscriber progress through automation_steps table.
        // For demonstration, we simply log the intention.
        console.log(`Evaluating 'welcome' automation: ${auto.name}`);
        
        // Example check:
        // SELECT s.id FROM subscribers s WHERE s.created_at >= NOW() - INTERVAL 1 HOUR 
        // AND NOT EXISTS (SELECT 1 FROM automation_subscribers a WHERE a.subscriber_id = s.id AND a.automation_id = ?)
      } else if (auto.trigger_type === 'birthday') {
        console.log(`Evaluating 'birthday' automation: ${auto.name}`);
      }
    }

  } catch (error) {
    console.error('Automation worker error:', error);
  } finally {
    if (connection) connection.release();
  }
});

console.log('Automation cron worker initialized.');
