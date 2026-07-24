const pool = require('./src/config/db');

async function test() {
  try {
    const [rows] = await pool.query('SELECT * FROM data_history ORDER BY id DESC LIMIT 10');
    console.log("HISTORY ROWS:", rows.length);
    console.log(rows);
  } catch(e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}
test();
