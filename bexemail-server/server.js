const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // For standard HTML forms

// Routes will be added here
app.get('/', (req, res) => {
  res.json({ message: 'BexEmail API is running successfully on port 5000!' });
});
app.use('/api', require('./src/routes/api'));
app.use('/api/webhooks', require('./src/routes/webhooks'));

const PORT = process.env.PORT || 5000;

// Initialize Cron Workers
require('./src/workers/cron');
require('./src/workers/cleanupCron');
require('./src/workers/worker');

const setupDB = require('./src/config/setup');

app.listen(PORT, async () => {
  await setupDB();
  console.log(`Server running on port ${PORT}`);
});
