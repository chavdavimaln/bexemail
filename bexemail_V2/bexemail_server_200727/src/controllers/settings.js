const pool = require('../config/db');

// Get all settings
exports.getSettings = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT setting_key, setting_value FROM settings');
    
    // Convert array of objects to a key-value object map
    const settings = rows.reduce((acc, current) => {
      acc[current.setting_key] = current.setting_value;
      return acc;
    }, {});

    res.json(settings);
  } catch (error) {
    console.error('Settings error:', error);
    res.status(500).json({ error: 'Database error' });
  }
};

// Update settings
exports.updateSettings = async (req, res) => {
  const settingsObj = req.body; // e.g. { company_name: "BexEmail", smtp_host: "..." }
  
  if (!settingsObj || typeof settingsObj !== 'object') {
    return res.status(400).json({ error: 'Invalid settings format' });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    for (const [key, value] of Object.entries(settingsObj)) {
      await connection.query(
        `INSERT INTO settings (setting_key, setting_value) 
         VALUES (?, ?) 
         ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
        [key, value]
      );
    }

    await connection.commit();
    res.json({ message: 'Settings updated successfully' });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Settings error:', error);
    res.status(500).json({ error: 'Database error' });
  } finally {
    if (connection) connection.release();
  }
};
