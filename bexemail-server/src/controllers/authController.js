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

        res.status(200).json({
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                permissions: user.permissions ? (typeof user.permissions === 'string' ? JSON.parse(user.permissions) : user.permissions) : null
            }
        });
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ error: 'Server error during login' });
    }
};

// GET /api/auth/me
exports.getMe = async (req, res) => {
    try {
        const userId = req.user.id;
        const [users] = await db.query(`SELECT id, name, username, email, number, role, permissions, created_at FROM admin_users WHERE id = ?`, [userId]);
        
        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = users[0];
        if (user.permissions && typeof user.permissions === 'string') {
            user.permissions = JSON.parse(user.permissions);
        }

        res.status(200).json(user);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch user profile' });
    }
};

// PUT /api/auth/profile
exports.updateProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const { email } = req.body;
        
        if (email) {
            await db.query(`UPDATE admin_users SET email = ? WHERE id = ?`, [email, userId]);
        }
        
        res.status(200).json({ message: 'Profile updated' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update profile' });
    }
};

// PUT /api/auth/password
exports.updatePassword = async (req, res) => {
    try {
        const userId = req.user.id;
        const { currentPassword, newPassword } = req.body;

        const [users] = await db.query(`SELECT password FROM admin_users WHERE id = ?`, [userId]);
        if (users.length === 0) return res.status(404).json({ error: 'User not found' });

        const isMatch = await bcrypt.compare(currentPassword, users[0].password);
        if (!isMatch) return res.status(400).json({ error: 'Incorrect current password' });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        await db.query(`UPDATE admin_users SET password = ? WHERE id = ?`, [hashedPassword, userId]);
        
        res.status(200).json({ message: 'Password updated successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update password' });
    }
};
