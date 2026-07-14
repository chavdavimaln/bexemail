const pool = require('../config/db');

// Create Template
exports.createTemplate = async (req, res) => {
  const { template_name, category, html_content, plain_text_content } = req.body;
  if (!template_name) return res.status(400).json({ error: 'Template name is required' });

  try {
    const [result] = await pool.query(
      `INSERT INTO templates (template_name, category, html_content, plain_text_content) VALUES (?, ?, ?, ?)`,
      [template_name, category || 'General', html_content || '', plain_text_content || '']
    );
    res.status(201).json({ message: 'Template created successfully', id: result.insertId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database error' });
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
  const { template_name, category, html_content, plain_text_content } = req.body;

  try {
    const [result] = await pool.query(
      `UPDATE templates SET template_name = ?, category = ?, html_content = ?, plain_text_content = ? WHERE id = ?`,
      [template_name, category, html_content, plain_text_content, id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Template not found' });
    res.json({ message: 'Template updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database error' });
  }
};

// Delete Template
exports.deleteTemplate = async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await pool.query('DELETE FROM templates WHERE id = ?', [id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Template not found' });
    res.json({ message: 'Template deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database error' });
  }
};
