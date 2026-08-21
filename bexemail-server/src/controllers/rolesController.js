const pool = require('../config/db');

/**
 * Get all available roles (System & Custom)
 */
exports.getRoles = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM roles ORDER BY is_system DESC, name ASC');
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('[RolesController] Error fetching roles:', error);
    res.status(500).json({ error: 'Failed to fetch roles' });
  }
};

/**
 * Create a new custom role
 */
exports.createRole = async (req, res) => {
  try {
    const { name, description, color, system_key, company_id } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Role name is required' });
    }

    const roleId = require('crypto').randomUUID();
    const key = (system_key || name.toLowerCase().replace(/[^a-z0-9]/g, '_')).trim();

    const [existing] = await pool.query('SELECT id FROM roles WHERE system_key = ? OR name = ?', [key, name]);
    if (existing.length > 0) {
      return res.status(400).json({ error: `A role with name or key '${name}' already exists.` });
    }

    await pool.query(
      `INSERT INTO roles (id, company_id, name, description, color, is_system, is_active, system_key)
       VALUES (?, ?, ?, ?, ?, 0, 1, ?)`,
      [roleId, company_id || null, name.trim(), description || null, color || '#d90a2c', key]
    );

    const [newRole] = await pool.query('SELECT * FROM roles WHERE id = ?', [roleId]);
    res.status(201).json({ success: true, message: 'Role created successfully', data: newRole[0] });
  } catch (error) {
    console.error('[RolesController] Error creating role:', error);
    res.status(500).json({ error: 'Failed to create role' });
  }
};

/**
 * Update an existing role
 */
exports.updateRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, color, is_active } = req.body;

    const [existing] = await pool.query('SELECT * FROM roles WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Role not found' });
    }

    const role = existing[0];
    const updatedName = name ? name.trim() : role.name;
    const updatedDesc = description !== undefined ? description : role.description;
    const updatedColor = color || role.color;
    const updatedActive = is_active !== undefined ? (is_active ? 1 : 0) : role.is_active;

    await pool.query(
      'UPDATE roles SET name = ?, description = ?, color = ?, is_active = ? WHERE id = ?',
      [updatedName, updatedDesc, updatedColor, updatedActive, id]
    );

    const [updated] = await pool.query('SELECT * FROM roles WHERE id = ?', [id]);
    res.json({ success: true, message: 'Role updated successfully', data: updated[0] });
  } catch (error) {
    console.error('[RolesController] Error updating role:', error);
    res.status(500).json({ error: 'Failed to update role' });
  }
};

/**
 * Delete a custom role (Protected against deleting system roles)
 */
exports.deleteRole = async (req, res) => {
  try {
    const { id } = req.params;
    const [existing] = await pool.query('SELECT * FROM roles WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Role not found' });
    }

    if (existing[0].is_system === 1 || existing[0].is_system === true) {
      return res.status(400).json({ error: 'System roles (Leader, Manager, Team Member) cannot be deleted.' });
    }

    await pool.query('DELETE FROM roles WHERE id = ?', [id]);
    res.json({ success: true, message: 'Role deleted successfully' });
  } catch (error) {
    console.error('[RolesController] Error deleting role:', error);
    res.status(500).json({ error: 'Failed to delete role' });
  }
};
