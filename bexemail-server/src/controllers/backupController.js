const db = require('../config/db');

// Module table defaults
const MODULE_TABLE_MAP = {
  database: ['subscribers', 'lists', 'campaigns', 'templates', 'senders', 'settings', 'admin_users', 'automations', 'automation_steps', 'subscriber_origins', 'subscriber_list_origins', 'contact_import_logs'],
  db: ['subscribers', 'lists', 'subscriber_origins', 'subscriber_list_origins', 'contact_import_logs', 'senders'],
  contacts: ['subscribers', 'lists', 'subscriber_origins', 'subscriber_list_origins', 'contact_import_logs', 'senders', 'contacts_ui_config'],
  automations: ['automations', 'automation_steps', 'automation_subscribers', 'automation_logs', 'automations_ui_config'],
  campaigns: ['campaigns', 'templates', 'campaign_opens', 'campaign_clicks', 'campaigns_ui_config'],
  all: ['subscribers', 'lists', 'campaigns', 'templates', 'senders', 'settings', 'admin_users', 'automations', 'automation_steps', 'subscriber_origins', 'subscriber_list_origins', 'contact_import_logs', 'contacts_ui_config', 'automations_ui_config', 'campaigns_ui_config', 'ui_programming']
};

exports.downloadBackup = async (req, res) => {
  if (req.query.id) {
    req.params.id = req.query.id;
    return exports.downloadSpecificBackup(req, res);
  }

  try {
    const [tablesRes] = await db.query('SHOW TABLES');
    if (tablesRes.length === 0) {
      return res.status(200).send('-- No tables found in database');
    }
    
    const sampleRow = tablesRes[0];
    const tableKey = Object.keys(sampleRow)[0];
    
    let sqlDump = `-- BexEmail Complete Database Dump\n-- Generated: ${new Date().toISOString()}\n\n`;
    sqlDump += `SET FOREIGN_KEY_CHECKS = 0;\n\n`;

    for (const tableRow of tablesRes) {
      const tableName = tableRow[tableKey];
      
      try {
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
      } catch (tErr) {
        console.warn(`Skipped table dump for ${tableName}:`, tErr.message);
      }
    }
    
    sqlDump += `SET FOREIGN_KEY_CHECKS = 1;\n`;
    
    res.setHeader('Content-Type', 'application/sql');
    res.setHeader('Content-Disposition', `attachment; filename=bexemail_full_dump_${Date.now()}.sql`);
    res.status(200).send(sqlDump);
  } catch (error) {
    console.error('Backup error:', error);
    res.status(500).json({ error: 'Failed to generate backup: ' + error.message });
  }
};

exports.downloadCodeUiSystem = async (req, res) => {
  try {
    const [templates] = await db.query('SELECT * FROM templates').catch(() => [[]]);
    const [automations] = await db.query('SELECT * FROM automations').catch(() => [[]]);
    const [automationSteps] = await db.query('SELECT * FROM automation_steps').catch(() => [[]]);
    const [settings] = await db.query('SELECT * FROM settings').catch(() => [[]]);
    const [senders] = await db.query('SELECT * FROM senders').catch(() => [[]]);
    const [contactsUi] = await db.query('SELECT * FROM contacts_ui_config').catch(() => [[]]);
    const [automationsUi] = await db.query('SELECT * FROM automations_ui_config').catch(() => [[]]);
    const [campaignsUi] = await db.query('SELECT * FROM campaigns_ui_config').catch(() => [[]]);
    const [uiProgramming] = await db.query('SELECT * FROM ui_programming').catch(() => [[]]);

    const systemPackage = {
      package_title: "BexEmail Full System Code, Programming & UI Package",
      generated_at: new Date().toISOString(),
      system_version: "2.0.0",
      ui_programming_configs: uiProgramming || [],
      contacts_ui_configs: contactsUi || [],
      automations_ui_configs: automationsUi || [],
      campaigns_ui_configs: campaignsUi || [],
      email_templates: templates || [],
      automation_workflows: automations || [],
      automation_step_rules: automationSteps || [],
      system_settings: settings || [],
      smtp_senders: senders || []
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=bexemail_code_ui_system_${Date.now()}.json`);
    res.status(200).send(JSON.stringify(systemPackage, null, 2));
  } catch (error) {
    console.error('Download Code & UI System Error:', error);
    res.status(500).json({ error: 'Failed to generate Code & UI System package: ' + error.message });
  }
};

exports.createDatabaseBackup = async (req, res) => {
  if (req.body && (req.body.action === 'delete' || req.body.delete_id || (req.body.id && req.body.description === 'delete_backup_action'))) {
    req.body.id = req.body.delete_id || req.body.id;
    return exports.deleteDatabaseBackup(req, res);
  }

  const { description, tables, module_type = 'all' } = req.body;
  if (!description) return res.status(400).json({ error: 'Description is required' });

  try {
    // Dynamically query actual existing tables in MySQL
    const [existingTablesRes] = await db.query('SHOW TABLES');
    const existingTableNames = existingTablesRes.map(row => Object.values(row)[0]);

    // Determine target tables from actual existing tables
    let targetTables = tables;
    if (!targetTables || !Array.isArray(targetTables) || targetTables.length === 0) {
      if (module_type === 'all' || module_type === 'database') {
        targetTables = existingTableNames;
      } else {
        const moduleDefaults = MODULE_TABLE_MAP[module_type] || existingTableNames;
        targetTables = moduleDefaults.filter(t => existingTableNames.includes(t));
      }
    } else {
      targetTables = targetTables.filter(t => existingTableNames.includes(t));
    }

    const backupDataMap = {};
    const validIncludedTables = [];

    for (const tableName of targetTables) {
      try {
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
        validIncludedTables.push(tableName);
      } catch (tableErr) {
        console.warn(`Table ${tableName} skipped during backup creation:`, tableErr.message);
      }
    }

    const tablesIncluded = validIncludedTables.join(',');
    const backupJsonString = JSON.stringify(backupDataMap);

    await db.query(
      'INSERT INTO db_backups (module_type, description, backup_data, tables_included) VALUES (?, ?, ?, ?)',
      [module_type, description, backupJsonString, tablesIncluded]
    );

    res.status(201).json({ message: 'Backup created successfully', module_type, tables: validIncludedTables });
  } catch (error) {
    console.error('Create backup error:', error);
    res.status(500).json({ error: 'Failed to create backup: ' + error.message });
  }
};

exports.importDatabaseBackup = async (req, res) => {
  const { fileContent, description, module_type = 'database' } = req.body;
  if (!fileContent) {
    return res.status(400).json({ error: 'File content is required for backup import' });
  }

  try {
    let sqlDump = '';
    let backupDataMap = {};
    let tablesIncluded = [];

    if (fileContent.trim().startsWith('{') || fileContent.trim().startsWith('[')) {
      backupDataMap = JSON.parse(fileContent);
      tablesIncluded = Object.keys(backupDataMap);
    } else {
      sqlDump = fileContent;
      const tableMatches = [...fileContent.matchAll(/(?:CREATE TABLE|INSERT INTO|DROP TABLE IF EXISTS)\s+[`"]?(\w+)[`"]?/gi)];
      tablesIncluded = [...new Set(tableMatches.map(m => m[1]))];
    }

    await db.query('SET FOREIGN_KEY_CHECKS = 0');

    if (Object.keys(backupDataMap).length > 0) {
      for (const [tableName, tableSql] of Object.entries(backupDataMap)) {
        const statements = tableSql.split(/;\r?\n/).map(s => s.trim()).filter(Boolean);
        for (const stmt of statements) {
          await db.query(stmt);
        }
      }
    } else if (sqlDump) {
      const statements = sqlDump.split(/;\r?\n/).map(s => s.trim()).filter(Boolean);
      for (const stmt of statements) {
        await db.query(stmt);
      }
    }

    await db.query('SET FOREIGN_KEY_CHECKS = 1');

    const backupDesc = description || `Imported ${module_type.toUpperCase()} Backup - ${new Date().toLocaleDateString()}`;
    const tablesStr = tablesIncluded.join(',');
    const storedJson = Object.keys(backupDataMap).length > 0 ? JSON.stringify(backupDataMap) : JSON.stringify({ raw_import: sqlDump });

    await db.query(
      'INSERT INTO db_backups (module_type, description, backup_data, tables_included) VALUES (?, ?, ?, ?)',
      [module_type, backupDesc, storedJson, tablesStr]
    );

    res.status(200).json({ message: 'Database backup imported and applied successfully!', tables: tablesIncluded });
  } catch (error) {
    try { await db.query('SET FOREIGN_KEY_CHECKS = 1'); } catch (_) {}
    console.error('Import backup error:', error);
    res.status(500).json({ error: 'Failed to import backup file: ' + error.message });
  }
};

exports.getBackupHistory = async (req, res) => {
  try {
    const { module_type, startDate, endDate, year, month, day } = req.query;
    let query = 'SELECT id, module_type, description, tables_included, created_at, LENGTH(backup_data) as data_size FROM db_backups WHERE 1=1';
    const params = [];

    if (module_type && module_type !== 'All' && module_type !== 'all') {
      query += ' AND (module_type = ? OR (module_type IS NULL AND ? = "all"))';
      params.push(module_type.toLowerCase(), module_type.toLowerCase());
    }

    if (startDate) {
      query += ' AND created_at >= ?';
      params.push(`${startDate} 00:00:00`);
    }

    if (endDate) {
      query += ' AND created_at <= ?';
      params.push(`${endDate} 23:59:59`);
    }

    if (year) {
      query += ' AND YEAR(created_at) = ?';
      params.push(year);
    }

    if (month) {
      query += ' AND MONTH(created_at) = ?';
      params.push(month);
    }

    if (day) {
      query += ' AND DAY(created_at) = ?';
      params.push(day);
    }

    query += ' ORDER BY created_at DESC';

    const [rows] = await db.query(query, params);
    
    const normalizedRows = rows.map(r => ({
      ...r,
      module_type: r.module_type || 'all'
    }));

    res.status(200).json(normalizedRows);
  } catch (error) {
    console.error('List backups error:', error);
    res.status(500).json({ error: 'Failed to retrieve backup list' });
  }
};

exports.restoreDatabaseBackup = async (req, res) => {
  const { id } = req.params;
  const { tablesToRestore } = req.body;

  try {
    const [rows] = await db.query('SELECT * FROM db_backups WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Backup record not found' });
    }

    const backup = rows[0];
    const rawData = backup.backup_data || '';
    let backupDataMap = {};
    let isRawSql = false;

    if (typeof rawData === 'string' && (rawData.trim().startsWith('{') || rawData.trim().startsWith('['))) {
      try {
        backupDataMap = JSON.parse(rawData);
      } catch (_) {
        isRawSql = true;
      }
    } else {
      isRawSql = true;
    }

    await db.query('SET FOREIGN_KEY_CHECKS = 0');

    if (isRawSql || backupDataMap.raw_import) {
      const sqlContent = isRawSql ? rawData : backupDataMap.raw_import;
      const statements = sqlContent.split(/;\r?\n/).map(stmt => stmt.trim()).filter(stmt => stmt.length > 0);
      for (const statement of statements) {
        await db.query(statement);
      }
    } else {
      const availableTables = Object.keys(backupDataMap);
      const restoreTargets = (tablesToRestore && Array.isArray(tablesToRestore) && tablesToRestore.length > 0)
        ? tablesToRestore
        : availableTables;

      for (const tableName of restoreTargets) {
        const sqlDump = backupDataMap[tableName];
        if (!sqlDump || typeof sqlDump !== 'string') continue;

        const statements = sqlDump.split(/;\r?\n/).map(stmt => stmt.trim()).filter(stmt => stmt.length > 0);
        for (const statement of statements) {
          await db.query(statement);
        }
      }
    }

    await db.query('SET FOREIGN_KEY_CHECKS = 1');

    res.status(200).json({ message: 'Backup snapshot restored successfully' });
  } catch (error) {
    try { await db.query('SET FOREIGN_KEY_CHECKS = 1'); } catch (_) {}
    console.error('Restore backup error:', error);
    res.status(500).json({ error: 'Failed to restore backup snapshot: ' + error.message });
  }
};

exports.deleteDatabaseBackup = async (req, res) => {
  const id = req.params.id || req.query.id || req.body?.id || req.body?.delete_id;
  if (!id) {
    return res.status(400).json({ error: 'Backup ID is required for deletion' });
  }

  try {
    const [result] = await db.query('DELETE FROM db_backups WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Backup record not found' });
    }
    res.status(200).json({ message: 'Backup record deleted permanently' });
  } catch (error) {
    console.error('Delete backup error:', error);
    res.status(500).json({ error: 'Failed to delete backup: ' + error.message });
  }
};

exports.downloadSpecificBackup = async (req, res) => {
  const { id } = req.params;
  const downloadType = req.query.type || 'sql';

  try {
    const [rows] = await db.query('SELECT * FROM db_backups WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Backup snapshot not found' });
    }

    const backup = rows[0];

    if (downloadType === 'code_ui' || downloadType === 'ui') {
      const codeUiPackage = {
        snapshot_id: backup.id,
        module_type: backup.module_type || 'all',
        description: backup.description,
        created_at: backup.created_at,
        tables_included: backup.tables_included,
        ui_system_package: backup.backup_data
      };
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename=bexemail_code_ui_#${backup.id}.json`);
      return res.status(200).send(JSON.stringify(codeUiPackage, null, 2));
    }

    // Default: SQL Dump
    let sqlDump = `-- BexEmail Backup Snapshot #${backup.id}\n`;
    sqlDump += `-- Module: ${(backup.module_type || 'all').toUpperCase()}\n`;
    sqlDump += `-- Description: ${backup.description || 'Database Snapshot'}\n`;
    sqlDump += `-- Created: ${new Date(backup.created_at).toISOString()}\n\n`;
    sqlDump += `SET FOREIGN_KEY_CHECKS = 0;\n\n`;

    const rawData = backup.backup_data || '';

    if (typeof rawData === 'string' && (rawData.trim().startsWith('{') || rawData.trim().startsWith('['))) {
      try {
        const parsed = JSON.parse(rawData);
        if (parsed && typeof parsed === 'object') {
          if (parsed.raw_import) {
            sqlDump += parsed.raw_import + '\n\n';
          } else {
            Object.values(parsed).forEach(val => {
              if (typeof val === 'string') {
                sqlDump += val + '\n\n';
              }
            });
          }
        } else {
          sqlDump += rawData + '\n\n';
        }
      } catch (pErr) {
        sqlDump += rawData + '\n\n';
      }
    } else {
      sqlDump += rawData + '\n\n';
    }

    sqlDump += `SET FOREIGN_KEY_CHECKS = 1;\n`;

    const moduleTag = backup.module_type || 'all';
    res.setHeader('Content-Type', 'application/sql');
    res.setHeader('Content-Disposition', `attachment; filename=bexemail_backup_${moduleTag}_${backup.id}.sql`);
    res.status(200).send(sqlDump);
  } catch (error) {
    console.error('Download backup error:', error);
    res.status(500).json({ error: 'Failed to download backup snapshot: ' + error.message });
  }
};

exports.getBackupSchedules = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM backup_schedules ORDER BY created_at DESC');
    res.status(200).json(rows);
  } catch (error) {
    console.error('Get schedules error:', error);
    res.status(500).json({ error: 'Failed to fetch backup schedules' });
  }
};

exports.saveBackupSchedule = async (req, res) => {
  const { module_type = 'all', frequency = 'weekly', status = 'active', reminder_enabled = 1, reminder_email = '' } = req.body;

  try {
    const [existing] = await db.query('SELECT id FROM backup_schedules WHERE module_type = ? LIMIT 1', [module_type]);

    if (existing.length > 0) {
      await db.query(
        'UPDATE backup_schedules SET frequency = ?, status = ?, reminder_enabled = ?, reminder_email = ?, updated_at = NOW() WHERE id = ?',
        [frequency, status, reminder_enabled ? 1 : 0, reminder_email, existing[0].id]
      );
    } else {
      await db.query(
        'INSERT INTO backup_schedules (module_type, frequency, status, reminder_enabled, reminder_email) VALUES (?, ?, ?, ?, ?)',
        [module_type, frequency, status, reminder_enabled ? 1 : 0, reminder_email]
      );
    }

    res.status(200).json({ message: 'Backup schedule and reminder saved successfully' });
  } catch (error) {
    console.error('Save schedule error:', error);
    res.status(500).json({ error: 'Failed to save backup schedule' });
  }
};
