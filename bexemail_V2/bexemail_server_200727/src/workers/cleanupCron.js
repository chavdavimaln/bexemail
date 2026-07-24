const cron = require('node-cron');
const pool = require('../config/db');

async function initCleanupCron() {
  try {
    const [rows] = await pool.query('SELECT setting_key, setting_value FROM settings WHERE setting_key IN ("cleanup_cron_frequency", "log_retention_days", "debug_cleanup_mode")');
    const settings = rows.reduce((acc, current) => {
      acc[current.setting_key] = current.setting_value;
      return acc;
    }, {});

    const CRON_SCHEDULE = settings.cleanup_cron_frequency || process.env.CLEANUP_CRON_SCHEDULE || '0 3 * * *';
    const RETENTION_DAYS = parseInt(settings.log_retention_days || process.env.LOG_RETENTION_DAYS) || 30;
    const DEBUG_MODE = settings.debug_cleanup_mode === 'true' || process.env.DEBUG_CLEANUP === 'true';

    cron.schedule(CRON_SCHEDULE, async () => {
      if (DEBUG_MODE) {
        console.log(`[Maintenance] Starting database cleanup cron job...`);
      }

      let connection;
      try {
        connection = await pool.getConnection();

        // 1. Clean up old processed queue items
        const [queueResult] = await connection.query(
          `DELETE FROM email_queue 
           WHERE status IN ('sent', 'failed') 
           AND created_at < DATE_SUB(NOW(), INTERVAL ? DAY)`,
          [RETENTION_DAYS]
        );

        if (DEBUG_MODE || queueResult.affectedRows > 0) {
          console.log(`[Maintenance] Cleaned up ${queueResult.affectedRows} old email_queue records.`);
        }

        // 2. Clean up old campaign events
        const [eventsResult] = await connection.query(
          `DELETE FROM campaign_events 
           WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)`,
          [RETENTION_DAYS]
        );

        if (DEBUG_MODE || eventsResult.affectedRows > 0) {
          console.log(`[Maintenance] Cleaned up ${eventsResult.affectedRows} old campaign_events records.`);
        }

      } catch (error) {
        console.error(`[Maintenance Error] Failed to run database cleanup:`, error);
      } finally {
        if (connection) connection.release();
      }
    });

    console.log(`[Maintenance] Cleanup cron worker initialized (Schedule: ${CRON_SCHEDULE}, Retention: ${RETENTION_DAYS} days)`);
  } catch (error) {
    // If table doesn't exist yet, just ignore
    console.log(`[Maintenance] Could not initialize cleanup cron, waiting for database setup...`);
  }
}

initCleanupCron();
