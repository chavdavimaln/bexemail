const pool = require('../config/db');
const { logHistory } = require('../utils/historyLogger');

exports.getAdmins = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, name, email, number, role, password, created_at FROM admin_users ORDER BY created_at DESC');
    res.json(rows);
  } catch (error) {
    console.error('Fetch admins error:', error);
    res.status(500).json({ error: 'Database error' });
  }
};

exports.createAdmin = async (req, res) => {
  const { name, email, number, password, role } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: 'Name, email, password, and role are required' });
  }

  try {
    const [existing] = await pool.query('SELECT id FROM admin_users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    const [result] = await pool.query(
      'INSERT INTO admin_users (name, email, number, password, role) VALUES (?, ?, ?, ?, ?)',
      [name, email, number || null, password, role]
    );

    const newAdmin = { id: result.insertId, name, email, number, role };
    await logHistory('admin_users', result.insertId, 'add', null, newAdmin, req.headers['x-user-role'] || 'System');
    
    res.status(201).json({ message: 'User created successfully', id: result.insertId });
  } catch (error) {
    console.error('Create admin error:', error);
    res.status(500).json({ error: 'Database error' });
  }
};

exports.updateAdmin = async (req, res) => {
  const { id } = req.params;
  const { name, email, number, password, role } = req.body;

  try {
    const [oldDataRows] = await pool.query('SELECT id, name, email, number, role, password FROM admin_users WHERE id = ?', [id]);
    if (oldDataRows.length === 0) return res.status(404).json({ error: 'User not found' });
    
    const oldData = oldDataRows[0];
    const oldDataForHistory = { ...oldData };
    delete oldDataForHistory.password; // Don't log password hashes in history

    let finalPassword = oldData.password;
    if (password && password.trim() !== '') {
      finalPassword = password;
    }

    await pool.query(
      'UPDATE admin_users SET name = ?, email = ?, number = ?, role = ?, password = ? WHERE id = ?',
      [name, email, number || null, role, finalPassword, id]
    );

    const [newDataRows] = await pool.query('SELECT id, name, email, number, role FROM admin_users WHERE id = ?', [id]);
    await logHistory('admin_users', id, 'edit', oldDataForHistory, newDataRows[0], req.headers['x-user-role'] || 'System');

    res.json({ message: 'User updated successfully' });
  } catch (error) {
    console.error('Update admin error:', error);
    res.status(500).json({ error: 'Database error' });
  }
};

exports.deleteAdmin = async (req, res) => {
  const { id } = req.params;
  try {
    const [oldData] = await pool.query('SELECT id, name, email, number, role FROM admin_users WHERE id = ?', [id]);
    if (oldData.length > 0) {
      await logHistory('admin_users', id, 'delete', oldData[0], null, req.headers['x-user-role'] || 'System');
    }
    
    await pool.query('DELETE FROM admin_users WHERE id = ?', [id]);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete admin error:', error);
    res.status(500).json({ error: 'Database error' });
  }
};
