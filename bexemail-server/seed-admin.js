const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function seedAdmin() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || '127.0.0.1',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'db_bex_email'
    });

    try {
        console.log("Seeding default Super Admin user...");
        
        const email = 'vimal@bexcodeservices.com';
        const rawPassword = 'password123';
        
        const [existing] = await connection.query(`SELECT id FROM admin_users WHERE email = ?`, [email]);
        if (existing.length > 0) {
            console.log("Admin user already exists. Skipping seed.");
            process.exit(0);
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(rawPassword, salt);

        await connection.query(
            `INSERT INTO admin_users (email, password, role) VALUES (?, ?, 'Super Admin')`,
            [email, hashedPassword]
        );
        
        console.log("Super Admin seeded successfully!");
        console.log(`Email: ${email}`);
        console.log(`Password: ${rawPassword}`);
        
    } catch (err) {
        console.error("Failed to seed admin:", err);
    } finally {
        await connection.end();
        process.exit(0);
    }
}

seedAdmin();
