const pool = require('../config/db');
const { logHistory } = require('../utils/historyLogger');
const bcrypt = require('bcryptjs');

// Helper to hash password
const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
};

exports.getAdmins = async (req, res) => {
  const currentUser = req.user; // { id, email, role }
  
  try {
    let query = 'SELECT id, name, username, email, number, role, permissions, created_at FROM admin_users';
    let params = [];
    
    if (currentUser.role === 'Super Admin') {
      // Super Admin sees everything
      query += ' ORDER BY created_at DESC';
    } else if (currentUser.role === 'Admin' || currentUser.role === 'Sub Admin') {
      // Admins see other Admins/Users/Sub Admins but not Super Admins
      query += ' WHERE role != "Super Admin" ORDER BY created_at DESC';
    } else {
      // User sees only self
      query += ' WHERE id = ?';
      params.push(currentUser.id);
    }
    
    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (error) {
    console.error('Fetch admins error:', error);
    res.status(500).json({ error: 'Database error' });
  }
};

exports.createAdmin = async (req, res) => {
  const currentUser = req.user;
  const { name, username, email, number, password, role, permissions } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: 'Name, email, password, and role are required' });
  }

  // Role validation
  if (currentUser.role !== 'Super Admin') {
    if (currentUser.role !== 'Admin' && currentUser.role !== 'Sub Admin') {
      return res.status(403).json({ error: 'Forbidden: You do not have permission to create users' });
    }
    if (role === 'Super Admin') {
      return res.status(403).json({ error: 'Forbidden: You cannot create a Super Admin' });
    }
  }

  try {
    const [existing] = await pool.query('SELECT id FROM admin_users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    const hashedPassword = await hashPassword(password);
    const permissionsStr = permissions ? JSON.stringify(permissions) : null;

    const [result] = await pool.query(
      'INSERT INTO admin_users (name, username, email, number, password, role, permissions) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, username || null, email, number || null, hashedPassword, role, permissionsStr]
    );

    const newAdmin = { id: result.insertId, name, username, email, number, role, permissions };
    await logHistory('admin_users', result.insertId, 'add', null, newAdmin, currentUser.role);
    
    res.status(201).json({ message: 'User created successfully', id: result.insertId });
  } catch (error) {
    console.error('Create admin error:', error);
    res.status(500).json({ error: 'Database error' });
  }
};

exports.updateAdmin = async (req, res) => {
  const currentUser = req.user;
  const { id } = req.params;
  const { name, username, email, number, password, role, permissions } = req.body;

  // Authorization check
  if (currentUser.role !== 'Super Admin') {
    const isSelf = Number(currentUser.id) === Number(id);
    if (!isSelf) {
      if (currentUser.role !== 'Admin' && currentUser.role !== 'Sub Admin') {
        return res.status(403).json({ error: 'Forbidden: You can only edit your own profile' });
      }
      // Admins cannot edit Super Admins
      const [targetRows] = await pool.query('SELECT role FROM admin_users WHERE id = ?', [id]);
      if (targetRows.length > 0 && targetRows[0].role === 'Super Admin') {
        return res.status(403).json({ error: 'Forbidden: You cannot edit a Super Admin' });
      }
    }
  }

  try {
    const [oldDataRows] = await pool.query('SELECT id, name, username, email, number, role, password, permissions FROM admin_users WHERE id = ?', [id]);
    if (oldDataRows.length === 0) return res.status(404).json({ error: 'User not found' });
    
    const oldData = oldDataRows[0];
    const oldDataForHistory = { ...oldData };
    delete oldDataForHistory.password;

    let finalPassword = oldData.password;
    if (password && password.trim() !== '') {
      finalPassword = await hashPassword(password);
    }

    const permissionsStr = permissions ? JSON.stringify(permissions) : (oldData.permissions ? JSON.stringify(oldData.permissions) : null);

    // If a non-SuperAdmin is editing self, keep their role unchanged
    let finalRole = role || oldData.role;
    if (currentUser.role !== 'Super Admin' && Number(currentUser.id) === Number(id)) {
      finalRole = oldData.role;
    }

    await pool.query(
      'UPDATE admin_users SET name = ?, username = ?, email = ?, number = ?, role = ?, password = ?, permissions = ? WHERE id = ?',
      [
        name || oldData.name, 
        username !== undefined ? username : oldData.username, 
        email || oldData.email, 
        number !== undefined ? number : oldData.number, 
        finalRole, 
        finalPassword, 
        permissionsStr,
        id
      ]
    );

    const [newDataRows] = await pool.query('SELECT id, name, username, email, number, role, permissions FROM admin_users WHERE id = ?', [id]);
    await logHistory('admin_users', id, 'edit', oldDataForHistory, newDataRows[0], currentUser.role);

    res.json({ message: 'User updated successfully' });
  } catch (error) {
    console.error('Update admin error:', error);
    res.status(500).json({ error: 'Database error' });
  }
};

exports.deleteAdmin = async (req, res) => {
  const currentUser = req.user;
  const { id } = req.params;

  if (currentUser.role !== 'Super Admin') {
    if (currentUser.role !== 'Admin' && currentUser.role !== 'Sub Admin') {
      return res.status(403).json({ error: 'Forbidden: You do not have permission to delete users' });
    }
    // Admins cannot delete Super Admins
    const [targetRows] = await pool.query('SELECT role FROM admin_users WHERE id = ?', [id]);
    if (targetRows.length > 0 && targetRows[0].role === 'Super Admin') {
      return res.status(403).json({ error: 'Forbidden: You cannot delete a Super Admin' });
    }
  }

  try {
    const [oldData] = await pool.query('SELECT id, name, email, number, role FROM admin_users WHERE id = ?', [id]);
    if (oldData.length > 0) {
      await logHistory('admin_users', id, 'delete', oldData[0], null, currentUser.role);
    }
    
    await pool.query('DELETE FROM admin_users WHERE id = ?', [id]);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete admin error:', error);
    res.status(500).json({ error: 'Database error' });
  }
};

exports.resetPasswordManually = async (req, res) => {
  const currentUser = req.user;
  const { id } = req.params;
  const { newPassword } = req.body;

  if (!newPassword || newPassword.trim() === '') {
    return res.status(400).json({ error: 'New password is required' });
  }

  // Authorization check
  if (currentUser.role !== 'Super Admin') {
    const isSelf = Number(currentUser.id) === Number(id);
    if (!isSelf) {
      if (currentUser.role !== 'Admin' && currentUser.role !== 'Sub Admin') {
        return res.status(403).json({ error: 'Forbidden: You can only reset your own password' });
      }
      // Admins cannot reset Super Admin passwords
      const [targetRows] = await pool.query('SELECT role FROM admin_users WHERE id = ?', [id]);
      if (targetRows.length > 0 && targetRows[0].role === 'Super Admin') {
        return res.status(403).json({ error: 'Forbidden: You cannot reset a Super Admin password' });
      }
    }
  }

  try {
    const hashedPassword = await hashPassword(newPassword);
    await pool.query('UPDATE admin_users SET password = ? WHERE id = ?', [hashedPassword, id]);
    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Database error' });
  }
};

exports.sendForgetPassword = async (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    const [rows] = await pool.query('SELECT id FROM admin_users WHERE email = ?', [email]);
    if (rows.length === 0) {
      // Silently return success to avoid email harvesting
      return res.json({ message: 'If the email exists, a password reset link has been sent' });
    }
    
    console.log(`[Password Reset] Forget password requested for: ${email}. A mock reset link would be dispatched.`);
    res.json({ message: 'Password reset link sent successfully' });
  } catch (error) {
    console.error('Forget password error:', error);
    res.status(500).json({ error: 'Database error' });
  }
};
