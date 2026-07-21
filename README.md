# BexEmail

A comprehensive, decoupled email marketing and automation platform built with React, Node.js, and BullMQ.

## Features
- **Visual Workflow Builder**: Drag and drop nodes (Trigger, Delay, Split, Send Email) using `@xyflow/react`.
- **Campaign Wizard**: An 8-step wizard to guide users through email creation.
- **Asynchronous Execution**: Uses BullMQ for reliable background processing and rate-limiting.
- **Webhook Integration**: External apps can trigger workflows via webhooks.
- **Analytics**: Track Opens, Clicks, and view Reports in real-time.

## Setup Instructions

### 1. Database
Create a MySQL database and import the required schema (found in the root).
```bash
mysql -u root -p -e "CREATE DATABASE db_bex_email;"
```

### 2. Environment Variables (.env)
Create a `.env` file in the `bexemail-server` directory.
```env
DB_HOST=localhost
DB_USER=root
DB_PASS=
DB_NAME=db_bex_email
PORT=5000
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
SMTP_HOST=smtp.your-provider.com
SMTP_PORT=587
SMTP_USER=user
SMTP_PASS=password
```

### 3. Start Backend Services
Make sure Redis and MySQL are running on your machine.
```bash
cd bexemail-server
npm install
# Start API and Workers using PM2 (or node server.js)
npm start
```

### 4. Start Frontend
```bash
cd bexemail-client
npm install
npm start
```

For setup and usage, see [`docs/AUTOMATION_MODULE_GUIDE.md`](docs/AUTOMATION_MODULE_GUIDE.md). For production deployment, see [`docs/deployment_guide.md`](docs/deployment_guide.md).
