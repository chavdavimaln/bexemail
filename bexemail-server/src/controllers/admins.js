const pool = require('../config/db');
const { logHistory } = require('../utils/historyLogger');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');

const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'bexemail_super_secret_key_2026';

// Helper to hash password
const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
};

const getCurrentUser = (req) => {
  try {
    if (req && req.user && typeof req.user === 'object' && req.user.id) return req.user;

    let token = req && req.headers ? (req.headers.authorization || req.headers.Authorization) : null;
    if (token && typeof token === 'string') {
      if (token.startsWith('Bearer ')) token = token.slice(7);
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded && decoded.id) {
          return { id: Number(decoded.id), role: decoded.role || 'Admin' };
        }
      } catch (e) {}
    }

    const idHeader = req && req.headers ? (req.headers['x-user-id'] || req.headers['X-User-Id']) : null;
    const roleHeader = req && req.headers ? (req.headers['x-user-role'] || req.headers['X-User-Role']) : null;
    if (idHeader) {
      return {
        id: Number(idHeader),
        role: roleHeader || 'Admin'
      };
    }

    return { id: 1, role: roleHeader || 'Admin' };
  } catch (e) {
    return { id: 1, role: 'Admin' };
  }
};

exports.getAdmins = async (req, res) => {
  try {
    const currentUser = getCurrentUser(req);

    // Fetch active user's subscription details and domain
    const [subRows] = await pool.query(`
      SELECT au.domain, us.plan_code, us.seats_limit as sub_seats, p.seats_limit as plan_seats, au.custom_seats_limit
      FROM admin_users au
      LEFT JOIN user_subscriptions us ON au.id = us.user_id
      LEFT JOIN plans p ON (us.plan_id = p.id OR (us.plan_code IS NOT NULL AND p.plan_code = us.plan_code))
      WHERE au.id = ?
      ORDER BY us.id DESC LIMIT 1
    `, [currentUser.id]);

    const userMeta = subRows[0] || {};
    const planCode = (userMeta.plan_code || 'free').toLowerCase();
    const maxSeats = userMeta.custom_seats_limit || userMeta.sub_seats || userMeta.plan_seats || (planCode === 'free' ? 1 : planCode === 'essentials' ? 3 : planCode === 'standard' ? 5 : 10);

    let query = 'SELECT id, name, username, email, number, domain, role, permissions, plain_password, created_at, admin_id FROM admin_users';
    let params = [];

    const getAdminId = require('../utils/getAdminId');
    const adminId = getAdminId(req);

    // Admin Tenant Isolation: User sees their own account and sub-users under their admin_id
    query += ' WHERE (id = ? OR admin_id = ?)';
    params.push(adminId, adminId);

    query += ' ORDER BY created_at DESC';
    if (maxSeats > 0) {
      query += ` LIMIT ${Number(maxSeats)}`;
    }

    const [rows] = await pool.query(query, params);
    const parsedRows = rows.map(r => {
      let perms = r.permissions;
      if (typeof perms === 'string') {
        try { perms = JSON.parse(perms); } catch (e) {}
      }
      return { ...r, permissions: perms || {} };
    });
    res.json(parsedRows);
  } catch (error) {
    console.error('Fetch admins error:', error);
    res.status(500).json({ error: 'Database error: ' + error.message });
  }
};

exports.createAdmin = async (req, res) => {
  const currentUser = getCurrentUser(req);
  const { name, username, email, number, password, role, permissions } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: 'Name, email, password, and role are required' });
  }

  // Role validation: Non-Super-Admins CANNOT create another Admin
  if ((role === 'Admin' || role === 'Super Admin') && currentUser.role !== 'Super Admin') {
    return res.status(400).json({
      error: 'Subscription plans allow only 1 Admin account per subscription. Additional team seats must be added as Associates or Developer roles.'
    });
  }

  const allowedAdminRoles = ['Super Admin', 'Admin', 'Sub Admin', 'Campaign Manager', 'Developer', 'Associates'];
  if (!allowedAdminRoles.includes(currentUser.role)) {
    return res.status(403).json({ error: 'Forbidden: You do not have permission to create users' });
  }

  try {
    const [existing] = await pool.query('SELECT id FROM admin_users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    // Check seat capacity limits against active plan and custom DB overrides
    const targetTenantAdminId = currentUser.admin_id || currentUser.id || 1;
    const [currentUsers] = await pool.query('SELECT COUNT(*) as totalCount FROM admin_users WHERE id = ? OR admin_id = ?', [targetTenantAdminId, targetTenantAdminId]);
    const userCount = currentUsers[0]?.totalCount || 0;

    const { getUserPlanLimits } = require('../utils/planLimits');
    const userLimits = await getUserPlanLimits(targetTenantAdminId);

    // Get current user's subscription or default plan seat limits
    const [subs] = await pool.query(`
      SELECT au.domain, us.custom_seats_limit, us.custom_admins_limit, us.custom_associates_limit, us.seats_limit as sub_seats_limit, p.seats_limit as plan_seats_limit, p.name as plan_name, au.custom_seats_limit as user_custom_seats
      FROM admin_users au
      LEFT JOIN user_subscriptions us ON au.id = us.user_id
      LEFT JOIN plans p ON (us.plan_id = p.id OR (us.plan_code IS NOT NULL AND p.plan_code = us.plan_code))
      WHERE au.id = ? OR au.role IN ('Super Admin', 'Admin')
      ORDER BY us.id DESC LIMIT 1
    `, [targetTenantAdminId]);

    const activeSub = subs[0] || {};
    const maxSeats = userLimits.maxAdmins || activeSub.user_custom_seats || activeSub.custom_seats_limit || activeSub.sub_seats_limit || activeSub.plan_seats_limit || 1;
    const targetDomain = activeSub.domain || (currentUser.email ? currentUser.email.split('@')[1] : null);

    // If role is Associates, check associate limit
    if (role === 'Associates' && activeSub.custom_associates_limit) {
      const [assocCountRows] = await pool.query('SELECT COUNT(*) as count FROM admin_users WHERE role = "Associates" AND (id = ? OR admin_id = ?)', [targetTenantAdminId, targetTenantAdminId]);
      if ((assocCountRows[0]?.count || 0) >= activeSub.custom_associates_limit) {
        return res.status(400).json({ error: `Associates seat limit reached. Maximum allowed Associates configured in database is ${activeSub.custom_associates_limit}.` });
      }
    }

    // Enforce overall seat limit
    if (userCount >= maxSeats && currentUser.role !== 'Super Admin') {
      return res.status(400).json({
        error: `Seat capacity limit reached (${userCount}/${maxSeats} seats used). Your active ${userLimits.planName} allows up to ${maxSeats} seats (1 Admin + ${maxSeats - 1} Associates/Developers). Upgrade your plan to add more team members.`
      });
    }

    const hashedPassword = await hashPassword(password);
    const defaultPerms = permissions || {};
    const permissionsStr = JSON.stringify(defaultPerms);
    const parentAdminId = currentUser.id || 1;

    const [result] = await pool.query(
      'INSERT INTO admin_users (name, username, email, number, password, plain_password, role, permissions, domain, admin_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [name, username || null, email, number || null, hashedPassword, password, role, permissionsStr, targetDomain, parentAdminId]
    );

    const newAdmin = { id: result.insertId, name, username, email, number, role, permissions, plain_password: password };
    await logHistory('admin_users', result.insertId, 'add', null, newAdmin, currentUser.role);
    
    res.status(201).json({ message: 'User created successfully', id: result.insertId });
  } catch (error) {
    console.error('Create admin error:', error);
    res.status(500).json({ error: 'Database error: ' + error.message });
  }
};

exports.updateAdmin = async (req, res) => {
  const currentUser = getCurrentUser(req);
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
    const [oldDataRows] = await pool.query('SELECT id, name, username, email, number, role, password, plain_password, permissions FROM admin_users WHERE id = ?', [id]);
    if (oldDataRows.length === 0) return res.status(404).json({ error: 'User not found' });
    
    const oldData = oldDataRows[0];
    const oldDataForHistory = { ...oldData };
    delete oldDataForHistory.password;

    let finalPassword = oldData.password;
    let finalPlainPassword = oldData.plain_password;
    if (password && password.trim() !== '') {
      finalPassword = await hashPassword(password);
      finalPlainPassword = password;
    }

    let permissionsStr = null;
    if (permissions !== undefined) {
      permissionsStr = typeof permissions === 'string' ? permissions : JSON.stringify(permissions);
    } else if (oldData.permissions !== undefined && oldData.permissions !== null) {
      permissionsStr = typeof oldData.permissions === 'string' ? oldData.permissions : JSON.stringify(oldData.permissions);
    }

    // If a non-SuperAdmin is editing self, keep their role unchanged
    let finalRole = role || oldData.role;
    if (currentUser.role !== 'Super Admin' && Number(currentUser.id) === Number(id)) {
      finalRole = oldData.role;
    }

    await pool.query(
      'UPDATE admin_users SET name = ?, username = ?, email = ?, number = ?, role = ?, password = ?, plain_password = ?, permissions = ? WHERE id = ?',
      [
        name || oldData.name, 
        username !== undefined ? username : oldData.username, 
        email || oldData.email, 
        number !== undefined ? number : oldData.number, 
        finalRole, 
        finalPassword, 
        finalPlainPassword,
        permissionsStr,
        id
      ]
    );

    const [newDataRows] = await pool.query('SELECT id, name, username, email, number, role, permissions, plain_password FROM admin_users WHERE id = ?', [id]);
    await logHistory('admin_users', id, 'edit', oldDataForHistory, newDataRows[0], currentUser.role);

    res.json({ message: 'User updated successfully' });
  } catch (error) {
    console.error('Update admin error:', error);
    res.status(500).json({ error: 'Database error' });
  }
};

exports.deleteAdmin = async (req, res) => {
  const currentUser = getCurrentUser(req);
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
  const currentUser = getCurrentUser(req);
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
    await pool.query('UPDATE admin_users SET password = ?, plain_password = ? WHERE id = ?', [hashedPassword, newPassword, id]);
    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Database error' });
  }
};

exports.sendForgetPassword = async (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({ error: 'Registered email address is required' });
  }

  try {
    const [rows] = await pool.query('SELECT id, name, username, email, plain_password FROM admin_users WHERE email = ?', [email]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'No user profile found for this registered email address.' });
    }
    const user = rows[0];

    // Fetch active SMTP sender configuration
    const [senderRows] = await pool.query('SELECT * FROM senders ORDER BY is_default DESC, id ASC LIMIT 1');
    const sender = senderRows[0] || {};

    const host = (sender.smtp_host || 'smtp.gmail.com').trim();
    let port = Number(sender.smtp_port || 465);
    if (!port || isNaN(port)) port = 465;
    const smtpUser = (sender.smtp_user || sender.email || 'info@bexcodeservices.com').trim();
    
    let pass = (sender.smtp_pass && sender.smtp_pass !== '********') ? sender.smtp_pass : null;
    if (!pass) {
      const [settingsRows] = await pool.query('SELECT setting_key, setting_value FROM settings');
      const sysSettings = (settingsRows || []).reduce((acc, curr) => {
        acc[curr.setting_key] = curr.setting_value;
        return acc;
      }, {});
      pass = sysSettings.smtp_pass || sysSettings.smtp_password || process.env.SMTP_PASS || process.env.SMTP_PASSWORD || 'tbwffkmwugtbaiuw';
    }

    const isSecure = (sender.smtp_secure === 'ssl' || sender.smtp_secure === 'true' || port === 465);
    const fromEmail = sender.email || smtpUser;
    const fromName = sender.name || 'BexEmail Security';
    const clientOrigin = process.env.CLIENT_URL || req.headers.origin || (req.headers.referer ? new URL(req.headers.referer).origin : 'http://localhost:5173');
    const resetLink = `${clientOrigin}/reset-password?email=${encodeURIComponent(user.email)}`;

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: isSecure,
      auth: smtpUser && pass ? { user: smtpUser, pass: pass.trim() } : undefined,
      tls: { rejectUnauthorized: false }
    });

    const mailOptions = {
      from: `"${fromName}" <${fromEmail}>`,
      to: user.email,
      subject: `🔐 Password Reset Instructions - BexEmail`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 25px; border: 1px solid #e2e8f0; border-radius: 12px; max-width: 550px; margin: 0 auto; background-color: #ffffff; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
          <h2 style="color: #2563eb; margin-top: 0;">🔐 Password Reset Instructions</h2>
          <p style="color: #334155; font-size: 14px; line-height: 1.6;">
            Hello <strong>${user.name || user.email}</strong>,
          </p>
          <p style="color: #334155; font-size: 14px; line-height: 1.6;">
            A password reset link was requested for your registered account: <code>${user.email}</code>.
          </p>
          <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 15px; margin: 15px 0;">
            <p style="margin: 0 0 8px 0; font-size: 12px; font-weight: bold; color: #475569;">ACCOUNT SECURITY DETAILS:</p>
            <ul style="color: #475569; font-size: 13px; padding-left: 20px; margin: 0; line-height: 1.6;">
              <li><strong>Registered Email:</strong> ${user.email}</li>
              <li><strong>Account Name:</strong> ${user.name || 'User'}</li>
              <li><strong>Direct Profile Reset Link:</strong> <a href="${resetLink}" style="color: #2563eb; font-weight: bold;">${resetLink}</a></li>
            </ul>
          </div>
          <div style="text-align: center; margin: 25px 0;">
            <a href="${resetLink}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px; display: inline-block;">
              Open Profile & Reset Password
            </a>
          </div>
          <p style="color: #94a3b8; font-size: 12px; border-top: 1px solid #f1f5f9; padding-top: 15px; margin-top: 20px;">
            If you did not request this email, you can safely ignore it.
          </p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`[Password Reset] Reset link email dispatched successfully via SMTP to: ${user.email}`);
    res.json({ message: `Password reset link email dispatched successfully to ${user.email}` });
  } catch (error) {
    console.error('Forget password error:', error);
    res.status(500).json({ error: 'Failed to send password reset email: ' + error.message });
  }
};
