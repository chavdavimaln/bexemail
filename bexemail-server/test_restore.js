const pool = require('./src/config/db');

async function testRestore() {
  try {
    const [rows] = await pool.query("SELECT * FROM data_history WHERE action='delete' AND table_name='campaigns' ORDER BY id DESC LIMIT 1");
    if (rows.length === 0) {
      console.log("No deleted campaign history found.");
      process.exit(0);
    }
    
    const record = rows[0];
    let oldData = typeof record.old_data === 'string' ? JSON.parse(record.old_data) : record.old_data;
    
    const keys = Object.keys(oldData);
    const values = Object.values(oldData);
    const placeholders = keys.map(() => '?').join(', ');
    const query = `INSERT INTO campaigns (${keys.join(', ')}) VALUES (${placeholders})`;
    
    console.log("Testing insert into campaigns...");
    await pool.query(query, values);
    
    console.log("Testing insert into data_history (this is what History.js does)...");
    const table_name = record.table_name;
    const newRecordId = oldData.id || record.record_id;
    await pool.query(
      `INSERT INTO data_history (table_name, record_id, action, new_data, changed_by) 
       VALUES (?, ?, ?, ?, ?)`,
      [table_name, newRecordId, 'restore', JSON.stringify(oldData), 'System']
    );

    console.log("Success!");
  } catch(e) {
    console.error("SQL Error:", e.sqlMessage || e);
  } finally {
    process.exit(0);
  }
}
testRestore();
