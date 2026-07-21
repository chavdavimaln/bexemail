/**
 * redisCheck.js
 * 
 * Checks whether Redis is reachable before BullMQ tries to connect.
 * Returns a promise that resolves to `true` if Redis is up, `false` if not.
 * 
 * This avoids the infinite ECONNREFUSED spam that BullMQ emits when Redis
 * is not running in a local development environment.
 */
const net = require('net');

function isRedisAvailable(host, port, timeoutMs = 2000) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let resolved = false;

    const done = (result) => {
      if (!resolved) {
        resolved = true;
        socket.destroy();
        resolve(result);
      }
    };

    socket.setTimeout(timeoutMs);
    socket.on('connect', () => done(true));
    socket.on('error', () => done(false));
    socket.on('timeout', () => done(false));
    socket.connect(port, host);
  });
}

module.exports = { isRedisAvailable };
