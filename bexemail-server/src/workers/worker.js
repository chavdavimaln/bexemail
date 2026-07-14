require('dotenv').config(); // Load from bexemail-server/.env
const pool = require('../config/db');
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.ethereal.email',
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true' || parseInt(process.env.SMTP_PORT) === 465,
  auth: {
    user: process.env.SMTP_USER || 'your_smtp_user',
    pass: process.env.SMTP_PASSWORD || process.env.SMTP_PASS || 'your_smtp_password'
  }
});

async function processQueue() {
  console.log('Checking email queue...');
  let connection;
  try {
    connection = await pool.getConnection();

    // Fetch one pending email at a time to respect limits
    const [rows] = await connection.query(
      `SELECT q.id, q.recipient_id, q.campaign_id, c.subject, c.html_content, s.email, s.first_name, snd.name as sender_name, snd.email as sender_email
       FROM email_queue q
       JOIN campaigns c ON q.campaign_id = c.id
       JOIN subscribers s ON q.recipient_id = s.id
       LEFT JOIN senders snd ON c.sender_id = snd.id
       WHERE q.status = 'pending' 
       AND c.status = 'sending'
       AND (c.scheduled_at IS NULL OR c.scheduled_at <= NOW())
       ORDER BY q.created_at ASC
       LIMIT 1 FOR UPDATE`
    );

    if (rows.length === 0) {
      return; // No pending emails
    }

    const job = rows[0];
    console.log(`Processing job ${job.id} for ${job.email}`);

    try {
      // Send mail
      await transporter.sendMail({
        from: `"${job.sender_name || 'BexEmail'}" <${job.sender_email || process.env.SMTP_FROM}>`,
        to: job.email,
        subject: job.subject,
        html: job.html_content // In a real app, you might replace placeholders here
      });

      // Mark as sent
      await connection.query(
        `UPDATE email_queue SET status = 'sent' WHERE id = ?`,
        [job.id]
      );
      console.log(`Job ${job.id} sent successfully.`);

    } catch (sendError) {
      console.error(`[Worker] Failed to send job ${job.id} to ${job.email}:`, sendError.message);
      
      let errorCategory = 'Failed';
      let errorMessage = sendError.message;

      // Gracefully catch standard SMTP rejection errors
      if (sendError.responseCode >= 500 && sendError.responseCode <= 599) {
        errorCategory = 'Hard Bounce (SMTP 5xx)';
        console.warn(`[Worker] Hard Bounce detected for ${job.email}: ${sendError.response}`);
      } else if (sendError.responseCode >= 400 && sendError.responseCode <= 499) {
        errorCategory = 'Soft Bounce (SMTP 4xx)';
        console.warn(`[Worker] Soft Bounce/Rate Limit detected for ${job.email}: ${sendError.response}`);
      } else if (sendError.code === 'EAUTH') {
        errorCategory = 'Authentication Failed';
        console.error(`[Worker] CRITICAL: Gmail Authentication Failed. Check App Password.`);
      }

      // Mark as failed in queue
      await connection.query(
        `UPDATE email_queue SET status = 'failed', error_message = ? WHERE id = ?`,
        [`[${errorCategory}] ${errorMessage}`, job.id]
      );
    }

    // After updating queue (sent or failed), check if campaign is fully completed
    const [pendingJobs] = await connection.query(
      `SELECT COUNT(*) as count FROM email_queue WHERE campaign_id = ? AND status = 'pending'`,
      [job.campaign_id]
    );
    if (pendingJobs[0].count === 0) {
      await connection.query(`UPDATE campaigns SET status = 'sent' WHERE id = ?`, [job.campaign_id]);
      console.log(`Campaign ${job.campaign_id} is now fully completed.`);
    }

  } catch (err) {
    console.error('Database error in worker:', err);
  } finally {
    if (connection) connection.release();
  }
}

// Poll every 3 seconds for strict Gmail rate-limiting (max 1 email every 3 seconds)
console.log('Email queue worker started. Rate limit: 1 email per 3 seconds.');
setInterval(processQueue, 3000);
