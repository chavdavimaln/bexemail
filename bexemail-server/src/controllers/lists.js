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

const hasListsPermission = async (userId) => {
  if (!userId) return false;
  try {
    const [rows] = await pool.query('SELECT role, permissions FROM admin_users WHERE id = ?', [userId]);
    if (rows.length === 0) return false;
    const user = rows[0];
    if (user.role === 'Super Admin') return true;
    const perms = user.permissions ? (typeof user.permissions === 'string' ? JSON.parse(user.permissions) : user.permissions) : {};
    return perms.lists === true;
  } catch (err) {
    console.error('Error checking lists permission in backend:', err);
    return false;
  }
};

// Create a new List
exports.createList = async (req, res) => {
  const { name, description, admin_id } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });

  const user = getRequestUser(req);
  let targetAdminId = admin_id;
  if (user && user.role !== 'Super Admin') {
    if (!targetAdminId || Number(targetAdminId) === 0) {
      targetAdminId = user.id;
    }
  }

  try {
    const [result] = await pool.query(
      `INSERT INTO lists (name, description, admin_id) VALUES (?, ?, ?)`,
      [name, description || null, targetAdminId]
    );
    const newList = { id: result.insertId, name, description: description || null, is_deleted: 0, admin_id: targetAdminId };
    await logHistory('lists', result.insertId, 'add', null, newList, req.headers['x-user-role']);
    res.status(201).json({ message: 'List created successfully', id: result.insertId, ...newList });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database error' });
  }
};

// Get all active Lists
exports.getLists = async (req, res) => {
  try {
    const query = `
      SELECT l.*, 
             u.role AS admin_role, u.email AS admin_email, u.username AS admin_username,
             COALESCE(sub_counts.cnt, 0) AS subscriber_count,
             COALESCE(sub_counts.cnt, 0) AS contacts_count
      FROM lists l 
      LEFT JOIN admin_users u ON l.admin_id = u.id 
      LEFT JOIN (
        SELECT list_id, COUNT(DISTINCT subscriber_id) AS cnt
        FROM (
          SELECT list_id, subscriber_id FROM subscriber_lists
          UNION
          SELECT list_id, subscriber_id FROM subscriber_list_origins
        ) AS all_subs
        GROUP BY list_id
      ) sub_counts ON l.id = sub_counts.list_id
      WHERE l.is_deleted = FALSE
      ORDER BY l.created_at DESC
    `;
    const [rows] = await pool.query(query);
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database error' });
  }
};

// Update a List
exports.updateList = async (req, res) => {
  const { id } = req.params;
  const { name, description, admin_id } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });

  const user = getRequestUser(req);
  let targetAdminId = admin_id;
  if (user && user.role !== 'Super Admin') {
    if (!targetAdminId || Number(targetAdminId) === 0) {
      targetAdminId = user.id;
    }
  }

  try {
    const [oldRows] = await pool.query('SELECT * FROM lists WHERE id = ?', [id]);
    const oldData = oldRows[0];
    if (!oldData) return res.status(404).json({ error: 'List not found' });

    const hasPerm = user ? await hasListsPermission(user.id) : false;
    if (user && user.role !== 'Super Admin' && !hasPerm && oldData.admin_id !== null && oldData.admin_id !== user.id) {
      return res.status(403).json({ error: 'Forbidden: You do not own this list' });
    }
    
    await pool.query(
      'UPDATE lists SET name = ?, description = ?, admin_id = ? WHERE id = ?',
      [name, description || null, targetAdminId, id]
    );
    
    const newData = { ...oldData, name, description: description || null, admin_id: targetAdminId };
    await logHistory('lists', id, 'edit', oldData, newData, req.headers['x-user-role']);
    res.json({ message: 'List updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database error' });
  }
};

// Soft Delete a List
exports.deleteList = async (req, res) => {
  const { id } = req.params;
  const user = getRequestUser(req);
  try {
    const hasPerm = user ? await hasListsPermission(user.id) : false;
    const [oldRows] = await pool.query('SELECT * FROM lists WHERE id = ?', [id]);
    const oldData = oldRows[0];
    if (!oldData) return res.status(404).json({ error: 'List not found' });

    if (user && user.role !== 'Super Admin' && !hasPerm && oldData.admin_id !== null && oldData.admin_id !== user.id) {
      return res.status(403).json({ error: 'Forbidden: You do not own this list' });
    }
    
    await pool.query('UPDATE lists SET is_deleted = TRUE WHERE id = ?', [id]);
    
    if (oldData) {
      await logHistory('lists', id, 'delete', oldData, null, req.headers['x-user-role']);
    }
    res.json({ message: 'List deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database error' });
  }
};

// Assign Subscribers to a List
exports.assignSubscribers = async (req, res) => {
  const { list_id, subscriber_ids } = req.body;
  if (!list_id || !subscriber_ids || !Array.isArray(subscriber_ids)) {
    return res.status(400).json({ error: 'list_id and subscriber_ids (array) are required' });
  }

  try {
    const ids = subscriber_ids.map(Number).filter(Boolean);
    const values = ids.map(sub_id => [sub_id, list_id]);
    
    if (values.length > 0) {
      await pool.query(
        `INSERT IGNORE INTO subscriber_lists (subscriber_id, list_id) VALUES ?`,
        [values]
      );

      for (const sub_id of ids) {
        const [origins] = await pool.query('SELECT origin_site FROM subscriber_origins WHERE subscriber_id = ?', [sub_id]);
        const sites = origins.length > 0 ? origins.map(o => o.origin_site) : ['localhost'];
        if (origins.length === 0) {
          await pool.query('INSERT IGNORE INTO subscriber_origins (subscriber_id, origin_site, status) VALUES (?, ?, ?)', [sub_id, 'localhost', 'subscribed']);
        }
        for (const site of sites) {
          await pool.query('INSERT IGNORE INTO subscriber_list_origins (subscriber_id, list_id, origin_site) VALUES (?, ?, ?)', [sub_id, list_id, site]);
        }
      }
    }
    res.json({ message: 'Subscribers assigned successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database error' });
  }
};

// Sync Subscribers Lists
exports.syncSubscriberLists = async (req, res) => {
  const { subscriber_id, list_ids } = req.body;
  const numSubId = Number(subscriber_id);
  
  if (!numSubId || isNaN(numSubId) || !Array.isArray(list_ids)) {
    return res.status(400).json({ error: 'Valid subscriber_id and list_ids (array) are required' });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // 1. Delete all existing list associations for this subscriber
    await connection.query('DELETE FROM subscriber_lists WHERE subscriber_id = ?', [numSubId]);
    await connection.query('DELETE FROM subscriber_list_origins WHERE subscriber_id = ?', [numSubId]);

    // 2. Ensure origin record exists
    const [origins] = await connection.query('SELECT origin_site FROM subscriber_origins WHERE subscriber_id = ?', [numSubId]);
    let sites = origins.map(o => o.origin_site);
    if (sites.length === 0) {
      await connection.query('INSERT IGNORE INTO subscriber_origins (subscriber_id, origin_site, status) VALUES (?, ?, ?)', [numSubId, 'localhost', 'subscribed']);
      sites = ['localhost'];
    }

    // 3. Insert new list associations if any
    const validListIds = list_ids.map(Number).filter(lid => !isNaN(lid) && lid > 0);
    for (const list_id of validListIds) {
      await connection.query('INSERT IGNORE INTO subscriber_lists (subscriber_id, list_id) VALUES (?, ?)', [numSubId, list_id]);
      for (const site of sites) {
        await connection.query('INSERT IGNORE INTO subscriber_list_origins (subscriber_id, list_id, origin_site) VALUES (?, ?, ?)', [numSubId, list_id, site]);
      }
    }

    await connection.commit();
    res.json({ message: 'Subscriber lists synchronized successfully' });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error(error);
    res.status(500).json({ error: 'Database error' });
  } finally {
    if (connection) connection.release();
  }
};
