const pool = require('../config/db');
const getAdminId = require('../utils/getAdminId');

exports.getHistory = async (req, res) => {
  try {
    const adminId = getAdminId(req);
    const [rows] = await pool.query('SELECT * FROM data_history WHERE admin_id = ? ORDER BY timestamp DESC LIMIT 500', [adminId]);
    res.json(rows);
  } catch (error) {
    console.error('Fetch history error:', error);
    res.status(500).json({ error: 'Database error' });
  }
};

exports.restoreHistory = async (req, res) => {
  const { id } = req.params;

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [historyRows] = await connection.query('SELECT * FROM data_history WHERE id = ?', [id]);
    if (historyRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'History record not found' });
    }

    const record = historyRows[0];
    if (record.action !== 'delete') {
      await connection.rollback();
      return res.status(400).json({ error: 'Only deleted records can be restored' });
    }

    let oldData = record.old_data;
    if (typeof oldData === 'string') {
      try {
        oldData = JSON.parse(oldData);
      } catch (e) {
        // ignore
      }
    }

    if (!oldData) {
      await connection.rollback();
      return res.status(400).json({ error: 'No previous data found to restore' });
    }

    const { table_name } = record;
    
    // dynamically build insert query for oldData
    const keys = Object.keys(oldData);
    const values = Object.values(oldData);
    
    const placeholders = keys.map(() => '?').join(', ');
    const query = `INSERT INTO ${table_name} (${keys.join(', ')}) VALUES (${placeholders})`;
    
    await connection.query(query, values);

    // log the restore action
    const newRecordId = oldData.id || record.record_id;
    await connection.query(
      `INSERT INTO data_history (table_name, record_id, action, new_data, changed_by) 
       VALUES (?, ?, ?, ?, ?)`,
      [table_name, newRecordId, 'restore', JSON.stringify(oldData), req.headers['x-user-role'] || 'System']
    );

    await connection.commit();
    res.json({ message: 'Record restored successfully' });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Restore error:', error);
    res.status(500).json({ error: error.sqlMessage || error.message || 'Database error' });
  } finally {
    if (connection) connection.release();
  }
};

exports.downloadHistory = async (req, res) => {
  try {
    const adminId = getAdminId(req);
    const [rows] = await pool.query('SELECT * FROM data_history WHERE admin_id = ? ORDER BY timestamp DESC', [adminId]);
    
    if (rows.length === 0) {
      return res.send('No history data available.');
    }

    const { parse } = require('json2csv');
    const csv = parse(rows);
    
    res.header('Content-Type', 'text/csv');
    res.attachment('data_history.csv');
    return res.send(csv);
  } catch (error) {
    console.error('Download history error:', error);
    res.status(500).json({ error: 'Failed to generate CSV' });
  }
};

exports.restoreEditedHistory = async (req, res) => {
  const { id } = req.params;
  const { editedData } = req.body;

  if (!editedData || typeof editedData !== 'object') {
    return res.status(400).json({ error: 'Invalid or missing editedData' });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [historyRows] = await connection.query('SELECT * FROM data_history WHERE id = ?', [id]);
    if (historyRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'History record not found' });
    }

    const record = historyRows[0];
    if (record.action !== 'delete') {
      await connection.rollback();
      return res.status(400).json({ error: 'Only deleted records can be restored' });
    }

    const { table_name } = record;
    
    // Dynamically build insert query using the editedData
    const keys = Object.keys(editedData);
    const values = Object.values(editedData);
    
    if (keys.length === 0) {
      await connection.rollback();
      return res.status(400).json({ error: 'Edited data cannot be empty' });
    }
    
    const placeholders = keys.map(() => '?').join(', ');
    const query = `INSERT INTO ${table_name} (${keys.join(', ')}) VALUES (${placeholders})`;
    
    await connection.query(query, values);

    // log the restore action with the new edited data
    const newRecordId = editedData.id || record.record_id;
    await connection.query(
      `INSERT INTO data_history (table_name, record_id, action, old_data, new_data, changed_by) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [table_name, newRecordId, 'restore', JSON.stringify(record.old_data), JSON.stringify(editedData), req.headers['x-user-role'] || 'System']
    );

    await connection.commit();
    res.json({ message: 'Record edited and restored successfully' });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Restore edited error:', error);
    res.status(500).json({ error: error.sqlMessage || error.message || 'Database error. Check if the edited data violates unique constraints or data types.' });
  } finally {
    if (connection) connection.release();
  }
};
