const pool = require('../config/db');

// Get all registered domains for the current admin context
exports.getDomains = async (req, res) => {
  try {
    const getAdminId = require('../utils/getAdminId');
    const adminId = getAdminId(req);

    const [rows] = await pool.query('SELECT * FROM registered_domains WHERE admin_id = ? OR admin_id IS NULL ORDER BY is_primary DESC, id ASC', [adminId]);

    // Strict single-primary enforcement check
    const primaryRows = rows.filter(r => r.is_primary === 1 || r.is_primary === true);
    if (primaryRows.length > 1) {
      const keepPrimaryId = primaryRows[0].id;
      await pool.query('UPDATE registered_domains SET is_primary = 0 WHERE admin_id = ? OR admin_id IS NULL', [adminId]);
      await pool.query('UPDATE registered_domains SET is_primary = 1 WHERE id = ?', [keepPrimaryId]);
      rows.forEach(r => {
        r.is_primary = (r.id === keepPrimaryId) ? 1 : 0;
      });
    }

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

    const shouldBePrimary = (is_primary === true || is_primary === 1 || totalCount === 0) ? 1 : 0;

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
      domain_name: cleanDomain,
      is_primary: shouldBePrimary,
      status: 'active'
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
    const getAdminId = require('../utils/getAdminId');
    const adminId = getAdminId(req);
    const { company_name, domain_name, support_email, is_primary, status } = req.body;

    if (!company_name || !domain_name) {
      return res.status(400).json({ error: 'Company Name and Domain Name are required' });
    }

    const cleanDomain = domain_name.trim().toLowerCase();

    // Check if domain name belongs to another ID
    const [existing] = await pool.query('SELECT id FROM registered_domains WHERE LOWER(domain_name) = ? AND id != ?', [cleanDomain, id]);
    if (existing.length > 0) {
      return res.status(400).json({ error: `Domain '${cleanDomain}' is already registered by another entry.` });
    }

    if (is_primary === 1 || is_primary === true) {
      await pool.query('UPDATE registered_domains SET is_primary = 0 WHERE admin_id = ?', [adminId]);
    }

    const domainStatus = status || 'active';

    await pool.query(
      'UPDATE registered_domains SET company_name = ?, domain_name = ?, support_email = ?, is_primary = ?, status = ? WHERE id = ?',
      [company_name.trim(), cleanDomain, support_email ? support_email.trim() : null, (is_primary === 1 || is_primary === true) ? 1 : 0, domainStatus, id]
    );

    res.json({ message: 'Domain updated successfully' });
  } catch (error) {
    console.error('Update domain error:', error);
    res.status(500).json({ error: 'Database error: ' + error.message });
  }
};

// Set single domain as Primary
exports.setPrimaryDomain = async (req, res) => {
  try {
    const { id } = req.params;
    const getAdminId = require('../utils/getAdminId');
    const adminId = getAdminId(req);

    const [domainRows] = await pool.query('SELECT * FROM registered_domains WHERE id = ?', [id]);
    if (domainRows.length === 0) {
      return res.status(404).json({ error: 'Domain not found' });
    }

    const targetAdminId = domainRows[0].admin_id || adminId;

    // Unset is_primary = 0 on ALL domains for this context, then set target domain to 1
    await pool.query('UPDATE registered_domains SET is_primary = 0 WHERE admin_id = ?', [targetAdminId]);
    await pool.query('UPDATE registered_domains SET is_primary = 1, status = "active" WHERE id = ?', [id]);

    res.json({ message: 'Primary domain updated successfully', id: Number(id) });
  } catch (error) {
    console.error('Set primary domain error:', error);
    res.status(500).json({ error: 'Database error: ' + error.message });
  }
};

// Toggle Active / Deactive Status for a Domain
exports.toggleDomainStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const [domainRows] = await pool.query('SELECT * FROM registered_domains WHERE id = ?', [id]);
    if (domainRows.length === 0) {
      return res.status(404).json({ error: 'Domain not found' });
    }

    const currentDomain = domainRows[0];
    const isCurrentlyActive = currentDomain.status === 'active';
    const newStatusText = isCurrentlyActive ? 'inactive' : 'active';

    // If attempting to deactivate the primary domain, prevent deactivation unless another active domain exists
    if (currentDomain.is_primary === 1 && isCurrentlyActive) {
      const [otherActive] = await pool.query('SELECT id FROM registered_domains WHERE id != ? AND status = "active" LIMIT 1', [id]);
      if (otherActive.length > 0) {
        // Promote other active domain to primary
        await pool.query('UPDATE registered_domains SET is_primary = 1 WHERE id = ?', [otherActive[0].id]);
        await pool.query('UPDATE registered_domains SET is_primary = 0, status = "inactive" WHERE id = ?', [id]);
      } else {
        return res.status(400).json({
          error: 'Cannot deactivate primary domain. At least one domain must remain active and primary in the system.'
        });
      }
    } else {
      await pool.query('UPDATE registered_domains SET status = ? WHERE id = ?', [newStatusText, id]);
    }

    res.json({
      message: `Domain status updated to ${newStatusText}`,
      id: Number(id),
      status: newStatusText
    });
  } catch (error) {
    console.error('Toggle domain status error:', error);
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

    const [target] = await pool.query('SELECT * FROM registered_domains WHERE id = ?', [id]);
    if (target.length === 0) {
      return res.status(404).json({ error: 'Domain not found' });
    }

    const wasPrimary = target[0].is_primary === 1;
    const adminId = target[0].admin_id || 1;

    await pool.query('DELETE FROM registered_domains WHERE id = ?', [id]);

    // If the deleted domain was primary, promote the remaining first domain to primary
    if (wasPrimary) {
      const [remaining] = await pool.query('SELECT id FROM registered_domains WHERE admin_id = ? ORDER BY id ASC LIMIT 1', [adminId]);
      if (remaining.length > 0) {
        await pool.query('UPDATE registered_domains SET is_primary = 1, status = "active" WHERE id = ?', [remaining[0].id]);
      }
    }

    res.json({ message: 'Domain deleted successfully' });
  } catch (error) {
    console.error('Delete domain error:', error);
    res.status(500).json({ error: 'Database error: ' + error.message });
  }
};
