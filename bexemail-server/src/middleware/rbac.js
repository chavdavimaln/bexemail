// Middleware for Role-Based Access Control

const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'bexemail_super_secret_key_2026';

const checkRole = (allowedRoles) => {
  return (req, res, next) => {
    let token = req.headers.authorization;
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }

    if (token.startsWith('Bearer ')) {
      token = token.slice(7, token.length);
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded; // { id, email, role }

      const userRole = req.user.role;

      if (!allowedRoles || allowedRoles.length === 0 || allowedRoles.includes(userRole) || userRole === 'Super Admin') {
        next(); // User is allowed
      } else {
        res.status(403).json({ error: 'Forbidden: You do not have permission for this action' });
      }
    } catch (err) {
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
