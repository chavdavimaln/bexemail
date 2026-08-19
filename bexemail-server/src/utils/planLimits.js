const pool = require('../config/db');

// Plan limits definition as per requirement:
// Free Plan: 1 admin (seats), 1 domain, 1 smtp
// Essentials Plan: 3 admin (seats), 3 domain, 3 smtp
// Standard Plan: 5 admin (seats), 5 domain, 5 smtp
// Premium Plan: 10 admin (seats), 10 domain, 10 smtp

const PLAN_LIMITS_MAP = {
  free: { admins: 1, domains: 1, smtps: 1, name: 'Free Plan' },
  essentials: { admins: 3, domains: 3, smtps: 3, name: 'Essentials Plan' },
  standard: { admins: 5, domains: 5, smtps: 5, name: 'Standard Plan' },
  premium: { admins: 10, domains: 10, smtps: 10, name: 'Premium Plan' }
};

/**
 * Gets active plan details and numerical limits for a given user or system context
 * @param {number} userId 
 */
async function getUserPlanLimits(userId) {
  try {
    let planCode = 'free';
    let planName = 'Free Plan';
    let customSeats = null;
    let customDomains = null;
    let customSmtps = null;

    if (userId) {
      const [rows] = await pool.query(
        `SELECT us.plan_code, p.name as plan_name, p.seats_limit,
                us.custom_seats_limit, us.custom_admins_limit,
                au.custom_seats_limit as user_custom_seats
         FROM admin_users au
         LEFT JOIN user_subscriptions us ON au.id = us.user_id AND us.status IN ('active', 'trialing')
         LEFT JOIN plans p ON (us.plan_id = p.id OR (us.plan_code IS NOT NULL AND p.plan_code = us.plan_code))
         WHERE au.id = ?
         ORDER BY us.id DESC LIMIT 1`,
        [userId]
      );
      if (rows.length > 0 && rows[0].plan_code) {
        planCode = rows[0].plan_code.toLowerCase().trim();
        planName = rows[0].plan_name || (planCode.charAt(0).toUpperCase() + planCode.slice(1) + ' Plan');
        customSeats = rows[0].user_custom_seats || rows[0].custom_seats_limit || rows[0].custom_admins_limit || null;
      } else {
        // Check admin user role or plan field directly
        const [uRows] = await pool.query('SELECT role, plan FROM admin_users WHERE id = ?', [userId]);
        if (uRows.length > 0 && uRows[0].plan) {
          planCode = String(uRows[0].plan).toLowerCase().trim();
          planName = planCode.charAt(0).toUpperCase() + planCode.slice(1) + ' Plan';
        }
      }
    } else {
      // Fallback: check latest active subscription in system
      const [rows] = await pool.query(
        `SELECT us.plan_code, p.name as plan_name
         FROM user_subscriptions us
         LEFT JOIN plans p ON us.plan_code = p.plan_code
         WHERE us.status IN ('active', 'trialing')
         ORDER BY us.id DESC LIMIT 1`
      );
      if (rows.length > 0 && rows[0].plan_code) {
        planCode = rows[0].plan_code.toLowerCase().trim();
        planName = rows[0].plan_name || (planCode.charAt(0).toUpperCase() + planCode.slice(1) + ' Plan');
      }
    }

    const limits = PLAN_LIMITS_MAP[planCode] || PLAN_LIMITS_MAP['free'];
    return {
      planCode,
      planName: limits.name || planName,
      maxAdmins: customSeats || limits.admins,
      maxDomains: customDomains || limits.domains,
      maxSmtps: customSmtps || limits.smtps
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
 */
async function getSystemLimitsStatus(userId) {
  try {
    const limits = await getUserPlanLimits(userId);

    let senderRows, domainRows, adminRows;
    if (userId && userId !== 0) {
      [senderRows] = await pool.query('SELECT COUNT(*) as count FROM senders WHERE admin_id = ? OR admin_id IS NULL OR is_default = 1', [userId]);
      [domainRows] = await pool.query('SELECT COUNT(*) as count FROM registered_domains WHERE admin_id = ? OR admin_id IS NULL OR is_primary = 1', [userId]);
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
 * Validates that an active SMTP configuration exists for the given admin/user context before sending email
 * @param {number} userId 
 */
async function checkSmtpRequirement(userId) {
  try {
    let countRows;
    if (userId) {
      [countRows] = await pool.query(
        'SELECT COUNT(*) as count FROM senders WHERE admin_id = ? OR is_default = 1',
        [userId]
      );
    } else {
      [countRows] = await pool.query('SELECT COUNT(*) as count FROM senders');
    }
    const smtpCount = countRows[0]?.count || 0;
    return smtpCount > 0;
  } catch (err) {
    console.error('Error checking SMTP requirement:', err);
    return true; // fallback to true on DB error to avoid breaking existing flows unexpectedly
  }
}

module.exports = {
  PLAN_LIMITS_MAP,
  getUserPlanLimits,
  getSystemLimitsStatus,
  checkSmtpRequirement
};

