const pool = require('./src/config/db');

async function test() {
  try {
    const [rows] = await pool.query("SELECT id, name, status, scheduled_at FROM campaigns ORDER BY id DESC LIMIT 5");
    console.log(rows);
  } catch(e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}
test();
