const pool = require('../config/db');
const crypto = require('crypto');

exports.generateKey = async (req, res) => {
  const { name } = req.body;
  // Mocking Admin ID for now
  const adminId = 1;

  try {
    // Generate raw API key to show to user ONCE
    const rawKey = 'bex_' + crypto.randomBytes(24).toString('hex');
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

    await pool.query(
      `INSERT INTO api_keys (key_hash, name, admin_id) VALUES (?, ?, ?)`,
      [keyHash, name || 'Default Key', adminId]
    );

    res.status(201).json({ 
      message: 'API Key generated successfully', 
      api_key: rawKey // Only shown once!
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database error' });
  }
};

exports.getKeys = async (req, res) => {
  try {
    // Return all keys (excluding the actual hash or raw key for security)
    const [rows] = await pool.query(
      `SELECT id, name, is_active, created_at, last_used_at FROM api_keys ORDER BY created_at DESC`
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database error' });
  }
};

exports.revokeKey = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query(`UPDATE api_keys SET is_active = false WHERE id = ?`, [id]);
    res.json({ message: 'Key revoked successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database error' });
  }
};
