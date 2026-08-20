# External Data Integrations Guide

BexEmail allows you to dynamically import subscribers from external systems without writing any code. You can do this by securely connecting to a **Live API** or a **Live Remote MySQL Database**.

This module is restricted to **Super Admins**.

---

## How to Configure an Integration

1. Log into your BexEmail dashboard as a Super Admin.
2. Navigate to **System Settings** using the left sidebar.
3. Click on the **External Integrations** tab.
4. Click **Add Data Source**.

---

## Option A: Connect via Live API

Use this option if the service you want to pull contacts from offers a REST API (like a CRM, a webhook, or a custom application).

### Step-by-Step
1. **Source Type:** Select `Live API / Webhook GET`.
2. **Endpoint URL:** Paste the full URL of the API endpoint.
   - *Example:* `https://api.yourcrm.com/v1/customers`
3. **API Key (Optional):** If the API requires authentication, paste your API Key or Bearer Token here. The system will automatically inject it securely into the HTTP Headers.
4. **Target List:** Select which Target List (e.g., "Subscribers Directory") the fetched contacts should be added to.
5. **Save and Sync:** Click Save. Once saved, click **Sync Now**. 

**How it works:** BexEmail will hit your URL, download the JSON response, and automatically search the response tree for any fields named `email`. It extracts these and safely injects them into your system.

---

## Option B: Connect via Live Remote Database (MySQL)

Use this option if you want to pull data directly from another application's live database (like an eCommerce store or an internal tool).

### Step-by-Step
1. **Source Type:** Select `Live Remote Database (MySQL)`.
2. **Host/IP:** Paste the remote database IP address (e.g., `192.168.1.100` or `db.example.com`).
3. **Database Name, Username, and Password:** Provide the credentials for a user that has `READ` access on the remote server.
4. **SQL Query:** Paste the exact SQL query required to fetch your users.
   - **CRITICAL:** The query *must* return a column named exactly `email` (or `Email` / `EMAIL`). It can optionally return `first_name` or `name`.
   - *Example:* `SELECT email_address AS email, full_name AS name FROM ecommerce_users WHERE subscribed = 1`
5. **Target List:** Select the list the imported contacts should be mapped to.
6. **Save and Sync:** Click Save. When you click **Sync Now**, the system will query the remote database and import the users.

---

## Troubleshooting

- **Database Connection Refused:** Ensure the remote MySQL server has configured `bind-address` to allow external connections, and that its firewall (e.g., UFW or AWS Security Groups) allows inbound traffic on port 3306 from your BexEmail server's IP address.
- **No Emails Imported:** Ensure the JSON response (for APIs) or the SQL Query (for databases) explicitly contains a field/column named `email`.
