# BexEmail - Deployment & Server Architecture Guide

This document outlines how to test emails locally and how to deploy BexEmail to a live production server (e.g., AWS EC2, DigitalOcean Droplet, Ubuntu VPS).

## 1. Localhost Testing Configuration (Safe Mode)
When developing locally, **never use your real SMTP credentials** (like Amazon SES or SendGrid). If you make a loop error, you will exhaust your quota or get banned for spamming.

**Solution: Use Mailtrap or Ethereal Email.**
These are "fake" SMTP servers that catch your outbound emails and display them in a web inbox without actually sending them to the recipients.

**Local `.env` Configuration:**
```env
# /backend/.env
NODE_ENV=development
DB_HOST=localhost
DB_USER=root
DB_PASS=
DB_NAME=db_bex_email

# SMTP Configuration (Use Mailtrap credentials here)
SMTP_HOST=sandbox.smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=your_mailtrap_user
SMTP_PASS=your_mailtrap_password
```

*(Note: We opted for a MySQL-based custom queue worker rather than Redis/BullMQ to minimize dependencies, as agreed upon during initial architecture planning. Therefore, REDIS configuration is omitted).*

## 2. Production Server Architecture

For a live server, we will use a single Ubuntu VPS with the following stack:

- **Nginx:** Acts as a reverse proxy. It will serve the compiled ReactJS frontend directly to the browser and route `/api` requests to your Node.js backend.
- **PM2:** A production process manager for Node.js. It will run two separate processes: your API server and your Queue Worker. If they crash, PM2 restarts them automatically.
- **MySQL:** Your main database (handling both data and the custom email queue).

## 3. Production Deployment Steps

### Step 1: Prepare the React Frontend
Navigate to `/bexemail-client/` and configure your production `.env`:
```env
VITE_API_BASE_URL=https://yourdomain.com/api
```
Run `npm run build`. This generates a `dist` or `build` folder containing static HTML/CSS/JS.

### Step 2: Server Setup (Ubuntu)
SSH into your live server.
Install dependencies: 
```bash
sudo apt update
sudo apt install nginx mysql-server
```
Install Node.js (via NVM or nodesource) and PM2: 
```bash
npm install -g pm2
```

### Step 3: Deploy Backend & Worker
Clone your repository to the server (e.g., `/var/www/bexemail`).
Navigate to `/bexemail-server/` and run `npm install`.
Create your production `.env` file with your REAL SMTP credentials (SES/SendGrid).
Start your apps using the PM2 ecosystem file: 
```bash
pm2 start ecosystem.config.js
```
Save the PM2 processes to start on boot: 
```bash
pm2 save && pm2 startup
```

### Step 4: Configure Nginx
Copy your compiled React dist folder to `/var/www/bexemail/client/dist`.
Create an Nginx server block to route traffic (provided in `bexemail.conf`).
Restart Nginx: 
```bash
sudo systemctl restart nginx
```

---

## Configuration References (Prompts 18-20)

### Production Database Setup (MySQL)
Run the following commands on your Ubuntu server to secure MySQL and create the database:

```bash
sudo mysql_secure_installation
```

Log into MySQL as root:
```bash
sudo mysql -u root -p
```

Execute the following SQL commands:
```sql
CREATE DATABASE db_bex_email;
CREATE USER 'bexemail_user'@'localhost' IDENTIFIED BY 'YourSecurePassword123!';
GRANT ALL PRIVILEGES ON db_bex_email.* TO 'bexemail_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```
Now, update your production `.env` file to use `bexemail_user` and `YourSecurePassword123!`.

---

## 4. Email Deliverability (DNS Configuration)
To ensure emails land in the inbox and not the spam folder, we must authenticate our sending domain using three DNS records at our domain registrar (e.g., GoDaddy, Namecheap, Cloudflare).

* **SPF (Sender Policy Framework):** A TXT record that lists the IP addresses and SMTP providers authorized to send emails on behalf of your domain.
* **DKIM (DomainKeys Identified Mail):** A TXT or CNAME record containing a cryptographic public key. Your Node.js worker (via your SMTP provider) will sign every outgoing email with a private key, and the receiving inbox uses this public key to verify it wasn't tampered with.
* **DMARC (Domain-based Message Authentication, Reporting, and Conformance):** A TXT record that tells the receiving server what to do if an email fails the SPF or DKIM checks (e.g., `p=reject` or `p=quarantine`).

**Important:** Do not send any bulk campaigns until these three records are verified by your SMTP provider.

### DNS Records Setup (SPF, DKIM, and DMARC)
Assuming your domain is `yourdomain.com` and your chosen SMTP provider is **Amazon SES**, here are the exact DNS records you need to add to your domain registrar:

#### 1. SPF Record
To authorize Amazon SES to send emails on your behalf, create the following TXT record:
- **Type:** TXT
- **Name/Host:** `@` (or leave blank depending on registrar)
- **Value:** `v=spf1 include:amazonses.com ~all`

*(If you are using SendGrid, the value would be `v=spf1 include:sendgrid.net ~all`)*

#### 2. DKIM Records
Amazon SES uses Easy DKIM. You must generate these keys inside the AWS Console under **SES > Verified Identities**. AWS will give you three CNAME records to add.
Example format provided by AWS:
- **Type:** CNAME
- **Name/Host:** `xyz123._domainkey`
- **Value:** `xyz123.dkim.amazonses.com`
*(Repeat for all three keys provided by your dashboard)*

#### 3. DMARC Record
DMARC requires SPF and DKIM to be set up first. To start monitoring without aggressively rejecting emails, we use a `quarantine` policy:
- **Type:** TXT
- **Name/Host:** `_dmarc`
- **Value:** `v=DMARC1; p=quarantine; rua=mailto:admin@yourdomain.com;`

*Note: The `rua` tag specifies where aggregate reports of your email traffic will be sent. You can monitor these reports to see if any legitimate emails are failing authentication.*

---

## 5. Gmail Configuration & Rate Limiting (Testing Phase)
If you choose to use Gmail (`smtp.gmail.com`) for early testing or small batches, you must configure a Google App Password and enforce strict rate limiting to avoid triggering Google's anti-spam algorithms (which cap at 500 emails per day).

### Generating a Google App Password
Since Google blocks standard password authentication for SMTP, follow these steps to generate a dedicated App Password:
1. Go to your Google Account settings (Manage your Google Account).
2. Navigate to the **Security** tab on the left panel.
3. Ensure **2-Step Verification (2FA)** is turned ON.
4. Under the "2-Step Verification" section, scroll down to **App passwords** (or search for "App passwords" in the top search bar).
5. Select "Select app" and choose **Mail**, then "Select device" and choose **Other (Custom name)**. Name it something like "BexEmail App".
6. Click **Generate**.
7. Google will display a 16-character password in a yellow box. Copy this exact password (spaces don't matter) and paste it into your `.env` file as `SMTP_PASSWORD`.

### Node.js SMTP Configuration
Your `.env` and Nodemailer configuration should look like this:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER="your-email@gmail.com"
SMTP_PASSWORD="your-16-char-app-password"
SMTP_SECURE="true"
```

### Queue Rate Limiting
To ensure you do not exceed Google's strict sending velocity, the custom MySQL queue worker (`src/workers/worker.js`) has been configured to process **a maximum of 1 email every 3 seconds**. This is achieved by limiting the database fetch to 1 record and setting the polling interval to 3000 milliseconds.
