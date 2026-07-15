require('dotenv').config();
const mysql = require('mysql2/promise');

async function updateDb() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'db_bex_email'
  });

  try {
    console.log("Updating admin_users table...");
    
    // Using try/catch for each so if column exists it doesn't crash the whole script
    try {
      await connection.query("ALTER TABLE admin_users ADD COLUMN name VARCHAR(255) NULL AFTER id");
      console.log("Added 'name' column");
    } catch(e) { if(e.code !== 'ER_DUP_FIELDNAME') throw e; }

    try {
      await connection.query("ALTER TABLE admin_users ADD COLUMN number VARCHAR(50) NULL AFTER email");
      console.log("Added 'number' column");
    } catch(e) { if(e.code !== 'ER_DUP_FIELDNAME') throw e; }

    // Modify the role ENUM. We convert to VARCHAR first then to the new ENUM just to be safe.
    await connection.query("ALTER TABLE admin_users MODIFY COLUMN role VARCHAR(255)");
    await connection.query("UPDATE admin_users SET role = 'Super Admin' WHERE role = 'admin' OR role = 'manager'");
    await connection.query("ALTER TABLE admin_users MODIFY COLUMN role ENUM('Super Admin', 'Sub Admin', 'User', 'Subscriber') DEFAULT 'User'");
    console.log("Updated 'role' enum");

    console.log("Table admin_users updated successfully!");
  } catch (err) {
    console.error("Error updating table:", err);
  } finally {
    await connection.end();
  }
}

updateDb();
