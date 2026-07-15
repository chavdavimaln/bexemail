const pool = require('../config/db');
const { logHistory } = require('../utils/historyLogger');

// Create a new List
exports.createList = async (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });

  try {
    const [result] = await pool.query(
      `INSERT INTO lists (name, description) VALUES (?, ?)`,
      [name, description || null]
    );
    const newList = { id: result.insertId, name, description: description || null, is_deleted: 0 };
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
    const [rows] = await pool.query('SELECT * FROM lists WHERE is_deleted = FALSE ORDER BY created_at DESC');
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database error' });
  }
};

// Update a List
exports.updateList = async (req, res) => {
  const { id } = req.params;
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });

  try {
    const [oldRows] = await pool.query('SELECT * FROM lists WHERE id = ?', [id]);
    const oldData = oldRows[0];
    
    await pool.query(
      'UPDATE lists SET name = ?, description = ? WHERE id = ?',
      [name, description || null, id]
    );
    
    const newData = { ...oldData, name, description: description || null };
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
  try {
    const [oldRows] = await pool.query('SELECT * FROM lists WHERE id = ?', [id]);
    const oldData = oldRows[0];
    
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
    // Basic implementation: insert ignores duplicates if we had UNIQUE constraint
    // But since it's a composite PK, INSERT IGNORE works
    const values = subscriber_ids.map(sub_id => [sub_id, list_id]);
    
    if (values.length > 0) {
       await pool.query(
        `INSERT IGNORE INTO subscriber_lists (subscriber_id, list_id) VALUES ?`,
        [values]
      );
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
  
  if (!subscriber_id || !Array.isArray(list_ids)) {
    return res.status(400).json({ error: 'subscriber_id and list_ids (array) are required' });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // 1. Delete all existing list associations for this subscriber
    await connection.query('DELETE FROM subscriber_lists WHERE subscriber_id = ?', [subscriber_id]);

    // 2. Insert new list associations if any
    if (list_ids.length > 0) {
      const values = list_ids.map(list_id => [subscriber_id, list_id]);
      await connection.query(
        'INSERT INTO subscriber_lists (subscriber_id, list_id) VALUES ?',
        [values]
      );
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
