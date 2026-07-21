/**
 * redisConnection.js
 * 
 * Shared, graceful IORedis connection for BullMQ.
 * - Uses lazyConnect to avoid immediately connecting on require()
 * - retryStrategy returns null to stop infinite retry spam
 * - Error handler suppresses ECONNREFUSED log noise when Redis is offline
 */
const IORedis = require('ioredis');

let warnedOnce = false;

const connection = new IORedis({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT) || 6379,
  maxRetriesPerRequest: null,
  enableOfflineQueue: false,
  lazyConnect: true,
  retryStrategy: () => null, // Stop all retries immediately
});

// Handle errors on the shared connection itself
connection.on('error', (err) => {
  if (err.code === 'ECONNREFUSED') {
    if (!warnedOnce) {
      warnedOnce = true;
      console.warn('[Redis] ⚠️  Redis not available on port 6379. BullMQ automation features are DISABLED. All other features (campaigns, analytics, contacts) work normally.');
    }
    return; // Suppress further ECONNREFUSED noise
  }
  console.error('[Redis] Unexpected error:', err.message);
});

// Attempt initial connection (will fail gracefully if Redis is offline)
connection.connect().catch(() => {});

module.exports = connection;


