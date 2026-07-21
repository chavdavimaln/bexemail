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
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // For standard HTML forms


// Routes
app.get('/', (req, res) => {
  res.json({ message: 'BexEmail API is running successfully on port 5000!' });
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

const PORT = process.env.PORT || 5000;

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
    console.warn(`[Server] ⚠️  Redis not detected on ${REDIS_HOST}:${REDIS_PORT}. Automation queue workers are DISABLED. Campaigns, contacts, and all other features work normally.`);
  }
});

const setupDB = require('./src/config/setup');

app.listen(PORT, async () => {
  await setupDB();
  console.log(`Server running on port ${PORT}`);
});
