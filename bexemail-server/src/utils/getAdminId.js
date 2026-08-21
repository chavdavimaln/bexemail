const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'bexemail_super_secret_key_2026';

/**
 * Helper utility to extract active admin_id for tenant isolation.
 * For Admin / Super Admin roles, the tenant admin_id is their own user ID (or assigned admin_id).
 * For Associate / Developer roles, the tenant admin_id is their parent Admin's user ID.
 */
function getAdminId(req) {
  try {
    if (!req) return 0;

    let user = req.user;
    if (typeof user === 'string') {
      try { user = JSON.parse(user); } catch (e) {}
    }

    // Decode Authorization Bearer header if req.user is not set or missing id
    if ((!user || !user.id) && req.headers) {
      let token = req.headers.authorization || req.headers.Authorization;
      if (token && typeof token === 'string') {
        if (token.startsWith('Bearer ')) token = token.slice(7).trim();
        try {
          const decoded = jwt.verify(token, JWT_SECRET);
          if (decoded && decoded.id) {
            user = decoded;
          }
        } catch (e) {}
      }
    }

    const headerUserId = req.headers ? (req.headers['x-user-id'] || req.headers['X-User-Id']) : null;
    const headerRole = req.headers ? (req.headers['x-user-role'] || req.headers['X-User-Role']) : null;
    const headerAdminId = req.headers ? (req.headers['x-admin-id'] || req.headers['X-Admin-Id']) : null;

    const userId = (user && user.id) ? Number(user.id) : (headerUserId ? Number(headerUserId) : null);
    const role = (user && user.role) ? user.role : (headerRole || 'Leader');
    const adminId = (user && user.admin_id) ? Number(user.admin_id) : (headerAdminId ? Number(headerAdminId) : null);

    if (!userId) return 1;

    if (role === 'Leader' || role === 'Admin' || role === 'Super Admin') {
      return adminId || userId;
    }
    return adminId || userId;
  } catch (e) {
    return 1;
  }
}

module.exports = getAdminId;
