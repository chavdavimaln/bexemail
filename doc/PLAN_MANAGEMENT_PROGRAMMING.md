# Plan Management & Pricing Module Programming Guide

## 1. Executive Summary
This document provides complete developer documentation for the BexEmail Marketing Plan Management, Dynamic Pricing System, and User Plan Assignment Architecture.

---

## 2. System Architecture & File Structure

### Frontend Module (`bexemail-client`)
```
src/
 ├── modules/
 │    └── pricing/
 │         ├── components/
 │         │    ├── TryForFreeHero.jsx      # Standard Plan 14-Day Free Trial Hero (PDF Page 1)
 │         │    ├── Save50Hero.jsx          # 50% Off Discount Hero (PDF Page 2)
 │         │    ├── PlansGrid.jsx           # Dynamic 4-Plan Grid Connected to DB (PDF Page 3)
 │         │    ├── TrustedIndustryLeader.jsx# "Work with a trusted industry leader" section
 │         │    ├── SmallBusinessPlans.jsx  # "Basic plans for smaller businesses" section
 │         │    └── PricingFAQs.jsx         # Accordion FAQ section
 │         └── index.js                      # Barrel export
 ├── pages/
 │    ├── Pricing.jsx                       # Full Marketing Pricing Landing Page (/pricing)
 │    ├── ComparePlans.jsx                  # Feature Comparison Matrix (/compare-plans)
 │    ├── PlanManagement.jsx                # Admin Control Panel for Plans & Assignments (/settings/plans)
 │    └── Register.jsx                     # Self-registration with 14-day trial plan badges
```

### Backend Architecture (`bexemail-server`)
```
src/
 ├── controllers/
 │    └── planController.js                 # Complete CRUD, Backup, Restore, & Assign APIs
 └── routes/
      └── planRoutes.js                     # REST endpoints for marketing plans
```

---

## 3. Database Schema

### Table 1: `plans`
Stores all dynamic marketing plans configured by Admin:
```sql
CREATE TABLE IF NOT EXISTS plans (
  id INT AUTO_INCREMENT PRIMARY KEY,
  plan_code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  tagline VARCHAR(255),
  monthly_price DECIMAL(10,2) DEFAULT 0.00,
  discount_percent INT DEFAULT 50,
  trial_days INT DEFAULT 14,
  contacts_limit INT DEFAULT 350,
  emails_limit INT DEFAULT 1000,
  is_popular TINYINT(1) DEFAULT 0,
  features JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### Table 2: `user_subscriptions`
Tracks assigned plans & 14-day trial expiration for registered users:
```sql
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  plan_id INT NOT NULL,
  plan_code VARCHAR(50) NOT NULL,
  trial_days INT DEFAULT 14,
  trial_start DATETIME DEFAULT CURRENT_TIMESTAMP,
  trial_end DATETIME,
  status VARCHAR(30) DEFAULT 'trialing',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX (user_id),
  INDEX (plan_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

---

## 4. REST API Endpoint Specifications

| Method | Endpoint | Access Level | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/plans` | Public | Retrieves all active marketing plans with prices, limits & features |
| `POST` | `/api/plans` | Admin | Adds a new marketing plan to database |
| `PUT` | `/api/plans/:id` | Admin | Updates plan pricing, discount %, trial days, limits, features |
| `DELETE` | `/api/plans/:id` | Admin | Deletes a plan from catalogue |
| `GET` | `/api/plans/backup` | Admin | Downloads a JSON snapshot backup of all plans & user assignments |
| `POST` | `/api/plans/restore` | Admin | Restores plans from uploaded JSON snapshot |
| `GET` | `/api/plans/user-subscriptions` | Admin | Lists registered users with their assigned plan & trial status |
| `POST` | `/api/plans/assign` | Admin | Previews & assigns a plan & trial days to a user |
| `POST` | `/api/plans/deassign` | Admin | Resets a user's plan to Free tier / deassigned status |

---

## 5. Non-Regression & Isolation Verification
All code changes are strictly isolated within dedicated routes (`/pricing`, `/compare-plans`, `/settings/plans`, `/api/plans`) and do not modify existing subscriber, campaign, or authentication table structures.
