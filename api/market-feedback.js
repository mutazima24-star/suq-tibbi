const https = require('node:https');

// Files marketplace feedback as a client request on the Souq Tibbi page of the Respark dashboard
// (Respark OS: public.client_task_requests). The browser emails a copy separately.
const CLIENT_ID = process.env.SUQ_TIBBI_CLIENT_ID || 'dc7a297a-74d9-4e45-8052-14b6334f3ee5';
const limits = { type: 20, section: 20, priority: 10, detail: 5000, name: 120, contact: 200, page: 500, website: 200 };
const TYPES = { note: ['change', 'ملاحظة'], feature: ['feature', 'إضافة مقترحة'], bug: ['change', 'مشكلة'] };
const SECTIONS = {
  home: 'الرئيسية والفلاتر', ad: 'صفحة الإعلان', new: 'إضافة إعلان', messages: 'الرسائل',
  account: 'الحساب والمفضلة', design: 'التصميم العام والألوان', other: 'أخرى',
};
// Best-effort per-instance burst protection.
const attempts = new Map();
const windowMs = 60_000;

function insertRequest(row) {
  return new Promise((resolve, reject) => {
    const base = process.env.SUPABASE_URL || 'https://ozcbyuftmfitkocrgfov.supabase.co';
    const req = https.request(new URL('/rest/v1/client_task_requests?select=id', base), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        Prefer: 'return=representation',
      },
    }, (response) => {
      let text = '';
      response.on('data', (chunk) => { text += chunk; });
      response.on('error', reject);
      response.on('end', () => {
        let id = null;
        try { id = JSON.parse(text)[0].id; } catch {}
        resolve({ status: response.statusCode, id });
      });
    });
    req.setTimeout(8000, () => req.destroy(new Error('Database timeout')));
    req.on('error', reject);
    req.end(JSON.stringify(row));
  });
}

function buildRow(d) {
  const [kind, typeLabel] = TYPES[d.type];
  const oneLine = d.detail.replace(/\s+/g, ' ');
  const title = `سوق طبي · ${typeLabel}: ${oneLine}`.slice(0, 150);
  const details = [
    d.detail,
    '',
    `النوع: ${typeLabel}`,
    `القسم: ${SECTIONS[d.section]}`,
    `الأولوية: ${d.priority === 'urgent' ? 'عاجلة' : 'عادية'}`,
    `الاسم: ${d.name || 'زائر'}`,
    `التواصل: ${d.contact || 'لم يُذكر'}`,
    d.page ? `الصفحة: ${d.page}` : '',
    'المصدر: ويدجت الملاحظات في النسخة التجريبية',
  ].filter((x) => x !== '').join('\n').slice(0, 6000);
  const by = (d.contact || 'visitor@souq-tibbi').slice(0, 200);
  return {
    client_id: CLIENT_ID, kind, title, details, priority: d.priority,
    created_by: by, created_by_name: d.name || 'زائر سوق طبي', created_side: 'client',
    last_by: by, last_side: 'client',
  };
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
  if (!body || typeof body !== 'object' || Array.isArray(body)) return res.status(400).json({ error: 'Invalid request' });
  const d = {};
  for (const [key, max] of Object.entries(limits)) {
    const value = body[key] ?? '';
    if (typeof value !== 'string' || value.length > max) return res.status(400).json({ error: 'Invalid field', field: key });
    d[key] = value.trim();
  }
  d.type = d.type || 'note';
  d.section = d.section || 'other';
  d.priority = d.priority || 'normal';
  if (!TYPES[d.type] || !SECTIONS[d.section] || !['normal', 'urgent'].includes(d.priority)) {
    return res.status(400).json({ error: 'Invalid option' });
  }
  if (d.detail.length < 5 || d.website) return res.status(400).json({ error: 'Invalid feedback' });

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

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Market feedback storage configuration missing');
    return res.status(503).json({ error: 'Feedback temporarily unavailable' });
  }
  try {
    const { status, id } = await insertRequest(buildRow(d));
    if (status < 200 || status >= 300) {
      console.error('Market feedback insert rejected', status);
      return res.status(502).json({ error: 'Failed to save feedback' });
    }
    return res.status(201).json({ success: true, id });
  } catch {
    console.error('Market feedback insert failed');
    return res.status(502).json({ error: 'Failed to save feedback' });
  }
};
