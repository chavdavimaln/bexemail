const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getSystemLimitsStatus, getUserPlanLimits } = require('../utils/planLimits');

const JWT_SECRET = process.env.JWT_SECRET || 'bexemail_super_secret_key_2026';

// POST /api/auth/login
exports.login = async (req, res) => {
    const { email, password, rememberMe } = req.body;
    
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    try {
        const cleanEmail = email.toLowerCase().trim();
        const [users] = await db.query(`SELECT * FROM admin_users WHERE LOWER(email) = ?`, [cleanEmail]);
        
        if (users.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user = users[0];
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const effectiveAdminId = user.admin_id || user.id;
        const expiresIn = rememberMe ? '30d' : '24h';
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role, admin_id: effectiveAdminId },
            JWT_SECRET,
            { expiresIn }
        );

        let perms = user.permissions;
        if (typeof perms === 'string') {
            try { perms = JSON.parse(perms); } catch (e) {}
        }

        // Fetch user active subscription & plan details
        const [subs] = await db.query(`
            SELECT us.*, p.name as plan_name, p.seats_limit as plan_seats_limit, p.contacts_limit as plan_contacts_limit, p.emails_limit as plan_emails_limit, p.role_access_info, p.contacts_limit_info
            FROM user_subscriptions us
            LEFT JOIN plans p ON (us.plan_id = p.id OR (us.plan_code IS NOT NULL AND p.plan_code = us.plan_code))
            WHERE us.user_id = ?
            ORDER BY us.id DESC LIMIT 1
        `, [user.id]);

        const sub = subs[0] || null;

        res.status(200).json({
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                admin_id: effectiveAdminId,
                name: user.name,
                username: user.username,
                email: user.email,
                number: user.number,
                domain: user.domain || '',
                role: user.role,
                permissions: perms || {},
                subscription: sub ? {
                    plan_code: sub.plan_code,
                    plan_name: sub.plan_name,
                    seats_limit: user.custom_seats_limit || sub.custom_seats_limit || sub.plan_seats_limit || (sub.plan_code === 'free' ? 1 : sub.plan_code === 'essentials' ? 3 : sub.plan_code === 'standard' ? 5 : sub.plan_code === 'premium' ? 10 : sub.seats_limit) || 1,
                    contacts_limit: user.custom_contacts_limit || sub.custom_contacts_limit || sub.plan_contacts_limit || (sub.plan_code === 'free' ? 250 : sub.plan_code === 'essentials' ? 50000 : sub.plan_code === 'standard' ? 100000 : sub.plan_code === 'premium' ? 150000 : 250),
                    emails_limit: user.custom_emails_limit || sub.custom_emails_limit || sub.plan_emails_limit || (sub.plan_code === 'free' ? 1000 : sub.plan_code === 'essentials' ? 5000 : sub.plan_code === 'standard' ? 6000 : sub.plan_code === 'premium' ? 150000 : 1000),
                    status: sub.status
                } : { plan_code: 'free', plan_name: 'Free Plan', seats_limit: 1, contacts_limit: 250, emails_limit: 1000, status: 'active' }
            }
        });
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ error: 'Server error during login' });
    }
};

// POST /api/auth/register
exports.register = async (req, res) => {
    const { name, username, email, number, domain, company_domain, password, role, isTrial, plan, plan_code } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ error: 'Full name, email address, and password are required.' });
    }

    try {
        const [existing] = await db.query(`SELECT id FROM admin_users WHERE email = ?`, [email.toLowerCase().trim()]);
        if (existing.length > 0) {
            return res.status(400).json({ error: 'This email address is already registered. Please sign in or use another email.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const userRole = role || 'Admin';
        const clientDomain = (domain || company_domain || '').trim();

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
            `INSERT INTO admin_users (name, username, email, number, domain, password, plain_password, role, permissions) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [name.trim(), genUsername, email.toLowerCase().trim(), number || null, clientDomain || null, hashedPassword, password, userRole, permissionsStr]
        );

        const newUserId = result.insertId;

        // Assign plan subscription
        const selectedPlanCode = (plan || plan_code || 'standard').toLowerCase().trim();
        const [pRows] = await db.query(`SELECT * FROM plans WHERE plan_code = ?`, [selectedPlanCode]);
        const matchedPlan = pRows[0] || { id: 1, plan_code: 'standard', name: 'Standard Plan', trial_days: 14, seats_limit: 5, contacts_limit: 100000, emails_limit: 6000 };

        const trialDays = matchedPlan.trial_days || 14;
        const startDate = new Date();
        const endDate = new Date(startDate.getTime() + (trialDays * 24 * 60 * 60 * 1000));

        await db.query(`
            INSERT INTO user_subscriptions (user_id, plan_id, plan_code, trial_days, trial_start, trial_end, status, seats_limit)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [newUserId, matchedPlan.id, matchedPlan.plan_code, trialDays, startDate, endDate, isTrial ? 'trialing' : 'active', matchedPlan.seats_limit || 1]);

        const token = jwt.sign(
            { id: newUserId, email: email.toLowerCase().trim(), role: userRole, admin_id: newUserId },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.status(201).json({
            message: isTrial ? `14-Day Free Trial registered for ${matchedPlan.name}!` : 'Account registered successfully!',
            token,
            user: {
                id: newUserId,
                admin_id: newUserId,
                name: name.trim(),
                username: genUsername,
                email: email.toLowerCase().trim(),
                number: number || null,
                domain: clientDomain,
                role: userRole,
                permissions: defaultPerms,
                subscription: {
                    plan_code: matchedPlan.plan_code,
                    plan_name: matchedPlan.name,
                    seats_limit: matchedPlan.seats_limit || 1,
                    contacts_limit: matchedPlan.contacts_limit || 250,
                    emails_limit: matchedPlan.emails_limit || 1000,
                    status: isTrial ? 'trialing' : 'active'
                }
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
        const userId = req.user?.id || req.headers['x-user-id'] || req.headers['X-User-Id'] || 1;
        const [users] = await db.query(`SELECT id, admin_id, name, username, email, number, domain, avatar, role, permissions, plain_password, custom_seats_limit, custom_contacts_limit, custom_emails_limit, created_at FROM admin_users WHERE id = ?`, [userId]);
        
        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = users[0];
        user.admin_id = user.admin_id || user.id;
        let perms = user.permissions;
        if (typeof perms === 'string') {
            try { perms = JSON.parse(perms); } catch (e) {}
        }
        user.permissions = perms || {};

        const [subs] = await db.query(`
            SELECT us.*, p.name as plan_name, p.seats_limit as plan_seats_limit, p.contacts_limit as plan_contacts_limit, p.emails_limit as plan_emails_limit
            FROM user_subscriptions us
            LEFT JOIN plans p ON (us.plan_id = p.id OR (us.plan_code IS NOT NULL AND p.plan_code = us.plan_code))
            WHERE us.user_id = ?
            ORDER BY us.id DESC LIMIT 1
        `, [user.id]);

        const sub = subs[0] || null;
        user.subscription = sub ? {
            plan_code: sub.plan_code,
            plan_name: sub.plan_name,
            seats_limit: user.custom_seats_limit || sub.custom_seats_limit || sub.plan_seats_limit || (sub.plan_code === 'free' ? 1 : sub.plan_code === 'essentials' ? 3 : sub.plan_code === 'standard' ? 5 : sub.plan_code === 'premium' ? 10 : sub.seats_limit) || 1,
            contacts_limit: user.custom_contacts_limit || sub.custom_contacts_limit || sub.plan_contacts_limit || (sub.plan_code === 'free' ? 250 : sub.plan_code === 'essentials' ? 50000 : sub.plan_code === 'standard' ? 100000 : sub.plan_code === 'premium' ? 150000 : 250),
            emails_limit: user.custom_emails_limit || sub.custom_emails_limit || sub.plan_emails_limit || (sub.plan_code === 'free' ? 1000 : sub.plan_code === 'essentials' ? 5000 : sub.plan_code === 'standard' ? 6000 : sub.plan_code === 'premium' ? 150000 : 1000),
            status: sub.status
        } : { plan_code: 'free', plan_name: 'Free Plan', seats_limit: 1, contacts_limit: 250, emails_limit: 1000, status: 'active' };

        res.status(200).json(user);
    } catch (error) {
        console.error('getMe error:', error);
        res.status(500).json({ error: 'Failed to fetch user profile' });
    }
};

// PUT /api/auth/profile
exports.updateProfile = async (req, res) => {
    try {
        const userId = req.user?.id || req.headers['x-user-id'] || req.headers['X-User-Id'] || 1;
        const { name, email, number, phone, domain, avatar, plan_code, plan } = req.body;
        
        // Ensure avatar column exists in database
        try {
            await db.query(`ALTER TABLE admin_users ADD COLUMN avatar LONGTEXT NULL`);
        } catch (e) {}

        if (avatar !== undefined && avatar !== null && avatar !== '') {
            await db.query(`UPDATE admin_users SET avatar = ? WHERE id = ?`, [avatar, userId]);
        }

        await db.query(
            `UPDATE admin_users SET name = COALESCE(?, name), email = COALESCE(?, email), number = COALESCE(?, number), domain = COALESCE(?, domain) WHERE id = ?`,
            [name || null, email || null, number || phone || null, domain || null, userId]
        );

        const targetPlanCode = (plan_code || plan || '').toLowerCase().trim();
        if (targetPlanCode) {
            const [pRows] = await db.query(`SELECT * FROM plans WHERE plan_code = ?`, [targetPlanCode]);
            if (pRows.length > 0) {
                const matchedPlan = pRows[0];
                const [existingSub] = await db.query(`SELECT id FROM user_subscriptions WHERE user_id = ?`, [userId]);
                if (existingSub.length === 0) {
                    await db.query(`
                        INSERT INTO user_subscriptions (user_id, plan_id, plan_code, trial_days, status, seats_limit)
                        VALUES (?, ?, ?, ?, ?, ?)
                    `, [userId, matchedPlan.id, matchedPlan.plan_code, matchedPlan.trial_days || 14, 'active', matchedPlan.seats_limit || 1]);
                } else {
                    await db.query(`
                        UPDATE user_subscriptions SET
                            plan_id = ?,
                            plan_code = ?,
                            trial_days = ?,
                            seats_limit = ?,
                            status = 'active'
                        WHERE user_id = ?
                    `, [matchedPlan.id, matchedPlan.plan_code, matchedPlan.trial_days || 14, matchedPlan.seats_limit || 1, userId]);
                }
            }
        }
        
        // Fetch updated user object
        const [users] = await db.query(`SELECT id, name, username, email, number, domain, avatar, role, permissions, plain_password, custom_seats_limit, custom_contacts_limit, custom_emails_limit, created_at FROM admin_users WHERE id = ?`, [userId]);
        const user = users[0] || {};
        let perms = user.permissions;
        if (typeof perms === 'string') {
            try { perms = JSON.parse(perms); } catch (e) {}
        }
        user.permissions = perms || {};

        const [subs] = await db.query(`
            SELECT us.*, p.name as plan_name, p.seats_limit as plan_seats_limit, p.contacts_limit as plan_contacts_limit, p.emails_limit as plan_emails_limit
            FROM user_subscriptions us
            LEFT JOIN plans p ON (us.plan_id = p.id OR (us.plan_code IS NOT NULL AND p.plan_code = us.plan_code))
            WHERE us.user_id = ?
            ORDER BY us.id DESC LIMIT 1
        `, [userId]);

        const sub = subs[0] || null;
        user.subscription = sub ? {
            plan_code: sub.plan_code,
            plan_name: sub.plan_name,
            seats_limit: user.custom_seats_limit || sub.custom_seats_limit || sub.seats_limit || sub.plan_seats_limit || 1,
            contacts_limit: user.custom_contacts_limit || sub.custom_contacts_limit || sub.plan_contacts_limit || 250,
            emails_limit: user.custom_emails_limit || sub.custom_emails_limit || sub.plan_emails_limit || 1000,
            status: sub.status
        } : { plan_code: 'free', plan_name: 'Free Plan', seats_limit: 1, contacts_limit: 250, emails_limit: 1000, status: 'active' };

        res.status(200).json({ message: 'Profile updated successfully', user });
    } catch (error) {
        console.error('updateProfile error:', error);
        res.status(500).json({ error: 'Failed to update profile: ' + error.message });
    }
};

// POST /api/auth/my-subscription
exports.updateMySubscription = async (req, res) => {
    try {
        const userId = req.user?.id || req.headers['x-user-id'] || 1;
        const { plan_code, plan } = req.body;
        const targetPlanCode = (plan_code || plan || 'standard').toLowerCase().trim();

        const [pRows] = await db.query(`SELECT * FROM plans WHERE plan_code = ?`, [targetPlanCode]);
        if (pRows.length === 0) {
            return res.status(400).json({ error: `Invalid plan code '${targetPlanCode}'` });
        }

        const matchedPlan = pRows[0];
        const [existingSub] = await db.query(`SELECT id FROM user_subscriptions WHERE user_id = ?`, [userId]);
        
        if (existingSub.length === 0) {
            await db.query(`
                INSERT INTO user_subscriptions (user_id, plan_id, plan_code, trial_days, status, seats_limit)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [userId, matchedPlan.id, matchedPlan.plan_code, matchedPlan.trial_days || 14, 'active', matchedPlan.seats_limit || 1]);
        } else {
            await db.query(`
                UPDATE user_subscriptions SET
                    plan_id = ?,
                    plan_code = ?,
                    trial_days = ?,
                    seats_limit = ?,
                    status = 'active'
                WHERE user_id = ?
            `, [matchedPlan.id, matchedPlan.plan_code, matchedPlan.trial_days || 14, matchedPlan.seats_limit || 1, userId]);
        }

        // Fetch updated user profile
        const [users] = await db.query(`SELECT id, name, username, email, number, domain, role, permissions, plain_password, custom_seats_limit, custom_contacts_limit, custom_emails_limit, created_at FROM admin_users WHERE id = ?`, [userId]);
        const user = users[0] || {};
        let perms = user.permissions;
        if (typeof perms === 'string') {
            try { perms = JSON.parse(perms); } catch (e) {}
        }
        user.permissions = perms || {};

        const [subs] = await db.query(`
            SELECT us.*, p.name as plan_name, p.seats_limit as plan_seats_limit, p.contacts_limit as plan_contacts_limit, p.emails_limit as plan_emails_limit
            FROM user_subscriptions us
            LEFT JOIN plans p ON (us.plan_id = p.id OR (us.plan_code IS NOT NULL AND p.plan_code = us.plan_code))
            WHERE us.user_id = ?
            ORDER BY us.id DESC LIMIT 1
        `, [userId]);

        const sub = subs[0] || null;
        user.subscription = sub ? {
            plan_code: sub.plan_code,
            plan_name: sub.plan_name,
            seats_limit: user.custom_seats_limit || sub.custom_seats_limit || sub.seats_limit || sub.plan_seats_limit || 1,
            contacts_limit: user.custom_contacts_limit || sub.custom_contacts_limit || sub.plan_contacts_limit || 250,
            emails_limit: user.custom_emails_limit || sub.custom_emails_limit || sub.plan_emails_limit || 1000,
            status: sub.status
        } : { plan_code: 'free', plan_name: 'Free Plan', seats_limit: 1, contacts_limit: 250, emails_limit: 1000, status: 'active' };

        res.status(200).json({
            message: `Subscription successfully updated to ${matchedPlan.name}!`,
            user
        });
    } catch (error) {
        console.error('updateMySubscription error:', error);
        res.status(500).json({ error: 'Failed to update subscription: ' + error.message });
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

// GET /api/auth/system-limits-status
exports.getSystemLimitsStatus = async (req, res) => {
    try {
        const userId = req.user?.id || req.headers['x-user-id'] || req.headers['X-User-Id'] || null;
        const status = await getSystemLimitsStatus(userId);
        res.json(status);
    } catch (error) {
        console.error('getSystemLimitsStatus error:', error);
        res.status(500).json({ error: 'Failed to fetch system limits status: ' + error.message });
    }
};
