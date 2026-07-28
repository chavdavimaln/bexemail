const pool = require('../config/db');
const { logHistory } = require('../utils/historyLogger');

// Helper to enqueue subscribers for a campaign
async function enqueueSubscribers(db, campaignId, listId, isAbTest, targetEmail) {
  try {
    const [existing] = await db.query('SELECT COUNT(*) as cnt FROM email_queue WHERE campaign_id = ?', [campaignId]);
    if (existing[0].cnt > 0) {
      console.log(`[Campaigns] Campaign #${campaignId} already has ${existing[0].cnt} queued emails.`);
      return;
    }

    let subscribers = [];

    // Mode 1: Single/Multiple recipient target email(s)
    if (targetEmail && targetEmail.trim() !== '') {
      const emails = targetEmail.split(',').map(e => e.trim()).filter(e => e.length > 0);
      for (const cleanEmail of emails) {
        let [existingSub] = await db.query('SELECT id FROM subscribers WHERE email = ?', [cleanEmail]);
        let subId;
        if (existingSub.length > 0) {
          subId = existingSub[0].id;
        } else {
          const [insertRes] = await db.query(
            'INSERT INTO subscribers (email, status) VALUES (?, "subscribed")',
            [cleanEmail]
          );
          subId = insertRes.insertId;
        }
        subscribers.push({ id: subId });
      }
      console.log(`[Campaigns] Target mode: Individual Contact(s) (${emails.join(', ')}, Subscriber IDs: ${subscribers.map(s => s.id).join(', ')})`);
    } else {
      // Mode 2: Audience List target
      const [rows] = await db.query(
        `SELECT DISTINCT s.id 
         FROM subscribers s
         JOIN subscriber_lists sl ON s.id = sl.subscriber_id
         WHERE sl.list_id = ? AND s.status = 'subscribed'`,
        [listId]
      );
      subscribers = rows;

      // Fallback: If no list mapping exists, fetch all subscribed contacts
      if (subscribers.length === 0) {
        const [allSubs] = await db.query(
          `SELECT id FROM subscribers WHERE status = 'subscribed'`
        );
        subscribers = allSubs;
      }
    }

    if (subscribers.length > 0) {
      let queueValues = [];
      if (isAbTest && (!targetEmail || targetEmail.trim() === '')) {
        const tenPercent = Math.max(1, Math.floor(subscribers.length * 0.10));
        const groupA = subscribers.slice(0, tenPercent);
        const groupB = subscribers.slice(tenPercent, tenPercent * 2);
        queueValues = [...groupA, ...groupB].map(sub => [sub.id, campaignId, 'pending']);
      } else {
        queueValues = subscribers.map(sub => [sub.id, campaignId, 'pending']);
      }

      if (queueValues.length > 0) {
        await db.query(
          `INSERT INTO email_queue (recipient_id, campaign_id, status) VALUES ?`,
          [queueValues]
        );
        console.log(`[Campaigns] Successfully enqueued ${queueValues.length} subscribers for campaign #${campaignId}`);
      }
    } else {
      console.warn(`[Campaigns] No active subscribed contacts found for campaign #${campaignId}`);
    }
  } catch (err) {
    console.error(`[Campaigns] Error enqueuing subscribers for campaign #${campaignId}:`, err);
  }
}

exports.dispatchCampaign = async (req, res) => {
  const { campaignName, name, subject, htmlContent, html_content, listId, list_id, senderId, sender_id, isAbTest, is_ab_test, variantBSubject, variant_b_subject, variantBHtml, variant_b_html, targetEmail, target_email, status } = req.body;
  const userRole = req.headers['x-user-role'] || 'Campaign Manager';

  const finalName = campaignName || name;
  const finalSubject = subject;
  const finalHtml = htmlContent || html_content;
  const finalListId = listId || list_id || null;
  const finalSenderId = senderId || sender_id || null;
  const finalAbTest = isAbTest || is_ab_test;
  const finalVarBSubject = variantBSubject || variant_b_subject;
  const finalVarBHtml = variantBHtml || variant_b_html;
  const finalTargetEmail = targetEmail || target_email || null;

  if (!finalName || !finalSubject || !finalHtml) {
    return res.status(400).json({ error: 'Missing required campaign fields (Name, Subject, Content)' });
  }

  if (!finalListId && (!finalTargetEmail || finalTargetEmail.trim() === '')) {
    return res.status(400).json({ error: 'Please select a target subscriber list or provide a single recipient email.' });
  }

  // Respect status parameter if provided, otherwise default by role
  const initialStatus = status || (userRole === 'Super Admin' ? 'sending' : 'submitted_for_review');

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // 1. Insert Campaign
    const [campaignResult] = await connection.query(
      `INSERT INTO campaigns (name, subject, html_content, list_id, target_email, sender_id, status, is_ab_test, variant_b_subject, variant_b_html)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [finalName, finalSubject, finalHtml, finalListId, finalTargetEmail, finalSenderId, initialStatus, finalAbTest ? 1 : 0, finalVarBSubject || null, finalVarBHtml || null]
    );
    const campaignId = campaignResult.insertId;

    if (initialStatus === 'sending' || initialStatus === 'scheduled') {
      await enqueueSubscribers(connection, campaignId, finalListId, finalAbTest, finalTargetEmail);
    }

    await connection.commit();
    const newCampaign = { id: campaignId, name: finalName, subject: finalSubject, html_content: finalHtml, list_id: finalListId, target_email: finalTargetEmail, sender_id: finalSenderId, status: initialStatus };
    await logHistory('campaigns', campaignId, 'add', null, newCampaign, req.headers['x-user-role']);

    res.status(200).json({ 
      message: initialStatus === 'sending' ? 'Campaign dispatched successfully' : 'Campaign saved/submitted', 
      campaignId, 
      status: initialStatus
    });

  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Dispatch error:', error);
    res.status(500).json({ error: 'Failed to dispatch campaign: ' + error.message });
  } finally {
    if (connection) connection.release();
  }
};

exports.getCampaigns = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        c.*, 
        l.name as list_name,
        (SELECT COUNT(*) FROM email_queue eq WHERE eq.campaign_id = c.id AND eq.status = 'sent') as delivered_count,
        (SELECT COUNT(*) FROM campaign_opens co WHERE co.campaign_id = c.id) as opened_count
      FROM campaigns c 
      LEFT JOIN lists l ON c.list_id = l.id 
      ORDER BY c.created_at DESC
    `);
    res.json(rows);
  } catch (error) {
    console.error('Fetch campaigns error:', error);
    res.status(500).json({ error: 'Database error' });
  }
};

exports.getCampaignById = async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await pool.query('SELECT * FROM campaigns WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Campaign not found' });
    res.json(rows[0]);
  } catch (error) {
    console.error('Fetch campaign by ID error:', error);
    res.status(500).json({ error: 'Database error' });
  }
};

exports.updateCampaign = async (req, res) => {
  const { id } = req.params;
  const { campaignName, name, subject, htmlContent, html_content, listId, list_id, senderId, sender_id, isAbTest, is_ab_test, variantBSubject, variant_b_subject, variantBHtml, variant_b_html, targetEmail, target_email, status } = req.body;
  
  const finalName = campaignName || name;
  const finalSubject = subject;
  const finalHtml = htmlContent || html_content;
  const finalListId = listId || list_id || null;
  const finalSenderId = senderId || sender_id || null;
  const finalAbTest = isAbTest || is_ab_test;
  const finalVarBSubject = variantBSubject || variant_b_subject;
  const finalVarBHtml = variantBHtml || variant_b_html;
  const finalTargetEmail = targetEmail || target_email || null;

  try {
    const [oldRows] = await pool.query('SELECT * FROM campaigns WHERE id = ?', [id]);
    const oldData = oldRows[0];
    
    let query = `UPDATE campaigns SET name = ?, subject = ?, html_content = ?, list_id = ?, target_email = ?, sender_id = ?, is_ab_test = ?, variant_b_subject = ?, variant_b_html = ?`;
    const params = [finalName, finalSubject, finalHtml, finalListId, finalTargetEmail, finalSenderId, finalAbTest ? 1 : 0, finalVarBSubject || null, finalVarBHtml || null];

    if (status) {
      query += `, status = ?`;
      params.push(status);
    }

    query += ` WHERE id = ?`;
    params.push(id);

    await pool.query(query, params);

    const targetStatus = status || oldData.status;
    if (targetStatus === 'sending' || targetStatus === 'scheduled') {
      await enqueueSubscribers(pool, id, finalListId, finalAbTest, finalTargetEmail);
    }

    const newData = { ...oldData, name: finalName, subject: finalSubject, html_content: finalHtml, list_id: finalListId, target_email: finalTargetEmail, sender_id: finalSenderId, status: targetStatus };
    await logHistory('campaigns', id, 'edit', oldData, newData, req.headers['x-user-role']);
    res.json({ message: 'Campaign updated successfully' });
  } catch (error) {
    console.error('Update campaign error:', error);
    res.status(500).json({ error: 'Database error' });
  }
};

exports.approveCampaign = async (req, res) => {
  const { id } = req.params;

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [campaigns] = await connection.query('SELECT * FROM campaigns WHERE id = ? FOR UPDATE', [id]);
    if (campaigns.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Campaign not found' });
    }

    const campaign = campaigns[0];

    // 1. Update status to sending
    await connection.query('UPDATE campaigns SET status = "sending" WHERE id = ?', [id]);

    // 2. Enqueue subscribers
    await enqueueSubscribers(connection, campaign.id, campaign.list_id, campaign.is_ab_test, campaign.target_email);

    await connection.commit();
    res.json({ message: 'Campaign approved and dispatching' });

  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Approval error:', error);
    res.status(500).json({ error: 'Failed to approve campaign' });
  } finally {
    if (connection) connection.release();
  }
};

exports.deleteCampaign = async (req, res) => {
  const { id } = req.params;
  try {
    const [oldRows] = await pool.query('SELECT * FROM campaigns WHERE id = ?', [id]);
    const oldData = oldRows[0];
    
    await pool.query('DELETE FROM email_queue WHERE campaign_id = ?', [id]);
    await pool.query('DELETE FROM campaigns WHERE id = ?', [id]);
    
    if (oldData) {
      await logHistory('campaigns', id, 'delete', oldData, null, req.headers['x-user-role']);
    }
    res.json({ message: 'Campaign deleted successfully' });
  } catch (error) {
    console.error('Delete campaign error:', error);
    res.status(500).json({ error: 'Database error' });
  }
};

exports.duplicateCampaign = async (req, res) => {
  const { id } = req.params;
  try {
    const [campaigns] = await pool.query('SELECT * FROM campaigns WHERE id = ?', [id]);
    if (campaigns.length === 0) return res.status(404).json({ error: 'Campaign not found' });
    
    const campaign = campaigns[0];
    const [result] = await pool.query(
      `INSERT INTO campaigns (name, subject, html_content, list_id, target_email, sender_id, status, is_ab_test, variant_b_subject, variant_b_html)
       VALUES (?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?)`,
      [`${campaign.name} (Copy)`, campaign.subject, campaign.html_content, campaign.list_id, campaign.target_email, campaign.sender_id, campaign.is_ab_test, campaign.variant_b_subject, campaign.variant_b_html]
    );
    
    res.json({ message: 'Campaign duplicated successfully', id: result.insertId });
  } catch (error) {
    console.error('Duplicate error:', error);
    res.status(500).json({ error: 'Database error' });
  }
};

exports.updateCampaignStatus = async (req, res) => {
  const { id } = req.params;
  const { status, scheduled_at } = req.body;
  try {
    let query = 'UPDATE campaigns SET status = ?';
    const params = [status];
    
    if (scheduled_at !== undefined) {
      query += ', scheduled_at = ?';
      params.push(scheduled_at ? new Date(scheduled_at) : null);
    }
    
    query += ' WHERE id = ?';
    params.push(id);
    
    await pool.query(query, params);
    
    if (status === 'sending' || status === 'scheduled') {
      const [campaigns] = await pool.query('SELECT * FROM campaigns WHERE id = ?', [id]);
      if (campaigns.length > 0) {
        const campaign = campaigns[0];
        await enqueueSubscribers(pool, id, campaign.list_id, campaign.is_ab_test, campaign.target_email);
      }
    }
    
    res.json({ message: 'Campaign updated successfully' });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ error: 'Database error' });
  }
};
