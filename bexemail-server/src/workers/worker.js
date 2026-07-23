require('dotenv').config(); // Load from bexemail-server/.env
const pool = require('../config/db');
const nodemailer = require('nodemailer');

function cleanEnv(val) {
  if (!val) return '';
  return String(val).replace(/^["']|["']$/g, '').trim();
}

const defaultHost = cleanEnv(process.env.SMTP_HOST) || 'smtp.gmail.com';
const defaultPort = parseInt(cleanEnv(process.env.SMTP_PORT)) || 465;
const defaultUser = cleanEnv(process.env.SMTP_USER) || 'info@bexcodeservices.com';
const defaultPass = cleanEnv(process.env.SMTP_PASSWORD) || cleanEnv(process.env.SMTP_PASS) || 'tbwffkmwugtbaiuw';
const defaultSecure = cleanEnv(process.env.SMTP_SECURE) === 'true' || defaultPort === 465;

function createMailTransporter(senderObj, sysSettings = {}) {
  const host = cleanEnv(senderObj?.smtp_host) || sysSettings.smtp_host || defaultHost;
  const port = parseInt(senderObj?.smtp_port || sysSettings.smtp_port) || defaultPort;
  const user = cleanEnv(senderObj?.smtp_user) || sysSettings.smtp_user || defaultUser;
  const pass = cleanEnv(senderObj?.smtp_pass) || sysSettings.smtp_pass || sysSettings.smtp_password || defaultPass;
  const isSecure = (senderObj?.smtp_secure === 'true' || senderObj?.smtp_secure === 'ssl' || sysSettings.smtp_secure === 'true' || port === 465);

  return nodemailer.createTransport({
    host: host,
    port: port,
    secure: isSecure,
    auth: user && pass ? { user, pass } : undefined,
    tls: {
      rejectUnauthorized: false
    }
  });
}

async function processQueue() {
  let connection;
  try {
    connection = await pool.getConnection();

    // Fetch one pending email at a time to respect limits
    const [rows] = await connection.query(
      `SELECT q.id, q.recipient_id, q.campaign_id, c.subject, c.html_content, c.status as campaign_status,
              s.email, s.first_name, snd.name as sender_name, snd.email as sender_email,
              snd.smtp_host, snd.smtp_port, snd.smtp_user, snd.smtp_pass, snd.smtp_secure
       FROM email_queue q
       JOIN campaigns c ON q.campaign_id = c.id
       JOIN subscribers s ON q.recipient_id = s.id
       LEFT JOIN senders snd ON c.sender_id = snd.id
       WHERE q.status = 'pending' 
       AND (c.status = 'sending' OR (c.status = 'scheduled' AND (c.scheduled_at IS NULL OR c.scheduled_at <= NOW())))
       ORDER BY q.created_at ASC
       LIMIT 1 FOR UPDATE`
    );

    if (rows.length === 0) {
      return; // No pending emails
    }

    const job = rows[0];
    console.log(`[Worker] Processing email queue job #${job.id} for recipient: ${job.email}`);

    try {
      // 1. Process HTML for tracking
      const cheerio = require('cheerio');
      const $ = cheerio.load(job.html_content || '');
      
      const baseUrl = process.env.API_URL || 'http://localhost:5000';
      $('a').each((i, link) => {
        const originalHref = $(link).attr('href');
        if (originalHref && !originalHref.startsWith('mailto:') && !originalHref.startsWith('tel:')) {
          const encodedUrl = encodeURIComponent(originalHref);
          const trackingLink = `${baseUrl}/api/track/click/${job.campaign_id}/${job.recipient_id}?url=${encodedUrl}`;
          $(link).attr('href', trackingLink);
        }
      });

      // Append 1x1 open tracking pixel
      const pixelUrl = `${baseUrl}/api/track/open/${job.campaign_id}/${job.recipient_id}`;
      $('body').append(`<img src="${pixelUrl}" width="1" height="1" alt="" style="display:none;" />`);

      const finalHtml = $.html();

      // Create transporter dynamically
      const transporter = createMailTransporter(job);

      const senderEmail = job.sender_email || defaultUser;
      const senderName = job.sender_name || 'BexEmail';
      
      await transporter.sendMail({
        from: `"${senderName}" <${senderEmail}>`,
        replyTo: `"${senderName}" <${senderEmail}>`,
        to: job.email,
        subject: job.subject,
        html: finalHtml 
      });

      // Mark as sent
      await connection.query(
        `UPDATE email_queue SET status = 'sent' WHERE id = ?`,
        [job.id]
      );
      console.log(`[Worker] Job #${job.id} sent successfully to ${job.email}`);

    } catch (sendError) {
      console.error(`[Worker] Failed to send job #${job.id} to ${job.email}:`, sendError.message);
      
      let errorCategory = 'Failed';
      let errorMessage = sendError.message;

      if (sendError.responseCode >= 500 && sendError.responseCode <= 599) {
        errorCategory = 'Hard Bounce (SMTP 5xx)';
      } else if (sendError.responseCode >= 400 && sendError.responseCode <= 499) {
        errorCategory = 'Soft Bounce (SMTP 4xx)';
      } else if (sendError.code === 'EAUTH') {
        errorCategory = 'Authentication Failed';
      }

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
      console.log(`[Worker] Campaign #${job.campaign_id} fully sent and completed!`);
    }

  } catch (err) {
    console.error('[Worker] Database error in queue worker:', err);
  } finally {
    if (connection) connection.release();
  }
}

// Poll every 3 seconds
console.log('[Worker] Email queue worker started. Rate limit: 1 email per 3 seconds.');
setInterval(processQueue, 3000);
