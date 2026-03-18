module.exports = async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email } = req.body || {};

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Valid email is required.' });
  }

  const RESEND_API_KEY = process.env.RESEND_API_KEY;

  if (!RESEND_API_KEY) {
    console.error('RESEND_API_KEY not set');
    return res.status(500).json({ error: 'Server misconfigured.' });
  }

  // Use verified domain sender, or Resend's default onboarding sender
  const fromAddress = process.env.RESEND_FROM || 'onboarding@resend.dev';

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + RESEND_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromAddress,
        to: 'info@sendbloc.com',
        subject: 'New Waitlist Signup: ' + email,
        html: '<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">'
          + '<h2 style="color:#fc6c4c;margin-bottom:16px">New Waitlist Signup</h2>'
          + '<table style="width:100%;border-collapse:collapse">'
          + '<tr><td style="padding:8px 0;color:#666">Email</td><td style="padding:8px 0;font-weight:600">' + email + '</td></tr>'
          + '<tr><td style="padding:8px 0;color:#666">Date</td><td style="padding:8px 0">' + new Date().toISOString() + '</td></tr>'
          + '</table></div>',
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Resend error:', err);
      return res.status(502).json({ error: 'Failed to send notification.' });
    }

    console.log('[Waitlist] ' + email);
    return res.status(200).json({ success: true, message: 'You\u2019re on the list!' });
  } catch (err) {
    console.error('Email send failed:', err.message);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
};
