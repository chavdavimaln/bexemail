# Bulk Import & Multi-Site Segregation Guide

This guide explains how to use the Bulk Import module, its API endpoints, domain plans/integration strategies, and how to operate and manage contact bifurcation.

---

## 1. How It Works

This module allows importing contact lists (CSV, TXT, or manual text) segregated by an **Origin Site** (e.g. `domain1.com`, `domain2.com`). 

### Core Database Architecture
To ensure compatibility with existing campaign dispatches, unsubscribes, and preference checks, the primary `subscribers` table maintains a `UNIQUE` constraint on `email`.
Instead of duplication in the primary table:
1. Contact site segregation details are stored in the `subscriber_origins` table.
2. List assignments per site are stored in `subscriber_list_origins`.
3. Standard target list registrations are mirrored in `subscriber_lists` to maintain complete functionality in other parts of BexEmail.

---

## 2. API Endpoints

### Parse Contacts
* **Route**: `POST /api/bulk-import/parse`
* **Payload**:
  ```json
  {
    "emailsRaw": "user1@domain.com, user2@gmail.com\nuser3@domain.com",
    "originSite": "site1.com"
  }
  ```
* **Returns**: Splits list into `newContacts` and `conflicts` (pre-existing emails).

### Confirm & Execute Import
* **Route**: `POST /api/bulk-import/confirm`
* **Payload**:
  ```json
  {
    "originSite": "site1.com",
    "importType": "csv",
    "filename": "site1_subscribers.csv",
    "listIds": [1, 2],
    "contacts": [
      { "email": "user1@domain.com", "name": "Vimal", "conflictAction": null },
      { "email": "user2@gmail.com", "name": "Komal", "conflictAction": "separate" }
    ]
  }
  ```
* **conflictAction Options**:
  - `merge`: Combines target lists and details globally under the single subscriber record.
  - `separate`: Bifurcates details specifically for this origin site (maintaining separate list assignments and names inside database schemas).

### Revert/Rollback Import
* **Route**: `POST /api/bulk-import/logs/:id/rollback`
* **Description**: Undo an import. Deletes subscribers added during the import and restores pre-existing conflicting subscribers back to their exact state prior to the import.

### Fetch History Logs
* **Route**: `GET /api/bulk-import/logs`
* **Returns**: Array of previous imports including filename, origin site, date, and type.

### Fetch Bifurcated Directory
* **Route**: `GET /api/bulk-import/subscribers`
* **Returns**: Subscribers with origin records and site list mappings.

---

## 3. Domain Plan Integration & Multi-Domain Setup

### Differentiating Site Domains in the UI
In the Bulk Import screen, users specify the **Origin Site** of the contacts (e.g. `domain1.com`). The UI displays visual tags on each contact card or row representing which origin domains they belongs to.

### Designing for Future Premium "Domain Plans" (Subscription Plans)
To monetize this setup by charging users based on active domains or total subscribers per domain:
1. **Adding Domain Limits**:
   Define a `domain_limits` setting or query a user's selected plan. If their plan allows max 2 domains, check the number of distinct `origin_site` entries in `subscriber_origins` before allowing a new import.
2. **Billing Mappings**:
   Integrate stripe or local billing scripts to verify active subscription plans against `subscriber_origins` counts:
   ```javascript
   const [domainCount] = await pool.query('SELECT COUNT(DISTINCT origin_site) as count FROM subscriber_origins');
   if (domainCount >= allowedPlanDomains) {
     throw new Error("Plan limit reached. Upgrade to add more domains.");
   }
   ```
3. **Integrating Dynamic Sending Domains**:
   To send campaign emails from the matching origin domain, the mail dispatcher worker (`worker.js` / `cron.js`) can look up `subscriber_origins` for each recipient, find their associated `origin_site`, and configure the SMTP `From:` header dynamically based on the matching domain name SMTP credentials.
