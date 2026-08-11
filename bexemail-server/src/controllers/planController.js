const pool = require('../config/db');

// GET /api/plans - Public endpoint to retrieve all active plans
exports.getPlans = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM plans ORDER BY id ASC');
    const plans = rows.map(r => {
      let feats = r.features;
      if (typeof feats === 'string') {
        try { feats = JSON.parse(feats); } catch(e) {}
      }
      return {
        ...r,
        features: Array.isArray(feats) ? feats : []
      };
    });
    res.json(plans);
  } catch (err) {
    console.error('Error fetching plans:', err);
    res.status(500).json({ error: 'Failed to fetch marketing plans' });
  }
};

// POST /api/plans - Add a new marketing plan
exports.addPlan = async (req, res) => {
  try {
    const {
      plan_code,
      name,
      tagline,
      monthly_price,
      discount_percent,
      trial_days,
      contacts_limit,
      emails_limit,
      is_popular,
      features
    } = req.body;

    if (!name || !plan_code) {
      return res.status(400).json({ error: 'Plan name and plan_code are required' });
    }

    const codeSlug = plan_code.toLowerCase().trim().replace(/[^a-z0-9_]/g, '_');

    // Check duplicate code
    const [existing] = await pool.query('SELECT id FROM plans WHERE plan_code = ?', [codeSlug]);
    if (existing.length > 0) {
      return res.status(400).json({ error: `Plan with code '${codeSlug}' already exists.` });
    }

    const featsStr = Array.isArray(features) ? JSON.stringify(features) : JSON.stringify([]);

    const [result] = await pool.query(`
      INSERT INTO plans (plan_code, name, tagline, monthly_price, discount_percent, trial_days, contacts_limit, emails_limit, is_popular, features)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      codeSlug,
      name.trim(),
      tagline || '',
      monthly_price !== undefined ? Number(monthly_price) : 0,
      discount_percent !== undefined ? Number(discount_percent) : 0,
      trial_days !== undefined ? Number(trial_days) : 14,
      contacts_limit !== undefined ? Number(contacts_limit) : 500,
      emails_limit !== undefined ? Number(emails_limit) : 5000,
      is_popular ? 1 : 0,
      featsStr
    ]);

    const [newPlan] = await pool.query('SELECT * FROM plans WHERE id = ?', [result.insertId]);
    res.status(201).json({ message: 'Plan added successfully', plan: newPlan[0] });
  } catch (err) {
    console.error('Error adding plan:', err);
    res.status(500).json({ error: 'Failed to add plan: ' + err.message });
  }
};

// PUT /api/plans/:id - Update an existing marketing plan
exports.updatePlan = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      tagline,
      monthly_price,
      discount_percent,
      trial_days,
      contacts_limit,
      emails_limit,
      is_popular,
      features
    } = req.body;

    const [existing] = await pool.query('SELECT * FROM plans WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    const current = existing[0];
    const updatedFeatures = Array.isArray(features) ? JSON.stringify(features) : (typeof features === 'string' ? features : current.features);

    await pool.query(`
      UPDATE plans SET
        name = COALESCE(?, name),
        tagline = COALESCE(?, tagline),
        monthly_price = COALESCE(?, monthly_price),
        discount_percent = COALESCE(?, discount_percent),
        trial_days = COALESCE(?, trial_days),
        contacts_limit = COALESCE(?, contacts_limit),
        emails_limit = COALESCE(?, emails_limit),
        is_popular = COALESCE(?, is_popular),
        features = ?
      WHERE id = ?
    `, [
      name !== undefined ? name : current.name,
      tagline !== undefined ? tagline : current.tagline,
      monthly_price !== undefined ? Number(monthly_price) : current.monthly_price,
      discount_percent !== undefined ? Number(discount_percent) : current.discount_percent,
      trial_days !== undefined ? Number(trial_days) : current.trial_days,
      contacts_limit !== undefined ? Number(contacts_limit) : current.contacts_limit,
      emails_limit !== undefined ? Number(emails_limit) : current.emails_limit,
      is_popular !== undefined ? (is_popular ? 1 : 0) : current.is_popular,
      updatedFeatures,
      id
    ]);

    const [updated] = await pool.query('SELECT * FROM plans WHERE id = ?', [id]);
    res.json({ message: 'Plan updated successfully', plan: updated[0] });
  } catch (err) {
    console.error('Error updating plan:', err);
    res.status(500).json({ error: 'Failed to update plan: ' + err.message });
  }
};

// DELETE /api/plans/:id - Delete a plan
exports.deletePlan = async (req, res) => {
  try {
    const { id } = req.params;
    const [existing] = await pool.query('SELECT * FROM plans WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    await pool.query('DELETE FROM plans WHERE id = ?', [id]);
    res.json({ message: 'Plan deleted successfully' });
  } catch (err) {
    console.error('Error deleting plan:', err);
    res.status(500).json({ error: 'Failed to delete plan: ' + err.message });
  }
};

// GET /api/plans/backup - Export JSON backup of all plans & subscriptions
exports.backupPlans = async (req, res) => {
  try {
    const [plans] = await pool.query('SELECT * FROM plans');
    const [subscriptions] = await pool.query('SELECT * FROM user_subscriptions');
    const backupData = {
      timestamp: new Date().toISOString(),
      version: '1.0',
      plans,
      subscriptions
    };
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=bexemail_plans_backup_${Date.now()}.json`);
    res.json(backupData);
  } catch (err) {
    console.error('Error backing up plans:', err);
    res.status(500).json({ error: 'Failed to generate plans backup' });
  }
};

// POST /api/plans/restore - Restore plans from JSON payload
exports.restorePlans = async (req, res) => {
  try {
    const { plans, subscriptions } = req.body;
    if (!Array.isArray(plans)) {
      return res.status(400).json({ error: 'Invalid backup file payload. "plans" array is required.' });
    }

    for (const p of plans) {
      const featsStr = Array.isArray(p.features) ? JSON.stringify(p.features) : (typeof p.features === 'string' ? p.features : JSON.stringify([]));
      await pool.query(`
        INSERT INTO plans (id, plan_code, name, tagline, monthly_price, discount_percent, trial_days, contacts_limit, emails_limit, is_popular, features)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          name = VALUES(name),
          tagline = VALUES(tagline),
          monthly_price = VALUES(monthly_price),
          discount_percent = VALUES(discount_percent),
          trial_days = VALUES(trial_days),
          contacts_limit = VALUES(contacts_limit),
          emails_limit = VALUES(emails_limit),
          is_popular = VALUES(is_popular),
          features = VALUES(features);
      `, [
        p.id || null,
        p.plan_code,
        p.name,
        p.tagline || '',
        p.monthly_price || 0,
        p.discount_percent || 0,
        p.trial_days || 14,
        p.contacts_limit || 500,
        p.emails_limit || 5000,
        p.is_popular ? 1 : 0,
        featsStr
      ]);
    }

    res.json({ message: 'Plans and configuration restored successfully!' });
  } catch (err) {
    console.error('Error restoring plans:', err);
    res.status(500).json({ error: 'Failed to restore plans: ' + err.message });
  }
};

// GET /api/plans/user-subscriptions - Admin endpoint to list user subscriptions & plan details
exports.getUserSubscriptions = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        au.id as user_id,
        au.name as user_name,
        au.username as user_username,
        au.email as user_email,
        au.domain as user_domain,
        au.role as user_role,
        au.custom_seats_limit as user_custom_seats,
        au.custom_contacts_limit as user_custom_contacts,
        au.custom_emails_limit as user_custom_emails,
        au.custom_campaigns_limit as user_custom_campaigns,
        au.custom_admins_limit as user_custom_admins,
        au.custom_associates_limit as user_custom_associates,
        us.id as subscription_id,
        us.plan_id,
        us.plan_code,
        us.trial_days,
        us.trial_start,
        us.trial_end,
        us.status as sub_status,
        p.name as plan_name,
        p.monthly_price,
        p.discount_percent,
        COALESCE(au.custom_contacts_limit, us.custom_contacts_limit, p.contacts_limit) as contacts_limit,
        COALESCE(au.custom_emails_limit, us.custom_emails_limit, p.emails_limit) as emails_limit,
        COALESCE(au.custom_seats_limit, us.custom_seats_limit, us.seats_limit, p.seats_limit, 1) as seats_limit,
        p.price_detail,
        p.role_access_info,
        p.contacts_limit_info
      FROM admin_users au
      LEFT JOIN user_subscriptions us ON au.id = us.user_id
      LEFT JOIN plans p ON (us.plan_id = p.id OR (us.plan_code IS NOT NULL AND p.plan_code = us.plan_code))
      ORDER BY au.id DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching user subscriptions:', err);
    res.status(500).json({ error: 'Failed to fetch user subscriptions' });
  }
};

// POST /api/plans/assign - Admin assigns plan to user
exports.assignPlan = async (req, res) => {
  try {
    const { user_id, plan_code, trial_days, status } = req.body;
    if (!user_id || !plan_code) {
      return res.status(400).json({ error: 'user_id and plan_code are required' });
    }

    const [pRows] = await pool.query('SELECT * FROM plans WHERE plan_code = ?', [plan_code]);
    if (pRows.length === 0) {
      return res.status(400).json({ error: 'Invalid plan_code specified' });
    }

    const plan = pRows[0];
    const assignedTrialDays = trial_days !== undefined ? Number(trial_days) : (plan.trial_days || 14);

    const [existing] = await pool.query('SELECT * FROM user_subscriptions WHERE user_id = ?', [user_id]);

    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + (assignedTrialDays * 24 * 60 * 60 * 1000));

    if (existing.length === 0) {
      await pool.query(`
        INSERT INTO user_subscriptions (user_id, plan_id, plan_code, trial_days, trial_start, trial_end, status)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [user_id, plan.id, plan.plan_code, assignedTrialDays, startDate, endDate, status || 'active']);
    } else {
      await pool.query(`
        UPDATE user_subscriptions SET
          plan_id = ?,
          plan_code = ?,
          trial_days = ?,
          trial_start = ?,
          trial_end = ?,
          status = ?
        WHERE user_id = ?
      `, [plan.id, plan.plan_code, assignedTrialDays, startDate, endDate, status || 'active', user_id]);
    }

    res.json({ message: `Plan '${plan.name}' assigned successfully to user ID ${user_id}!` });
  } catch (err) {
    console.error('Error assigning plan:', err);
    res.status(500).json({ error: 'Failed to assign plan: ' + err.message });
  }
};

// POST /api/plans/deassign - Admin deassigns plan from user (resets to Free plan)
exports.deassignPlan = async (req, res) => {
  try {
    const { user_id } = req.body;
    if (!user_id) {
      return res.status(400).json({ error: 'user_id is required' });
    }

    // Get Free plan id
    const [freeRows] = await pool.query('SELECT id FROM plans WHERE plan_code = "free"');
    const freeId = freeRows[0]?.id || 1;

    await pool.query(`
      UPDATE user_subscriptions SET
        plan_id = ?,
        plan_code = 'free',
        trial_days = 0,
        status = 'deassigned'
      WHERE user_id = ?
    `, [freeId, user_id]);

    res.json({ message: `Plan deassigned and user ID ${user_id} reset to Free tier.` });
  } catch (err) {
    console.error('Error deassigning plan:', err);
    res.status(500).json({ error: 'Failed to deassign plan: ' + err.message });
  }
};
