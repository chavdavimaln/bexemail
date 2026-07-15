const pool = require('../config/db');

/**
 * Logs a change to the data_history table.
 * 
 * @param {string} tableName - The name of the table modified.
 * @param {number} recordId - The ID of the modified record.
 * @param {string} action - 'add', 'edit', 'delete', or 'restore'.
 * @param {object|null} oldData - The previous state of the record (for edit/delete).
 * @param {object|null} newData - The new state of the record (for add/edit).
 * @param {string} changedBy - Identifier for who made the change.
 */
async function logHistory(tableName, recordId, action, oldData, newData, changedBy = 'System') {
  try {
    await pool.query(
      `INSERT INTO data_history (table_name, record_id, action, old_data, new_data, changed_by) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        tableName, 
        recordId, 
        action, 
        oldData ? JSON.stringify(oldData) : null, 
        newData ? JSON.stringify(newData) : null,
        changedBy
      ]
    );
  } catch (error) {
    console.error(`Failed to log history for ${tableName} (${action}):`, error);
  }
}

module.exports = { logHistory };
