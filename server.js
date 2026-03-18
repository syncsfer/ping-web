const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const WAITLIST_FILE = path.join(__dirname, 'waitlist.json');

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Persist waitlist to a JSON file
function loadWaitlist() {
  try {
    return JSON.parse(fs.readFileSync(WAITLIST_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function saveWaitlist(list) {
  fs.writeFileSync(WAITLIST_FILE, JSON.stringify(list, null, 2));
}

app.post('/api/waitlist', async (req, res) => {
  const { email } = req.body;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Valid email is required.' });
  }

  const waitlist = loadWaitlist();
  const exists = waitlist.some(entry => entry.email === email.toLowerCase());

  if (exists) {
    return res.status(409).json({ error: 'This email is already on the waitlist.' });
  }

  waitlist.push({ email: email.toLowerCase(), date: new Date().toISOString() });
  saveWaitlist(waitlist);

  // Forward notification to info@sendbloc.com via Resend
  if (RESEND_API_KEY) {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + RESEND_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'SendBloc Waitlist <waitlist@sendbloc.com>',
          to: 'info@sendbloc.com',
          subject: 'New Waitlist Signup: ' + email,
          html: '<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">'
            + '<h2 style="color:#fc6c4c;margin-bottom:16px">New Waitlist Signup</h2>'
            + '<table style="width:100%;border-collapse:collapse">'
            + '<tr><td style="padding:8px 0;color:#666">Email</td><td style="padding:8px 0;font-weight:600">' + email + '</td></tr>'
            + '<tr><td style="padding:8px 0;color:#666">Date</td><td style="padding:8px 0">' + new Date().toISOString() + '</td></tr>'
            + '<tr><td style="padding:8px 0;color:#666">Total signups</td><td style="padding:8px 0">' + waitlist.length + '</td></tr>'
            + '</table></div>',
        }),
      });
      if (!response.ok) {
        const err = await response.text();
        console.error('Resend error:', err);
      }
    } catch (err) {
      console.error('Email send failed:', err.message);
    }
  }

  console.log('[Waitlist] ' + email + ' (total: ' + waitlist.length + ')');
  res.json({ success: true, message: 'You\u2019re on the list!' });
});

app.listen(PORT, () => {
  console.log('Server running on http://localhost:' + PORT);
  if (!RESEND_API_KEY) {
    console.warn('Warning: RESEND_API_KEY not set. Signups will be saved locally but emails won\u2019t be sent.');
    console.warn('Get a free key at https://resend.com/api-keys');
  }
});
