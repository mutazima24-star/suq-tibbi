const https = require('node:https');

// Demo visit sessions for the Respark console (Respark OS: public.demo_visit_track, licence `demo_visits`).
// The browser sends its session id, page, opened ad and visible time; this function adds the approximate place from
// Vercel's geo headers, the device / OS / browser from the user agent and a truncated IP. No name, email or full IP is kept.
const CLIENT_KEY = 'SUQ_TIBBI';
const KINDS = ['start', 'ping', 'page', 'item', 'feedback'];
const ENTRIES = ['intro_auto', 'intro_click', 'direct', 'internal'];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const attempts = new Map();
const windowMs = 60_000;
const perMinute = 40;

const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
function header(req, name) {
  const v = req.headers?.[name];
  if (typeof v !== 'string' || !v) return '';
  try { return decodeURIComponent(v).slice(0, 80); } catch { return v.slice(0, 80); }
}

function parseAgent(ua) {
  const s = String(ua || '');
  const os = /iPad/.test(s) ? 'iPadOS' : /iPhone|iPod/.test(s) ? 'iOS' : /Android/.test(s) ? 'Android'
    : /Windows/.test(s) ? 'Windows' : /Mac OS X|Macintosh/.test(s) ? 'macOS' : /CrOS/.test(s) ? 'ChromeOS' : /Linux/.test(s) ? 'Linux' : '';
  const browser = /Edg\//.test(s) ? 'Edge' : /OPR\/|Opera/.test(s) ? 'Opera' : /SamsungBrowser/.test(s) ? 'Samsung Internet'
    : /CriOS|Chrome\//.test(s) ? 'Chrome' : /FxiOS|Firefox\//.test(s) ? 'Firefox' : /Safari\//.test(s) ? 'Safari' : '';
  const tablet = /iPad|Tablet/.test(s) || (/Android/.test(s) && !/Mobile/.test(s));
  const device = tablet ? 'tablet' : /Mobi|iPhone|iPod/.test(s) ? 'mobile' : s ? 'desktop' : '';
  return { os, browser, device };
}

function truncIp(raw) {
  const ip = String(raw || '').split(',')[0].trim();
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) return ip.replace(/\.\d{1,3}$/, '.0');
  if (ip.includes(':')) return ip.split(':').slice(0, 3).join(':') + '::';
  return '';
}

function callTrack(payload) {
  return new Promise((resolve, reject) => {
    const base = process.env.SUPABASE_URL || 'https://ozcbyuftmfitkocrgfov.supabase.co';
    const req = https.request(new URL('/rest/v1/rpc/demo_visit_track', base), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
    }, (response) => {
      response.resume();
      response.on('error', reject);
      response.on('end', () => resolve(response.statusCode));
    });
    req.setTimeout(6000, () => req.destroy(new Error('Database timeout')));
    req.on('error', reject);
    req.end(JSON.stringify({ p: payload }));
  });
}

function readBody(req) {
  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch { return null; } }
  if (Buffer.isBuffer(b)) { try { b = JSON.parse(b.toString('utf8')); } catch { return null; } }
  return b && typeof b === 'object' && !Array.isArray(b) ? b : null;
}

function buildPayload(b, req) {
  const kind = str(b.kind, 10);
  const sid = str(b.sid, 36); const vid = str(b.vid, 36);
  if (!KINDS.includes(kind) || !UUID_RE.test(sid) || !UUID_RE.test(vid)) return null;
  const invite = str(b.invite, 40).toLowerCase();
  const utm = {};
  if (b.utm && typeof b.utm === 'object' && !Array.isArray(b.utm)) {
    for (const k of ['source', 'medium', 'campaign', 'content', 'term']) { const v = str(b.utm[k], 100); if (v) utm[k] = v; }
  }
  const agent = parseAgent(req.headers?.['user-agent']);
  const ms = Number(b.active_ms);
  const screen = str(b.screen, 11);
  return {
    client: CLIENT_KEY, kind, sid, vid,
    invite: /^[a-z0-9_-]{1,40}$/.test(invite) ? invite : null,
    host: str(req.headers?.host, 120) || null,
    path: str(b.path, 200) || null,
    item: kind === 'item' ? (str(b.item, 60) || null) : null,
    entry: ENTRIES.includes(b.entry) ? b.entry : null,
    ref_host: str(b.ref_host, 120).toLowerCase() || null,
    utm,
    country: header(req, 'x-vercel-ip-country').toUpperCase() || null,
    region: header(req, 'x-vercel-ip-country-region') || null,
    city: header(req, 'x-vercel-ip-city') || null,
    device: agent.device || null, os: agent.os || null, browser: agent.browser || null,
    screen: /^\d{2,5}x\d{2,5}$/.test(screen) ? screen : null,
    lang: str(b.lang, 20) || null,
    ip_trunc: truncIp(req.headers?.['x-vercel-forwarded-for'] || req.headers?.['x-forwarded-for']) || null,
    active_ms: Number.isFinite(ms) ? Math.max(0, Math.min(Math.round(ms), 86_400_000)) : 0,
  };
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const origin = req.headers?.origin;
  if (origin) {
    try {
      if (new URL(origin).host !== req.headers?.host) return res.status(403).json({ error: 'Origin not allowed' });
    } catch { return res.status(403).json({ error: 'Invalid origin' }); }
  }
  const b = readBody(req);
  const payload = b && buildPayload(b, req);
  if (!payload) return res.status(400).json({ error: 'Invalid request' });

  const now = Date.now();
  for (const [key, entry] of attempts) if (now - entry.start >= windowMs) attempts.delete(key);
  const ip = req.headers?.['x-vercel-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
  const entry = attempts.get(ip) || { start: now, count: 0 };
  if (entry.count >= perMinute) return res.status(429).json({ error: 'Too many requests' });
  entry.count += 1;
  attempts.set(ip, entry);
  if (attempts.size > 10000) attempts.delete(attempts.keys().next().value);

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return res.status(204).end();
  try {
    const status = await callTrack(payload);
    if (status < 200 || status >= 300) console.error('Visit track rejected', status);
  } catch {
    console.error('Visit track failed');
  }
  return res.status(204).end();
};

module.exports.parseAgent = parseAgent;
module.exports.truncIp = truncIp;
module.exports.buildPayload = buildPayload;
