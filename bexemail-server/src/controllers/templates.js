const pool = require('../config/db');
const { logHistory } = require('../utils/historyLogger');
// Create Template
exports.createTemplate = async (req, res) => {
  const { template_name, category, html_content, plain_text_content, design_json } = req.body;
  if (!template_name) return res.status(400).json({ error: 'Template name is required' });

  const designStr = typeof design_json === 'object' ? JSON.stringify(design_json) : (design_json || null);

  try {
    let result;
    try {
      const [insertRes] = await pool.query(
        `INSERT INTO templates (template_name, category, html_content, plain_text_content, design_json) VALUES (?, ?, ?, ?, ?)`,
        [template_name, category || 'General', html_content || '', plain_text_content || '', designStr]
      );
      result = insertRes;
    } catch (dbErr) {
      if (dbErr.code === 'ER_BAD_FIELD_ERROR' || (dbErr.sqlMessage && dbErr.sqlMessage.includes('design_json'))) {
        await pool.query('ALTER TABLE templates ADD COLUMN design_json LONGTEXT NULL').catch(() => {});
        const [insertRes] = await pool.query(
          `INSERT INTO templates (template_name, category, html_content, plain_text_content, design_json) VALUES (?, ?, ?, ?, ?)`,
          [template_name, category || 'General', html_content || '', plain_text_content || '', designStr]
        );
        result = insertRes;
      } else {
        const [insertRes] = await pool.query(
          `INSERT INTO templates (template_name, category, html_content, plain_text_content) VALUES (?, ?, ?, ?)`,
          [template_name, category || 'General', html_content || '', plain_text_content || '']
        );
        result = insertRes;
      }
    }

    const newTemplate = { id: result.insertId, template_name, category: category || 'General', html_content: html_content || '', plain_text_content: plain_text_content || '', design_json: designStr };
    await logHistory('templates', result.insertId, 'add', null, newTemplate, req.headers['x-user-role']).catch(() => {});
    res.status(201).json({ message: 'Template created successfully', id: result.insertId });
  } catch (error) {
    console.error('Create template error:', error);
    res.status(500).json({ error: 'Failed to create template: ' + error.message });
  }
};

// Get all Templates
exports.getTemplates = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM templates ORDER BY created_at DESC');
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database error' });
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

// Update Template
exports.updateTemplate = async (req, res) => {
  const { id } = req.params;
  const { template_name, category, html_content, plain_text_content, design_json } = req.body;

  const designStr = typeof design_json === 'object' ? JSON.stringify(design_json) : (design_json || null);

  try {
    const [oldRows] = await pool.query('SELECT * FROM templates WHERE id = ?', [id]);
    const oldData = oldRows[0] || {};
    
    let result;
    try {
      const [updateRes] = await pool.query(
        `UPDATE templates SET template_name = ?, category = ?, html_content = ?, plain_text_content = ?, design_json = ? WHERE id = ?`,
        [template_name, category, html_content || '', plain_text_content || '', designStr, id]
      );
      result = updateRes;
    } catch (dbErr) {
      if (dbErr.code === 'ER_BAD_FIELD_ERROR' || (dbErr.sqlMessage && dbErr.sqlMessage.includes('design_json'))) {
        await pool.query('ALTER TABLE templates ADD COLUMN design_json LONGTEXT NULL').catch(() => {});
        const [updateRes] = await pool.query(
          `UPDATE templates SET template_name = ?, category = ?, html_content = ?, plain_text_content = ?, design_json = ? WHERE id = ?`,
          [template_name, category, html_content || '', plain_text_content || '', designStr, id]
        );
        result = updateRes;
      } else {
        const [updateRes] = await pool.query(
          `UPDATE templates SET template_name = ?, category = ?, html_content = ?, plain_text_content = ? WHERE id = ?`,
          [template_name, category, html_content || '', plain_text_content || '', id]
        );
        result = updateRes;
      }
    }

    if (result.affectedRows === 0) return res.status(404).json({ error: 'Template not found' });
    
    const newData = { ...oldData, template_name, category, html_content, plain_text_content, design_json: designStr };
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
