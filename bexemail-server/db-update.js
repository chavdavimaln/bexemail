const mysql = require('./node_modules/mysql2/promise');
async function run() {
  const c = await mysql.createConnection({host: '127.0.0.1', user: 'root', password: '', database: 'db_bex_email'});
  await c.query("UPDATE lists SET name = 'Subscribers Directory' WHERE id = 1");
  console.log('Done');
  c.end();
}
run();
