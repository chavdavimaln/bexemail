const pool = require('../config/db');

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
    res.status(201).json({ id: result.insertId, name, email, is_default: is_default || false });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Create sender error:', error);
    res.status(500).json({ error: 'Database error' });
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

    await connection.query(
      'UPDATE senders SET name = ?, email = ?, is_default = ? WHERE id = ?',
      [name, email, is_default, id]
    );

    await connection.commit();
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
    await pool.query('DELETE FROM senders WHERE id = ?', [id]);
    res.json({ message: 'Sender deleted successfully' });
  } catch (error) {
    console.error('Delete sender error:', error);
    res.status(500).json({ error: 'Database error' });
  }
};
