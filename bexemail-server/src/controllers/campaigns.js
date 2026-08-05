const pool = require('../config/db');
const { logHistory } = require('../utils/historyLogger');

// Helper to enqueue subscribers for a campaign
async function enqueueSubscribers(db, campaignId, listId, isAbTest, targetEmail) {
  try {
    // Delete any previous queue items for this campaign so fresh pending jobs are enqueued
    await db.query('DELETE FROM email_queue WHERE campaign_id = ?', [campaignId]);

    // Fetch campaign details to get Multi-SMTP and audience configuration
    const [cRows] = await db.query(
      'SELECT sender_id, sender_mode, sender_mapping, list_id, target_email FROM campaigns WHERE id = ?',
      [campaignId]
    );
    const campaign = cRows[0] || {};
    const senderMode = campaign.sender_mode || 'broadcast';
    let senderMapping = {};
    try {
      senderMapping = typeof campaign.sender_mapping === 'string'
        ? JSON.parse(campaign.sender_mapping || '{}')
        : (campaign.sender_mapping || {});
    } catch (e) {
      senderMapping = {};
    }

    let sendersList = String(campaign.sender_id || '')
      .split(',')
      .map(s => parseInt(s.trim(), 10))
      .filter(id => !isNaN(id) && id > 0);

    // Fallback: If campaign has no sender_id set, fetch active system/default sender
    if (sendersList.length === 0) {
      const [defaultSenders] = await db.query('SELECT id FROM senders WHERE is_default = 1 LIMIT 1');
      if (defaultSenders.length > 0) {
        sendersList = [defaultSenders[0].id];
      } else {
        const [anySender] = await db.query('SELECT id FROM senders ORDER BY id ASC LIMIT 1');
        if (anySender.length > 0) {
          sendersList = [anySender[0].id];
        }
      }
    }

    const effectiveListId = listId || campaign.list_id || 'all';
    const effectiveTargetEmail = targetEmail || campaign.target_email;

    let subscribers = [];

    // Mode 1: Single/Multiple recipient target email(s)
    if (effectiveTargetEmail && String(effectiveTargetEmail).trim() !== '') {
      const emails = String(effectiveTargetEmail).split(',').map(e => e.trim()).filter(e => e.length > 0);
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
      if (effectiveListId === 'all' || (typeof effectiveListId === 'string' && effectiveListId.includes('all'))) {
        const [allRows] = await db.query(
          `SELECT DISTINCT s.id FROM subscribers s WHERE s.status = 'subscribed'`
        );
        subscribers = allRows;
      } else {
        const listIds = String(effectiveListId || '').split(',').map(id => id.trim()).filter(Boolean);
        if (listIds.length > 0) {
          const [rows] = await db.query(
            `SELECT DISTINCT s.id 
             FROM subscribers s
             JOIN subscriber_lists sl ON s.id = sl.subscriber_id
             WHERE sl.list_id IN (?) AND s.status = 'subscribed'`,
            [listIds]
          );
          subscribers = rows;
        }

        // Fallback: If no list mapping exists, fetch all subscribed contacts
        if (subscribers.length === 0) {
          const [allSubs] = await db.query(
            `SELECT id FROM subscribers WHERE status = 'subscribed'`
          );
          subscribers = allSubs;
        }
      }
    }

    // Deduplicate target subscribers by subscriber ID
    subscribers = Array.from(new Map(subscribers.map(s => [s.id, s])).values());

    if (subscribers.length > 0) {
      let queueValues = [];

      if (sendersList.length <= 1) {
        // Single Sender
        const sId = sendersList[0] || null;
        if (isAbTest && (!targetEmail || targetEmail.trim() === '')) {
          const tenPercent = Math.max(1, Math.floor(subscribers.length * 0.10));
          const groupA = subscribers.slice(0, tenPercent);
          const groupB = subscribers.slice(tenPercent, tenPercent * 2);
          queueValues = [...groupA, ...groupB].map(sub => [sub.id, campaignId, sId, 'pending']);
        } else {
          queueValues = subscribers.map(sub => [sub.id, campaignId, sId, 'pending']);
        }
      } else {
        // Multiple Senders Selected!
        if (senderMode === 'rotate') {
          // Load balance / round robin across senders
          queueValues = subscribers.map((sub, idx) => {
            const sId = sendersList[idx % sendersList.length];
            return [sub.id, campaignId, sId, 'pending'];
          });
        } else if (senderMode === 'custom' && Object.keys(senderMapping).length > 0) {
          // Custom mapping per list or contact
          for (const sub of subscribers) {
            let mappedSenders = senderMapping[sub.id] || senderMapping[listId] || senderMapping['all'] || sendersList;
            if (!Array.isArray(mappedSenders)) mappedSenders = [mappedSenders];
            mappedSenders = mappedSenders.map(id => parseInt(id, 10)).filter(Boolean);
            if (mappedSenders.length === 0) mappedSenders = sendersList;

            for (const sId of mappedSenders) {
              queueValues.push([sub.id, campaignId, sId, 'pending']);
            }
          }
        } else {
          // Default Mode: 'broadcast' (Dual / Multi-Sender Delivery)
          // Every subscriber receives an email from EVERY selected SMTP sender!
          for (const sub of subscribers) {
            for (const sId of sendersList) {
              queueValues.push([sub.id, campaignId, sId, 'pending']);
            }
          }
        }
      }

      // Deduplicate queue values to ensure exactly 1 email per (recipient, campaign, sender) combination
      const uniqueQueueMap = new Map();
      for (const item of queueValues) {
        const key = `${item[0]}_${item[1]}_${item[2]}`;
        if (!uniqueQueueMap.has(key)) {
          uniqueQueueMap.set(key, item);
        }
      }
      queueValues = Array.from(uniqueQueueMap.values());

      // Fetch existing sent/processing records for this campaign to avoid sending duplicate emails
      const [existingSent] = await db.query(
        `SELECT recipient_id, campaign_id, sender_id FROM email_queue WHERE campaign_id = ? AND status IN ('sent', 'processing')`,
        [campaignId]
      );

      const sentKeySet = new Set(existingSent.map(r => `${r.recipient_id}_${r.campaign_id}_${r.sender_id}`));

      // Filter queueValues so we NEVER re-enqueue or re-send to (recipient, campaign, sender) combinations already sent!
      queueValues = queueValues.filter(item => {
        const key = `${item[0]}_${item[1]}_${item[2]}`;
        return !sentKeySet.has(key);
      });

      if (queueValues.length > 0) {
        // Clear any existing pending items for this campaign to avoid duplicate enqueueing on edits/approvals
        await db.query(`DELETE FROM email_queue WHERE campaign_id = ? AND status = 'pending'`, [campaignId]);

        await db.query(
          `INSERT INTO email_queue (recipient_id, campaign_id, sender_id, status) VALUES ?`,
          [queueValues]
        );
        console.log(`[Campaigns] Successfully enqueued ${queueValues.length} new unique email queue items across ${sendersList.length} sender(s) for campaign #${campaignId}`);
      } else {
        console.log(`[Campaigns] All target recipients for campaign #${campaignId} have already received this campaign from selected sender(s). Zero duplicate emails enqueued.`);
      }
    } else {
      console.warn(`[Campaigns] No active subscribed contacts found for campaign #${campaignId}`);
    }
  } catch (err) {
    console.error(`[Campaigns] Error enqueuing subscribers for campaign #${campaignId}:`, err);
  }
}

exports.dispatchCampaign = async (req, res) => {
  const { campaignName, name, subject, htmlContent, html_content, listId, list_id, senderId, sender_id, sender_mode, senderMode, sender_mapping, senderMapping, isAbTest, is_ab_test, variantBSubject, variant_b_subject, variantBHtml, variant_b_html, targetEmail, target_email, status } = req.body;
  const userRole = req.headers['x-user-role'] || 'Campaign Manager';

  const finalName = campaignName || name;
  const finalSubject = subject;
  const finalHtml = htmlContent || html_content;
  const rawListId = listId || list_id;
  const finalListId = (rawListId && !isNaN(Number(rawListId))) ? Number(rawListId) : null;
  const rawSenderId = senderId || sender_id || null;
  const finalSenderId = Array.isArray(rawSenderId) ? rawSenderId.join(',') : (rawSenderId ? String(rawSenderId) : null);
  const finalSenderMode = sender_mode || senderMode || 'broadcast';
  const finalSenderMapping = (sender_mapping || senderMapping) ? (typeof (sender_mapping || senderMapping) === 'string' ? (sender_mapping || senderMapping) : JSON.stringify(sender_mapping || senderMapping)) : null;
  const finalAbTest = isAbTest || is_ab_test;
  const finalVarBSubject = variantBSubject || variant_b_subject;
  const finalVarBHtml = variantBHtml || variant_b_html;
  const finalTargetEmail = targetEmail || target_email || null;

  if (!finalName || !finalSubject || !finalHtml) {
    return res.status(400).json({ error: 'Missing required campaign fields (Name, Subject, Content)' });
  }

  if (!rawListId && (!finalTargetEmail || finalTargetEmail.trim() === '')) {
    return res.status(400).json({ error: 'Please select a target subscriber list or provide a single recipient email.' });
  }

  // Respect status parameter if provided, otherwise default to submitted_for_review
  const initialStatus = status || 'submitted_for_review';

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const initialSenderHistory = finalSenderId || null;

    // 1. Insert Campaign
    const [campaignResult] = await connection.query(
      `INSERT INTO campaigns (name, subject, html_content, list_id, target_email, sender_id, sender_history, sender_mode, sender_mapping, status, is_ab_test, variant_b_subject, variant_b_html)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [finalName, finalSubject, finalHtml, finalListId, finalTargetEmail, finalSenderId, initialSenderHistory, finalSenderMode, finalSenderMapping, initialStatus, finalAbTest ? 1 : 0, finalVarBSubject || null, finalVarBHtml || null]
    );
    const campaignId = campaignResult.insertId;

    if (initialStatus === 'sending' || initialStatus === 'scheduled') {
      await enqueueSubscribers(connection, campaignId, finalListId, finalAbTest, finalTargetEmail);
    }

    await connection.commit();
    const newCampaign = { id: campaignId, name: finalName, subject: finalSubject, html_content: finalHtml, list_id: finalListId, target_email: finalTargetEmail, sender_id: finalSenderId, sender_history: initialSenderHistory, sender_mode: finalSenderMode, sender_mapping: finalSenderMapping, status: initialStatus };
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
        (SELECT COUNT(*) FROM campaign_opens co WHERE co.campaign_id = c.id) as opened_count,
        (SELECT COUNT(DISTINCT eq.sender_id) FROM email_queue eq WHERE eq.campaign_id = c.id AND eq.sender_id IS NOT NULL) as queue_sender_count
      FROM campaigns c 
      LEFT JOIN lists l ON c.list_id = l.id 
      ORDER BY c.created_at DESC
    `);

    // Calculate dynamic sender_count combining sender_history, current sender_id, and email_queue
    const campaignsWithSenderCount = rows.map(c => {
      const historyIds = String(c.sender_history || '').split(',').map(s => s.trim()).filter(Boolean);
      const currentIds = String(c.sender_id || '').split(',').map(s => s.trim()).filter(Boolean);
      const allDistinctSenderIds = Array.from(new Set([...historyIds, ...currentIds]));
      const finalCount = Math.max(allDistinctSenderIds.length, c.queue_sender_count || 0, 1);

      return {
        ...c,
        sender_count: finalCount,
        sender_history_ids: allDistinctSenderIds.join(',')
      };
    });

    res.json(campaignsWithSenderCount);
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
  const { campaignName, name, subject, htmlContent, html_content, listId, list_id, senderId, sender_id, sender_mode, senderMode, sender_mapping, senderMapping, isAbTest, is_ab_test, variantBSubject, variant_b_subject, variantBHtml, variant_b_html, targetEmail, target_email, status } = req.body;
  
  const finalName = campaignName || name;
  const finalSubject = subject;
  const finalHtml = htmlContent || html_content;
  const rawListId = listId || list_id;
  const finalListId = (rawListId && !isNaN(Number(rawListId))) ? Number(rawListId) : null;
  const rawSenderId = senderId || sender_id || null;
  const finalSenderId = Array.isArray(rawSenderId) ? rawSenderId.join(',') : (rawSenderId ? String(rawSenderId) : null);
  const finalSenderMode = sender_mode || senderMode || 'broadcast';
  const finalSenderMapping = (sender_mapping || senderMapping) ? (typeof (sender_mapping || senderMapping) === 'string' ? (sender_mapping || senderMapping) : JSON.stringify(sender_mapping || senderMapping)) : null;
  const finalAbTest = isAbTest || is_ab_test;
  const finalVarBSubject = variantBSubject || variant_b_subject;
  const finalVarBHtml = variantBHtml || variant_b_html;
  const finalTargetEmail = targetEmail || target_email || null;

  try {
    const [oldRows] = await pool.query('SELECT * FROM campaigns WHERE id = ?', [id]);
    const oldData = oldRows[0];
    
    // Merge sender_history with new sender_id so ALL previous senders & current sender are preserved
    const oldHistoryIds = String(oldData?.sender_history || oldData?.sender_id || '').split(',').map(s => s.trim()).filter(Boolean);
    const newSenderIds = String(finalSenderId || '').split(',').map(s => s.trim()).filter(Boolean);
    const mergedSenderHistory = Array.from(new Set([...oldHistoryIds, ...newSenderIds])).join(',') || null;

    let query = `UPDATE campaigns SET name = ?, subject = ?, html_content = ?, list_id = ?, target_email = ?, sender_id = ?, sender_history = ?, sender_mode = ?, sender_mapping = ?, is_ab_test = ?, variant_b_subject = ?, variant_b_html = ?`;
    const params = [finalName, finalSubject, finalHtml, finalListId, finalTargetEmail, finalSenderId, mergedSenderHistory, finalSenderMode, finalSenderMapping, finalAbTest ? 1 : 0, finalVarBSubject || null, finalVarBHtml || null];

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

    const newData = { ...oldData, name: finalName, subject: finalSubject, html_content: finalHtml, list_id: finalListId, target_email: finalTargetEmail, sender_id: finalSenderId, sender_mode: finalSenderMode, sender_mapping: finalSenderMapping, status: targetStatus };
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

exports.getCampaignLogs = async (req, res) => {
  const { id } = req.params;
  try {
    const [queueLogs] = await pool.query(
      `SELECT eq.id, eq.campaign_id, eq.recipient_id, eq.sender_id, eq.status, eq.error_message, eq.created_at, eq.updated_at,
              s.email as recipient_email, s.first_name as recipient_name,
              snd.name as sender_name, snd.email as sender_email, snd.smtp_user
       FROM email_queue eq
       LEFT JOIN subscribers s ON eq.recipient_id = s.id
       LEFT JOIN senders snd ON eq.sender_id = snd.id
       WHERE eq.campaign_id = ?
       ORDER BY eq.updated_at DESC`,
      [id]
    );

    const [senderStats] = await pool.query(
      `SELECT eq.sender_id, snd.name as sender_name, snd.email as sender_email, snd.smtp_user,
              COUNT(*) as total_dispatched,
              SUM(CASE WHEN eq.status = 'sent' THEN 1 ELSE 0 END) as sent_count,
              SUM(CASE WHEN eq.status = 'failed' THEN 1 ELSE 0 END) as failed_count
       FROM email_queue eq
       LEFT JOIN senders snd ON eq.sender_id = snd.id
       WHERE eq.campaign_id = ?
       GROUP BY eq.sender_id, snd.name, snd.email, snd.smtp_user`,
      [id]
    );

    const [historyLogs] = await pool.query(
      `SELECT * FROM data_history WHERE table_name = 'campaigns' AND record_id = ? ORDER BY timestamp DESC`,
      [id]
    );

    res.json({
      campaignId: id,
      queueLogs,
      senderStats,
      historyLogs
    });
  } catch (error) {
    console.error('Fetch campaign logs error:', error);
    res.status(500).json({ error: 'Database error fetching campaign logs' });
  }
};

exports.createCampaign = exports.dispatchCampaign;
