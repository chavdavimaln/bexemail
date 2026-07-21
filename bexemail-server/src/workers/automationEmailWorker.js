require('dotenv').config();
const { Worker } = require('bullmq');
const nodemailer = require('nodemailer');
const db = require('../config/db'); // MySQL
const connection = require('../config/redisConnection');


const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.ethereal.email',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true' || parseInt(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER || 'your_smtp_user',
      pass: process.env.SMTP_PASSWORD || process.env.SMTP_PASS || 'your_smtp_password'
    }
});

const emailWorker = new Worker('email_queue', async (job) => {
    // Only process automation emails, regular campaigns go through worker.js (MySQL queue)
    if (job.name !== 'send_automation_email') return;

    const { subscriber_id, subject, template } = job.data;

    try {
        // 1. Fetch subscriber details for liquid tags
        const [subRows] = await db.query(
            `SELECT * FROM subscribers WHERE id = ?`,
            [subscriber_id]
        );

        if (subRows.length === 0) {
            console.log(`Subscriber ${subscriber_id} not found. Dropping email.`);
            return;
        }

        const subscriber = subRows[0];

        // 2. Liquid Tag Replacement
        // Very basic implementation: replace {{subscriber.first_name}}, {{subscriber.email}}, etc.
        const replaceTags = (text) => {
            if (!text) return '';
            let newText = text;
            newText = newText.replace(/\{\{subscriber\.first_name\}\}/gi, subscriber.first_name || '');
            newText = newText.replace(/\{\{subscriber\.last_name\}\}/gi, subscriber.last_name || '');
            newText = newText.replace(/\{\{subscriber\.email\}\}/gi, subscriber.email || '');
            return newText;
        };

        const finalSubject = replaceTags(subject);
        const finalTemplate = replaceTags(template);

        const senderEmail = process.env.SMTP_FROM || 'hello@bexemail.com';
        const senderName = 'BexEmail Automation';

        // 3. Send email
        await transporter.sendMail({
            from: `"${senderName}" <${senderEmail}>`,
            to: subscriber.email,
            subject: finalSubject,
            html: finalTemplate
        });

        console.log(`Automation email sent to ${subscriber.email}`);
        
    } catch (error) {
        console.error("Failed to send automation email:", error);
        throw error; // Will be retried by BullMQ
    }
}, { connection });

emailWorker.on('failed', (job, err) => {
    console.error(`Automation email job ${job.id} failed:`, err);
});

console.log("Automation Email Worker (BullMQ) started successfully.");
