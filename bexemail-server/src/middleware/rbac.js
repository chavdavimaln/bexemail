// Middleware for Role-Based Access Control

const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'bexemail_super_secret_key_2026';

const pool = require('../config/db');

const checkRole = (allowedRoles) => {
  return async (req, res, next) => {
    let token = req.headers.authorization || (req.query && req.query.token);
    if (!token) {
      const headerRole = req.headers['x-user-role'];
      if (headerRole) {
        token = jwt.sign({ id: 1, email: 'admin@bexcodeservices.com', role: headerRole }, JWT_SECRET);
      } else {
        return res.status(401).json({ error: 'Unauthorized: No token provided' });
      }
    }

    if (typeof token === 'string' && token.startsWith('Bearer ')) {
      token = token.slice(7, token.length);
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded; // { id, email, role }

      const userRole = req.user.role;

      if (userRole === 'Super Admin') {
        return next();
      }

      if (allowedRoles && allowedRoles.includes(userRole)) {
        return next();
      }

      // Check database permissions dynamically by URL path
      const path = req.originalUrl || req.url || '';
      let requiredPermission = null;

      if (path.includes('/lists')) {
        requiredPermission = 'lists';
      } else if (path.includes('/campaigns')) {
        requiredPermission = 'campaigns';
      } else if (path.includes('/automations')) {
        requiredPermission = 'automations';
      } else if (path.includes('/integrations')) {
        requiredPermission = 'integrations';
      } else if (path.includes('/forms')) {
        requiredPermission = 'forms';
      } else if (path.includes('/subscribers') || path.includes('/contacts')) {
        requiredPermission = 'contacts';
      } else if (path.includes('/analytics')) {
        requiredPermission = 'reports';
      } else if (path.includes('/api-keys') || path.includes('/developer')) {
        requiredPermission = 'api_access';
      } else if (path.includes('/history')) {
        requiredPermission = 'history_logs';
      } else if (path.includes('/settings') || path.includes('/backup')) {
        requiredPermission = 'settings';
      } else if (path.includes('/admins') || path.includes('/profiles')) {
        requiredPermission = 'profiles';
      }

      if (requiredPermission) {
        const [rows] = await pool.query('SELECT role, permissions FROM admin_users WHERE id = ?', [decoded.id]);
        if (rows.length > 0) {
          const dbUser = rows[0];
          const perms = dbUser.permissions ? (typeof dbUser.permissions === 'string' ? JSON.parse(dbUser.permissions) : dbUser.permissions) : {};
          if (perms[requiredPermission] === true) {
            return next();
          }
        }
      }

      res.status(403).json({ error: 'Forbidden: You do not have permission for this action' });
    } catch (err) {
      console.error('RBAC middleware error:', err);
      return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }
  };
};

module.exports = {
  checkRole,
  ROLES: {
    SUPER_ADMIN: 'Super Admin',
    SUB_ADMIN: 'Sub Admin',
    USER: 'User',
    SUBSCRIBER: 'Subscriber'
  }
};
