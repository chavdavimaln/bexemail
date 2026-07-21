const cron = require('node-cron');
const db = require('../config/db');
const { Queue } = require('bullmq');
const connection = require('../config/redisConnection');

const automationQueue = new Queue('automationQueue', { connection });


cron.schedule('* * * * *', async () => {
    try {


        // Find contacts who are waiting and their time has arrived
        const [readyContacts] = await db.query(`
            SELECT automation_id, subscriber_id, current_node_id 
            FROM automation_contacts 
            WHERE status = 'waiting' AND next_execution_time <= NOW()
        `);

        for (let contact of readyContacts) {
            // Update status back to processing
            await db.query(
                `UPDATE automation_contacts SET status = 'processing', next_execution_time = NULL WHERE subscriber_id = ? AND automation_id = ?`,
                [contact.subscriber_id, contact.automation_id]
            );

            // Re-add to the BullMQ queue to find the NEXT node after this delay
            await automationQueue.add('process_step', {
                automation_id: contact.automation_id,
                subscriber_id: contact.subscriber_id,
                current_node_id: contact.current_node_id // Still on the delay node, the worker will find the edge to the next node
            });
        }
    } catch (error) {
        console.error("Cron Job Error:", error);
    }
});
