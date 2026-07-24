const pool = require('../config/db');
const crypto = require('crypto');

// Middleware to protect API routes for external usage
const verifyApiKey = async (req, res, next) => {
  const apiKey = req.headers['x-api-key'] || req.query.api_key;
  
  if (!apiKey) {
    return res.status(401).json({ error: 'Unauthorized: API Key is missing' });
  }

  // The key must start with 'bex_' to be valid in our system
  if (!apiKey.startsWith('bex_')) {
    return res.status(401).json({ error: 'Unauthorized: Invalid API Key format' });
  }

  try {
    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

    const [rows] = await pool.query(
      `SELECT id, is_active FROM api_keys WHERE key_hash = ?`,
      [keyHash]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Unauthorized: API Key not found' });
    }

    if (!rows[0].is_active) {
      return res.status(403).json({ error: 'Forbidden: API Key has been revoked' });
    }

    // Update last used timestamp asynchronously
    pool.query(`UPDATE api_keys SET last_used_at = NOW() WHERE id = ?`, [rows[0].id]).catch(console.error);

    // Attach admin id if needed
    req.apiKeyId = rows[0].id;
    next();
  } catch (error) {
    console.error('API Key Auth error:', error);
    res.status(500).json({ error: 'Internal server error during authentication' });
  }
};

module.exports = verifyApiKey;
