const db = require('../config/db');

exports.downloadBackup = async (req, res) => {
  try {
    const [tablesRes] = await db.query('SHOW TABLES');
    // Find the key for the tables list row
    if (tablesRes.length === 0) {
      return res.status(200).send('-- No tables found in database');
    }
    
    const sampleRow = tablesRes[0];
    const tableKey = Object.keys(sampleRow)[0];
    
    let sqlDump = `-- BexEmail Database Backup\n-- Date: ${new Date().toISOString()}\n\n`;
    sqlDump += `SET FOREIGN_KEY_CHECKS = 0;\n\n`;

    for (const tableRow of tablesRes) {
      const tableName = tableRow[tableKey];
      
      // 1. Get CREATE TABLE statement
      const [createRes] = await db.query(`SHOW CREATE TABLE \`${tableName}\``);
      if (createRes.length > 0) {
        const createSql = createRes[0]['Create Table'] || createRes[0]['Create View'];
        sqlDump += `DROP TABLE IF EXISTS \`${tableName}\`;\n`;
        sqlDump += `${createSql};\n\n`;
      }
      
      // 2. Get all rows
      const [rows] = await db.query(`SELECT * FROM \`${tableName}\``);
      if (rows.length > 0) {
        const insertStmt = `INSERT INTO \`${tableName}\` (\`${Object.keys(rows[0]).join('\`, \`').replace(/\\/g, '\\\\')}\`) VALUES \n`;
        sqlDump += insertStmt;
        const valueStrings = rows.map(row => {
          const values = Object.values(row).map(val => {
            if (val === null) return 'NULL';
            if (typeof val === 'object') {
              return `'${JSON.stringify(val).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
            }
            if (typeof val === 'string') {
              return `'${val.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
            }
            if (val instanceof Date) {
              return `'${val.toISOString().slice(0, 19).replace('T', ' ')}'`;
            }
            if (typeof val === 'boolean') {
              return val ? '1' : '0';
            }
            return val;
          });
          return `(${values.join(', ')})`;
        });
        sqlDump += valueStrings.join(',\n') + ';\n\n';
      }
    }
    
    sqlDump += `SET FOREIGN_KEY_CHECKS = 1;\n`;
    
    res.setHeader('Content-Type', 'application/sql');
    res.setHeader('Content-Disposition', `attachment; filename=bexemail_backup_${Date.now()}.sql`);
    res.status(200).send(sqlDump);
  } catch (error) {
    console.error('Backup error:', error);
    res.status(500).json({ error: 'Failed to generate backup: ' + error.message });
  }
};
