const pool = require('../config/db');
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'bexemail_super_secret_key_2026';

const getRequestUser = (req) => {
  if (req && req.user) return req.user;
  let token = req && req.headers ? (req.headers.authorization || req.headers.Authorization) : null;
  if (!token) return null;
  if (typeof token === 'string' && token.startsWith('Bearer ')) {
    token = token.slice(7);
  }
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
};

// Parse uploaded contacts (TXT, CSV, Comma separated text) to find new/conflicting records
exports.parseContacts = async (req, res) => {
  const getAdminId = require('../utils/getAdminId');
  const targetAdminId = getAdminId(req);
  const { emailsRaw, originSite } = req.body;
  if (!originSite) {
    return res.status(400).json({ error: 'Origin site/group name is required' });
  }

  // Helper to extract email addresses from text
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const emails = Array.from(new Set((emailsRaw || '').match(emailRegex) || [])).map(e => e.toLowerCase().trim());

  if (emails.length === 0) {
    return res.status(400).json({ error: 'No valid email addresses found' });
  }

  try {
    const newContacts = [];
    const conflicts = [];

    for (const email of emails) {
      // 1. Check if email exists in subscribers for this admin
      const [existingSubs] = await pool.query('SELECT * FROM subscribers WHERE email = ? AND admin_id = ?', [email, targetAdminId]);
      
      if (existingSubs.length === 0) {
        newContacts.push({ email });
      } else {
        const sub = existingSubs[0];
        // 2. Check if it already exists under this specific origin site
        const [existingOrigin] = await pool.query(
          'SELECT * FROM subscriber_origins WHERE subscriber_id = ? AND origin_site = ?',
          [sub.id, originSite]
        );

        // Fetch lists for this subscriber
        const [lists] = await pool.query(
          `SELECT l.id, l.name FROM subscriber_lists sl 
           JOIN lists l ON sl.list_id = l.id 
           WHERE sl.subscriber_id = ?`,
          [sub.id]
        );

        const [originSites] = await pool.query(
          'SELECT origin_site FROM subscriber_origins WHERE subscriber_id = ?',
          [sub.id]
        );

        conflicts.push({
          id: sub.id,
          email: sub.email,
          currentName: sub.first_name,
          currentStatus: sub.status,
          currentLists: lists,
          existingOrigins: originSites.map(o => o.origin_site),
          isSameSite: existingOrigin.length > 0
        });
      }
    }

    res.json({
      success: true,
      newContacts,
      conflicts,
      originSite
    });
  } catch (error) {
    console.error('Parse contacts error:', error);
    res.status(500).json({ error: 'Failed to parse contacts' });
  }
};

// Confirm import with selected options (merge vs separate) for conflicts
exports.confirmImport = async (req, res) => {
  const { originSite, importType, filename, listIds, contacts, adminId } = req.body;
  if (!originSite || !listIds || listIds.length === 0 || !contacts || contacts.length === 0) {
    return res.status(400).json({ error: 'Missing required import details' });
  }

  const getAdminId = require('../utils/getAdminId');
  const targetAdminId = getAdminId(req);

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Fetch Admin email, primary domain and primary smtp for association tracking
    const [uRows] = await connection.query('SELECT email FROM admin_users WHERE id = ?', [targetAdminId]);
    const adminEmail = uRows.length > 0 ? uRows[0].email : null;

    const [dRows] = await connection.query('SELECT domain_name FROM registered_domains WHERE admin_id = ? LIMIT 1', [targetAdminId]);
    const domainName = dRows.length > 0 ? dRows[0].domain_name : null;

    const [sRows] = await connection.query('SELECT email FROM senders WHERE admin_id = ? LIMIT 1', [targetAdminId]);
    const smtpEmail = sRows.length > 0 ? sRows[0].email : null;

    const addedSubscriberIds = [];
    const alreadyExistingEmails = [];
    const newEmails = [];
    const beforeState = {
      subscribers: [],
      subscriber_origins: [],
      subscriber_list_origins: [],
      subscriber_lists: []
    };

    // 1. Gather all emails to fetch their current state for backup for this admin
    const emailsToFetch = contacts.map(c => c.email ? c.email.toLowerCase().trim() : '').filter(Boolean);
    if (emailsToFetch.length > 0) {
      const [existingSubs] = await connection.query('SELECT * FROM subscribers WHERE email IN (?) AND admin_id = ?', [emailsToFetch, targetAdminId]);
      beforeState.subscribers = existingSubs;

      const subIds = existingSubs.map(s => s.id);
      if (subIds.length > 0) {
        const [existingOrigins] = await connection.query('SELECT * FROM subscriber_origins WHERE subscriber_id IN (?)', [subIds]);
        beforeState.subscriber_origins = existingOrigins;

        const [existingListOrigins] = await connection.query('SELECT * FROM subscriber_list_origins WHERE subscriber_id IN (?)', [subIds]);
        beforeState.subscriber_list_origins = existingListOrigins;

        const [existingLists] = await connection.query('SELECT * FROM subscriber_lists WHERE subscriber_id IN (?)', [subIds]);
        beforeState.subscriber_lists = existingLists;
      }
    }

    // 2. Process each contact
    for (const contact of contacts) {
      const { email, name, conflictAction } = contact;
      if (!email) continue;
      const cleanEmail = email.toLowerCase().trim();

      // Check if email already exists for this admin
      const [existing] = await connection.query('SELECT id, first_name, status FROM subscribers WHERE email = ? AND admin_id = ?', [cleanEmail, targetAdminId]);

      if (existing.length === 0) {
        // Insert new subscriber
        const [subResult] = await connection.query(
          'INSERT INTO subscribers (email, first_name, status, admin_id, admin_email, domain_name, smtp_email) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [cleanEmail, name || null, 'subscribed', targetAdminId || null, adminEmail, domainName, smtpEmail]
        );
        const subId = subResult.insertId;
        addedSubscriberIds.push(subId);
        newEmails.push(cleanEmail);

        // Insert into subscriber_origins
        await connection.query(
          'INSERT INTO subscriber_origins (subscriber_id, origin_site, name, status) VALUES (?, ?, ?, ?)',
          [subId, originSite, name || null, 'subscribed']
        );

        // Insert list mappings
        for (const listId of listIds) {
          await connection.query(
            'INSERT INTO subscriber_list_origins (subscriber_id, list_id, origin_site) VALUES (?, ?, ?)',
            [subId, listId, originSite]
          );
          await connection.query(
            'INSERT IGNORE INTO subscriber_lists (subscriber_id, list_id) VALUES (?, ?)',
            [subId, listId]
          );
        }
      } else {
        // Conflicting subscriber (Already exists)
        if (!alreadyExistingEmails.includes(cleanEmail)) {
          alreadyExistingEmails.push(cleanEmail);
        }
        const subId = existing[0].id;

        const effectiveAction = conflictAction || 'merge';

        if (effectiveAction === 'merge') {
          // Merge contact info
          // Update subscriber name if empty
          if (!existing[0].first_name && name) {
            await connection.query('UPDATE subscribers SET first_name = ? WHERE id = ?', [name, subId]);
          }

          // Check if origin site map exists
          const [origin] = await connection.query(
            'SELECT id FROM subscriber_origins WHERE subscriber_id = ? AND origin_site = ?',
            [subId, originSite]
          );
          if (origin.length === 0) {
            await connection.query(
              'INSERT INTO subscriber_origins (subscriber_id, origin_site, name, status) VALUES (?, ?, ?, ?)',
              [subId, originSite, name || existing[0].first_name || null, 'subscribed']
            );
          }

          // Add list mappings
          for (const listId of listIds) {
            await connection.query(
              'INSERT IGNORE INTO subscriber_list_origins (subscriber_id, list_id, origin_site) VALUES (?, ?, ?)',
              [subId, listId, originSite]
            );
            await connection.query(
              'INSERT IGNORE INTO subscriber_lists (subscriber_id, list_id) VALUES (?, ?)',
              [subId, listId]
            );
          }
        } else if (effectiveAction === 'separate') {
          // Differentiate site details
          const [origin] = await connection.query(
            'SELECT id FROM subscriber_origins WHERE subscriber_id = ? AND origin_site = ?',
            [subId, originSite]
          );
          if (origin.length === 0) {
            await connection.query(
              'INSERT INTO subscriber_origins (subscriber_id, origin_site, name, status) VALUES (?, ?, ?, ?)',
              [subId, originSite, name || null, 'subscribed']
            );
          } else {
            // Update name specifically for this site
            await connection.query(
              'UPDATE subscriber_origins SET name = ? WHERE subscriber_id = ? AND origin_site = ?',
              [name || null, subId, originSite]
            );
          }

          // Overwrite list mappings specifically for this site in subscriber_list_origins
          await connection.query(
            'DELETE FROM subscriber_list_origins WHERE subscriber_id = ? AND origin_site = ?',
            [subId, originSite]
          );
          for (const listId of listIds) {
            await connection.query(
              'INSERT INTO subscriber_list_origins (subscriber_id, list_id, origin_site) VALUES (?, ?, ?)',
              [subId, listId, originSite]
            );
            await connection.query(
              'INSERT IGNORE INTO subscriber_lists (subscriber_id, list_id) VALUES (?, ?)',
              [subId, listId]
            );
          }
        }
      }
    }

    // Save rollback details in contact_import_logs
    const logPayload = {
      addedSubscriberIds,
      beforeState
    };

    await connection.query(
      'INSERT INTO contact_import_logs (filename, origin_site, import_type, contacts_json) VALUES (?, ?, ?, ?)',
      [filename || 'Direct Text Input', originSite, importType || 'manual', JSON.stringify(logPayload)]
    );

    await connection.commit();
    res.json({
      success: true,
      message: 'Contacts imported successfully',
      importedCount: addedSubscriberIds.length,
      existingCount: alreadyExistingEmails.length,
      alreadyExistingEmails,
      newEmails
    });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Confirm import error:', error);
    res.status(500).json({ error: 'Failed to import contacts' });
  } finally {
    if (connection) connection.release();
  }
};

// Rollback an import and restore subscribers to previous state
exports.rollbackImport = async (req, res) => {
  const { id } = req.params;

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [logs] = await connection.query('SELECT * FROM contact_import_logs WHERE id = ?', [id]);
    if (logs.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Import log not found' });
    }

    const payload = JSON.parse(logs[0].contacts_json);
    const { addedSubscriberIds, beforeState } = payload;

    // 1. Delete all subscribers that were brand new
    if (addedSubscriberIds && addedSubscriberIds.length > 0) {
      await connection.query('DELETE FROM subscribers WHERE id IN (?)', [addedSubscriberIds]);
    }

    // 2. Restore prior state of pre-existing subscribers
    if (beforeState) {
      // Clean up modified origins/lists for pre-existing subscribers
      const preExistingEmails = beforeState.subscribers.map(s => s.email);
      if (preExistingEmails.length > 0) {
        const [preSubs] = await connection.query('SELECT id FROM subscribers WHERE email IN (?)', [preExistingEmails]);
        const preSubIds = preSubs.map(s => s.id);
        
        if (preSubIds.length > 0) {
          await connection.query('DELETE FROM subscriber_origins WHERE subscriber_id IN (?)', [preSubIds]);
          await connection.query('DELETE FROM subscriber_list_origins WHERE subscriber_id IN (?)', [preSubIds]);
          await connection.query('DELETE FROM subscriber_lists WHERE subscriber_id IN (?)', [preSubIds]);
        }
      }

      // Re-insert previous state
      for (const sub of beforeState.subscribers) {
        await connection.query(
          'INSERT INTO subscribers (id, email, first_name, status, tags, created_at) VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE first_name = VALUES(first_name), status = VALUES(status), tags = VALUES(tags)',
          [sub.id, sub.email, sub.first_name, sub.status, sub.tags ? JSON.stringify(sub.tags) : null, sub.created_at]
        );
      }

      for (const origin of beforeState.subscriber_origins) {
        await connection.query(
          'INSERT IGNORE INTO subscriber_origins (id, subscriber_id, origin_site, name, status, created_at) VALUES (?, ?, ?, ?, ?, ?)',
          [origin.id, origin.subscriber_id, origin.origin_site, origin.name, origin.status, origin.created_at]
        );
      }

      for (const lo of beforeState.subscriber_list_origins) {
        await connection.query(
          'INSERT IGNORE INTO subscriber_list_origins (subscriber_id, list_id, origin_site) VALUES (?, ?, ?)',
          [lo.subscriber_id, lo.list_id, lo.origin_site]
        );
      }

      for (const sl of beforeState.subscriber_lists) {
        await connection.query(
          'INSERT IGNORE INTO subscriber_lists (subscriber_id, list_id) VALUES (?, ?)',
          [sl.subscriber_id, sl.list_id]
        );
      }
    }

    // Delete the import log
    await connection.query('DELETE FROM contact_import_logs WHERE id = ?', [id]);

    await connection.commit();
    res.json({ success: true, message: 'Import rolled back successfully' });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Rollback import error:', error);
    res.status(500).json({ error: 'Failed to rollback import' });
  } finally {
    if (connection) connection.release();
  }
};

// Fetch backup logs of all imports
exports.getImportLogs = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, filename, origin_site, import_type, created_at FROM contact_import_logs ORDER BY created_at DESC');
    res.json(rows);
  } catch (error) {
    console.error('Get import logs error:', error);
    res.status(500).json({ error: 'Failed to fetch import history' });
  }
};

// Fetch detailed bifurcated subscribers for the directory view
exports.getBifurcatedSubscribers = async (req, res) => {
  const getAdminId = require('../utils/getAdminId');
  const adminId = getAdminId(req);

  const search = req.query.search || '';
  const status = req.query.status || '';

  let query = 'SELECT s.id, s.email, s.first_name, s.status, s.created_at, s.admin_id FROM subscribers s WHERE s.admin_id = ?';
  const queryParams = [adminId];

  if (search) {
    query += ' AND (s.email LIKE ? OR s.first_name LIKE ?)';
    queryParams.push(`%${search}%`, `%${search}%`);
  }

  if (status) {
    query += ' AND s.status = ?';
    queryParams.push(status);
  }

  query += ' ORDER BY s.created_at DESC';

  try {
    const [subs] = await pool.query(query, queryParams);
    
    // For each subscriber, fetch site origins and their associated lists
    const data = [];
    for (const sub of subs) {
      const [origins] = await pool.query(
        'SELECT origin_site, name, status FROM subscriber_origins WHERE subscriber_id = ?',
        [sub.id]
      );

      const [listOrigins] = await pool.query(
        `SELECT slo.origin_site, l.id as list_id, l.name as list_name 
         FROM subscriber_list_origins slo
         JOIN lists l ON slo.list_id = l.id
         WHERE slo.subscriber_id = ?`,
        [sub.id]
      );

      // Fetch all assigned lists from subscriber_lists
      const [allLists] = await pool.query(
        `SELECT l.id as list_id, l.name as list_name 
         FROM subscriber_lists sl
         JOIN lists l ON sl.list_id = l.id
         WHERE sl.subscriber_id = ?`,
        [sub.id]
      );

      const listNames = allLists.map(l => l.list_name).join(', ');
      const listIds = allLists.map(l => l.list_id).join(',');

      data.push({
        ...sub,
        list_names: listNames,
        list_ids: listIds,
        all_lists: allLists.map(l => ({ id: l.list_id, name: l.list_name })),
        origins: origins.map(o => {
          let siteLists = listOrigins
            .filter(lo => lo.origin_site === o.origin_site)
            .map(lo => ({ id: lo.list_id, name: lo.list_name }));

          if (siteLists.length === 0) {
            siteLists = allLists.map(l => ({ id: l.list_id, name: l.list_name }));
          }

          return {
            origin_site: o.origin_site,
            name: o.name,
            status: o.status,
            lists: siteLists
          };
        })
      });
    }

    res.json({ data });
  } catch (error) {
    console.error('Get bifurcated subscribers error:', error);
    res.status(500).json({ error: 'Failed to fetch directory contacts' });
  }
};
