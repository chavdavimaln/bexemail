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
    console.log("Creating external_integrations table...");
    await connection.query(`
      CREATE TABLE IF NOT EXISTS external_integrations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        type ENUM('api', 'database') NOT NULL,
        url VARCHAR(500) NULL,
        method VARCHAR(10) DEFAULT 'GET',
        headers JSON NULL,
        api_key VARCHAR(255) NULL,
        db_host VARCHAR(255) NULL,
        db_user VARCHAR(255) NULL,
        db_password VARCHAR(255) NULL,
        db_name VARCHAR(255) NULL,
        db_query TEXT NULL,
        target_list_id INT NULL,
        last_sync_at DATETIME NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (target_list_id) REFERENCES lists(id) ON DELETE SET NULL
      )
    `);
    console.log("Table external_integrations created successfully!");
  } catch (err) {
    console.error("Error creating table:", err);
  } finally {
    await connection.end();
  }
}

updateDb();
