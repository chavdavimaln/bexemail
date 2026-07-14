# BexEmail - Email Marketing Admin Panel

BexEmail is a scalable, Mailchimp-like email marketing admin panel built with ReactJS, Tailwind CSS, Node.js, and MySQL. It supports bulk sending, one-to-one emails, campaign scheduling, and detailed analytics.

## Tech Stack
* **Frontend:** ReactJS, Tailwind CSS, Axios, React Router.
* **Backend:** Node.js, Express.js, BullMQ (for email queuing).
* **Database:** MySQL (Strictly).

## 1. Database Setup (phpMyAdmin)
1. Ensure XAMPP/WAMP or your local MySQL server is running.
2. Open your browser and go to `http://localhost/phpmyadmin`.
3. Click on **Databases** and create a new database named exactly: `db_bex_email`.
4. Import the `schema.sql` (found in `/backend/db/`) into this database to create all necessary tables.

## 2. Backend Setup (Node.js)
1. Open a terminal and navigate to the backend folder: `cd backend`
2. Install dependencies: `npm install`
3. Configure your `.env` file with your MySQL credentials:
   DB_HOST=localhost
   DB_USER=root
   DB_PASS=
   DB_NAME=db_bex_email
   SMTP_HOST=your_smtp_provider
4. Start the server: `npm run dev` (Runs on port 5000)
5. Start the background queue worker: `npm run worker` (Crucial for sending emails without blocking the server).

## 3. Frontend Setup (ReactJS)
1. Open a terminal and navigate to the frontend folder: `cd frontend`
2. Install dependencies: `npm install`
3. Configure your `.env` file:
   VITE_API_BASE_URL=http://localhost:5000/api
4. Start the development server: `npm run dev` (Runs on port 5173)

## Important Architectural Note
Do not send marketing blasts using a single visible recipient list (CC/BCC). Every bulk campaign must create individual recipient jobs in the queue. The React frontend only *starts* the campaign; the Node.js background workers process the queue and send the emails in controlled batches via SMTP.
