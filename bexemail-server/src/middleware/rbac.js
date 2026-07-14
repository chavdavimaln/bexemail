// Middleware for Role-Based Access Control

const checkRole = (allowedRoles) => {
  return (req, res, next) => {
    // In a real app, you would extract the user from the JWT token:
    // const user = req.user;
    
    // For this demonstration, we assume user is passed in headers (mocking auth)
    // Normally, this comes from a verified JWT
    const userRole = req.headers['x-user-role'] || 'Super Admin'; // Default mock for testing

    if (!userRole) {
      return res.status(401).json({ error: 'Unauthorized: No role found' });
    }

    if (allowedRoles.includes(userRole) || userRole === 'Super Admin') {
      next(); // User is allowed
    } else {
      res.status(403).json({ error: 'Forbidden: You do not have permission for this action' });
    }
  };
};

module.exports = {
  checkRole,
  ROLES: {
    SUPER_ADMIN: 'Super Admin',
    CAMPAIGN_MANAGER: 'Campaign Manager',
    AUDIENCE_MANAGER: 'Audience Manager'
  }
};
