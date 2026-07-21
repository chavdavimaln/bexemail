const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const webhookController = require('../controllers/webhookController');

// External Webhook to Subscribe User
// POST /api/webhooks/subscribe
router.post('/subscribe', async (req, res) => {
  // Can accept standard form-urlencoded or JSON
  const { email, first_name, list_id, tags } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const tagsJson = tags ? JSON.stringify(Array.isArray(tags) ? tags : [tags]) : null;

    // 1. Insert or Update Subscriber
    const [subResult] = await connection.query(
      `INSERT INTO subscribers (email, first_name, status, tags)
       VALUES (?, ?, 'subscribed', ?)
       ON DUPLICATE KEY UPDATE 
         first_name = COALESCE(VALUES(first_name), first_name),
         status = 'subscribed'`,
      [email, first_name || null, tagsJson]
    );

    // Get subscriber ID (either new insertId or we have to query it if it was an update without changes)
    let subscriberId = subResult.insertId;
    if (!subscriberId) {
      const [rows] = await connection.query(`SELECT id FROM subscribers WHERE email = ?`, [email]);
      subscriberId = rows[0].id;
    }

    // 2. Assign to List if provided
    if (list_id) {
      await connection.query(
        `INSERT IGNORE INTO subscriber_lists (subscriber_id, list_id) VALUES (?, ?)`,
        [subscriberId, list_id]
      );
    }

    await connection.commit();
    
    // Trigger automations
    try {
      const { triggerAutomations } = require('../utils/automationTrigger');
      if (list_id) {
        await triggerAutomations(subscriberId, 'Subscriber joins list', { listId: list_id });
      }
      
      const formType = req.body.form_type || 'Signup form submitted';
      await triggerAutomations(subscriberId, formType, { listId: list_id });

      for (const [key, value] of Object.entries(req.body)) {
        if (!['email', 'redirectUrl', 'form_type', 'list_id', 'listId'].includes(key) && value) {
          await triggerAutomations(subscriberId, 'Specific form field selected', {
            listId: list_id,
            fieldName: key,
            fieldValue: String(value)
          });
        }
      }
    } catch (triggerError) {
      console.error('Webhook automation trigger failed:', triggerError);
    }
    
    // Check if it's a form submission expecting a redirect
    if (req.headers.accept && req.headers.accept.includes('text/html')) {
      // In a real app, you'd redirect to a success page URL provided in the payload
      res.send('<h1>Subscription Successful!</h1><p>Thank you for subscribing.</p>');
    } else {
      res.status(200).json({ message: 'Subscribed successfully', id: subscriberId });
    }

  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Failed to process subscription' });
  } finally {
    if (connection) connection.release();
  }
});

// Generic Webhook for Email Events (SES / SendGrid / Mailgun)
// POST /api/webhooks/email-events
router.post('/email-events', async (req, res) => {
  // Payload structure abstracted for a generic provider
  // e.g. { eventType: 'Hard Bounce', email: 'bounced@example.com', campaignId: 1 }
  const { eventType, email, campaignId } = req.body;

  if (!email || !eventType) {
    return res.status(400).json({ error: 'Email and eventType are required' });
  }

  let connection;
  try {
    connection = await pool.getConnection();

    // 1. Get subscriber ID
    const [subRows] = await connection.query(`SELECT id FROM subscribers WHERE email = ?`, [email]);
    if (subRows.length === 0) {
      return res.status(404).json({ error: 'Subscriber not found' });
    }
    const subscriberId = subRows[0].id;

    // 2. Process Event Type
    switch (eventType) {
      case 'Delivered':
        // Optional: Log delivery timestamp in a detailed events table
        break;

      case 'Hard Bounce':
        // Update subscriber status to Bounced so we don't send to them again
        await connection.query(`UPDATE subscribers SET status = 'bounced' WHERE id = ?`, [subscriberId]);
        break;

      case 'Spam Complaint':
        // Update subscriber status to Complained (must respect CAN-SPAM)
        await connection.query(`UPDATE subscribers SET status = 'complained' WHERE id = ?`, [subscriberId]);
        break;

      case 'Opened':
        // If the webhook provides opens instead of our tracking pixel
        if (campaignId) {
          await connection.query(
            `INSERT IGNORE INTO campaign_events (campaign_id, subscriber_id, event_type) VALUES (?, ?, 'open')`,
            [campaignId, subscriberId]
          );
          
          // Resume any automations waiting for an open
          const [waiting] = await connection.query(
              `SELECT automation_id, current_node_id FROM automation_contacts WHERE subscriber_id = ? AND status = 'waiting_condition' AND JSON_EXTRACT(context_json, '$.waitCondition') = 'opened_email'`,
              [subscriberId]
          );
          
          if (waiting.length > 0) {
            const { Queue } = require('bullmq');
            const IORedis = require('ioredis');
            const redisConn = new IORedis({ host: process.env.REDIS_HOST, port: process.env.REDIS_PORT, maxRetriesPerRequest: null });
            const autoQueue = new Queue('automationQueue', { connection: redisConn });
            
            for (const w of waiting) {
                await connection.query(`UPDATE automation_contacts SET status = 'processing' WHERE subscriber_id = ? AND automation_id = ?`, [subscriberId, w.automation_id]);
                await connection.query(`INSERT INTO automation_logs (automation_id, subscriber_id, node_id, action_taken) VALUES (?, ?, ?, ?)`, [w.automation_id, subscriberId, w.current_node_id, 'Resumed: Opened email via webhook']);
                await autoQueue.add('process_step', { automation_id: w.automation_id, subscriber_id: subscriberId, current_node_id: w.current_node_id });
            }
          }
        }
        break;

      default:
        console.log(`[Webhook] Unhandled email event type: ${eventType}`);
    }

    res.status(200).json({ message: 'Event processed successfully' });
  } catch (error) {
    console.error('Email Event Webhook error:', error);
    res.status(500).json({ error: 'Failed to process email event' });
  } finally {
    if (connection) connection.release();
  }
});

// Automation Webhook
// POST /api/webhooks/automation/:automationId/:triggerId
router.post('/automation/:automationId/:triggerId', webhookController.receiveWebhook);

module.exports = router;
