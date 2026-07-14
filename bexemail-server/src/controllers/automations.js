const pool = require('../config/db');

// Create Automation
exports.createAutomation = async (req, res) => {
  const { name, trigger_type, workflow_json } = req.body;
  if (!name || !trigger_type) return res.status(400).json({ error: 'Name and trigger_type are required' });

  try {
    const [result] = await pool.query(
      `INSERT INTO automations (name, trigger_type, workflow_json) VALUES (?, ?, ?)`,
      [name, trigger_type, JSON.stringify(workflow_json || {})]
    );
    res.status(201).json({ message: 'Automation created successfully', id: result.insertId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database error' });
  }
};

// Get all Automations
exports.getAutomations = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM automations ORDER BY created_at DESC');
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database error' });
  }
};

// Update Automation Status
exports.updateAutomationStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    const [result] = await pool.query(
      `UPDATE automations SET status = ? WHERE id = ?`,
      [status, id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Automation not found' });
    res.json({ message: 'Status updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database error' });
  }
};
