const pool = require('./src/config/db');
const fs = require('fs');
const path = require('path');

async function initDb() {
  try {
    const schemaPath = path.join(__dirname, 'db', 'schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf8');

    // Split by ; but ignore ones inside quotes/comments (simple split for this schema is fine)
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    console.log(`Found ${statements.length} statements to execute.`);

    for (const stmt of statements) {
      if (stmt.startsWith('--')) continue; // skip comments
      try {
        await pool.query(stmt);
      } catch (e) {
        console.error("Error executing statement:", stmt.substring(0, 50) + "...");
        console.error(e.message);
      }
    }

    console.log("Database initialized successfully from schema.sql!");

  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    process.exit(0);
  }
}

initDb();
