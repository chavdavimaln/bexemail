# BexEmail

BexEmail is a powerful, self-hosted email marketing platform built with **ReactJS** and **Node.js/MySQL**. Designed to rival commercial platforms like Mailchimp, it gives you complete control over your audience, campaigns, automations, and data.

## Features Overview

* **Audience Management:** Easily manage subscribers, segments, and tags. Import contacts and handle hard/soft bounces automatically via webhooks.
* **Campaign Wizard:** A multi-step flow to create, schedule, and dispatch email campaigns using a rich text/drag-and-drop template editor.
* **Automation Engine:** Set up event-driven email workflows (e.g., Welcome series, Drip campaigns) triggered by subscriber activity.
* **Performance Analytics:** Track open rates, click-through rates, and device usage (Mobile vs Desktop) using an embedded tracking pixel.
* **Role-Based Access Control (RBAC):** Secure admin panel with customizable roles (Super Admin, Campaign Manager, Report Viewer).
* **Background Queue:** A robust MySQL-polled background worker (`BullMQ` logic adapted for MySQL) handles throttling and bulk dispatching to protect your SMTP reputation (e.g., Gmail rate limits).

## Tech Stack

* **Frontend:** React.js, Vite, Tailwind CSS v4, Recharts, Lucide Icons.
* **Backend:** Node.js, Express.js, Axios, node-cron.
* **Database:** MySQL.
* **Authentication:** JWT (JSON Web Tokens), bcrypt for passwords, hashed API keys.

## Local Setup Instructions

### 1. Database Configuration
1. Ensure your local MySQL server (XAMPP/WAMP or Docker) is running.
2. Access `phpMyAdmin` (usually `http://localhost/phpmyadmin`) or your MySQL CLI.
3. Create a database named `db_bex_email`.
4. Import the schema files located in `bexemail-server/db/` to initialize the tables. (Start with `schema.sql` and run any subsequent updates).

### 2. Backend Setup (Node.js)
1. Navigate to the server directory:
   ```bash
   cd bexemail-server
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure your Environment Variables:
   * Copy the `.env.example` file to `.env` (or create a `.env` file).
   * Update it with your MySQL credentials, JWT secret, and SMTP settings (e.g., Gmail App Password).
4. Start the Express API server:
   ```bash
   npm start
   ```
   *(Runs on http://localhost:5000)*

### 3. Background Worker Setup
BexEmail uses a separate worker process to handle the heavy lifting of sending emails slowly to avoid spam filters.
1. Open a **new terminal window** in `bexemail-server`.
2. Start the worker:
   ```bash
   node src/workers/worker.js
   ```

### 4. Frontend Setup (React)
1. Navigate to the client directory:
   ```bash
   cd bexemail-client
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
4. Open your browser to **http://localhost:5173/**.

## Architecture

BexEmail uses an **asynchronous queue architecture** to safely send bulk emails. 

1. When a user dispatches a campaign from the React UI, the Express API simply inserts individual rows into the `email_queue` table in MySQL with a status of `pending`. The API responds to the user instantly.
2. The isolated **Background Worker** (`worker.js`) continuously polls the `email_queue` table. It fetches jobs one-by-one (or in batches) and sends them via Nodemailer.
3. The worker enforces strict rate limiting (e.g., 1 email every 3 seconds for Gmail) to prevent your IP from being blacklisted.
4. Any errors (Hard bounces, Authentication failures) are caught by the worker, logged, and the subscriber's status is updated so the queue continues processing without crashing the main application.

### Database Design Notes
* **Cascading Deletes:** If a campaign or subscriber is deleted, their corresponding rows in the `email_queue` and `subscriber_lists` will automatically vanish to prevent database bloat.
* **JSON Tags:** The `tags` column in the subscribers table uses the native MySQL JSON data type, making it highly flexible to add/remove tags on the fly without needing a separate relational table.
* **Queue Architecture:** The `email_queue` uses a BIGINT for its primary key. Because this table will experience a massive volume of inserts and deletes over the lifespan of your app, standard INT limits can be reached surprisingly fast.
