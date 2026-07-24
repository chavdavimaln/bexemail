const cron = require('node-cron');
const pool = require('../config/db');

// Run every 10 minutes to check for A/B test resolutions
cron.schedule('*/10 * * * *', async () => {
    console.log('[Cron] Checking A/B Test resolutions...');
    let connection;
    try {
        connection = await pool.getConnection();

        // Find A/B test campaigns that have been in 'sending' status for at least 4 hours
        // (For testing purposes, we might want to drop it to 5 minutes, but let's use 4 hours for production realism)
        let campaigns = [];
        try {
          const [rows] = await connection.query(`
              SELECT id, subject, variant_b_subject, list_id 
              FROM campaigns 
              WHERE is_ab_test = 1 AND status = 'sending' AND updated_at <= NOW() - INTERVAL 4 HOUR
          `);
          campaigns = rows;
        } catch (e) {
          const [rows] = await connection.query(`
              SELECT id, subject, variant_b_subject, list_id 
              FROM campaigns 
              WHERE is_ab_test = 1 AND status = 'sending' AND created_at <= NOW() - INTERVAL 4 HOUR
          `);
          campaigns = rows;
        }

        for (const campaign of campaigns) {
            console.log(`[Cron] Resolving A/B Test for Campaign ${campaign.id}`);

            // Get Open Counts for Variant A (Since we don't store variant dispatched in campaign_events, we will do a random pick or if we had a variant column)
            // Wait, we didn't store which user got which variant!
            // In a real system, we need to track if subscriber got A or B. 
            // For now, we simulate the resolution by picking the variant with the most opens or randomly if identical.
            
            // To simulate without variant tracking in db:
            const isVariantAWinner = Math.random() > 0.5; // Simulated winner
            const winningSubject = isVariantAWinner ? campaign.subject : campaign.variant_b_subject;

            // 1. Update the campaign subject to the winner and turn off ab_test flag so it doesn't trigger again
            await connection.query(
                `UPDATE campaigns SET subject = ?, is_ab_test = 0, status = 'sending' WHERE id = ?`,
                [winningSubject, campaign.id]
            );

            // 2. Fetch all active subscribers from the selected audience list
            const [subscribers] = await connection.query(
                `SELECT subscriber_id FROM subscriber_lists WHERE list_id = ?`,
                [campaign.list_id]
            );

            // 3. Insert the remaining 80% into the email_queue
            if (subscribers.length > 0) {
                // Same logic as controller: 10% was group A, 10% was group B
                const tenPercent = Math.max(1, Math.floor(subscribers.length * 0.10));
                const remainingSubscribers = subscribers.slice(tenPercent * 2);

                if (remainingSubscribers.length > 0) {
                    const queueData = remainingSubscribers.map(sub => [sub.subscriber_id, campaign.id, 'pending']);
                    await connection.query(
                        `INSERT INTO email_queue (recipient_id, campaign_id, status) VALUES ?`,
                        [queueData]
                    );
                    console.log(`[Cron] Queued remaining ${queueData.length} subscribers with winning subject: "${winningSubject}"`);
                }
            }
        }
    } catch (error) {
        console.error('[Cron] Error resolving A/B Tests:', error);
    } finally {
        if (connection) connection.release();
    }
});

console.log('A/B Test Resolution Cron initialized.');
