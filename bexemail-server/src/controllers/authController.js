const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'bexemail_super_secret_key_2026';

// POST /api/auth/login
exports.login = async (req, res) => {
    const { email, password } = req.body;
    
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    try {
        const [users] = await db.query(`SELECT * FROM admin_users WHERE email = ?`, [email]);
        
        if (users.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user = users[0];
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        let perms = user.permissions;
        if (typeof perms === 'string') {
            try { perms = JSON.parse(perms); } catch (e) {}
        }
        if (typeof perms === 'string') {
            try { perms = JSON.parse(perms); } catch (e) {}
        }

        res.status(200).json({
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                name: user.name,
                username: user.username,
                email: user.email,
                number: user.number,
                role: user.role,
                permissions: perms || {}
            }
        });
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ error: 'Server error during login' });
    }
};

// POST /api/auth/register
exports.register = async (req, res) => {
    const { name, username, email, number, password, role, isTrial } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ error: 'Full name, email address, and password are required.' });
    }

    try {
        const [existing] = await db.query(`SELECT id FROM admin_users WHERE email = ?`, [email.toLowerCase().trim()]);
        if (existing.length > 0) {
            return res.status(400).json({ error: 'This email address is already registered. Please sign in or use another email.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const userRole = role || 'Developer';

        // Default permissions for new self-registered trial users
        const defaultPerms = {
            reports: true,
            backup_history_all: true,
            backup_history_management: true,
            backup_history_auto_backup: true,
            backup_history_logs: true,
            profiles_all: true,
            profiles_database_backup: true,
            profiles_user_accounts: true,
            profiles_smtp_config: true,
            settings_all: true,
            settings_system: true,
            settings_api_access: true
        };
        const permissionsStr = JSON.stringify(defaultPerms);

        const genUsername = username && username.trim() !== '' 
            ? username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '')
            : name.trim().toLowerCase().replace(/[^a-z0-9]/g, '') + Math.floor(100 + Math.random() * 900);

        const [result] = await db.query(
            `INSERT INTO admin_users (name, username, email, number, password, plain_password, role, permissions) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [name.trim(), genUsername, email.toLowerCase().trim(), number || null, hashedPassword, password, userRole, permissionsStr]
        );

        const newUserId = result.insertId;

        const token = jwt.sign(
            { id: newUserId, email: email.toLowerCase().trim(), role: userRole },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.status(201).json({
            message: isTrial ? '14-Day Free Trial account created successfully!' : 'Account registered successfully!',
            token,
            user: {
                id: newUserId,
                name: name.trim(),
                username: genUsername,
                email: email.toLowerCase().trim(),
                number: number || null,
                role: userRole,
                permissions: defaultPerms
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Server error during registration: ' + error.message });
    }
};

// GET /api/auth/me
exports.getMe = async (req, res) => {
    try {
        const userId = req.user.id;
        const [users] = await db.query(`SELECT id, name, username, email, number, role, permissions, plain_password, created_at FROM admin_users WHERE id = ?`, [userId]);
        
        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = users[0];
        let perms = user.permissions;
        if (typeof perms === 'string') {
            try { perms = JSON.parse(perms); } catch (e) {}
        }
        if (typeof perms === 'string') {
            try { perms = JSON.parse(perms); } catch (e) {}
        }
        user.permissions = perms || {};

        res.status(200).json(user);
    } catch (error) {
        console.error('getMe error:', error);
        res.status(500).json({ error: 'Failed to fetch user profile' });
    }
};

// PUT /api/auth/profile
exports.updateProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const { name, email, number, phone } = req.body;
        
        await db.query(
            `UPDATE admin_users SET name = COALESCE(?, name), email = COALESCE(?, email), number = COALESCE(?, number) WHERE id = ?`,
            [name || null, email || null, number || phone || null, userId]
        );
        
        res.status(200).json({ message: 'Profile updated successfully' });
    } catch (error) {
        console.error('updateProfile error:', error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
};

// PUT /api/auth/password
exports.updatePassword = async (req, res) => {
    try {
        const userId = req.user.id;
        const { currentPassword, newPassword } = req.body;

        if (!newPassword || newPassword.trim() === '') {
            return res.status(400).json({ error: 'New password is required' });
        }

        const [users] = await db.query(`SELECT password, plain_password FROM admin_users WHERE id = ?`, [userId]);
        if (users.length === 0) return res.status(404).json({ error: 'User not found' });

        const user = users[0];
        let isMatch = false;
        
        if (currentPassword) {
            if (user.plain_password && currentPassword === user.plain_password) {
                isMatch = true;
            } else {
                isMatch = await bcrypt.compare(currentPassword, user.password);
            }
        } else {
            isMatch = true;
        }

        if (!isMatch) return res.status(400).json({ error: 'Incorrect current password' });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        await db.query(`UPDATE admin_users SET password = ?, plain_password = ? WHERE id = ?`, [hashedPassword, newPassword, userId]);
        
        res.status(200).json({ message: 'Password updated successfully', plain_password: newPassword });
    } catch (error) {
        console.error('updatePassword error:', error);
        res.status(500).json({ error: 'Failed to update password' });
    }
};

// POST /api/auth/reset-password-public
exports.resetPasswordPublic = async (req, res) => {
    try {
        const { email, newPassword } = req.body;
        if (!email || !newPassword) {
            return res.status(400).json({ error: 'Email and new password are required' });
        }

        const [users] = await db.query(`SELECT id FROM admin_users WHERE email = ?`, [email]);
        if (users.length === 0) {
            return res.status(404).json({ error: 'No user account found for this registered email address.' });
        }

        const userId = users[0].id;
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        await db.query(`UPDATE admin_users SET password = ?, plain_password = ? WHERE id = ?`, [hashedPassword, newPassword, userId]);

        res.status(200).json({ message: 'Password reset successfully' });
    } catch (error) {
        console.error('resetPasswordPublic error:', error);
        res.status(500).json({ error: 'Failed to reset password: ' + error.message });
    }
};
