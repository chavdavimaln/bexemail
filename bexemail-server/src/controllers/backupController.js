const db = require('../config/db');

exports.downloadBackup = async (req, res) => {
  try {
    const [tablesRes] = await db.query('SHOW TABLES');
    if (tablesRes.length === 0) {
      return res.status(200).send('-- No tables found in database');
    }
    
    const sampleRow = tablesRes[0];
    const tableKey = Object.keys(sampleRow)[0];
    
    let sqlDump = `-- BexEmail Database Backup\n-- Date: ${new Date().toISOString()}\n\n`;
    sqlDump += `SET FOREIGN_KEY_CHECKS = 0;\n\n`;

    for (const tableRow of tablesRes) {
      const tableName = tableRow[tableKey];
      
      const [createRes] = await db.query(`SHOW CREATE TABLE \`${tableName}\``);
      if (createRes.length > 0) {
        const createSql = createRes[0]['Create Table'] || createRes[0]['Create View'];
        sqlDump += `DROP TABLE IF EXISTS \`${tableName}\`;\n`;
        sqlDump += `${createSql};\n\n`;
      }
      
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

exports.createDatabaseBackup = async (req, res) => {
  const { description, tables } = req.body;
  if (!description) return res.status(400).json({ error: 'Description is required' });
  if (!tables || !Array.isArray(tables) || tables.length === 0) {
    return res.status(400).json({ error: 'At least one table must be selected' });
  }

  try {
    const backupDataMap = {};

    for (const tableName of tables) {
      const [createRes] = await db.query(`SHOW CREATE TABLE \`${tableName}\``);
      if (createRes.length === 0) continue;
      const createSql = createRes[0]['Create Table'] || createRes[0]['Create View'];

      let tableDump = `DROP TABLE IF EXISTS \`${tableName}\`;\n${createSql};\n\n`;

      const [rows] = await db.query(`SELECT * FROM \`${tableName}\``);
      if (rows.length > 0) {
        const columns = Object.keys(rows[0]).map(col => `\`${col}\``).join(', ');
        const insertStmt = `INSERT INTO \`${tableName}\` (${columns}) VALUES \n`;
        const values = rows.map(row => {
          const formattedValues = Object.values(row).map(val => {
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
          return `(${formattedValues.join(', ')})`;
        }).join(',\n') + ';\n\n';
        tableDump += insertStmt + values;
      }
      backupDataMap[tableName] = tableDump;
    }

    const tablesIncluded = tables.join(',');
    const backupJsonString = JSON.stringify(backupDataMap);

    await db.query(
      'INSERT INTO db_backups (description, backup_data, tables_included) VALUES (?, ?, ?)',
      [description, backupJsonString, tablesIncluded]
    );

    res.status(201).json({ message: 'Database backup created successfully' });
  } catch (error) {
    console.error('Create backup error:', error);
    res.status(500).json({ error: 'Failed to create database backup: ' + error.message });
  }
};

exports.getBackupHistory = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT id, description, tables_included, created_at FROM db_backups ORDER BY created_at DESC');
    res.status(200).json(rows);
  } catch (error) {
    console.error('List backups error:', error);
    res.status(500).json({ error: 'Failed to retrieve backup list' });
  }
};

exports.restoreDatabaseBackup = async (req, res) => {
  const { id } = req.params;
  const { tablesToRestore } = req.body;

  if (!tablesToRestore || !Array.isArray(tablesToRestore) || tablesToRestore.length === 0) {
    return res.status(400).json({ error: 'At least one table must be selected for restoration' });
  }

  try {
    const [rows] = await db.query('SELECT * FROM db_backups WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Backup record not found' });
    }

    const backup = rows[0];
    const backupDataMap = JSON.parse(backup.backup_data);

    await db.query('SET FOREIGN_KEY_CHECKS = 0');

    for (const tableName of tablesToRestore) {
      const sqlDump = backupDataMap[tableName];
      if (!sqlDump) continue;

      const statements = sqlDump
        .split(/;\r?\n/)
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0);

      for (const statement of statements) {
        await db.query(statement);
      }
    }

    await db.query('SET FOREIGN_KEY_CHECKS = 1');

    res.status(200).json({ message: 'Backup restored successfully' });
  } catch (error) {
    try { await db.query('SET FOREIGN_KEY_CHECKS = 1'); } catch (_) {}
    console.error('Restore backup error:', error);
    res.status(500).json({ error: 'Failed to restore database: ' + error.message });
  }
};
