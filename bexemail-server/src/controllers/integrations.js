const pool = require('../config/db');
const mysql = require('mysql2/promise');
const { logHistory } = require('../utils/historyLogger');

exports.getIntegrations = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT e.*, l.name as list_name 
      FROM external_integrations e 
      LEFT JOIN lists l ON e.target_list_id = l.id 
      ORDER BY e.created_at DESC
    `);
    // Mask passwords for safety
    const safeRows = rows.map(r => ({
      ...r,
      db_password: r.db_password ? '********' : null,
      api_key: r.api_key ? '********' : null
    }));
    res.json(safeRows);
  } catch (error) {
    console.error('Fetch integrations error:', error);
    res.status(500).json({ error: 'Database error' });
  }
};

exports.createIntegration = async (req, res) => {
  const { name, type, url, method, api_key, db_host, db_user, db_password, db_name, db_query, target_list_id } = req.body;
  try {
    const [result] = await pool.query(
      `INSERT INTO external_integrations (name, type, url, method, api_key, db_host, db_user, db_password, db_name, db_query, target_list_id) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, type, url, method || 'GET', api_key, db_host, db_user, db_password, db_name, db_query, target_list_id]
    );
    const newIntegration = { id: result.insertId, name, type, target_list_id };
    await logHistory('external_integrations', result.insertId, 'add', null, newIntegration, req.headers['x-user-role'] || 'System');
    res.json({ message: 'Integration added successfully', id: result.insertId });
  } catch (error) {
    console.error('Create integration error:', error);
    res.status(500).json({ error: 'Database error' });
  }
};

exports.updateIntegration = async (req, res) => {
  const { id } = req.params;
  const { name, type, url, method, api_key, db_host, db_user, db_password, db_name, db_query, target_list_id } = req.body;
  try {
    const [oldData] = await pool.query('SELECT * FROM external_integrations WHERE id = ?', [id]);
    
    // Only update passwords if a new one is provided (not masked)
    const finalApiKey = api_key === '********' ? oldData[0].api_key : api_key;
    const finalDbPass = db_password === '********' ? oldData[0].db_password : db_password;

    await pool.query(
      `UPDATE external_integrations 
       SET name = ?, type = ?, url = ?, method = ?, api_key = ?, db_host = ?, db_user = ?, db_password = ?, db_name = ?, db_query = ?, target_list_id = ? 
       WHERE id = ?`,
      [name, type, url, method, finalApiKey, db_host, db_user, finalDbPass, db_name, db_query, target_list_id, id]
    );
    
    const [newData] = await pool.query('SELECT * FROM external_integrations WHERE id = ?', [id]);
    await logHistory('external_integrations', id, 'edit', oldData[0], newData[0], req.headers['x-user-role'] || 'System');
    
    res.json({ message: 'Integration updated successfully' });
  } catch (error) {
    console.error('Update integration error:', error);
    res.status(500).json({ error: 'Database error' });
  }
};

exports.deleteIntegration = async (req, res) => {
  const { id } = req.params;
  try {
    const [oldData] = await pool.query('SELECT * FROM external_integrations WHERE id = ?', [id]);
    if (oldData.length > 0) {
      await logHistory('external_integrations', id, 'delete', oldData[0], null, req.headers['x-user-role'] || 'System');
    }
    await pool.query('DELETE FROM external_integrations WHERE id = ?', [id]);
    res.json({ message: 'Integration deleted successfully' });
  } catch (error) {
    console.error('Delete integration error:', error);
    res.status(500).json({ error: 'Database error' });
  }
};

// Extractor helper to find email arrays inside diverse API JSON responses
const extractEmailsFromAPIResponse = (data) => {
  let contacts = [];
  if (Array.isArray(data)) {
    contacts = data;
  } else if (typeof data === 'object' && data !== null) {
    // Try to find the array
    for (let key in data) {
      if (Array.isArray(data[key])) {
        contacts = data[key];
        break;
      }
    }
  }
  
  // map to standard format
  return contacts.filter(c => c && (c.email || c.Email || c.EMAIL)).map(c => ({
    email: c.email || c.Email || c.EMAIL,
    first_name: c.first_name || c.firstName || c.name || c.Name || ''
  }));
};

exports.syncIntegration = async (req, res) => {
  const { id } = req.params;
  try {
    const [integrations] = await pool.query('SELECT * FROM external_integrations WHERE id = ?', [id]);
    if (integrations.length === 0) return res.status(404).json({ error: 'Integration not found' });
    
    const integration = integrations[0];
    if (!integration.target_list_id) {
      return res.status(400).json({ error: 'A Target List must be selected before syncing' });
    }

    let contacts = [];

    if (integration.type === 'api') {
      const headers = { 'Content-Type': 'application/json' };
      if (integration.api_key) {
        headers['Authorization'] = `Bearer ${integration.api_key}`;
        headers['x-api-key'] = integration.api_key;
      }
      const response = await fetch(integration.url, { method: integration.method, headers });
      if (!response.ok) {
        throw new Error(`API returned status ${response.status}`);
      }
      const data = await response.json();
      contacts = extractEmailsFromAPIResponse(data);
      
    } else if (integration.type === 'database') {
      const remoteDb = await mysql.createConnection({
        host: integration.db_host,
        user: integration.db_user,
        password: integration.db_password,
        database: integration.db_name
      });
      const [rows] = await remoteDb.query(integration.db_query);
      contacts = rows.filter(r => r && (r.email || r.Email || r.EMAIL)).map(r => ({
        email: r.email || r.Email || r.EMAIL,
        first_name: r.first_name || r.firstName || r.name || r.Name || ''
      }));
      await remoteDb.end();
    }

    if (contacts.length === 0) {
      return res.json({ message: 'Sync successful, but no valid email contacts found to import.' });
    }

    // Insert contacts into subscribers & subscriber_lists
    let imported = 0;
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      for (let c of contacts) {
        // Try inserting subscriber
        const [insertRes] = await connection.query(
          'INSERT IGNORE INTO subscribers (email, first_name) VALUES (?, ?)',
          [c.email, c.first_name]
        );
        let subscriberId = insertRes.insertId;
        if (!subscriberId) {
          // Already exists, fetch ID
          const [exist] = await connection.query('SELECT id FROM subscribers WHERE email = ?', [c.email]);
          if (exist.length > 0) subscriberId = exist[0].id;
        }

        if (subscriberId) {
          const [listLink] = await connection.query(
            'INSERT IGNORE INTO subscriber_lists (subscriber_id, list_id) VALUES (?, ?)',
            [subscriberId, integration.target_list_id]
          );
          if (listLink.affectedRows > 0) imported++;
        }
      }
      await connection.query('UPDATE external_integrations SET last_sync_at = NOW() WHERE id = ?', [id]);
      await connection.commit();
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }

    res.json({ message: `Sync successful! Imported ${imported} new contacts from external source.` });

  } catch (error) {
    console.error('Sync integration error:', error);
    res.status(500).json({ error: error.message || 'Failed to sync data' });
  }
};
