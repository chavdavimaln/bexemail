const pool = require('../config/db');
const { logHistory } = require('../utils/historyLogger');

exports.getSenders = async (req, res) => {
  const currentUser = req.user;
  
  try {
    let query = 'SELECT * FROM senders';
    let params = [];
    
    if (currentUser.role !== 'Super Admin') {
      query += ' WHERE admin_id = ? OR admin_id IS NULL';
      params.push(currentUser.id);
    }
    
    query += ' ORDER BY is_default DESC, name ASC';
    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (error) {
    console.error('Fetch senders error:', error);
    res.status(500).json({ error: 'Database error' });
  }
};

exports.createSender = async (req, res) => {
  const currentUser = req.user;
  const { name, email, is_default, smtp_host, smtp_port, smtp_user, smtp_pass, smtp_secure, admin_id } = req.body;
  
  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required' });
  }

  // Force Admin to own their senders
  let targetAdminId = admin_id || null;
  if (currentUser.role !== 'Super Admin') {
    targetAdminId = currentUser.id;
  }

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    if (is_default) {
      if (currentUser.role === 'Super Admin') {
        await connection.query('UPDATE senders SET is_default = FALSE WHERE is_default = TRUE');
      } else {
        await connection.query('UPDATE senders SET is_default = FALSE WHERE admin_id = ? AND is_default = TRUE', [currentUser.id]);
      }
    }

    const [result] = await connection.query(
      `INSERT INTO senders (name, email, is_default, smtp_host, smtp_port, smtp_user, smtp_pass, smtp_secure, admin_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, email, is_default || false, smtp_host || null, smtp_port || null, smtp_user || null, smtp_pass || null, smtp_secure || 'tls', targetAdminId]
    );

    await connection.commit();
    const newSender = { 
      id: result.insertId, name, email, is_default: is_default || false,
      smtp_host: smtp_host || null, smtp_port: smtp_port || null, smtp_user: smtp_user || null, smtp_pass: smtp_pass || null, smtp_secure: smtp_secure || 'tls',
      admin_id: targetAdminId
    };
    await logHistory('senders', result.insertId, 'add', null, newSender, currentUser.role);
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
  const currentUser = req.user;
  const { id } = req.params;
  const { name, email, is_default, smtp_host, smtp_port, smtp_user, smtp_pass, smtp_secure, admin_id } = req.body;

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [oldRows] = await connection.query('SELECT * FROM senders WHERE id = ?', [id]);
    if (oldRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Sender not found' });
    }
    const oldData = oldRows[0];

    // Auth check
    if (currentUser.role !== 'Super Admin' && Number(oldData.admin_id) !== Number(currentUser.id)) {
      await connection.rollback();
      return res.status(403).json({ error: 'Forbidden: You cannot modify this sender configuration' });
    }

    if (is_default) {
      if (currentUser.role === 'Super Admin') {
        await connection.query('UPDATE senders SET is_default = FALSE WHERE id != ?', [id]);
      } else {
        await connection.query('UPDATE senders SET is_default = FALSE WHERE admin_id = ? AND id != ?', [currentUser.id, id]);
      }
    }

    let targetAdminId = oldData.admin_id;
    if (currentUser.role === 'Super Admin') {
      targetAdminId = admin_id !== undefined ? admin_id : oldData.admin_id;
    }

    await connection.query(
      `UPDATE senders SET name = ?, email = ?, is_default = ?, smtp_host = ?, smtp_port = ?, smtp_user = ?, smtp_pass = ?, smtp_secure = ?, admin_id = ? WHERE id = ?`,
      [name, email, is_default, smtp_host || null, smtp_port || null, smtp_user || null, smtp_pass || null, smtp_secure || 'tls', targetAdminId, id]
    );

    await connection.commit();
    const newData = { id, name, email, is_default, smtp_host, smtp_port, smtp_user, smtp_pass, smtp_secure, admin_id: targetAdminId };
    await logHistory('senders', id, 'edit', oldData, newData, currentUser.role);
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
  const currentUser = req.user;
  const { id } = req.params;
  try {
    const [oldRows] = await pool.query('SELECT * FROM senders WHERE id = ?', [id]);
    if (oldRows.length === 0) return res.status(404).json({ error: 'Sender not found' });
    const oldData = oldRows[0];

    // Auth check
    if (currentUser.role !== 'Super Admin' && Number(oldData.admin_id) !== Number(currentUser.id)) {
      return res.status(403).json({ error: 'Forbidden: You cannot delete this sender configuration' });
    }
    
    await pool.query('DELETE FROM senders WHERE id = ?', [id]);
    
    await logHistory('senders', id, 'delete', oldData, null, currentUser.role);
    res.json({ message: 'Sender deleted successfully' });
  } catch (error) {
    console.error('Delete sender error:', error);
    res.status(500).json({ error: 'Database error' });
  }
};
