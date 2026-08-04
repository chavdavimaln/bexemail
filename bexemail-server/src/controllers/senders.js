const pool = require('../config/db');
const { logHistory } = require('../utils/historyLogger');
const nodemailer = require('nodemailer');

const getCurrentUser = (req) => {
  try {
    if (req && req.user && typeof req.user === 'object') return req.user;
    const roleHeader = req && req.headers ? (req.headers['x-user-role'] || req.headers['X-User-Role']) : null;
    const idHeader = req && req.headers ? (req.headers['x-user-id'] || req.headers['X-User-Id']) : null;
    return {
      id: idHeader ? Number(idHeader) : 1,
      role: roleHeader || 'Admin'
    };
  } catch (e) {
    return { id: 1, role: 'Admin' };
  }
};

exports.getSenders = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM senders ORDER BY is_default DESC, name ASC');

    // If senders table is empty, auto-seed default system SMTP sender (info@bexcodeservices.com)
    if (rows.length === 0) {
      const [settingsRows] = await pool.query('SELECT setting_key, setting_value FROM settings');
      const settings = (settingsRows || []).reduce((acc, curr) => {
        acc[curr.setting_key] = curr.setting_value;
        return acc;
      }, {});

      const defaultName = settings.from_name || 'Active System SMTP';
      const defaultEmail = settings.from_email || settings.smtp_user || 'info@bexcodeservices.com';
      const smtpHost = settings.smtp_host || 'smtp.gmail.com';
      const smtpPort = settings.smtp_port ? Number(settings.smtp_port) : 465;
      const smtpUser = settings.smtp_user || 'info@bexcodeservices.com';
      const smtpPass = settings.smtp_pass || '********';
      const smtpSecure = settings.smtp_secure || 'ssl';

      const [insertResult] = await pool.query(
        `INSERT INTO senders (name, email, is_default, smtp_host, smtp_port, smtp_user, smtp_pass, smtp_secure, admin_id)
         VALUES (?, ?, TRUE, ?, ?, ?, ?, ?, NULL)`,
        [defaultName, defaultEmail, smtpHost, smtpPort, smtpUser, smtpPass, smtpSecure]
      );

      const seededSender = {
        id: insertResult.insertId,
        name: defaultName,
        email: defaultEmail,
        is_default: 1,
        smtp_host: smtpHost,
        smtp_port: smtpPort,
        smtp_user: smtpUser,
        smtp_pass: smtpPass,
        smtp_secure: smtpSecure,
        admin_id: null
      };

      return res.json([seededSender]);
    }

    res.json(rows);
  } catch (error) {
    console.error('Fetch senders error:', error);
    res.status(500).json({ error: 'Database error' });
  }
};

exports.createSender = async (req, res) => {
  const currentUser = getCurrentUser(req);
  const { name, email, is_default, smtp_host, smtp_port, smtp_user, smtp_pass, smtp_secure, admin_id } = req.body;
  
  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required' });
  }

  // Force Admin to own their senders
  let targetAdminId = admin_id || null;
  if (currentUser && currentUser.role !== 'Super Admin') {
    targetAdminId = currentUser.id || 1;
  }

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    if (is_default) {
      if (currentUser && currentUser.role === 'Super Admin') {
        await connection.query('UPDATE senders SET is_default = FALSE WHERE is_default = TRUE');
      } else {
        await connection.query('UPDATE senders SET is_default = FALSE WHERE admin_id = ? AND is_default = TRUE', [currentUser?.id || 1]);
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
    await logHistory('senders', result.insertId, 'add', null, newSender, currentUser?.role || 'Super Admin');
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
  const currentUser = getCurrentUser(req);
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
    if (currentUser && currentUser.role !== 'Super Admin' && Number(oldData.admin_id) !== Number(currentUser.id)) {
      await connection.rollback();
      return res.status(403).json({ error: 'Forbidden: You cannot modify this sender configuration' });
    }

    if (is_default) {
      if (currentUser && currentUser.role === 'Super Admin') {
        await connection.query('UPDATE senders SET is_default = FALSE WHERE id != ?', [id]);
      } else {
        await connection.query('UPDATE senders SET is_default = FALSE WHERE admin_id = ? AND id != ?', [currentUser?.id || 1, id]);
      }
    }

    let targetAdminId = oldData.admin_id;
    if (currentUser && currentUser.role === 'Super Admin') {
      targetAdminId = admin_id !== undefined ? admin_id : oldData.admin_id;
    }

    await connection.query(
      `UPDATE senders SET name = ?, email = ?, is_default = ?, smtp_host = ?, smtp_port = ?, smtp_user = ?, smtp_pass = ?, smtp_secure = ?, admin_id = ? WHERE id = ?`,
      [name, email, is_default, smtp_host || null, smtp_port || null, smtp_user || null, smtp_pass || null, smtp_secure || 'tls', targetAdminId, id]
    );

    await connection.commit();
    const newData = { id, name, email, is_default, smtp_host, smtp_port, smtp_user, smtp_pass, smtp_secure, admin_id: targetAdminId };
    await logHistory('senders', id, 'edit', oldData, newData, currentUser?.role || 'Super Admin');
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
  const currentUser = getCurrentUser(req);
  const { id } = req.params;
  try {
    const [oldRows] = await pool.query('SELECT * FROM senders WHERE id = ?', [id]);
    if (oldRows.length === 0) return res.status(404).json({ error: 'Sender not found' });
    const oldData = oldRows[0];

    // Auth check
    if (currentUser && currentUser.role !== 'Super Admin' && Number(oldData.admin_id) !== Number(currentUser.id)) {
      return res.status(403).json({ error: 'Forbidden: You cannot delete this sender configuration' });
    }
    
    await pool.query('DELETE FROM senders WHERE id = ?', [id]);
    
    await logHistory('senders', id, 'delete', oldData, null, currentUser?.role || 'Super Admin');
    res.json({ message: 'Sender deleted successfully' });
  } catch (error) {
    console.error('Delete sender error:', error);
    res.status(500).json({ error: 'Database error' });
  }
};

exports.testSender = async (req, res) => {
  const { id } = req.params;
  const { test_email, smtp_host, smtp_port, smtp_user, smtp_pass, smtp_secure, email: sender_email, name: sender_name } = req.body;

  try {
    let sender = null;
    if (id && id !== 'new' && id !== 'undefined' && id !== 'test') {
      const [rows] = await pool.query('SELECT * FROM senders WHERE id = ?', [id]);
      if (rows.length > 0) {
        sender = rows[0];
      }
    }

    const host = (smtp_host || sender?.smtp_host || 'smtp.gmail.com').trim();
    let port = Number(smtp_port || sender?.smtp_port || 465);
    if (!port || isNaN(port)) port = 465;

    const user = (smtp_user || sender?.smtp_user || sender?.email || sender_email || 'info@bexcodeservices.com').trim();

    let pass = (smtp_pass !== undefined && smtp_pass !== null && smtp_pass !== '********') ? smtp_pass : (sender?.smtp_pass !== '********' ? sender?.smtp_pass : null);
    if (!pass || pass.trim() === '' || pass === '********') {
      const [settingsRows] = await pool.query('SELECT setting_key, setting_value FROM settings');
      const sysSettings = (settingsRows || []).reduce((acc, curr) => {
        acc[curr.setting_key] = curr.setting_value;
        return acc;
      }, {});
      pass = sysSettings.smtp_pass || sysSettings.smtp_password || process.env.SMTP_PASS || process.env.SMTP_PASSWORD || 'tbwffkmwugtbaiuw';
    }

    const isSecure = (smtp_secure === 'ssl' || smtp_secure === 'true' || port === 465);
    const fromEmail = sender_email || sender?.email || user;
    const fromName = sender_name || sender?.name || 'BexEmail System';
    const targetEmail = (test_email || 'vimal@bexcodeservices.com').trim();

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: isSecure,
      auth: user && pass ? { user: user.trim(), pass: pass.trim() } : undefined,
      tls: { rejectUnauthorized: false }
    });

    await transporter.verify();

    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: targetEmail,
      subject: `[BexEmail] Test Email Connection Verification`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 25px; border: 1px solid #e2e8f0; border-radius: 12px; max-width: 550px; margin: 0 auto; background-color: #ffffff; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
          <h2 style="color: #2563eb; margin-top: 0;">✅ SMTP Connection Verified!</h2>
          <p style="color: #334155; font-size: 14px; line-height: 1.6;">
            This email confirms that your SMTP sender configuration for <strong>${fromName}</strong> (<code>${fromEmail}</code>) is active and functioning properly in <strong>BexEmail</strong>.
          </p>
          <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 15px; margin: 15px 0;">
            <p style="margin: 0 0 8px 0; font-size: 12px; font-weight: bold; color: #475569; uppercase;">Configuration Details:</p>
            <ul style="color: #475569; font-size: 13px; padding-left: 20px; margin: 0; line-height: 1.6;">
              <li><strong>SMTP Host:</strong> ${host}:${port}</li>
              <li><strong>Username:</strong> ${user}</li>
              <li><strong>Security Mode:</strong> ${isSecure ? 'SSL (Port 465)' : 'TLS / STARTTLS'}</li>
              <li><strong>Target Recipient:</strong> ${targetEmail}</li>
            </ul>
          </div>
          <p style="color: #94a3b8; font-size: 11px; text-align: center; margin-top: 20px; border-top: 1px solid #f1f5f9; padding-top: 10px;">
            © 2026 BexEmail System Verification • Sent via configured SMTP profile
          </p>
        </div>
      `
    });

    res.json({
      success: true,
      message: `Test email sent successfully to ${targetEmail}!`,
      messageId: info.messageId
    });
  } catch (error) {
    console.error('SMTP test error:', error);
    res.status(400).json({
      error: `SMTP Test Connection Failed: ${error.message || 'Unable to connect to SMTP server'}`
    });
  }
};
