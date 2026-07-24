const pool = require('./src/config/db');

async function test() {
  try {
    const [rows] = await pool.query("SELECT * FROM admin_users");
    console.log(rows);
  } catch(e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}
test();
