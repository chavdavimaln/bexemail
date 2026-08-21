const pool = require('../config/db');

// Plan limits definition per tier:
// Free Plan: 1 seat (1 Admin), 1 domain, 1 SMTP server
// Essentials Plan: 3 seats (1 Admin + 2 Associates/Developers), 3 domains, 3 SMTP servers
// Standard Plan: 5 seats (1 Admin + 4 Associates/Developers), 5 domains, 5 SMTP servers
// Premium Plan: 10 seats (1 Admin + 9 Associates/Developers), 10 domains, 10 SMTP servers

const PLAN_LIMITS_MAP = {
  free: { admins: 1, domains: 1, smtps: 1, name: 'Free Plan' },
  essentials: { admins: 3, domains: 3, smtps: 3, name: 'Essentials Plan' },
  standard: { admins: 5, domains: 5, smtps: 5, name: 'Standard Plan' },
  premium: { admins: 10, domains: 10, smtps: 10, name: 'Premium Plan' }
};

/**
 * Gets active plan details and dynamic numerical limits for a given user, company, or system context
 * @param {number} userId 
 * @param {number} companyId 
 */
async function getUserPlanLimits(userId, companyId = null) {
  try {
    let planCode = null;
    let planName = null;
    let customSeats = null;
    let customDomains = null;
    let customSmtps = null;

    // 1. Fetch user subscription & active plan directly from DB
    if (userId) {
      const [rows] = await pool.query(
        `SELECT us.plan_code, p.name as plan_name, p.seats_limit, p.max_domains, p.max_smtps,
                us.custom_seats_limit, us.custom_admins_limit, us.custom_domains_limit, us.custom_smtps_limit,
                au.custom_seats_limit as user_custom_seats, au.custom_domains_limit as user_custom_domains, au.custom_smtps_limit as user_custom_smtps
         FROM admin_users au
         LEFT JOIN user_subscriptions us ON au.id = us.user_id AND us.status IN ('active', 'trialing')
         LEFT JOIN plans p ON (us.plan_id = p.id OR (us.plan_code IS NOT NULL AND LOWER(p.plan_code) = LOWER(us.plan_code)))
         WHERE au.id = ?
         ORDER BY us.id DESC LIMIT 1`,
        [userId]
      );

      if (rows.length > 0 && rows[0].plan_code) {
        planCode = String(rows[0].plan_code).toLowerCase().trim();
        planName = rows[0].plan_name;

        customSeats = rows[0].user_custom_seats || rows[0].custom_seats_limit || rows[0].custom_admins_limit;
        customDomains = rows[0].user_custom_domains || rows[0].custom_domains_limit;
        customSmtps = rows[0].user_custom_smtps || rows[0].custom_smtps_limit;
      }
    }

    // 2. If no subscription found, check company plan code
    if (!planCode && companyId) {
      const [cRows] = await pool.query('SELECT plan_code FROM companies WHERE id = ?', [companyId]);
      if (cRows.length > 0 && cRows[0].plan_code) {
        planCode = String(cRows[0].plan_code).toLowerCase().trim();
      }
    }

    if (!planCode) planCode = 'free';

    // Resolve plan tier definition from PLAN_LIMITS_MAP
    const tier = PLAN_LIMITS_MAP[planCode] || PLAN_LIMITS_MAP['free'];
    const resolvedName = tier.name || (planCode.charAt(0).toUpperCase() + planCode.slice(1) + ' Plan');

    return {
      planCode,
      planName: resolvedName,
      maxAdmins: customSeats !== null && customSeats !== undefined ? Number(customSeats) : tier.admins,
      maxDomains: customDomains !== null && customDomains !== undefined ? Number(customDomains) : tier.domains,
      maxSmtps: customSmtps !== null && customSmtps !== undefined ? Number(customSmtps) : tier.smtps
    };
  } catch (error) {
    console.error('Error in getUserPlanLimits:', error);
    return {
      planCode: 'free',
      planName: 'Free Plan',
      maxAdmins: 1,
      maxDomains: 1,
      maxSmtps: 1
    };
  }
}

/**
 * Gets real-time system counts & comparison flags
 * @param {number} userId 
 * @param {number} companyId 
 */
async function getSystemLimitsStatus(userId, companyId = null) {
  try {
    const limits = await getUserPlanLimits(userId, companyId);

    let senderRows, domainRows, adminRows;
    if (companyId) {
      [senderRows] = await pool.query('SELECT COUNT(*) as count FROM senders WHERE company_id = ?', [companyId]);
      [domainRows] = await pool.query('SELECT COUNT(*) as count FROM registered_domains WHERE company_id = ?', [companyId]);
      [adminRows] = await pool.query('SELECT COUNT(*) as count FROM admin_users WHERE company_id = ?', [companyId]);
    } else if (userId && userId !== 0) {
      [senderRows] = await pool.query('SELECT COUNT(*) as count FROM senders WHERE admin_id = ?', [userId]);
      [domainRows] = await pool.query('SELECT COUNT(*) as count FROM registered_domains WHERE admin_id = ?', [userId]);
      [adminRows] = await pool.query('SELECT COUNT(*) as count FROM admin_users WHERE id = ? OR admin_id = ?', [userId, userId]);
    } else {
      [senderRows] = await pool.query('SELECT COUNT(*) as count FROM senders');
      [domainRows] = await pool.query('SELECT COUNT(*) as count FROM registered_domains');
      [adminRows] = await pool.query("SELECT COUNT(*) as count FROM admin_users WHERE role IN ('Admin', 'Super Admin')");
    }

    const smtpCount = senderRows[0]?.count || 0;
    const domainCount = domainRows[0]?.count || 0;
    const adminCount = adminRows[0]?.count || 0;

    return {
      success: true,
      planCode: limits.planCode,
      planName: limits.planName,
      hasSmtp: smtpCount > 0,
      smtpCount,
      smtpLimit: limits.maxSmtps,
      hasDomain: domainCount > 0,
      domainCount,
      domainLimit: limits.maxDomains,
      adminCount,
      adminLimit: limits.maxAdmins
    };
  } catch (error) {
    console.error('Error in getSystemLimitsStatus:', error);
    return {
      success: false,
      hasSmtp: true,
      hasDomain: true,
      smtpCount: 0,
      smtpLimit: 1,
      domainCount: 0,
      domainLimit: 1,
      adminCount: 1,
      adminLimit: 1
    };
  }
}

/**
 * Validates that an active SMTP configuration exists for the given admin/user/company context before sending email
 * @param {number} userId 
 * @param {number} companyId 
 */
async function checkSmtpRequirement(userId, companyId = null) {
  try {
    let countRows;
    if (companyId) {
      [countRows] = await pool.query('SELECT COUNT(*) as count FROM senders WHERE company_id = ? AND (is_active = 1 OR is_active IS NULL)', [companyId]);
    } else if (userId) {
      [countRows] = await pool.query(
        'SELECT COUNT(*) as count FROM senders WHERE admin_id = ? AND (is_active = 1 OR is_active IS NULL)',
        [userId]
      );
    } else {
      [countRows] = await pool.query('SELECT COUNT(*) as count FROM senders WHERE is_active = 1 OR is_active IS NULL');
    }
    const smtpCount = countRows[0]?.count || 0;
    return smtpCount > 0;
  } catch (err) {
    console.error('Error checking SMTP requirement:', err);
    return true;
  }
}

module.exports = {
  PLAN_LIMITS_MAP,
  getUserPlanLimits,
  getSystemLimitsStatus,
  checkSmtpRequirement
};
