# BexEmail Deployment Guide

This document outlines how to take your BexEmail project live, configuring the Live API, Live Database, and essential settings.

## Prerequisites

Before starting, ensure your production server (e.g., VPS on DigitalOcean, AWS, or similar) has the following installed:
- **Node.js** (v18 or higher recommended)
- **NPM** (Node Package Manager)
- **MySQL Server** (v8+ recommended)
- **Git**
- **PM2** (Optional, but highly recommended for keeping the node apps running: `npm install -g pm2`)

---

## 1. Setting up the Live Database

1. Log into your production MySQL server:
   ```bash
   mysql -u root -p
   ```
2. Create the production database and user:
   ```sql
   CREATE DATABASE db_bex_email_live;
   CREATE USER 'bex_user'@'localhost' IDENTIFIED BY 'your_strong_password_here';
   GRANT ALL PRIVILEGES ON db_bex_email_live.* TO 'bex_user'@'localhost';
   FLUSH PRIVILEGES;
   EXIT;
   ```

---

## 2. Setting up the Backend Server

1. Clone or upload the repository to your server and navigate into the backend folder:
   ```bash
   cd /path/to/project/bexemail-server
   npm install
   ```

2. Configure the `.env` file for the Live environment. Create a `.env` file in `bexemail-server/` with the following variables:
   ```env
   # Application Port
   PORT=5000

   # Database Settings (Update with Live DB credentials)
   DB_HOST=127.0.0.1
   DB_USER=bex_user
   DB_PASSWORD=your_strong_password_here
   DB_NAME=db_bex_email_live

   # Background Worker Settings
   CLEANUP_CRON_SCHEDULE="0 3 * * *"
   ```
   *(Note: The `SMTP` settings are managed via the System Settings UI in the app, but you can also define defaults here if preferred).*

3. Initialize the database schema:
   ```bash
   node index.js
   # Note: Wait for the "Server running on port 5000" and "Setup Complete" logs, then press Ctrl+C to stop it.
   ```

4. Start the server using PM2 (for production):
   ```bash
   pm2 start index.js --name "bexemail-api"
   pm2 save
   ```

---

## 3. Setting up the Frontend Client

1. Navigate to the client folder:
   ```bash
   cd ../bexemail-client
   npm install
   ```

2. Build the production React app:
   ```bash
   npm run build
   ```
   This will generate a `dist` (or `build`) folder.

3. Serve the static files using a web server like **Nginx**:
   ```nginx
   server {
       listen 80;
       server_name yourdomain.com;

       root /path/to/project/bexemail-client/dist;
       index index.html;

       location / {
           try_files $uri $uri/ /index.html;
       }

       # Proxy API requests to the backend PM2 process
       location /api/ {
           proxy_pass http://localhost:5000/api/;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
   }
   ```

4. Restart Nginx to apply the configuration.
   ```bash
   sudo systemctl restart nginx
   ```

---

## 4. Final Security Checklist

- [ ] Ensure your MySQL database is strictly bound to `127.0.0.1` and not accessible from the public internet (unless properly secured behind a firewall for remote integrations).
- [ ] Install SSL certificates on your Nginx server using **Let's Encrypt / Certbot**.
- [ ] Configure the API keys in your System Settings (if required) and ensure the Admin Users have strong passwords.
