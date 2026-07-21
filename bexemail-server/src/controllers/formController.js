const pool = require('../config/db');

exports.submitForm = async (req, res) => {
  const { listId } = req.params;
  const { email, first_name, last_name, redirectUrl } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // 1. Find or create subscriber
    let subscriberId;
    const [existing] = await connection.query(`SELECT id FROM subscribers WHERE email = ?`, [email]);
    
    if (existing.length > 0) {
      subscriberId = existing[0].id;
      // Update name if provided
      if (first_name || last_name) {
        await connection.query(
          `UPDATE subscribers SET first_name = COALESCE(?, first_name), last_name = COALESCE(?, last_name) WHERE id = ?`,
          [first_name, last_name, subscriberId]
        );
      }
    } else {
      const [result] = await connection.query(
        `INSERT INTO subscribers (email, first_name, last_name, status) VALUES (?, ?, ?, 'subscribed')`,
        [email, first_name || null, last_name || null]
      );
      subscriberId = result.insertId;
    }

    // 2. Add to list if not already in it
    if (listId) {
      const [listLink] = await connection.query(
        `SELECT id FROM subscriber_lists WHERE subscriber_id = ? AND list_id = ?`,
        [subscriberId, listId]
      );
      
      if (listLink.length === 0) {
        await connection.query(
          `INSERT INTO subscriber_lists (subscriber_id, list_id) VALUES (?, ?)`,
          [subscriberId, listId]
        );
      }
    }

    await connection.commit();

    // 3. Trigger automations
    try {
      const { triggerAutomations } = require('../utils/automationTrigger');
      
      // Trigger list join automation
      if (listId) {
        await triggerAutomations(subscriberId, 'Subscriber joins list', { listId });
      }

      // Trigger specific form type automation
      const formType = req.body.form_type || 'Signup form submitted';
      await triggerAutomations(subscriberId, formType, { listId });

      // Trigger specific form field selected automation
      for (const [key, value] of Object.entries(req.body)) {
        if (!['email', 'redirectUrl', 'form_type', 'list_id', 'listId'].includes(key) && value) {
          await triggerAutomations(subscriberId, 'Specific form field selected', {
            listId,
            fieldName: key,
            fieldValue: String(value)
          });
        }
      }
    } catch (triggerError) {
      console.error('Failed to trigger automations for form submission:', triggerError);
    }

    // Support standard HTML form redirects
    if (redirectUrl) {
      return res.redirect(redirectUrl);
    }
    
    res.json({ message: 'Successfully subscribed' });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Form Submission Error:', error);
    res.status(500).json({ error: 'Failed to process subscription' });
  } finally {
    if (connection) connection.release();
  }
};
