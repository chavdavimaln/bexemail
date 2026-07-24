const express = require('express');
const router = express.Router();
const pool = require('../config/db');

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

module.exports = router;
