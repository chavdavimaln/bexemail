const pool = require('./src/config/db');

async function test() {
  try {
    const [rows] = await pool.query("SHOW COLUMNS FROM campaigns");
    console.log(rows.map(r => r.Field));
  } catch(e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}
test();
