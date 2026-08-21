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
    const getAdminId = require('../utils/getAdminId');
    const adminId = getAdminId(req);

    const [rows] = await pool.query('SELECT * FROM senders WHERE admin_id = ? ORDER BY is_default DESC, id ASC', [adminId]);

    // Strict single-primary enforcement check
    const primaryRows = rows.filter(r => r.is_default === 1 || r.is_default === true);
    if (primaryRows.length > 1) {
      const keepPrimaryId = primaryRows[0].id;
      await pool.query('UPDATE senders SET is_default = 0 WHERE admin_id = ?', [adminId]);
      await pool.query('UPDATE senders SET is_default = 1 WHERE id = ? AND admin_id = ?', [keepPrimaryId, adminId]);
      rows.forEach(r => {
        r.is_default = (r.id === keepPrimaryId) ? 1 : 0;
      });
    }

    res.json(rows);
  } catch (error) {
    console.error('Fetch senders error:', error);
    res.status(500).json({ error: 'Database error: ' + error.message });
  }
};

exports.createSender = async (req, res) => {
  const currentUser = getCurrentUser(req);
  const getAdminId = require('../utils/getAdminId');
  const targetAdminId = getAdminId(req);
  const { name, email, is_default, smtp_host, smtp_port, smtp_user, smtp_pass, smtp_secure } = req.body;
  
  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required' });
  }

  // Plan Limit Check for SMTPs
  try {
    const { getUserPlanLimits } = require('../utils/planLimits');
    const limits = await getUserPlanLimits(targetAdminId);
    const [countRows] = await pool.query('SELECT COUNT(*) as count FROM senders WHERE admin_id = ?', [targetAdminId]);
    const currentSmtpCount = countRows[0]?.count || 0;
    if (currentSmtpCount >= limits.maxSmtps) {
      return res.status(400).json({
        error: `Your current ${limits.planName} allows a maximum of ${limits.maxSmtps} SMTP configuration(s). Please upgrade your CRM plan to add more SMTP senders.`
      });
    }
  } catch (limitErr) {
    console.error('SMTP limit check error:', limitErr);
  }

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [countRows] = await connection.query('SELECT COUNT(*) as count FROM senders WHERE admin_id = ?', [targetAdminId]);
    const totalCount = countRows[0]?.count || 0;

    const shouldBeDefault = is_default || totalCount === 0 ? 1 : 0;

    if (shouldBeDefault === 1) {
      await connection.query('UPDATE senders SET is_default = 0 WHERE admin_id = ?', [targetAdminId]);
    }

    const [result] = await connection.query(
      `INSERT INTO senders (name, email, is_default, is_active, status, smtp_host, smtp_port, smtp_user, smtp_pass, smtp_secure, admin_id)
       VALUES (?, ?, ?, 1, 'active', ?, ?, ?, ?, ?, ?)`,
      [name.trim(), email.trim(), shouldBeDefault, smtp_host ? smtp_host.trim() : null, smtp_port || null, smtp_user ? smtp_user.trim() : null, smtp_pass || null, smtp_secure || 'tls', targetAdminId]
    );

    await connection.commit();
    const newSender = { 
      id: result.insertId, name: name.trim(), email: email.trim(), is_default: shouldBeDefault, is_active: 1, status: 'active',
      smtp_host: smtp_host ? smtp_host.trim() : null, smtp_port: smtp_port || null, smtp_user: smtp_user ? smtp_user.trim() : null, smtp_pass: smtp_pass || null, smtp_secure: smtp_secure || 'tls',
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
  const { name, email, is_default, is_active, status, smtp_host, smtp_port, smtp_user, smtp_pass, smtp_secure, admin_id } = req.body;

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
    let targetAdminId = oldData.admin_id || currentUser?.id || 1;
    if (admin_id !== undefined) targetAdminId = admin_id;

    if (is_default === 1 || is_default === true) {
      await connection.query('UPDATE senders SET is_default = 0 WHERE admin_id = ?', [targetAdminId]);
    }

    const activeState = (is_active !== undefined) ? (is_active ? 1 : 0) : (status === 'inactive' ? 0 : 1);
    const statusText = activeState === 1 ? 'active' : 'inactive';

    await connection.query(
      `UPDATE senders SET name = ?, email = ?, is_default = ?, is_active = ?, status = ?, smtp_host = ?, smtp_port = ?, smtp_user = ?, smtp_pass = ?, smtp_secure = ?, admin_id = ? WHERE id = ? AND admin_id = ?`,
      [name.trim(), email.trim(), (is_default === 1 || is_default === true) ? 1 : 0, activeState, statusText, smtp_host ? smtp_host.trim() : null, smtp_port || null, smtp_user ? smtp_user.trim() : null, smtp_pass || null, smtp_secure || 'tls', targetAdminId, id, targetAdminId]
    );

    await connection.commit();
    const newData = { id, name, email, is_default: (is_default === 1 || is_default === true) ? 1 : 0, is_active: activeState, status: statusText, smtp_host, smtp_port, smtp_user, smtp_pass, smtp_secure, admin_id: targetAdminId };
    await logHistory('senders', id, 'edit', oldData, newData, currentUser?.role || 'Admin');
    res.json({ message: 'Sender updated successfully' });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Update sender error:', error);
    res.status(500).json({ error: 'Database error: ' + error.message });
  } finally {
    if (connection) connection.release();
  }
};

// Set single SMTP as Primary / Default
exports.setPrimarySender = async (req, res) => {
  try {
    const { id } = req.params;
    const getAdminId = require('../utils/getAdminId');
    const adminId = getAdminId(req);

    const [senderRows] = await pool.query('SELECT * FROM senders WHERE id = ?', [id]);
    if (senderRows.length === 0) {
      return res.status(404).json({ error: 'Sender not found' });
    }

    const targetAdminId = senderRows[0].admin_id || adminId;

    // Unset is_default on all senders for this admin context, then set target sender to 1
    await pool.query('UPDATE senders SET is_default = 0 WHERE admin_id = ?', [targetAdminId]);
    await pool.query('UPDATE senders SET is_default = 1, is_active = 1, status = "active" WHERE id = ? AND admin_id = ?', [id, targetAdminId]);

    res.json({ message: 'Primary SMTP sender updated successfully', id: Number(id) });
  } catch (error) {
    console.error('Set primary sender error:', error);
    res.status(500).json({ error: 'Database error: ' + error.message });
  }
};

// Toggle Active / Deactive Status for an SMTP Server
exports.toggleSenderStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const [senderRows] = await pool.query('SELECT * FROM senders WHERE id = ?', [id]);
    if (senderRows.length === 0) {
      return res.status(404).json({ error: 'Sender not found' });
    }

    const currentSender = senderRows[0];
    const targetAdminId = currentSender.admin_id || 1;
    const isCurrentlyActive = currentSender.is_active === 1 || currentSender.status === 'active';
    const newActiveState = isCurrentlyActive ? 0 : 1;
    const newStatusText = newActiveState === 1 ? 'active' : 'inactive';

    // If attempting to deactivate the default primary sender, prevent deactivation unless another active sender exists for this admin
    if (currentSender.is_default === 1 && isCurrentlyActive) {
      const [otherActive] = await pool.query('SELECT id FROM senders WHERE id != ? AND admin_id = ? AND (is_active = 1 OR status = "active") LIMIT 1', [id, targetAdminId]);
      if (otherActive.length > 0) {
        // Promote other active sender to default primary for this admin
        await pool.query('UPDATE senders SET is_default = 1 WHERE id = ? AND admin_id = ?', [otherActive[0].id, targetAdminId]);
        await pool.query('UPDATE senders SET is_default = 0, is_active = 0, status = "inactive" WHERE id = ? AND admin_id = ?', [id, targetAdminId]);
      } else {
        return res.status(400).json({
          error: 'Cannot deactivate the primary SMTP server. At least one active primary SMTP server must remain active for your account.'
        });
      }
    } else {
      await pool.query('UPDATE senders SET is_active = ?, status = ? WHERE id = ?', [newActiveState, newStatusText, id]);
    }

    res.json({
      message: `SMTP sender status updated to ${newStatusText}`,
      id: Number(id),
      is_active: newActiveState,
      status: newStatusText
    });
  } catch (error) {
    console.error('Toggle sender status error:', error);
    res.status(500).json({ error: 'Database error: ' + error.message });
  }
};

exports.deleteSender = async (req, res) => {
  const currentUser = getCurrentUser(req);
  const { id } = req.params;
  try {
    const [oldRows] = await pool.query('SELECT * FROM senders WHERE id = ?', [id]);
    if (oldRows.length === 0) return res.status(404).json({ error: 'Sender not found' });
    const oldData = oldRows[0];

    const [countRows] = await pool.query('SELECT COUNT(*) as count FROM senders WHERE admin_id = ?', [oldData.admin_id || 1]);
    if (countRows[0]?.count <= 1) {
      return res.status(400).json({ error: 'Cannot delete SMTP server. At least one SMTP configuration must remain in the system.' });
    }
    
    await pool.query('DELETE FROM senders WHERE id = ?', [id]);

    // If the deleted sender was the default primary, automatically assign default status to the next available sender
    if (oldData.is_default === 1 || oldData.is_default === true) {
      const [remaining] = await pool.query('SELECT id FROM senders WHERE admin_id = ? ORDER BY id ASC LIMIT 1', [oldData.admin_id || 1]);
      if (remaining.length > 0) {
        await pool.query('UPDATE senders SET is_default = 1, is_active = 1, status = "active" WHERE id = ?', [remaining[0].id]);
      }
    }
    
    await logHistory('senders', id, 'delete', oldData, null, currentUser?.role || 'Admin');
    res.json({ message: 'Sender deleted successfully' });
  } catch (error) {
    console.error('Delete sender error:', error);
    res.status(500).json({ error: 'Database error: ' + error.message });
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
