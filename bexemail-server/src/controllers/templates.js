const pool = require('../config/db');
const nodemailer = require('nodemailer');
const { logHistory } = require('../utils/historyLogger');
const getAdminId = require('../utils/getAdminId');

// Create Template
exports.createTemplate = async (req, res) => {
  const adminId = getAdminId(req);
  const { 
    template_name, 
    category, 
    industry,
    is_predesigned,
    thumbnail,
    html_content, 
    plain_text_content, 
    design_json, 
    include_footer, 
    footer_editor_type, 
    footer_html, 
    footer_design_json 
  } = req.body;
  
  if (!template_name) return res.status(400).json({ error: 'Template name is required' });

  const designStr = typeof design_json === 'object' ? JSON.stringify(design_json) : (design_json || null);
  const footerDesignStr = typeof footer_design_json === 'object' ? JSON.stringify(footer_design_json) : (footer_design_json || null);

  try {
    const [uRows] = await pool.query('SELECT email FROM admin_users WHERE id = ?', [adminId]);
    const adminEmail = uRows.length > 0 ? uRows[0].email : null;

    const [dRows] = await pool.query('SELECT domain_name FROM registered_domains WHERE admin_id = ? LIMIT 1', [adminId]);
    const domainName = dRows.length > 0 ? dRows[0].domain_name : null;

    const [insertRes] = await pool.query(
      `INSERT INTO templates (
        template_name, 
        category, 
        industry,
        is_predesigned,
        thumbnail,
        html_content, 
        plain_text_content, 
        design_json, 
        include_footer, 
        footer_editor_type, 
        footer_html, 
        footer_design_json,
        admin_id,
        admin_email,
        domain_name
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        template_name, 
        category || 'General', 
        industry || 'General',
        is_predesigned ? 1 : 0,
        thumbnail || null,
        html_content || '', 
        plain_text_content || '', 
        designStr, 
        include_footer !== undefined ? include_footer : 1, 
        footer_editor_type || 'html', 
        footer_html || null, 
        footerDesignStr,
        adminId || null,
        adminEmail,
        domainName
      ]
    );

    const newTemplate = { 
      id: insertRes.insertId, 
      template_name, 
      category: category || 'General', 
      industry: industry || 'General',
      is_predesigned: is_predesigned ? 1 : 0,
      thumbnail: thumbnail || null,
      html_content: html_content || '', 
      plain_text_content: plain_text_content || '', 
      design_json: designStr,
      include_footer: include_footer !== undefined ? include_footer : 1,
      footer_editor_type: footer_editor_type || 'html',
      footer_html: footer_html || null,
      footer_design_json: footerDesignStr,
      admin_id: adminId,
      admin_email: adminEmail,
      domain_name: domainName
    };
    await logHistory('templates', insertRes.insertId, 'add', null, newTemplate, req.headers['x-user-role']).catch(() => {});
    res.status(201).json({ message: 'Template created successfully', id: insertRes.insertId, template: newTemplate });
  } catch (error) {
    console.error('Create template error:', error);
    res.status(500).json({ error: 'Failed to create template: ' + error.message });
  }
};

// Get all Templates (with optional filter query parameters)
exports.getTemplates = async (req, res) => {
  try {
    const adminId = getAdminId(req);
    const { category, industry, is_predesigned, search } = req.query;
    let sql = 'SELECT * FROM templates WHERE (is_predesigned = 1 OR admin_id = ?)';
    let params = [adminId];

    if (category && category !== 'All') {
      sql += ' AND category = ?';
      params.push(category);
    }
    if (industry && industry !== 'All') {
      sql += ' AND industry = ?';
      params.push(industry);
    }
    if (is_predesigned !== undefined && is_predesigned !== '' && is_predesigned !== 'All') {
      const isPre = (is_predesigned === 'true' || is_predesigned === '1' || is_predesigned === 1) ? 1 : 0;
      sql += ' AND is_predesigned = ?';
      params.push(isPre);
    }
    if (search && search.trim() !== '') {
      sql += ' AND (template_name LIKE ? OR category LIKE ? OR industry LIKE ?)';
      const term = `%${search.trim()}%`;
      params.push(term, term, term);
    }

    sql += ' ORDER BY is_predesigned DESC, created_at DESC, id DESC';
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (error) {
    console.error('getTemplates error:', error);
    res.status(500).json({ error: 'Database error: ' + error.message });
  }
};

// Get Template by ID
exports.getTemplateById = async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await pool.query('SELECT * FROM templates WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Template not found' });
    res.json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database error' });
  }
};

// Clone / Duplicate Template
exports.cloneTemplate = async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await pool.query('SELECT * FROM templates WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Source template not found' });

    const source = rows[0];
    const newName = req.body.template_name || `${source.template_name} (Copy)`;

    const [insertRes] = await pool.query(
      `INSERT INTO templates (
        template_name,
        category,
        industry,
        is_predesigned,
        thumbnail,
        html_content,
        plain_text_content,
        design_json,
        include_footer,
        footer_editor_type,
        footer_html,
        footer_design_json
      ) VALUES (?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        newName,
        source.category || 'General',
        source.industry || 'General',
        source.thumbnail || null,
        source.html_content || '',
        source.plain_text_content || '',
        source.design_json || null,
        source.include_footer !== undefined ? source.include_footer : 1,
        source.footer_editor_type || 'html',
        source.footer_html || null,
        source.footer_design_json || null
      ]
    );

    const cloned = {
      id: insertRes.insertId,
      template_name: newName,
      category: source.category,
      industry: source.industry,
      is_predesigned: 0,
      thumbnail: source.thumbnail,
      html_content: source.html_content
    };

    await logHistory('templates', insertRes.insertId, 'add', null, cloned, req.headers['x-user-role']).catch(() => {});
    res.status(201).json({ message: 'Template cloned successfully', id: insertRes.insertId, template: cloned });
  } catch (error) {
    console.error('Clone template error:', error);
    res.status(500).json({ error: 'Failed to clone template: ' + error.message });
  }
};

// Update Template
exports.updateTemplate = async (req, res) => {
  const { id } = req.params;
  const { 
    template_name, 
    category, 
    industry,
    is_predesigned,
    thumbnail,
    html_content, 
    plain_text_content, 
    design_json, 
    include_footer, 
    footer_editor_type, 
    footer_html, 
    footer_design_json 
  } = req.body;

  const designStr = typeof design_json === 'object' ? JSON.stringify(design_json) : (design_json || null);
  const footerDesignStr = typeof footer_design_json === 'object' ? JSON.stringify(footer_design_json) : (footer_design_json || null);

  try {
    const [oldRows] = await pool.query('SELECT * FROM templates WHERE id = ?', [id]);
    const oldData = oldRows[0] || {};
    
    const [updateRes] = await pool.query(
      `UPDATE templates SET 
        template_name = ?, 
        category = ?, 
        industry = ?,
        is_predesigned = ?,
        thumbnail = ?,
        html_content = ?, 
        plain_text_content = ?, 
        design_json = ?, 
        include_footer = ?, 
        footer_editor_type = ?, 
        footer_html = ?, 
        footer_design_json = ? 
      WHERE id = ?`,
      [
        template_name || oldData.template_name, 
        category || oldData.category || 'General', 
        industry || oldData.industry || 'General',
        is_predesigned !== undefined ? (is_predesigned ? 1 : 0) : oldData.is_predesigned,
        thumbnail !== undefined ? thumbnail : oldData.thumbnail,
        html_content !== undefined ? html_content : oldData.html_content, 
        plain_text_content !== undefined ? plain_text_content : oldData.plain_text_content, 
        designStr, 
        include_footer !== undefined ? include_footer : oldData.include_footer, 
        footer_editor_type || oldData.footer_editor_type || 'html', 
        footer_html !== undefined ? footer_html : oldData.footer_html, 
        footerDesignStr,
        id
      ]
    );

    if (updateRes.affectedRows === 0) return res.status(404).json({ error: 'Template not found' });
    
    const newData = { 
      ...oldData, 
      template_name, 
      category, 
      industry,
      is_predesigned,
      thumbnail,
      html_content, 
      plain_text_content, 
      design_json: designStr, 
      include_footer, 
      footer_editor_type, 
      footer_html, 
      footer_design_json: footerDesignStr 
    };
    await logHistory('templates', id, 'edit', oldData, newData, req.headers['x-user-role']).catch(() => {});
    res.json({ message: 'Template updated successfully' });
  } catch (error) {
    console.error('Update template error:', error);
    res.status(500).json({ error: 'Failed to update template: ' + error.message });
  }
};

// Delete Template
exports.deleteTemplate = async (req, res) => {
  const { id } = req.params;
  try {
    const [oldRows] = await pool.query('SELECT * FROM templates WHERE id = ?', [id]);
    const oldData = oldRows[0];
    
    const [result] = await pool.query('DELETE FROM templates WHERE id = ?', [id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Template not found' });
    
    if (oldData) {
      await logHistory('templates', id, 'delete', oldData, null, req.headers['x-user-role']);
    }
    res.json({ message: 'Template deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database error' });
  }
};

// Send Test Template Email
exports.sendTestTemplate = async (req, res) => {
  const { 
    test_email, 
    sender_id, 
    subject, 
    template_name, 
    html_content, 
    include_footer, 
    footer_html 
  } = req.body;

  const targetEmail = (test_email || '').trim();
  if (!targetEmail) {
    return res.status(400).json({ error: 'Recipient test email address is required.' });
  }

  try {
    // Resolve Sender SMTP configuration
    let sender = null;
    if (sender_id) {
      const [senderRows] = await pool.query('SELECT * FROM senders WHERE id = ?', [sender_id]);
      if (senderRows.length > 0) sender = senderRows[0];
    }
    if (!sender) {
      const [defaultSenderRows] = await pool.query('SELECT * FROM senders WHERE is_default = 1 LIMIT 1');
      if (defaultSenderRows.length > 0) {
        sender = defaultSenderRows[0];
      } else {
        const [anySenderRows] = await pool.query('SELECT * FROM senders LIMIT 1');
        if (anySenderRows.length > 0) {
          sender = anySenderRows[0];
        }
      }
    }

    if (!sender) {
      return res.status(400).json({ error: 'Cannot send test email: No active SMTP server configuration found. You must add an SMTP sender configuration under Profiles & User Access before sending test emails.' });
    }

    const host = (sender?.smtp_host || 'smtp.gmail.com').trim();
    let port = Number(sender?.smtp_port || 465);
    if (!port || isNaN(port)) port = 465;

    const user = (sender?.smtp_user || sender?.email || 'info@bexcodeservices.com').trim();

    let pass = (sender?.smtp_pass !== undefined && sender?.smtp_pass !== null && sender?.smtp_pass !== '********') ? sender?.smtp_pass : null;
    if (!pass || pass.trim() === '' || pass === '********') {
      const [settingsRows] = await pool.query('SELECT setting_key, setting_value FROM settings');
      const sysSettings = (settingsRows || []).reduce((acc, curr) => {
        acc[curr.setting_key] = curr.setting_value;
        return acc;
      }, {});
      pass = sysSettings.smtp_pass || sysSettings.smtp_password || process.env.SMTP_PASS || process.env.SMTP_PASSWORD || 'tbwffkmwugtbaiuw';
    }

    const isSecure = (sender?.smtp_secure === 'ssl' || sender?.smtp_secure === 'true' || port === 465);
    const fromEmail = sender?.email || user;
    const fromName = sender?.name || 'BexEmail Templates';

    let finalHtml = html_content || '<h1>BexEmail Test Template</h1>';
    if (include_footer && footer_html && footer_html.trim() !== '') {
      if (!finalHtml.includes(footer_html)) {
        if (finalHtml.includes('</body>')) {
          finalHtml = finalHtml.replace('</body>', `${footer_html}</body>`);
        } else {
          finalHtml = `${finalHtml}\n${footer_html}`;
        }
      }
    }

    const emailSubject = subject || `[Test Email] ${template_name || 'Email Template Preview'}`;

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
      subject: emailSubject,
      html: finalHtml
    });

    res.json({
      success: true,
      message: `Test email sent successfully to ${targetEmail}!`,
      messageId: info.messageId
    });
  } catch (error) {
    console.error('Send test template error:', error);
    res.status(400).json({
      error: `Failed to send test email: ${error.message || 'SMTP Connection Error'}`
    });
  }
};

