const db = require('../config/db');

// Lazy queue getter — only creates the BullMQ Queue when Redis is actually needed
// This prevents the Queue constructor from spawning connections at startup
let _automationQueue = null;
function getAutomationQueue() {
  if (!_automationQueue) {
    const { Queue } = require('bullmq');
    const connection = require('../config/redisConnection');
    _automationQueue = new Queue('automationQueue', { connection });
  }
  return _automationQueue;
}

exports.trackOpen = async (req, res) => {
    const { campaignId, subscriberId } = req.params;
    try {
        await db.query(
            `INSERT INTO campaign_opens (campaign_id, subscriber_id) VALUES (?, ?)`,
            [campaignId, subscriberId]
        );
        
        // Resume any automations waiting for an open
        const [waiting] = await db.query(
            `SELECT automation_id, current_node_id FROM automation_contacts WHERE subscriber_id = ? AND status = 'waiting_condition' AND JSON_EXTRACT(context_json, '$.waitCondition') = 'opened_email'`,
            [subscriberId]
        );
        
        if (waiting.length > 0) {
            const automationQueue = getAutomationQueue();
            for (const w of waiting) {
                await db.query(`UPDATE automation_contacts SET status = 'processing' WHERE subscriber_id = ? AND automation_id = ?`, [subscriberId, w.automation_id]);
                await db.query(`INSERT INTO automation_logs (automation_id, subscriber_id, node_id, action_taken) VALUES (?, ?, ?, ?)`, [w.automation_id, subscriberId, w.current_node_id, 'Resumed: Opened email']);
                await automationQueue.add('process_step', { automation_id: w.automation_id, subscriber_id: subscriberId, current_node_id: w.current_node_id });
            }
        }
    } catch (error) {
        console.error("Open track error", error);
    } finally {
        // Send a 1x1 transparent pixel
        const buf = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
        res.writeHead(200, {
            'Content-Type': 'image/gif',
            'Content-Length': buf.length
        });
        res.end(buf);
    }
};

exports.trackClick = async (req, res) => {
    const { campaignId, subscriberId } = req.params;
    const { url } = req.query; // Destination URL passed as a query param
    try {
        if (url) {
            await db.query(
                `INSERT INTO campaign_clicks (campaign_id, subscriber_id, url) VALUES (?, ?, ?)`,
                [campaignId, subscriberId, url]
            );
            
            // Resume any automations waiting for a click
            const [waiting] = await db.query(
                `SELECT automation_id, current_node_id FROM automation_contacts WHERE subscriber_id = ? AND status = 'waiting_condition' AND JSON_EXTRACT(context_json, '$.waitCondition') = 'clicked_link'`,
                [subscriberId]
            );
            
            if (waiting.length > 0) {
                const automationQueue = getAutomationQueue();
                for (const w of waiting) {
                    await db.query(`UPDATE automation_contacts SET status = 'processing' WHERE subscriber_id = ? AND automation_id = ?`, [subscriberId, w.automation_id]);
                    await db.query(`INSERT INTO automation_logs (automation_id, subscriber_id, node_id, action_taken) VALUES (?, ?, ?, ?)`, [w.automation_id, subscriberId, w.current_node_id, 'Resumed: Clicked link']);
                    await automationQueue.add('process_step', { automation_id: w.automation_id, subscriber_id: subscriberId, current_node_id: w.current_node_id });
                }
            }
        }
    } catch (error) {
        console.error("Click track error", error);
    } finally {
        res.redirect(url || '/');
    }
};
