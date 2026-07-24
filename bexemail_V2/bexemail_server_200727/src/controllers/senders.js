const pool = require('../config/db');
const { logHistory } = require('../utils/historyLogger');
exports.getSenders = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM senders ORDER BY is_default DESC, name ASC');
    res.json(rows);
  } catch (error) {
    console.error('Fetch senders error:', error);
    res.status(500).json({ error: 'Database error' });
  }
};

exports.createSender = async (req, res) => {
  const { name, email, is_default } = req.body;
  
  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required' });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    if (is_default) {
      // Unset previous defaults
      await connection.query('UPDATE senders SET is_default = FALSE WHERE is_default = TRUE');
    }

    const [result] = await connection.query(
      'INSERT INTO senders (name, email, is_default) VALUES (?, ?, ?)',
      [name, email, is_default || false]
    );

    await connection.commit();
    const newSender = { id: result.insertId, name, email, is_default: is_default || false };
    await logHistory('senders', result.insertId, 'add', null, newSender, req.headers['x-user-role']);
    res.status(201).json(newSender);
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Create sender error:', error);
    res.status(500).json({ error: 'Database error: ' + error.message });
  } finally {
    if (connection) connection.release();
  }
};

exports.updateSender = async (req, res) => {
  const { id } = req.params;
  const { name, email, is_default } = req.body;

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    if (is_default) {
      await connection.query('UPDATE senders SET is_default = FALSE WHERE id != ?', [id]);
    }

    const [oldRows] = await connection.query('SELECT * FROM senders WHERE id = ?', [id]);
    const oldData = oldRows[0];

    await connection.query(
      'UPDATE senders SET name = ?, email = ?, is_default = ? WHERE id = ?',
      [name, email, is_default, id]
    );

    await connection.commit();
    const newData = { id, name, email, is_default };
    await logHistory('senders', id, 'edit', oldData, newData, req.headers['x-user-role']);
    res.json({ message: 'Sender updated successfully' });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Update sender error:', error);
    res.status(500).json({ error: 'Database error' });
  } finally {
    if (connection) connection.release();
  }
};

exports.deleteSender = async (req, res) => {
  const { id } = req.params;
  try {
    const [oldRows] = await pool.query('SELECT * FROM senders WHERE id = ?', [id]);
    const oldData = oldRows[0];
    
    await pool.query('DELETE FROM senders WHERE id = ?', [id]);
    
    if (oldData) {
      await logHistory('senders', id, 'delete', oldData, null, req.headers['x-user-role']);
    }
    res.json({ message: 'Sender deleted successfully' });
  } catch (error) {
    console.error('Delete sender error:', error);
    res.status(500).json({ error: 'Database error' });
  }
};
