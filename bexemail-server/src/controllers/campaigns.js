const pool = require('../config/db');
const { logHistory } = require('../utils/historyLogger');
exports.dispatchCampaign = async (req, res) => {
  const { campaignName, subject, htmlContent, listId, senderId, isAbTest, variantBSubject, variantBHtml } = req.body;
  const userRole = req.headers['x-user-role'] || 'Campaign Manager'; // MOCK RBAC header

  if (!campaignName || !subject || !htmlContent || !listId) {
    return res.status(400).json({ error: 'Missing required campaign fields' });
  }

  // Determine initial status based on user role (Approvals Logic)
  const initialStatus = userRole === 'Super Admin' ? 'sending' : 'submitted_for_review';

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // 1. Insert Campaign
    const [campaignResult] = await connection.query(
      `INSERT INTO campaigns (name, subject, html_content, list_id, sender_id, status, is_ab_test, variant_b_subject, variant_b_html)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [campaignName, subject, htmlContent, listId, senderId, initialStatus, isAbTest ? 1 : 0, variantBSubject || null, variantBHtml || null]
    );
    const campaignId = campaignResult.insertId;

    if (initialStatus === 'sending') {
      // 2. Fetch Active Subscribers
      const [subscribers] = await connection.query(
        `SELECT s.id 
         FROM subscribers s
         JOIN subscriber_lists sl ON s.id = sl.subscriber_id
         WHERE sl.list_id = ? AND s.status = 'subscribed'`,
        [listId]
      );

      if (subscribers.length > 0) {
        // A/B Testing Logic Simulation
        let queueValues = [];
        
        if (isAbTest) {
          // Send to 10% each (for simplicity, we just split the array if small, or calculate)
          const tenPercent = Math.max(1, Math.floor(subscribers.length * 0.10));
          
          const groupA = subscribers.slice(0, tenPercent);
          const groupB = subscribers.slice(tenPercent, tenPercent * 2);
          // the rest are held back until a winner is chosen manually (status = held)

          groupA.forEach(sub => queueValues.push([sub.id, campaignId, 'pending', 'A']));
          groupB.forEach(sub => queueValues.push([sub.id, campaignId, 'pending', 'B']));
          
          // Assuming we altered email_queue to support variant column, 
          // For now, standard queueing without strict variant logging in queue table (we'd resolve content at worker level via A/B tracking table)
          // To keep it simple without altering queue table again: 
          queueValues = [...groupA, ...groupB].map(sub => [sub.id, campaignId, 'pending']);
        } else {
          queueValues = subscribers.map(sub => [sub.id, campaignId, 'pending']);
        }
        
        if (queueValues.length > 0) {
          await connection.query(
            `INSERT INTO email_queue (recipient_id, campaign_id, status) VALUES ?`,
            [queueValues]
          );
        }
      }
    }

    await connection.commit();
    const newCampaign = { id: campaignId, name: campaignName, subject, html_content: htmlContent, list_id: listId, sender_id: senderId, status: initialStatus, is_ab_test: isAbTest ? 1 : 0, variant_b_subject: variantBSubject || null, variant_b_html: variantBHtml || null };
    await logHistory('campaigns', campaignId, 'add', null, newCampaign, req.headers['x-user-role']);

    res.status(200).json({ 
      message: initialStatus === 'sending' ? 'Campaign dispatched successfully' : 'Campaign submitted for review', 
      campaignId, 
      status: initialStatus
    });

  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Dispatch error:', error);
    res.status(500).json({ error: 'Failed to dispatch campaign' });
  } finally {
    if (connection) connection.release();
  }
};

exports.getCampaigns = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT c.*, l.name as list_name FROM campaigns c LEFT JOIN lists l ON c.list_id = l.id ORDER BY c.created_at DESC');
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
  const { campaignName, subject, htmlContent, listId, senderId, isAbTest, variantBSubject, variantBHtml } = req.body;
  
  try {
    const [oldRows] = await pool.query('SELECT * FROM campaigns WHERE id = ?', [id]);
    const oldData = oldRows[0];
    
    await pool.query(
      `UPDATE campaigns 
       SET name = ?, subject = ?, html_content = ?, list_id = ?, sender_id = ?, is_ab_test = ?, variant_b_subject = ?, variant_b_html = ?
       WHERE id = ?`,
      [campaignName, subject, htmlContent, listId, senderId, isAbTest ? 1 : 0, variantBSubject || null, variantBHtml || null, id]
    );
    
    const newData = { ...oldData, name: campaignName, subject, html_content: htmlContent, list_id: listId, sender_id: senderId, is_ab_test: isAbTest ? 1 : 0, variant_b_subject: variantBSubject || null, variant_b_html: variantBHtml || null };
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
    if (campaign.status !== 'submitted_for_review') {
      await connection.rollback();
      return res.status(400).json({ error: 'Campaign is not in review status' });
    }

    // 1. Update status to sending
    await connection.query('UPDATE campaigns SET status = "sending" WHERE id = ?', [id]);

    // 2. Fetch Active Subscribers
    const [subscribers] = await connection.query(
      `SELECT s.id 
       FROM subscribers s
       JOIN subscriber_lists sl ON s.id = sl.subscriber_id
       WHERE sl.list_id = ? AND s.status = 'subscribed'`,
      [campaign.list_id]
    );

    if (subscribers.length > 0) {
      // For simplicity, handle standard queueing (assuming no partial A/B test sent yet)
      let queueValues = [];
      if (campaign.is_ab_test) {
        const tenPercent = Math.max(1, Math.floor(subscribers.length * 0.10));
        const groupA = subscribers.slice(0, tenPercent);
        const groupB = subscribers.slice(tenPercent, tenPercent * 2);
        queueValues = [...groupA, ...groupB].map(sub => [sub.id, campaign.id, 'pending']);
      } else {
        queueValues = subscribers.map(sub => [sub.id, campaign.id, 'pending']);
      }
      
      if (queueValues.length > 0) {
        await connection.query(
          `INSERT INTO email_queue (recipient_id, campaign_id, status) VALUES ?`,
          [queueValues]
        );
      }
    }

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
      `INSERT INTO campaigns (name, subject, html_content, list_id, sender_id, status, is_ab_test, variant_b_subject, variant_b_html)
       VALUES (?, ?, ?, ?, ?, 'draft', ?, ?, ?)`,
      [`${campaign.name} (Copy)`, campaign.subject, campaign.html_content, campaign.list_id, campaign.sender_id, campaign.is_ab_test, campaign.variant_b_subject, campaign.variant_b_html]
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
      // We should technically push to email_queue here if it's not already queued.
      // But for simplicity, we can rely on approveCampaign for actually queueing it if it's 'sending'.
      // If the UI calls updateCampaignStatus to 'schedule', we need to queue it.
      if (status === 'scheduled') {
        const [campaigns] = await pool.query('SELECT * FROM campaigns WHERE id = ?', [id]);
        const campaign = campaigns[0];
        
        const [subscribers] = await pool.query(
          `SELECT s.id 
           FROM subscribers s
           JOIN subscriber_lists sl ON s.id = sl.subscriber_id
           WHERE sl.list_id = ? AND s.status = 'subscribed'`,
          [campaign.list_id]
        );
        
        if (subscribers.length > 0) {
          const queueValues = subscribers.map(sub => [sub.id, campaign.id, 'pending']);
          await pool.query(
            `INSERT INTO email_queue (recipient_id, campaign_id, status) VALUES ?`,
            [queueValues]
          );
        }
      }
    }
    
    res.json({ message: 'Campaign updated successfully' });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ error: 'Database error' });
  }
};
