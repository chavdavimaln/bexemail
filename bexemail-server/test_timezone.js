const pool = require('./src/config/db');

async function test() {
  try {
    const [rows] = await pool.query("SELECT id, name, status, scheduled_at, NOW() as current_time_mysql FROM campaigns WHERE status = 'scheduled'");
    console.log(rows);
  } catch(e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}
test();
