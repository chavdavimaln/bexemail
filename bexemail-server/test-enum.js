require('dotenv').config();
const mysql = require('mysql2/promise');
async function run() {
  const c = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'db_bex_email'
  });
  try { 
    const [res] = await c.query("INSERT INTO campaigns (name, subject, status) VALUES ('test enum', 'test', 'submitted_for_review')"); 
    console.log(res); 
    const [rows] = await c.query("SELECT * FROM campaigns WHERE id = ?", [res.insertId]);
    console.log('Inserted:', rows[0].status);
  } catch(e){ 
    console.error(e) 
  } 
  c.end();
}
run();
