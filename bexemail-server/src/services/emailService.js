const nodemailer = require('nodemailer');
const pool = require('../config/db');
const { checkSmtpRequirement } = require('../utils/planLimits');

/**
 * Retrieves active SMTP Transporter for a given admin/company context
 * @param {number} userId 
 * @param {number} companyId 
 */
async function getActiveSmtpTransporter(userId = null, companyId = null) {
  let query = 'SELECT * FROM senders WHERE is_active = 1 OR is_active IS NULL ORDER BY is_default DESC, id DESC LIMIT 1';
  let params = [];

  if (companyId) {
    query = 'SELECT * FROM senders WHERE company_id = ? AND (is_active = 1 OR is_active IS NULL) ORDER BY is_default DESC, id DESC LIMIT 1';
    params = [companyId];
  } else if (userId) {
    query = 'SELECT * FROM senders WHERE (admin_id = ? OR is_default = 1) AND (is_active = 1 OR is_active IS NULL) ORDER BY is_default DESC, id DESC LIMIT 1';
    params = [userId];
  }

  const [rows] = await pool.query(query, params);

  if (rows.length === 0) {
    // Check fallback environment variables if no DB sender exists
    if (process.env.SMTP_HOST && process.env.SMTP_USER) {
      return {
        transporter: nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT) || 587,
          secure: process.env.SMTP_SECURE === 'true' || parseInt(process.env.SMTP_PORT) === 465,
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD || process.env.SMTP_PASS
          }
        }),
        sender: {
          from_email: process.env.SMTP_FROM || process.env.SMTP_USER,
          from_name: process.env.SMTP_FROM_NAME || 'BexEmail System'
        }
      };
    }
    return null;
  }

  const sender = rows[0];
  const transporter = nodemailer.createTransport({
    host: sender.host || sender.smtp_host,
    port: parseInt(sender.port || sender.smtp_port) || 587,
    secure: sender.secure === 1 || sender.secure === 'true' || parseInt(sender.port || sender.smtp_port) === 465,
    auth: {
      user: sender.username || sender.smtp_user || sender.email,
      pass: sender.password || sender.smtp_password || sender.pass
    }
  });

  return { transporter, sender };
}

/**
 * Dispatches a campaign email safely enforcing active SMTP validation
 * @param {Object} emailPayload - { to, subject, html, text, campaignId, recipientId, userId, companyId }
 */
async function dispatchCampaignEmail(emailPayload) {
  const { to, subject, html, text, userId, companyId } = emailPayload;

  // 1. Enforce SMTP Existence Check
  const hasSmtp = await checkSmtpRequirement(userId, companyId);
  if (!hasSmtp) {
    throw new Error('SMTP Constraint Failure: No active SMTP sender configured. Email campaign dispatch aborted.');
  }

  // 2. Resolve Active Transporter
  const smtpConfig = await getActiveSmtpTransporter(userId, companyId);
  if (!smtpConfig || !smtpConfig.transporter) {
    throw new Error('SMTP Configuration Error: Unable to initialize valid Nodemailer transporter.');
  }

  const { transporter, sender } = smtpConfig;
  const fromAddress = sender.from_email || sender.email || sender.username || process.env.SMTP_USER;
  const fromName = sender.from_name || sender.name || 'BexEmail';

  // 3. Send Email
  const mailOptions = {
    from: `"${fromName}" <${fromAddress}>`,
    to,
    subject,
    text: text || html.replace(/<[^>]*>?/gm, ''),
    html
  };

  const info = await transporter.sendMail(mailOptions);
  return info;
}

module.exports = {
  getActiveSmtpTransporter,
  dispatchCampaignEmail
};
