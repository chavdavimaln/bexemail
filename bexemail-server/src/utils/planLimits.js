const pool = require('../config/db');

// Plan limits definition as per requirement:
// Free Plan: 1 admin, 1 domain, 1 smtp
// Essentials Plan: 3 admin, 3 domain, 3 smtp
// Standard Plan: 5 admin, 5 domain, 5 smtp
// Premium Plan: 10 admin, 10 domain, 10 smtp

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
    let planCode = 'standard'; // default
    let planName = 'Standard Plan';

    if (userId) {
      const [rows] = await pool.query(
        `SELECT us.plan_code, p.name as plan_name, p.seats_limit
         FROM user_subscriptions us
         LEFT JOIN plans p ON us.plan_code = p.plan_code
         WHERE us.user_id = ? AND us.status IN ('active', 'trialing')
         ORDER BY us.id DESC LIMIT 1`,
        [userId]
      );
      if (rows.length > 0 && rows[0].plan_code) {
        planCode = rows[0].plan_code.toLowerCase().trim();
        planName = rows[0].plan_name || (planCode.charAt(0).toUpperCase() + planCode.slice(1) + ' Plan');
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

    const limits = PLAN_LIMITS_MAP[planCode] || PLAN_LIMITS_MAP['standard'];
    return {
      planCode,
      planName: limits.name || planName,
      maxAdmins: limits.admins,
      maxDomains: limits.domains,
      maxSmtps: limits.smtps
    };
  } catch (error) {
    console.error('Error in getUserPlanLimits:', error);
    return {
      planCode: 'standard',
      planName: 'Standard Plan',
      maxAdmins: 5,
      maxDomains: 5,
      maxSmtps: 5
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
    if (userId) {
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
      smtpCount: 1,
      smtpLimit: 5,
      domainCount: 1,
      domainLimit: 5,
      adminCount: 1,
      adminLimit: 5
    };
  }
}

module.exports = {
  PLAN_LIMITS_MAP,
  getUserPlanLimits,
  getSystemLimitsStatus
};
