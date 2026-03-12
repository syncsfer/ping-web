const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Configure SMTP transporter
// Set these environment variables before running:
//   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// In-memory store (replace with a database in production)
const waitlist = [];

app.post('/api/waitlist', async (req, res) => {
  const { email } = req.body;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Valid email is required.' });
  }

  if (waitlist.includes(email.toLowerCase())) {
    return res.status(409).json({ error: 'This email is already on the waitlist.' });
  }

  waitlist.push(email.toLowerCase());

  // Forward to info@sendbloc.com
  try {
    await transporter.sendMail({
      from: process.env.SMTP_USER || 'noreply@sendbloc.com',
      to: 'info@sendbloc.com',
      subject: `New Waitlist Signup: ${email}`,
      text: `New waitlist signup for SendBloc/Ping:\n\nEmail: ${email}\nDate: ${new Date().toISOString()}\nTotal signups: ${waitlist.length}`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
          <h2 style="color:#fc6c4c;margin-bottom:16px">New Waitlist Signup</h2>
          <table style="width:100%;border-collapse:collapse">
            <tr><td style="padding:8px 0;color:#666">Email</td><td style="padding:8px 0;font-weight:600">${email}</td></tr>
            <tr><td style="padding:8px 0;color:#666">Date</td><td style="padding:8px 0">${new Date().toISOString()}</td></tr>
            <tr><td style="padding:8px 0;color:#666">Total signups</td><td style="padding:8px 0">${waitlist.length}</td></tr>
          </table>
        </div>`,
    });
  } catch (err) {
    console.error('Email send failed:', err.message);
    // Still return success — the signup is captured even if email fails
  }

  console.log(`[Waitlist] ${email} (total: ${waitlist.length})`);
  res.json({ success: true, message: 'You\u2019re on the list!' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  if (!process.env.SMTP_USER) {
    console.warn('Warning: SMTP_USER not set — emails will not be sent. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS.');
  }
});
