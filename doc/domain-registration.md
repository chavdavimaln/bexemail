# Domain Registration & Multi-Tenant Plan Constraints Guide

## Architecture Summary
This module enforces company-level resource governance for the **BexEmail** CRM platform. It ties multi-tenant domain registrations, seat restrictions, and SMTP sender accounts directly to the company's active subscription tier, ensuring no campaign emails can be dispatched without an active, verified SMTP configuration.

---

## Plan Tiers & Limits

| Plan Name | Max Seats | Max Domains | Max SMTP Accounts | SMTP Required to Send? |
| :--- | :--- | :--- | :--- | :--- |
| **Free** | 1 (1 Admin) | 1 | 1 | Yes (Mandatory) |
| **Essentials** | 3 (1 Admin + 2 Associates/Developers) | 3 | 3 | Yes (Mandatory) |
| **Standard** | 5 (1 Admin + 4 Associates/Developers) | 5 | 5 | Yes (Mandatory) |
| **Premium** | 10 (1 Admin + 9 Associates/Developers) | 10 | 10 | Yes (Mandatory) |

---

## Complete Database Schema & Configuration

### 1. Table Definitions & Relationships

#### A. `companies` Table
Holds tenant company profiles and default domain routing links.
```sql
CREATE TABLE IF NOT EXISTS companies (
  id INT AUTO_INCREMENT PRIMARY KEY,
  company_name VARCHAR(255) NOT NULL,
  domain_name VARCHAR(255) UNIQUE NULL,
  plan_code VARCHAR(50) DEFAULT 'free',
  max_domains INT DEFAULT 1,
  max_smtps INT DEFAULT 1,
  max_seats INT DEFAULT 1,
  status ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

#### B. `plans` / `subscription_plans` Table
Defines plan features, monthly pricing, and default resource limits.
```sql
CREATE TABLE IF NOT EXISTS plans (
  id INT AUTO_INCREMENT PRIMARY KEY,
  plan_code VARCHAR(50) UNIQUE NOT NULL,
  plan_name VARCHAR(100) NOT NULL,
  price_monthly DECIMAL(10, 2) DEFAULT 0.00,
  max_domains INT DEFAULT 1,
  max_smtps INT DEFAULT 1,
  seats_limit INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seed Default Subscription Plan Tiers
INSERT INTO plans (plan_code, plan_name, price_monthly, max_domains, max_smtps, seats_limit)
VALUES 
  ('free', 'Free Plan', 0.00, 1, 1, 1),
  ('essentials', 'Essentials Plan', 29.00, 3, 3, 3),
  ('standard', 'Standard Plan', 79.00, 5, 5, 5),
  ('premium', 'Premium Plan', 199.00, 10, 10, 10)
ON DUPLICATE KEY UPDATE 
  max_domains = VALUES(max_domains), 
  max_smtps = VALUES(max_smtps), 
  seats_limit = VALUES(seats_limit);
```

#### C. `admin_users` Table
Stores system admins, developers, and associates bound to a tenant company (`company_id`).
```sql
ALTER TABLE admin_users ADD COLUMN company_id INT NULL;
ALTER TABLE admin_users ADD COLUMN custom_domains_limit INT NULL;
ALTER TABLE admin_users ADD COLUMN custom_smtps_limit INT NULL;
```

#### D. `registered_domains` Table
Stores multi-tenant custom domains with single Primary (`is_primary = 1`) enforcement.
```sql
CREATE TABLE IF NOT EXISTS registered_domains (
  id INT AUTO_INCREMENT PRIMARY KEY,
  company_name VARCHAR(255) NOT NULL,
  domain_name VARCHAR(255) NOT NULL,
  support_email VARCHAR(255) NULL,
  is_primary TINYINT DEFAULT 0,
  status VARCHAR(20) DEFAULT 'active',
  environment VARCHAR(20) DEFAULT 'live',
  admin_id INT NULL,
  company_id INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

#### E. `senders` Table
Stores custom SMTP configurations with single Primary (`is_default = 1`) enforcement.
```sql
CREATE TABLE IF NOT EXISTS senders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  is_default TINYINT DEFAULT 0,
  is_active TINYINT DEFAULT 1,
  status VARCHAR(20) DEFAULT 'active',
  smtp_host VARCHAR(255) NULL,
  smtp_port INT DEFAULT 587,
  smtp_user VARCHAR(255) NULL,
  smtp_pass VARCHAR(255) NULL,
  smtp_secure VARCHAR(10) DEFAULT 'tls',
  admin_id INT NULL,
  company_id INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

---

### 2. Database Migration Script Execution

To automatically run and verify all database tables, columns, plan limits, and single-primary rules:
```bash
cd bexemail-server
node db-update-multitenant.js
```

---

## Localhost vs. Live Server Routing & Setup

### 1. Localhost Environment Setup (Development)
- **Domain Resolution**: Local testing uses custom hostname entries in your OS `hosts` file:
  - Windows Path: `C:\Windows\System32\drivers\etc\hosts`
  - Linux/Mac Path: `/etc/hosts`
  - Example Host Entries:
    ```text
    127.0.0.1 localhost
    127.0.0.1 tenant1.local
    127.0.0.1 tenant2.local
    ```
- **Tenant Middleware ([`bexemail-server/src/middleware/domainRouter.js`](file:///g:/react-project/bexemail/bexemail-server/src/middleware/domainRouter.js))**:
  Extracts the incoming `Host` header (`req.headers.host.split(':')[0]`).
  If the hostname is `localhost` or `127.0.0.1`, it resolves the default company context (`Bexcode Services`). If a custom hostname is provided (e.g. `tenant1.local`), it matches against `registered_domains` / `companies` in MySQL and attaches `req.companyId`.
- **SMTP Testing**:
  Local email dispatches can use Mailtrap, Ethereal, or Gmail SMTP App Passwords configured under [`SmtpManager.jsx`](file:///g:/react-project/bexemail/bexemail-client/src/components/SmtpManager.jsx).

---

### 2. Live Server Environment Setup (Production: Ubuntu / Nginx / PM2)
- **Wildcard DNS / CNAME Setup**:
  - Add an `A` record pointing `yourdomain.com` to your Live Server IP address.
  - Add a Wildcard `CNAME` or `A` record pointing `*.yourdomain.com` to the server IP.
- **Nginx Reverse Proxy (`/etc/nginx/sites-available/bexemail`)**:
  Ensure Nginx forwards the raw `Host` header to Node.js on port 5000:
  ```nginx
  server {
      server_name bexcodeservices.com *.bexcodeservices.com;

      location / {
          proxy_pass http://127.0.0.1:5000;
          proxy_set_header Host $host;
          proxy_set_header X-Real-IP $remote_addr;
          proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
          proxy_set_header X-Forwarded-Proto $scheme;
      }
  }
  ```
- **Wildcard SSL Certificate (Certbot / Let's Encrypt)**:
  ```bash
  sudo certbot --nginx -d bexcodeservices.com -d '*.bexcodeservices.com'
  ```

---

## File Mappings & Implementation Reference

| Component / Functionality | Implementation File Path |
| :--- | :--- |
| **MySQL Multi-Tenant & Limit Migration** | [`bexemail-server/db-update-multitenant.js`](file:///g:/react-project/bexemail/bexemail-server/db-update-multitenant.js) |
| **Plan Limit Enforcement Middleware** | [`bexemail-server/src/middleware/planCheck.js`](file:///g:/react-project/bexemail/bexemail-server/src/middleware/planCheck.js) |
| **Dynamic Domain Router (Local & Live)** | [`bexemail-server/src/middleware/domainRouter.js`](file:///g:/react-project/bexemail/bexemail-server/src/middleware/domainRouter.js) |
| **Email Service Pre-flight SMTP Check** | [`bexemail-server/src/services/emailService.js`](file:///g:/react-project/bexemail/bexemail-server/src/services/emailService.js) |
| **Senders Backend Controller** | [`bexemail-server/src/controllers/senders.js`](file:///g:/react-project/bexemail/bexemail-server/src/controllers/senders.js) |
| **Domains Backend Controller** | [`bexemail-server/src/controllers/domainsController.js`](file:///g:/react-project/bexemail/bexemail-server/src/controllers/domainsController.js) |
| **SMTP Server Manager UI Component** | [`bexemail-client/src/components/SmtpManager.jsx`](file:///g:/react-project/bexemail/bexemail-client/src/components/SmtpManager.jsx) |
| **Multi-Tenant Domain Manager UI Component** | [`bexemail-client/src/components/DomainManager.jsx`](file:///g:/react-project/bexemail/bexemail-client/src/components/DomainManager.jsx) |
| **Missing SMTP/Domain Redline Alert Banner** | [`bexemail-client/src/components/RedlineAlertBanner.jsx`](file:///g:/react-project/bexemail/bexemail-client/src/components/RedlineAlertBanner.jsx) |
| **Settings Management Page** | [`bexemail-client/src/pages/Settings.jsx`](file:///g:/react-project/bexemail/bexemail-client/src/pages/Settings.jsx) |
| **Profiles & Access Management Page** | [`bexemail-client/src/pages/Profiles.jsx`](file:///g:/react-project/bexemail/bexemail-client/src/pages/Profiles.jsx) |

---

## Step-by-Step Configuration & Verification Guide

### Step 1: Database Migration
To update dynamic plan limits and single-primary rules in MySQL:
```bash
cd bexemail-server
node db-update-multitenant.js
```

### Step 2: Adding a Custom Domain
1. Open the BexEmail Web Dashboard (`http://localhost:3000/settings`).
2. Navigate to **General & Domains** -> **Multi-Tenant Domain Management**.
3. Click **+ Add Domain**.
4. Enter your Company Name and Domain Name (e.g. `tenant1.local` or `bexcodeservices.com`).
5. Click **Save Domain**.
   - If your plan limit is reached (e.g. 1 on Free Plan), a quota error banner will appear.
   - The first domain registered is automatically marked as **`★ PRIMARY`**.

### Step 3: Setting a Domain as Primary
1. Click **Make Primary** next to any secondary registered domain.
2. The UI instantly updates: the target domain receives the **`★ PRIMARY`** badge, and all other domains are automatically unset.
3. A confirmation modal will display:
   > *"Domain configuration for `bexcodeservices.com` has been set as Primary for site/project routing."*

### Step 4: Configuring SMTP Server for Dispatches
1. Navigate to **System Settings** -> **SMTP Delivery** (or **Profiles** -> **SMTP Server Configurations**).
2. Click **+ Add SMTP Sender**.
3. Enter Sender Name, Email Address, Host (`smtp.gmail.com`), Port (`587`), and Security Credentials.
4. Click **Save SMTP Config**.
5. Click **Make Primary** to assign the primary sender for campaign dispatches.
6. Click **Test Connection** to dispatch a verification test email.
