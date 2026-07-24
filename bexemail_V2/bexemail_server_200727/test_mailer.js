require('dotenv').config();
const nodemailer = require('nodemailer');

// Prompt 17: Localhost Safe Email Testing
// Configuration for Testing

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.ethereal.email',
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true' || parseInt(process.env.SMTP_PORT) === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD || process.env.SMTP_PASS
  }
});

async function testConnection() {
  try {
    // 1. Verify connection
    await transporter.verify();
    console.log("Transporter is ready to send emails (connected to Mailtrap)");

    // 2. Send a dummy email (Plain Text + HTML)
    const info = await transporter.sendMail({
      from: '"BexEmail Local Test" <test@bexemail.local>',
      to: "dummy@example.com",
      subject: "Test Email from Local Queue Worker",
      text: "This is a plain text body verifying the local queue worker.",
      html: "<b>This is an HTML body</b> verifying the local queue worker."
    });

    console.log("Message sent successfully! Message ID: %s", info.messageId);
    console.log("Check your Mailtrap inbox to view the email.");
  } catch (error) {
    console.error("Error connecting to Mailtrap or sending test email:", error);
  }
}

testConnection();
