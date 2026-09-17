const https = require('node:https');

const limits = { name: 120, contact: 200, type: 80, section: 160, detail: 5000, priority: 80, website: 200 };
// Best-effort per-instance burst protection; use a shared limiter for a public launch.
const attempts = new Map();
const windowMs = 60_000;

function saveFeedback(payload) {
  return new Promise((resolve, reject) => {
    const base = process.env.SUPABASE_URL || 'https://ozcbyuftmfitkocrgfov.supabase.co';
    const req = https.request(new URL('/rest/v1/suq_tibbi_feedback', base), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        Prefer: 'return=minimal',
      },
    }, (response) => {
      response.resume();
      response.on('error', reject);
      response.on('end', () => resolve(response.statusCode));
    });
    req.setTimeout(8000, () => req.destroy(new Error('Database timeout')));
    req.on('error', reject);
    req.end(JSON.stringify(payload));
  });
}

function sendFeedbackEmail(data, sourceOrigin) {
  // Preserve the destination already used by the production form.
  return new Promise((resolve, reject) => {
    const req = https.request('https://formsubmit.co/ajax/mutazima24@gmail.com', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json',
        Origin: sourceOrigin, Referer: `${sourceOrigin}/`,
      },
    }, response => {
      let text = '';
      response.on('data', chunk => { text += chunk; });
      response.on('error', reject);
      response.on('end', () => {
        try {
          const result = JSON.parse(text);
          const accepted = response.statusCode >= 200 && response.statusCode < 300 &&
            (result.success === true || result.success === 'true');
          const message = String(result.message || '').toLowerCase();
          const reason = /activat|confirm.*email/.test(message) ? 'activation_required'
            : /referer|referrer|web server|html file/.test(message) ? 'source_required' : 'provider_rejected';
          resolve({ accepted, reason, status: response.statusCode });
        } catch { resolve({ accepted: false, reason: 'invalid_provider_response', status: response.statusCode }); }
      });
    });
    req.setTimeout(8000, () => req.destroy(new Error('Delivery timeout')));
    req.on('error', reject);
    req.end(JSON.stringify({
      _subject: 'ملاحظة جديدة على تصور سوق طبي — ريسبارك',
      _captcha: 'false', _template: 'table',
      name: data.name || 'زائر', 'وسيلة التواصل': data.contact,
      'نوع الملاحظة': data.type, 'القسم': data.section,
      message: data.detail, 'الأولوية': data.priority,
    }));
  });
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const origin = req.headers?.origin;
  const host = req.headers?.host;
  if (origin) {
    try {
      if (new URL(origin).host !== host) return res.status(403).json({ error: 'Origin not allowed' });
    } catch { return res.status(403).json({ error: 'Invalid origin' }); }
  }
  if (!(req.headers?.['content-type'] || '').toLowerCase().startsWith('application/json')) {
    return res.status(415).json({ error: 'JSON required' });
  }
  const body = req.body;
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return res.status(400).json({ error: 'Invalid request' });
  }
  const data = {};
  for (const [key, max] of Object.entries(limits)) {
    const value = body[key] ?? '';
    if (typeof value !== 'string' || value.length > max) {
      return res.status(400).json({ error: 'Invalid field', field: key });
    }
    data[key] = value.trim();
  }
  if (!data.detail || data.website) return res.status(400).json({ error: 'Invalid feedback' });
  const now = Date.now();
  for (const [key, entry] of attempts) if (now - entry.start >= windowMs) attempts.delete(key);
  const ip = req.headers?.['x-vercel-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
  const entry = attempts.get(ip) || { start: now, count: 0 };
  if (entry.count >= 5) {
    res.setHeader('Retry-After', String(Math.ceil((windowMs - (now - entry.start)) / 1000)));
    return res.status(429).json({ error: 'Too many requests' });
  }
  entry.count += 1;
  attempts.set(ip, entry);
  if (attempts.size > 10000) attempts.delete(attempts.keys().next().value);
  const provider = process.env.FEEDBACK_PROVIDER || 'formsubmit';
  if (!['formsubmit', 'supabase'].includes(provider)) return res.status(503).json({ error: 'Feedback configuration invalid' });
  if (provider === 'supabase' && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Feedback storage configuration missing');
    return res.status(503).json({ error: 'Feedback temporarily unavailable' });
  }
  try {
    if (provider === 'formsubmit') {
      const delivery = await sendFeedbackEmail(data, origin || 'https://suq-tibbi.vercel.app');
      if (!delivery.accepted) {
        // Log only diagnostic categories; never log submitted data or the recipient.
        console.error('Feedback email rejected', delivery.status, delivery.reason);
        return res.status(502).json({ error: 'Delivery not confirmed', code: delivery.reason });
      }
      return res.status(201).json({ success: true });
    }
    const status = await saveFeedback({
      customer_name: data.name, contact: data.contact, note_type: data.type,
      section: data.section, detail: data.detail, priority: data.priority,
      page_url: (req.headers?.referer || '').split('?')[0].slice(0,500),
      user_agent: (req.headers?.['user-agent'] || '').slice(0,500),
    });
    if (status < 200 || status >= 300) {
      console.error('Feedback storage rejected request', status);
      return res.status(502).json({ error: 'Failed to save feedback' });
    }
    return res.status(201).json({ success: true });
  } catch {
    console.error('Feedback storage request failed');
    return res.status(502).json({ error: 'Failed to save feedback' });
  }
};
