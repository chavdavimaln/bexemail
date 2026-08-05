const pool = require('../config/db');
const { logHistory } = require('../utils/historyLogger');
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'bexemail_super_secret_key_2026';

const getRequestUser = (req) => {
  if (req && req.user) return req.user;
  let token = req && req.headers ? (req.headers.authorization || req.headers.Authorization) : null;
  if (!token && req && req.headers) {
    const roleHeader = req.headers['x-user-role'] || req.headers['X-User-Role'];
    if (roleHeader) {
      return { id: 1, role: roleHeader };
    }
    return null;
  }
  if (token && typeof token === 'string' && token.startsWith('Bearer ')) {
    token = token.slice(7);
  }
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
};

// Create or Import Subscriber
exports.createSubscriber = async (req, res) => {
  const { email, first_name, status, tags, admin_id } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  const user = getRequestUser(req);
  let targetAdminId = admin_id;
  if (user && user.role !== 'Super Admin') {
    targetAdminId = user.id;
  }

  try {
    const tagsJson = tags ? JSON.stringify(tags) : null;
    const [result] = await pool.query(
      `INSERT INTO subscribers (email, first_name, status, tags, admin_id)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE first_name = VALUES(first_name), status = VALUES(status), tags = VALUES(tags), admin_id = VALUES(admin_id)`,
      [email, first_name || null, status || 'subscribed', tagsJson, targetAdminId || null]
    );

    let subscriberId = result.insertId;
    if (!subscriberId) {
      const [existing] = await pool.query('SELECT id FROM subscribers WHERE email = ?', [email]);
      if (existing.length > 0) {
        subscriberId = existing[0].id;
      }
    }

    if (subscriberId) {
      await pool.query(
        'INSERT IGNORE INTO subscriber_origins (subscriber_id, origin_site, name, status) VALUES (?, ?, ?, ?)',
        [subscriberId, 'localhost', first_name || null, status || 'subscribed']
      );
    }

    res.status(201).json({ message: 'Subscriber added/updated successfully', id: subscriberId });
  } catch (error) {
    console.error('Create subscriber error:', error);
    res.status(500).json({ error: 'Database error' });
  }
};

// Update Subscriber by ID (email, name, status)
exports.updateSubscriber = async (req, res) => {
  const { id } = req.params;
  const { email, first_name, status, admin_id } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  const user = getRequestUser(req);
  let targetAdminId = admin_id;
  if (user && user.role !== 'Super Admin') {
    targetAdminId = user.id;
  }

  try {
    const [oldRows] = await pool.query('SELECT * FROM subscribers WHERE id = ?', [id]);
    if (oldRows.length === 0) return res.status(404).json({ error: 'Subscriber not found' });

    if (user && user.role !== 'Super Admin' && oldRows[0].admin_id !== user.id) {
      return res.status(403).json({ error: 'Forbidden: You do not own this contact' });
    }

    await pool.query(
      `UPDATE subscribers SET email = ?, first_name = ?, status = ?, admin_id = ? WHERE id = ?`,
      [email, first_name || null, status || 'subscribed', targetAdminId || null, id]
    );

    res.json({ message: 'Subscriber updated successfully', id });
  } catch (error) {
    console.error('Update subscriber error:', error);
    res.status(500).json({ error: 'Database error' });
  }
};

// Fetch Subscribers with pagination, search, filter
exports.getSubscribers = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;
  const search = req.query.search || '';
  const status = req.query.status || '';

  const user = getRequestUser(req);

  let query = 'SELECT * FROM subscribers WHERE 1=1';
  const queryParams = [];

  if (search) {
    query += ' AND (email LIKE ? OR first_name LIKE ?)';
    queryParams.push(`%${search}%`, `%${search}%`);
  }

  if (status) {
    query += ' AND status = ?';
    queryParams.push(status);
  }

  // First get total count
  const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as total');
  
  query = query.replace('SELECT * FROM subscribers', "SELECT subscribers.*, (SELECT GROUP_CONCAT(lists.name SEPARATOR ', ') FROM subscriber_lists JOIN lists ON subscriber_lists.list_id = lists.id WHERE subscriber_lists.subscriber_id = subscribers.id) as list_names, (SELECT GROUP_CONCAT(lists.id SEPARATOR ',') FROM subscriber_lists JOIN lists ON subscriber_lists.list_id = lists.id WHERE subscriber_lists.subscriber_id = subscribers.id) as list_ids FROM subscribers");
  
  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  queryParams.push(limit, offset);

  try {
    const [countResult] = await pool.query(countQuery, queryParams.slice(0, queryParams.length - 2));
    const [rows] = await pool.query(query, queryParams);

    res.json({
      data: rows,
      total: countResult[0].total,
      page,
      limit,
      totalPages: Math.ceil(countResult[0].total / limit)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database error' });
  }
};

// Unsubscribe
exports.unsubscribe = async (req, res) => {
  const { subscriberId } = req.params;
  const { reason } = req.body;

  try {
    const [result] = await pool.query(
      `UPDATE subscribers SET status = 'unsubscribed', unsubscribe_reason = ? WHERE id = ?`,
      [reason || 'User requested', subscriberId]
    );

    if (result.affectedRows === 0) return res.status(404).json({ error: 'Subscriber not found' });
    res.json({ message: 'Unsubscribed successfully' });
  } catch (error) {
    console.error('Unsubscribe error:', error);
    res.status(500).json({ error: 'Database error' });
  }
};

// Delete Subscriber
exports.deleteSubscriber = async (req, res) => {
  const { id } = req.params;

  const user = getRequestUser(req);

  try {
    const [oldRows] = await pool.query('SELECT * FROM subscribers WHERE id = ?', [id]);
    const oldData = oldRows[0];
    if (!oldData) {
      return res.status(404).json({ error: 'Subscriber not found' });
    }

    if (user && user.role !== 'Super Admin' && oldData.admin_id !== user.id) {
      return res.status(403).json({ error: 'Forbidden: You do not own this contact' });
    }

    const [result] = await pool.query('DELETE FROM subscribers WHERE id = ?', [id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Subscriber not found' });
    }
    
    if (oldData) {
      await logHistory('subscribers', id, 'delete', oldData, null, req.headers['x-user-role']);
    }
    
    res.json({ message: 'Subscriber deleted successfully' });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Database error' });
  }
};
