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

function createMailTransporter(senderObj, sysSettings = {}, forceDefault = false) {
  if (forceDefault) {
    return nodemailer.createTransport({
      host: defaultHost,
      port: defaultPort,
      secure: defaultSecure,
      auth: defaultUser && defaultPass ? { user: defaultUser, pass: defaultPass } : undefined,
      tls: { rejectUnauthorized: false }
    });
  }

  const host = cleanEnv(senderObj?.smtp_host) || sysSettings.smtp_host || defaultHost;
  const port = parseInt(senderObj?.smtp_port || sysSettings.smtp_port) || defaultPort;
  const user = cleanEnv(senderObj?.smtp_user) || cleanEnv(senderObj?.sender_email) || sysSettings.smtp_user || defaultUser;
  const pass = cleanEnv(senderObj?.smtp_pass || sysSettings.smtp_pass || sysSettings.smtp_password || defaultPass).replace(/\s+/g, '');
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

async function resolveCompletedCampaigns(connection) {
  try {
    await connection.query(`
      UPDATE campaigns c 
      SET c.status = CASE 
        WHEN (SELECT COUNT(*) FROM email_queue eq WHERE eq.campaign_id = c.id AND eq.status = 'sent') > 0 THEN 'sent' 
        WHEN (SELECT COUNT(*) FROM email_queue eq WHERE eq.campaign_id = c.id AND eq.status = 'failed') > 0 THEN 'failed'
        ELSE c.status 
      END
      WHERE c.status IN ('sending', 'scheduled', 'draft', 'in_progress', 'review');
    `);
  } catch (err) {
    console.error('[Worker] Error resolving campaign status:', err.message);
  }
}

async function processQueue() {
  let connection;
  try {
    connection = await pool.getConnection();

    // 1. Acquire MySQL named lock to guarantee SINGLE-INSTANCE worker execution across all processes
    const [lockRes] = await connection.query(`SELECT GET_LOCK('bexemail_worker_singleton_lock', 0) as acquired`);
    if (!lockRes || lockRes[0]?.acquired !== 1) {
      return; // Another process is currently executing queue processing
    }

    try {
      const [rows] = await connection.query(`
        SELECT q.id, q.recipient_id, q.campaign_id, q.sender_id as queue_sender_id,
               c.subject, c.html_content, c.status as campaign_status,
               s.email, s.first_name, snd.id as sender_id, snd.name as sender_name, snd.email as sender_email,
               snd.smtp_host, snd.smtp_port, snd.smtp_user, snd.smtp_pass, snd.smtp_secure
        FROM email_queue q
         JOIN campaigns c ON q.campaign_id = c.id
         JOIN subscribers s ON q.recipient_id = s.id
         LEFT JOIN senders snd ON (
           (q.sender_id IS NOT NULL AND snd.id = q.sender_id) OR
           (q.sender_id IS NULL AND (c.sender_id COLLATE utf8mb4_general_ci = CAST(snd.id AS CHAR) COLLATE utf8mb4_general_ci OR FIND_IN_SET(CAST(snd.id AS CHAR), c.sender_id COLLATE utf8mb4_general_ci) > 0))
         )
         WHERE q.status = 'pending' 
         AND (c.status = 'sending' OR (c.status = 'scheduled' AND (c.scheduled_at IS NULL OR c.scheduled_at <= NOW())))
         ORDER BY (q.id % 10) ASC, q.created_at ASC
         LIMIT 1 FOR UPDATE`
      );

      if (rows.length === 0) {
        return; // No pending emails
      }

      const job = rows[0];

      // 2. Atomically claim the job status
      const [claimRes] = await connection.query(
        `UPDATE email_queue SET status = 'processing' WHERE id = ? AND status = 'pending'`,
        [job.id]
      );

      if (claimRes.affectedRows === 0) {
        return; // Job already claimed by another worker tick
      }

    console.log(`[Worker] Processing email queue job #${job.id} for recipient: ${job.email}`);

    // Process HTML tracking
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
    const senderEmail = job.sender_email || defaultUser;
    const senderName = job.sender_name || 'BexEmail';

    let sendSuccess = false;

    // Primary Attempt with Sender SMTP
    try {
      const transporter = createMailTransporter(job);
      await transporter.sendMail({
        from: `"${senderName}" <${senderEmail}>`,
        replyTo: `"${senderName}" <${senderEmail}>`,
        to: job.email,
        subject: job.subject,
        html: finalHtml 
      });
      sendSuccess = true;
    } catch (primaryErr) {
      console.warn(`[Worker] Primary SMTP failed for job #${job.id} (${primaryErr.message}). Retrying with System Default SMTP...`);
      // Retry with System Default SMTP
      try {
        const defaultTransporter = createMailTransporter(job, {}, true);
        await defaultTransporter.sendMail({
          from: `"${senderName}" <${defaultUser}>`,
          replyTo: `"${senderName}" <${defaultUser}>`,
          to: job.email,
          subject: job.subject,
          html: finalHtml 
        });
        sendSuccess = true;
        console.log(`[Worker] System Default SMTP fallback succeeded for job #${job.id}`);
      } catch (fallbackErr) {
        console.error(`[Worker] Fallback SMTP also failed for job #${job.id}:`, fallbackErr.message);
        
        let errorCategory = 'Failed';
        let errorMessage = fallbackErr.message;

        if (fallbackErr.responseCode >= 500 && fallbackErr.responseCode <= 599) {
          errorCategory = 'Hard Bounce (SMTP 5xx)';
        } else if (fallbackErr.responseCode >= 400 && fallbackErr.responseCode <= 499) {
          errorCategory = 'Soft Bounce (SMTP 4xx)';
        } else if (fallbackErr.code === 'EAUTH') {
          errorCategory = 'Authentication Failed';
        }

        await connection.query(
          `UPDATE email_queue SET status = 'failed', error_message = ? WHERE id = ?`,
          [`[${errorCategory}] ${errorMessage}`, job.id]
        );
      }
    }

    if (sendSuccess) {
      await connection.query(
        `UPDATE email_queue SET status = 'sent' WHERE id = ?`,
        [job.id]
      );
      console.log(`[Worker] Job #${job.id} sent successfully to ${job.email}`);
    }

    // Check if campaign is fully completed
    await resolveCompletedCampaigns(connection);

    } finally {
      await connection.query(`SELECT RELEASE_LOCK('bexemail_worker_singleton_lock')`).catch(() => {});
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
