# BexEmail - Complete Technical & Operational Architecture Guide

Welcome to the master technical documentation for **BexEmail**, an enterprise multi-tenant Email Marketing, Automation, CRM, and Resource Governance platform.

---

## 1. Executive Summary & Tech Stack

### Core Platform Architecture
- **Frontend Stack**: React 19, Vite 8, Tailwind CSS 4, React Router v7, Lucide Icons, Recharts, Axios.
- **Backend Stack**: Node.js, Express.js, MySQL (mysql2 connection pool), Nodemailer, BullMQ (Redis optional standalone mode), JWT Authentication, bcryptjs.
- **Multi-Tenant Architecture**: Dynamic Domain Routing middleware (`domainRouter.js`), Resource Governance Plan Limits (`planCheck.js`), Single Primary Item Enforcement (`is_primary` / `is_default`), Pre-flight Active SMTP Check (`emailService.js`).

---

## 2. Subscription Plan Tiers & Resource Limits

| Plan Tier | Max Seats / Admins | Max Domains Allowed | Max SMTP Servers Allowed | Mandatory SMTP Check? |
| :--- | :--- | :--- | :--- | :--- |
| **Free Plan** | **1** (1 Admin) | **1** | **1** | **Yes (Mandatory)** |
| **Essentials Plan** | **3** (1 Admin + 2 Associates/Devs) | **3** | **3** | **Yes (Mandatory)** |
| **Standard Plan** | **5** (1 Admin + 4 Associates/Devs) | **5** | **5** | **Yes (Mandatory)** |
| **Premium Plan** | **10** (1 Admin + 9 Associates/Devs) | **10** | **10** | **Yes (Mandatory)** |

---

## 3. Database Architecture & Schema Reference

### A. Core Multi-Tenant Tables

#### 1. `companies` Table
Stores tenant organization profiles and dynamic limit allocations.
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

#### 2. `plans` Table
Stores subscription plan pricing and resource bounds. Default seeds: `free` (1,1,1), `essentials` (3,3,3), `standard` (5,5,5), `premium` (10,10,10).

#### 3. `admin_users` Table
Stores system admins, developers, associates, and users linked to `company_id`.

#### 4. `registered_domains` Table
Stores multi-tenant custom domains with single Primary (`is_primary = 1`) enforcement.

#### 5. `senders` Table
Stores custom SMTP configurations with single Primary (`is_default = 1`) enforcement and active/inactive status switches (`is_active`, `status`).

---

## 4. Module By Module Functional Guide

### 1. Dashboard Overview & Analytics ([`Dashboard.jsx`](file:///g:/react-project/bexemail/bexemail-client/src/pages/Dashboard.jsx))
- Displays real-time subscriber counts, active dispatches, open rates, click rates, and pending queues.
- Features interactive area charts powered by Recharts.

### 2. Multi-Tenant Domain Management ([`DomainManager.jsx`](file:///g:/react-project/bexemail/bexemail-client/src/components/DomainManager.jsx))
- Displays quota badges based on active subscription tier (`1/1`, `3/3`, `5/5`, `10/10`).
- Enforces single `★ PRIMARY` domain per organization. Setting a domain as Primary automatically unsets all others.
- Provides a single-click Active/Inactive status toggle switch (`PUT /api/domains/:id/toggle-status`).

### 3. SMTP Server Configurations ([`SmtpManager.jsx`](file:///g:/react-project/bexemail/bexemail-client/src/components/SmtpManager.jsx))
- Displays configured senders, host/port (`smtp.gmail.com:587`), security mode (`TLS`/`SSL`), and single `★ PRIMARY` badge.
- Enforces pre-flight SMTP checks before email campaigns are dispatched.
- Features single-click Active/Inactive toggle (`PUT /api/senders/:id/toggle-status`) and instant connection verifier (`POST /api/senders/:id/test`).

### 4. Redline Warning Banner ([`RedlineAlertBanner.jsx`](file:///g:/react-project/bexemail/bexemail-client/src/components/RedlineAlertBanner.jsx))
- Renders prominent warning banners on the dashboard and main pages if 0 SMTP configurations or 0 registered domains exist.

### 5. Subscribers Directory & Target Lists ([`Contacts.jsx`](file:///g:/react-project/bexemail/bexemail-client/src/pages/Contacts.jsx) & [`TargetLists.jsx`](file:///g:/react-project/bexemail/bexemail-client/src/pages/TargetLists.jsx))
- Manages subscriber emails, status (`subscribed`, `unsubscribed`, `bounced`), custom field attributes, and list segmentations.

### 6. Bulk Import & Export ([`BulkImportPage.jsx`](file:///g:/react-project/bexemail/bexemail-client/src/modules/bulk-import/pages/BulkImportPage.jsx) & [`ExportPanel.jsx`](file:///g:/react-project/bexemail/bexemail-client/src/pages/ExportPanel.jsx))
- Supports bulk CSV and Excel (`.xlsx`) subscriber ingestion with duplicate detection, validation logs, and history tracking.

### 7. Campaign Wizard & Email Templates ([`CampaignWizard.jsx`](file:///g:/react-project/bexemail/bexemail-client/src/pages/CampaignWizard.jsx) & [`TemplateEditor.jsx`](file:///g:/react-project/bexemail/bexemail-client/src/pages/TemplateEditor.jsx))
- Features rich HTML WYSIWYG editor, predesigned industry templates, AI Copywriter JSON generator, and A/B Variant testing generator.

### 8. Automation Engine & Workflows ([`AutomationProvider.jsx`](file:///g:/react-project/bexemail/bexemail-client/src/modules/automations))
- Visual node builder for automated email drip sequences, delay triggers, subscriber tag events, and conditional splits.

### 9. System Settings & External Data Integrations ([`Settings.jsx`](file:///g:/react-project/bexemail/bexemail-client/src/pages/Settings.jsx))
- Connects live external REST APIs or remote MySQL databases to dynamically fetch and sync subscriber records into target lists.

### 10. User Profiles & Permission Manager ([`Profiles.jsx`](file:///g:/react-project/bexemail/bexemail-client/src/pages/Profiles.jsx) & [`PermissionsManager.jsx`](file:///g:/react-project/bexemail/bexemail-client/src/pages/PermissionsManager.jsx))
- Manages user profiles, role-based access control (RBAC), and granular section permissions.

---

## 5. Localhost & Live Server Deployment Guide

### Localhost Development Setup
1. **Start Backend Server**:
   ```bash
   cd bexemail-server
   npm start
   ```
   Server listens on `http://127.0.0.1:5000`.
2. **Start Frontend Client**:
   ```bash
   cd bexemail-client
   npm start
   ```
   Client listens on `http://localhost:3000` (or `http://127.0.0.1:3000`).

### Live Production Deployment (Ubuntu / Nginx / PM2)
1. **Database Migration**:
   ```bash
   cd bexemail-server
   node db-update-multitenant.js
   ```
2. **Nginx Reverse Proxy Configuration (`/etc/nginx/sites-available/bexemail`)**:
   ```nginx
   server {
       listen 80;
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
3. **PM2 Daemon Management**:
   ```bash
   pm2 start server.js --name "bexemail-backend"
   ```
4. **SSL Certificate Configuration**:
   ```bash
   sudo certbot --nginx -d bexcodeservices.com -d '*.bexcodeservices.com'
   ```

---

## 6. Complete File Reference Index

| Category | File Path |
| :--- | :--- |
| **Server Entry Point** | [`bexemail-server/server.js`](file:///g:/react-project/bexemail/bexemail-server/server.js) |
| **Database Connection Pool** | [`bexemail-server/src/config/db.js`](file:///g:/react-project/bexemail/bexemail-server/src/config/db.js) |
| **Multi-Tenant Migration Script** | [`bexemail-server/db-update-multitenant.js`](file:///g:/react-project/bexemail/bexemail-server/db-update-multitenant.js) |
| **Dynamic Domain Router Middleware** | [`bexemail-server/src/middleware/domainRouter.js`](file:///g:/react-project/bexemail/bexemail-server/src/middleware/domainRouter.js) |
| **Plan Limits Middleware** | [`bexemail-server/src/middleware/planCheck.js`](file:///g:/react-project/bexemail/bexemail-server/src/middleware/planCheck.js) |
| **Plan Limits Utility** | [`bexemail-server/src/utils/planLimits.js`](file:///g:/react-project/bexemail/bexemail-server/src/utils/planLimits.js) |
| **Email Service & Dispatcher** | [`bexemail-server/src/services/emailService.js`](file:///g:/react-project/bexemail/bexemail-server/src/services/emailService.js) |
| **Senders Backend Controller** | [`bexemail-server/src/controllers/senders.js`](file:///g:/react-project/bexemail/bexemail-server/src/controllers/senders.js) |
| **Domains Backend Controller** | [`bexemail-server/src/controllers/domainsController.js`](file:///g:/react-project/bexemail/bexemail-server/src/controllers/domainsController.js) |
| **API Express Routes** | [`bexemail-server/src/routes/api.js`](file:///g:/react-project/bexemail/bexemail-server/src/routes/api.js) |
| **React App Router & Shell** | [`bexemail-client/src/App.jsx`](file:///g:/react-project/bexemail/bexemail-client/src/App.jsx) |
| **Layout Component** | [`bexemail-client/src/components/Layout.jsx`](file:///g:/react-project/bexemail/bexemail-client/src/components/Layout.jsx) |
| **SMTP Server Manager UI** | [`bexemail-client/src/components/SmtpManager.jsx`](file:///g:/react-project/bexemail/bexemail-client/src/components/SmtpManager.jsx) |
| **Domain Manager UI** | [`bexemail-client/src/components/DomainManager.jsx`](file:///g:/react-project/bexemail/bexemail-client/src/components/DomainManager.jsx) |
| **Redline Warning Banner UI** | [`bexemail-client/src/components/RedlineAlertBanner.jsx`](file:///g:/react-project/bexemail/bexemail-client/src/components/RedlineAlertBanner.jsx) |
| **System Settings Page** | [`bexemail-client/src/pages/Settings.jsx`](file:///g:/react-project/bexemail/bexemail-client/src/pages/Settings.jsx) |
| **Profiles & Access Page** | [`bexemail-client/src/pages/Profiles.jsx`](file:///g:/react-project/bexemail/bexemail-client/src/pages/Profiles.jsx) |
| **Login Page** | [`bexemail-client/src/pages/Login.jsx`](file:///g:/react-project/bexemail/bexemail-client/src/pages/Login.jsx) |
| **Reset Password Page** | [`bexemail-client/src/pages/ResetPassword.jsx`](file:///g:/react-project/bexemail/bexemail-client/src/pages/ResetPassword.jsx) |
