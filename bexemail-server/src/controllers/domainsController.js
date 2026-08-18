const pool = require('../config/db');

// Get all registered domains for the current admin context
exports.getDomains = async (req, res) => {
  try {
    const getAdminId = require('../utils/getAdminId');
    const adminId = getAdminId(req);

    const [rows] = await pool.query('SELECT * FROM registered_domains WHERE admin_id = ? ORDER BY is_primary DESC, id ASC', [adminId]);
    res.json(rows);
  } catch (error) {
    console.error('Fetch domains error:', error);
    res.status(500).json({ error: 'Database error: ' + error.message });
  }
};

// Create new registered domain
exports.createDomain = async (req, res) => {
  try {
    const getAdminId = require('../utils/getAdminId');
    const adminId = getAdminId(req);

    const { company_name, domain_name, support_email, is_primary } = req.body;

    if (!company_name || !domain_name) {
      return res.status(400).json({ error: 'Company Name and Domain Name are required' });
    }

    const cleanDomain = domain_name.trim().toLowerCase();

    // Check plan limit for domain registration
    const { getUserPlanLimits } = require('../utils/planLimits');
    const limits = await getUserPlanLimits(adminId);
    const [countRows] = await pool.query('SELECT COUNT(*) as count FROM registered_domains WHERE admin_id = ?', [adminId]);
    const totalCount = countRows[0]?.count || 0;

    if (totalCount >= limits.maxDomains) {
      return res.status(400).json({
        error: `Your current ${limits.planName} allows a maximum of ${limits.maxDomains} domain registration(s). Please upgrade your CRM plan to register more domains.`
      });
    }

    // Check if domain already exists for this admin
    const [existing] = await pool.query('SELECT id FROM registered_domains WHERE LOWER(domain_name) = ? AND admin_id = ?', [cleanDomain, adminId]);
    if (existing.length > 0) {
      return res.status(400).json({ error: `Domain '${cleanDomain}' is already registered.` });
    }

    const shouldBePrimary = is_primary || totalCount === 0 ? 1 : 0;

    if (shouldBePrimary === 1) {
      await pool.query('UPDATE registered_domains SET is_primary = 0 WHERE admin_id = ?', [adminId]);
    }

    const [result] = await pool.query(
      'INSERT INTO registered_domains (company_name, domain_name, support_email, is_primary, status, dkim_status, spf_status, dmarc_status, admin_id) VALUES (?, ?, ?, ?, "active", "valid", "valid", "valid", ?)',
      [company_name.trim(), cleanDomain, support_email ? support_email.trim() : null, shouldBePrimary, adminId]
    );

    res.status(201).json({
      message: 'Domain registered successfully',
      id: result.insertId,
      domain_name: cleanDomain
    });
  } catch (error) {
    console.error('Create domain error:', error);
    res.status(500).json({ error: 'Database error: ' + error.message });
  }
};

// Update domain details
exports.updateDomain = async (req, res) => {
  try {
    const { id } = req.params;
    const { company_name, domain_name, support_email, is_primary } = req.body;

    if (!company_name || !domain_name) {
      return res.status(400).json({ error: 'Company Name and Domain Name are required' });
    }

    const cleanDomain = domain_name.trim().toLowerCase();

    // Check if domain name belongs to another ID
    const [existing] = await pool.query('SELECT id FROM registered_domains WHERE LOWER(domain_name) = ? AND id != ?', [cleanDomain, id]);
    if (existing.length > 0) {
      return res.status(400).json({ error: `Domain '${cleanDomain}' is already registered by another entry.` });
    }

    if (is_primary) {
      await pool.query('UPDATE registered_domains SET is_primary = 0');
    }

    await pool.query(
      'UPDATE registered_domains SET company_name = ?, domain_name = ?, support_email = ?, is_primary = ? WHERE id = ?',
      [company_name.trim(), cleanDomain, support_email ? support_email.trim() : null, is_primary ? 1 : 0, id]
    );

    res.json({ message: 'Domain updated successfully' });
  } catch (error) {
    console.error('Update domain error:', error);
    res.status(500).json({ error: 'Database error: ' + error.message });
  }
};

// Set a domain as primary
exports.setPrimaryDomain = async (req, res) => {
  try {
    const { id } = req.params;

    const [domainRows] = await pool.query('SELECT id FROM registered_domains WHERE id = ?', [id]);
    if (domainRows.length === 0) {
      return res.status(404).json({ error: 'Domain not found' });
    }

    await pool.query('UPDATE registered_domains SET is_primary = 0');
    await pool.query('UPDATE registered_domains SET is_primary = 1 WHERE id = ?', [id]);

    res.json({ message: 'Primary domain updated successfully' });
  } catch (error) {
    console.error('Set primary domain error:', error);
    res.status(500).json({ error: 'Database error: ' + error.message });
  }
};

// Delete domain registration
exports.deleteDomain = async (req, res) => {
  try {
    const { id } = req.params;

    const [countRows] = await pool.query('SELECT COUNT(*) as count FROM registered_domains');
    const totalCount = countRows[0]?.count || 0;

    if (totalCount <= 1) {
      return res.status(400).json({ error: 'Cannot delete domain. At least one domain must remain registered in the system.' });
    }

    const [target] = await pool.query('SELECT is_primary FROM registered_domains WHERE id = ?', [id]);
    if (target.length === 0) {
      return res.status(404).json({ error: 'Domain not found' });
    }

    const wasPrimary = target[0].is_primary === 1;

    await pool.query('DELETE FROM registered_domains WHERE id = ?', [id]);

    // If the deleted domain was primary, promote the remaining first domain to primary
    if (wasPrimary) {
      const [remaining] = await pool.query('SELECT id FROM registered_domains ORDER BY id ASC LIMIT 1');
      if (remaining.length > 0) {
        await pool.query('UPDATE registered_domains SET is_primary = 1 WHERE id = ?', [remaining[0].id]);
      }
    }

    res.json({ message: 'Domain deleted successfully' });
  } catch (error) {
    console.error('Delete domain error:', error);
    res.status(500).json({ error: 'Database error: ' + error.message });
  }
};
