const pool = require('../config/db');

/**
 * Dynamic Request Handler for Localhost & Live Multi-Tenant Domain Routing
 */
const domainRouter = async (req, res, next) => {
  try {
    const rawHost = req.headers['x-forwarded-host'] || req.headers.host || 'localhost';
    // Remove port numbers if present (e.g., localhost:5000 -> localhost)
    const hostname = rawHost.split(':')[0].toLowerCase().trim();

    // Check if request is running on Localhost / Local Development Environment
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname.endsWith('.local');

    if (isLocalhost) {
      req.environment = 'localhost';
      // Look up default company or local admin context
      const [compRows] = await pool.query("SELECT * FROM companies WHERE domain_name = 'localhost' OR id = 1 LIMIT 1");
      if (compRows.length > 0) {
        req.companyId = compRows[0].id;
        req.tenant = compRows[0];
      } else {
        req.companyId = 1;
        req.tenant = { id: 1, company_name: 'Bexcode Localhost', domain_name: 'localhost', plan_code: 'premium' };
      }
      return next();
    }

    // Live Multi-Tenant Custom Domain Lookup
    req.environment = 'live';
    const [domainRows] = await pool.query(
      `SELECT rd.*, c.id as tenant_company_id, c.company_name, c.plan_code
       FROM registered_domains rd
       LEFT JOIN companies c ON rd.company_id = c.id
       WHERE LOWER(rd.domain_name) = ? OR LOWER(c.domain_name) = ?
       LIMIT 1`,
      [hostname, hostname]
    );

    if (domainRows.length > 0) {
      const match = domainRows[0];
      req.companyId = match.company_id || match.tenant_company_id || 1;
      req.tenant = {
        id: req.companyId,
        company_name: match.company_name || match.company_name,
        domain_name: match.domain_name,
        plan_code: match.plan_code || 'free'
      };
      req.domainConfig = match;
    } else {
      // Fallback tenant for unmapped custom domains to avoid service interruption
      const [defaultComp] = await pool.query('SELECT * FROM companies LIMIT 1');
      const fallbackCompany = defaultComp[0] || { id: 1, company_name: 'Default Tenant', plan_code: 'free' };
      req.companyId = fallbackCompany.id;
      req.tenant = fallbackCompany;
    }

    next();
  } catch (error) {
    console.error('[domainRouter] Error resolving tenant domain:', error);
    // Fallback gracefully so request processing continues uninterrupted
    req.environment = 'localhost';
    req.companyId = 1;
    req.tenant = { id: 1, company_name: 'Fallback Tenant', plan_code: 'free' };
    next();
  }
};

module.exports = domainRouter;
