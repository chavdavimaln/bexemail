const pool = require('../config/db');
const getAdminId = require('../utils/getAdminId');
const { getUserPlanLimits, checkSmtpRequirement } = require('../utils/planLimits');

/**
 * Middleware to check Domain registration limit against current Plan
 */
const checkDomainLimit = async (req, res, next) => {
  try {
    const adminId = getAdminId(req);
    const companyId = req.companyId || req.tenant?.id || null;

    const limits = await getUserPlanLimits(adminId, companyId);
    
    let countQuery = 'SELECT COUNT(*) as count FROM registered_domains WHERE admin_id = ?';
    let queryParams = [adminId];

    if (companyId) {
      countQuery = 'SELECT COUNT(*) as count FROM registered_domains WHERE company_id = ?';
      queryParams = [companyId];
    }

    const [countRows] = await pool.query(countQuery, queryParams);
    const currentCount = countRows[0]?.count || 0;

    if (currentCount >= limits.maxDomains) {
      return res.status(403).json({
        error: `Domain Limit Exceeded: Your current ${limits.planName} allows up to ${limits.maxDomains} domain(s). Currently registered: ${currentCount}. Please upgrade your subscription plan to register additional domains.`,
        limitExceeded: true,
        limitType: 'domains',
        currentCount,
        maxLimit: limits.maxDomains,
        planName: limits.planName
      });
    }

    req.planLimits = limits;
    next();
  } catch (error) {
    console.error('[planCheck] Domain limit error:', error);
    next(); // Pass through on unexpected errors to maintain resilience
  }
};

/**
 * Middleware to check SMTP Sender binding limit against current Plan
 */
const checkSmtpLimit = async (req, res, next) => {
  try {
    const adminId = getAdminId(req);
    const companyId = req.companyId || req.tenant?.id || null;

    const limits = await getUserPlanLimits(adminId, companyId);

    let countQuery = 'SELECT COUNT(*) as count FROM senders WHERE admin_id = ?';
    let queryParams = [adminId];

    if (companyId) {
      countQuery = 'SELECT COUNT(*) as count FROM senders WHERE company_id = ?';
      queryParams = [companyId];
    }

    const [countRows] = await pool.query(countQuery, queryParams);
    const currentCount = countRows[0]?.count || 0;

    if (currentCount >= limits.maxSmtps) {
      return res.status(403).json({
        error: `SMTP Limit Exceeded: Your current ${limits.planName} allows up to ${limits.maxSmtps} SMTP binding(s). Currently configured: ${currentCount}. Please upgrade your subscription plan to add more SMTP senders.`,
        limitExceeded: true,
        limitType: 'smtps',
        currentCount,
        maxLimit: limits.maxSmtps,
        planName: limits.planName
      });
    }

    req.planLimits = limits;
    next();
  } catch (error) {
    console.error('[planCheck] SMTP limit error:', error);
    next();
  }
};

/**
 * Middleware to check Admin / Seat limit against current Plan
 */
const checkSeatLimit = async (req, res, next) => {
  try {
    const adminId = getAdminId(req);
    const companyId = req.companyId || req.tenant?.id || null;

    const limits = await getUserPlanLimits(adminId, companyId);

    let countQuery = "SELECT COUNT(*) as count FROM admin_users WHERE (id = ? OR admin_id = ?)";
    let queryParams = [adminId, adminId];

    if (companyId) {
      countQuery = 'SELECT COUNT(*) as count FROM admin_users WHERE company_id = ?';
      queryParams = [companyId];
    }

    const [countRows] = await pool.query(countQuery, queryParams);
    const currentCount = countRows[0]?.count || 0;

    if (currentCount >= limits.maxAdmins) {
      return res.status(403).json({
        error: `Seat Limit Exceeded: Your current ${limits.planName} allows up to ${limits.maxAdmins} team seat(s). Currently active: ${currentCount}. Please upgrade your subscription to invite more team members.`,
        limitExceeded: true,
        limitType: 'seats',
        currentCount,
        maxLimit: limits.maxAdmins,
        planName: limits.planName
      });
    }

    req.planLimits = limits;
    next();
  } catch (error) {
    console.error('[planCheck] Seat limit error:', error);
    next();
  }
};

/**
 * Middleware to verify that at least one SMTP sender exists before sending campaigns
 */
const checkSmtpExists = async (req, res, next) => {
  try {
    const adminId = getAdminId(req);
    const companyId = req.companyId || req.tenant?.id || null;

    const hasSmtp = await checkSmtpRequirement(adminId, companyId);

    if (!hasSmtp) {
      return res.status(400).json({
        error: 'No active SMTP sender configured. You must configure at least one SMTP sender before launching or dispatching email campaigns.',
        smtpRequired: true
      });
    }

    next();
  } catch (error) {
    console.error('[planCheck] SMTP existence check error:', error);
    next();
  }
};

module.exports = {
  checkDomainLimit,
  checkSmtpLimit,
  checkSeatLimit,
  checkSmtpExists
};
