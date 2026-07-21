# Automation module: database, API, and usage guide

This guide explains how to connect BexEmail to MySQL, run the API and workers, call the automation endpoints, and use the automation UI.

## 1. Architecture and data ownership

The React client never acts as the source of truth for automation data. Operational automation data is read from and written to MySQL through the Express API.

| Feature | MySQL source |
| --- | --- |
| Workflows, status, audience, re-entry rules | `automations` |
| Canvas nodes and connections | `automations.workflow_json` |
| Contacts moving through workflows | `automation_contacts` |
| Execution activity and failures | `automation_logs` |
| Published workflow history | `automation_versions` |
| Workflow template gallery | `automation_templates` |
| Product selector | `automation_products` |
| Subscriber tag selector | Distinct values from `subscribers.tags` |
| Audience selector | `lists` |
| Email template selector | `templates` |
| Generated workflow audit history | `automation_generation_history` |
| Dashboard and analytics | Aggregates from the tables above |

The node library and the help/example diagram are UI definitions. They describe available node types but do not represent customer or execution data.

## 2. MySQL connection

### Requirements

- MySQL 8.x or MariaDB with compatible JSON/LONGTEXT behavior
- Node.js 20 or later
- Redis 7.x for executing queued automation steps

Create the database:

```sql
CREATE DATABASE db_bex_email CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'bexemail_user'@'localhost' IDENTIFIED BY 'replace-with-a-strong-password';
GRANT ALL PRIVILEGES ON db_bex_email.* TO 'bexemail_user'@'localhost';
FLUSH PRIVILEGES;
```

Import the latest project snapshot when setting up a new installation:

```bash
mysql -u bexemail_user -p db_bex_email < db_bex_email_200726.sql
```

Create `bexemail-server/.env`:

```env
PORT=5000
DB_HOST=127.0.0.1
DB_USER=bexemail_user
DB_PASSWORD=replace-with-a-strong-password
DB_NAME=db_bex_email

REDIS_HOST=127.0.0.1
REDIS_PORT=6379

SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=mailer@example.com
SMTP_PASSWORD=replace-with-smtp-password
SMTP_FROM=mailer@example.com
SMTP_SECURE=false
```

`src/config/db.js` reads `DB_HOST`, `DB_USER`, `DB_PASSWORD`, and `DB_NAME`. Do not use `DB_PASS`; it is not read by the current connection module.

On API startup, `src/config/setup.js` safely runs `CREATE TABLE IF NOT EXISTS` for supporting tables and seeds default workflow templates/products with `INSERT IGNORE`. Existing rows are not overwritten.

## 3. Run locally

Start MySQL and Redis, then run the API:

```powershell
cd bexemail-server
npm install
node server.js
```

Start the client in another terminal:

```powershell
cd bexemail-client
npm install
npm run dev
```

Development URLs:

- Client: `http://localhost:5173`
- API: `http://localhost:5000`
- Automation dashboard: `http://localhost:5173/automations`

Relative Axios requests use `VITE_API_URL` when supplied and otherwise use `http://localhost:5000` during Vite development. Production Nginx proxies `/api/` to the API container.

## 4. Automation API guide

Base URL: `http://localhost:5000/api/automations`

JSON requests require `Content-Type: application/json`. The client also attaches its stored JWT as `Authorization: Bearer <token>`.

### Workflows

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/` | List workflows with database contact counts |
| `POST` | `/` | Create a persisted draft |
| `GET` | `/:id` | Get settings and parsed `workflow_graph` |
| `PUT` | `/:id` | Save name, trigger, audience, re-entry rules, nodes, and edges |
| `POST` | `/:id/activate` | Validate, version, and activate |
| `POST` | `/:id/pause` | Pause the workflow and active contacts |
| `POST` | `/:id/resume` | Resume the workflow and paused contacts |
| `POST` | `/:id/stop` | Stop the workflow and exit active contacts |
| `POST` | `/:id/duplicate` | Copy the workflow into a new database draft |

Create example:

```bash
curl -X POST http://localhost:5000/api/automations \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Welcome workflow",
    "trigger_type": "subscriber_joins_list",
    "audience_id": 1,
    "reentry_policy": {
      "allowReentry": true,
      "cooldownDays": 7,
      "exitTag": "purchased"
    },
    "workflow_graph": {
      "nodes": [],
      "edges": []
    }
  }'
```

Save canvas example:

```bash
curl -X PUT http://localhost:5000/api/automations/3 \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Welcome workflow",
    "trigger_type": "subscriber_joins_list",
    "workflow_graph": {
      "nodes": [
        {
          "id": "trigger_1",
          "type": "triggerNode",
          "position": { "x": 250, "y": 50 },
          "data": { "label": "Subscriber joins list" }
        }
      ],
      "edges": []
    }
  }'
```

### Templates and builder selectors

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/templates` | Get workflow templates from `automation_templates` |
| `POST` | `/templates/:templateId/use` | Create a database draft from a template |
| `GET` | `/builder-options` | Get products, tags, workflows, lists, and email templates |
| `POST` | `/ai-generate` | Generate a graph and store the prompt/result audit record |

### Testing, contacts, logs, and analytics

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/:id/test` | Dry-run with an existing `subscribers.id`; sends no email |
| `GET` | `/:id/contacts` | List contacts in a workflow |
| `POST` | `/:id/contacts/:contactId/retry` | Return a failed contact to processing |
| `GET` | `/:id/logs` | Get persisted execution logs |
| `GET` | `/:id/logs/:subscriberId` | Get one contact's journey |
| `GET` | `/:id/stats` | Get database-derived summary, daily, and node metrics |
| `GET` | `/dashboard-stats` | Get aggregate automation metrics |
| `GET` | `/activity/recent` | Get recent persisted activity |
| `GET` | `/:id/versions` | List saved publication versions |
| `POST` | `/:id/versions/:versionId/restore` | Restore a version into `workflow_json` |

Dry-run example:

```bash
curl -X POST http://localhost:5000/api/automations/3/test \
  -H "Content-Type: application/json" \
  -d '{ "subscriberId": 2 }'
```

## 5. Use the automation UI

1. Open **Automations → Templates** and choose a database template, or select **Build from Scratch**.
2. In the builder, drag Trigger, Action, Delay, Logic, or Goal nodes from the left library.
3. Connect node handles to draw the journey.
4. Select a node and configure it in the right panel. Products, tags, lists, email templates, and linked workflows come from MySQL.
5. With no node selected, configure audience, re-entry cooldown, and exit tag. These values save to the automation row.
6. Select a node or connection and choose **Delete selected**, or press Delete/Backspace.
7. Select **Save** to persist `workflow_json`.
8. Select **Test**, choose a subscribed database contact, and run a dry-run. No email is sent during this simulation.
9. Select **Activate**. The API validates the graph, stores a version, and changes status to `active`.
10. Use Contacts, Logs, and Analytics to inspect database execution state.

## 6. Execution requirements

Active workflows require Redis. When Redis is reachable, `server.js` loads the automation processor and cron worker. If Redis is unavailable, workflow CRUD and reports still work, but queued contacts do not advance.

The API and worker must use the same MySQL and Redis configuration. Email actions create individual queue jobs; do not send marketing mail through CC/BCC lists.

## 7. Troubleshooting

### Page shows empty data

- Confirm `http://localhost:5000/api/automations` returns JSON.
- Confirm the client has `VITE_API_URL=http://localhost:5000` when using a nonstandard API host.
- Restart the API after controller or route changes.

### Database connection fails

- Confirm MySQL is listening on `DB_HOST`.
- Verify `DB_PASSWORD`, not `DB_PASS`.
- Confirm the database user has privileges on `DB_NAME`.

### Workflow does not execute

- Confirm the workflow status is `active`.
- Confirm Redis is running and the server log says automation workers started.
- Confirm the graph contains a trigger and at least one action.
- Inspect `automation_contacts` and `automation_logs` for current status and errors.

### Analytics are zero

Analytics are calculated from `automation_contacts` and `automation_logs`; zero is correct until contacts enter and steps execute.

