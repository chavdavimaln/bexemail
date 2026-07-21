const db = require('../config/db');

// Lazy queue getter — only creates the BullMQ Queue when a webhook actually fires
// This prevents startup ECONNREFUSED errors when Redis is not running
let _automationQueue = null;
function getAutomationQueue() {
  if (!_automationQueue) {
    const { Queue } = require('bullmq');
    const connection = require('../config/redisConnection');
    _automationQueue = new Queue('automationQueue', { connection });
  }
  return _automationQueue;
}



// POST /api/webhooks/automation/:automationId/:triggerId
exports.receiveWebhook = async (req, res) => {
    const { automationId, triggerId } = req.params;
    const { email, first_name, last_name } = req.body;

    if (!email) {
        return res.status(400).json({ error: "Email field is required in the JSON payload." });
    }

    try {
        // 1. Find or create the subscriber
        let [subscriber] = await db.query(`SELECT id FROM subscribers WHERE email = ?`, [email]);
        let subscriberId;

        if (subscriber.length === 0) {
            const [newSub] = await db.query(
                `INSERT INTO subscribers (email, first_name, last_name, status) VALUES (?, ?, ?, 'subscribed')`,
                [email, first_name, last_name]
            );
            subscriberId = newSub.insertId;
        } else {
            subscriberId = subscriber[0].id;
        }

        // 1.5 Check Re-entry Policy
        const [autoRows] = await db.query(`SELECT reentry_policy FROM automations WHERE id = ?`, [automationId]);
        if (autoRows.length === 0) return res.status(404).json({ error: "Automation not found" });
        
        const reentryPolicy = autoRows[0].reentry_policy || {};
        
        // Check if subscriber is already in the automation
        const [existing] = await db.query(`SELECT status, entered_at FROM automation_contacts WHERE subscriber_id = ? AND automation_id = ? ORDER BY entered_at DESC LIMIT 1`, [subscriberId, automationId]);
        
        if (existing.length > 0) {
            const currentStatus = existing[0].status;
            
            // If they are currently active, usually block re-entry unless explicitly allowed to have multiple concurrent runs (rare)
            if (['processing', 'waiting', 'waiting_condition'].includes(currentStatus)) {
                return res.status(400).json({ error: "Subscriber is already active in this automation." });
            }
            
            // If they finished/exited, check the policy
            if (reentryPolicy.allowReentry === false) {
                return res.status(400).json({ error: "Re-entry is not allowed for this automation." });
            }
            
            // Check frequency limit if they are allowed to re-enter
            if (reentryPolicy.cooldownDays && existing[0].entered_at) {
                const cooldownMs = reentryPolicy.cooldownDays * 24 * 60 * 60 * 1000;
                const timeSinceLastEntry = Date.now() - new Date(existing[0].entered_at).getTime();
                if (timeSinceLastEntry < cooldownMs) {
                    return res.status(400).json({ error: `Subscriber is in cooldown period for ${reentryPolicy.cooldownDays} days.` });
                }
            }
        }

        // 2. Add the subscriber into the workflow at the specific trigger node
        await db.query(
            `INSERT INTO automation_contacts (automation_id, subscriber_id, current_node_id, status, context_json) 
             VALUES (?, ?, ?, 'processing', '{}')`,
            [automationId, subscriberId, triggerId]
        );

        // 3. Immediately push a job to BullMQ so the workflow begins executing
        await getAutomationQueue().add('process_step', {

            automation_id: automationId,
            subscriber_id: subscriberId,
            current_node_id: triggerId
        });

        // Log the entry
        await db.query(
            `INSERT INTO automation_logs (automation_id, subscriber_id, node_id, action_taken) VALUES (?, ?, ?, ?)`,
            [automationId, subscriberId, triggerId, 'Entered via Webhook']
        );

        res.status(200).json({ success: true, message: "Webhook received and workflow started." });
    } catch (error) {
        console.error("Webhook Error:", error);
        res.status(500).json({ error: "Internal server error processing webhook." });
    }
};
