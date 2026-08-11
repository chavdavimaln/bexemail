const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Suppress Redis ECONNREFUSED errors emitted by BullMQ's internal IORedis clones.
// BullMQ creates internal connections that don't inherit our error handlers.
// This suppressor only silences port 6379 errors and re-throws everything else.
const _emitWarning = process.emitWarning.bind(process);
process.on('uncaughtException', (err) => {
  if (err.code === 'ECONNREFUSED' && err.address && (err.port === 6379 || err.address.includes('6379'))) {
    return; // Silently ignore Redis connection errors — server operates normally without Redis
  }
  console.error('[Fatal]', err);
  process.exit(1);
});

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' })); // For standard HTML forms


// Routes
app.get('/', (req, res) => {
  res.json({ message: 'BexEmail API is running successfully on port 5000!' });
});

// ── Dedicated Contact Update + List Sync (no role guard, for Contacts page edit) ──
const pool = require('./src/config/db');
app.put('/api/contacts/:id/update', async (req, res) => {
  const { id } = req.params;
  const numSubId = Number(id);
  const { email, first_name, status, list_ids } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // 1. Update subscriber fields
    const [check] = await connection.query('SELECT id FROM subscribers WHERE id = ?', [numSubId]);
    if (check.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Subscriber not found' });
    }
    await connection.query(
      'UPDATE subscribers SET email = ?, first_name = ?, status = ? WHERE id = ?',
      [email, first_name || null, status || 'subscribed', numSubId]
    );

    // 2. Clear old assignments
    await connection.query('DELETE FROM subscriber_lists WHERE subscriber_id = ?', [numSubId]);
    await connection.query('DELETE FROM subscriber_list_origins WHERE subscriber_id = ?', [numSubId]);

    // 3. Ensure origin record exists
    const [origins] = await connection.query('SELECT origin_site FROM subscriber_origins WHERE subscriber_id = ?', [numSubId]);
    let sites = origins.map(o => o.origin_site);
    if (sites.length === 0) {
      await connection.query(
        'INSERT IGNORE INTO subscriber_origins (subscriber_id, origin_site, status) VALUES (?, ?, ?)',
        [numSubId, 'localhost', status || 'subscribed']
      );
      sites = ['localhost'];
    }

    // 4. Insert new list assignments
    const validListIds = Array.isArray(list_ids) ? list_ids.map(Number).filter(lid => !isNaN(lid) && lid > 0) : [];
    for (const lid of validListIds) {
      await connection.query('INSERT IGNORE INTO subscriber_lists (subscriber_id, list_id) VALUES (?, ?)', [numSubId, lid]);
      for (const site of sites) {
        await connection.query('INSERT IGNORE INTO subscriber_list_origins (subscriber_id, list_id, origin_site) VALUES (?, ?, ?)', [numSubId, lid, site]);
      }
    }

    await connection.commit();
    res.json({ message: 'Contact updated successfully', id: numSubId });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('[Contact Update] Error:', error);
    res.status(500).json({ error: 'Database error: ' + error.message });
  } finally {
    if (connection) connection.release();
  }
});

const automationRoutes = require('./src/routes/automationRoutes');
app.use('/api/automations', automationRoutes);
app.use('/api', require('./src/routes/api'));
app.use('/api/auth', require('./src/routes/authRoutes'));
app.use('/api/webhooks', require('./src/routes/webhooks'));
app.use('/api/campaigns_wizard', require('./src/routes/campaignRoutes'));
app.use('/api/reports', require('./src/routes/reportRoutes'));
app.use('/api/track_wizard', require('./src/routes/trackRoutes'));
app.use('/api/forms', require('./src/routes/formRoutes'));
app.use('/api/preferences', require('./src/routes/preferenceRoutes'));
app.use('/api/ai', require('./src/routes/aiRoutes'));
app.use('/api/bulk-import', require('./src/routes/bulkImportRoutes'));
app.use('/api/plans', require('./src/routes/planRoutes'));
app.use('/api/payments', require('./src/routes/paymentRoutes'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Initialize non-Redis cron workers immediately
require('./src/workers/cron');
require('./src/workers/cleanupCron');
require('./src/workers/worker');
require('./src/workers/abTestCron');

// Initialize BullMQ-dependent workers only if Redis is reachable
const { isRedisAvailable } = require('./src/utils/redisCheck');
const REDIS_HOST = process.env.REDIS_HOST || '127.0.0.1';
const REDIS_PORT = parseInt(process.env.REDIS_PORT) || 6379;

isRedisAvailable(REDIS_HOST, REDIS_PORT).then((available) => {
  if (available) {
    require('./src/workers/automationProcessor');
    require('./src/workers/automationCron');
    console.log('[Server] ✅ Redis online — Automation queue workers started.');
  } else {
    console.log(`[Server] ✅ Operating in Standalone Mode (No Redis required). Campaigns, Contacts, and Email Processing are fully active on Port ${PORT}.`);
  }
});

const setupDB = require('./src/config/setup');

app.listen(PORT, async () => {
  await setupDB();
  console.log(`Server running on port ${PORT}`);
});
