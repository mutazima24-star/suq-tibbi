const test = require('node:test');
const assert = require('node:assert');
const track = require('../api/track.js');

function run(req) {
  return new Promise((resolve) => {
    const res = { headers: {}, code: 0, setHeader(k, v) { this.headers[k] = v; },
      status(c) { this.code = c; return this; }, json(b) { resolve({ code: this.code, body: b }); }, end() { resolve({ code: this.code }); } };
    track({ method: 'POST', headers: { host: 'souq-tibbi.respark-os.com', ...req.headers }, body: req.body, socket: {} }, res);
  });
}
const ok = { kind: 'start', sid: '6b0f1e2a-1c2d-4e5f-8a9b-0c1d2e3f4a5b', vid: '7c0f1e2a-1c2d-4e5f-8a9b-0c1d2e3f4a5b' };

test('parses user agents', () => {
  assert.deepStrictEqual(track.parseAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit Version/17.0 Mobile/15E148 Safari/604.1'),
    { os: 'iOS', browser: 'Safari', device: 'mobile' });
  assert.deepStrictEqual(track.parseAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36 Edg/126.0'),
    { os: 'Windows', browser: 'Edge', device: 'desktop' });
  assert.deepStrictEqual(track.parseAgent('Mozilla/5.0 (Linux; Android 14; SM-X710) AppleWebKit/537.36 Chrome/126.0 Safari/537.36'),
    { os: 'Android', browser: 'Chrome', device: 'tablet' });
});

test('truncates IPs', () => {
  assert.strictEqual(track.truncIp('94.97.12.201, 10.0.0.1'), '94.97.12.0');
  assert.strictEqual(track.truncIp('2a02:cb80:4100:1:2:3:4:5'), '2a02:cb80:4100::');
  assert.strictEqual(track.truncIp('junk'), '');
});

test('builds the payload with geo headers and drops bad values', () => {
  const p = track.buildPayload({ ...ok, invite: 'Abdullah!', entry: 'hack', utm: { source: 'wa', x: 'y' }, screen: '390x844', active_ms: 1e12 },
    { headers: { host: 'h', 'x-vercel-ip-country': 'sa', 'x-vercel-ip-city': 'Riyadh%20City', 'user-agent': '' } });
  assert.strictEqual(p.client, 'SUQ_TIBBI');
  assert.strictEqual(p.invite, null);
  assert.strictEqual(p.entry, null);
  assert.deepStrictEqual(p.utm, { source: 'wa' });
  assert.strictEqual(p.country, 'SA');
  assert.strictEqual(p.city, 'Riyadh City');
  assert.strictEqual(p.active_ms, 86400000);
  assert.strictEqual(track.buildPayload({ ...ok, invite: 'abdullah' }, { headers: {} }).invite, 'abdullah');
  assert.strictEqual(track.buildPayload({ ...ok, kind: 'x' }, { headers: {} }), null);
  assert.strictEqual(track.buildPayload({ ...ok, sid: 'nope' }, { headers: {} }), null);
});

test('rejects GET, foreign origins and bad bodies; accepts beacon text', async () => {
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  const r1 = await new Promise((resolve) => { const res = { setHeader() {}, status(c) { return { json: () => resolve(c) }; } };
    track({ method: 'GET', headers: {} }, res); });
  assert.strictEqual(r1, 405);
  assert.strictEqual((await run({ headers: { origin: 'https://evil.example' }, body: ok })).code, 403);
  assert.strictEqual((await run({ body: '{bad' })).code, 400);
  assert.strictEqual((await run({ body: JSON.stringify(ok) })).code, 204);
  assert.strictEqual((await run({ headers: { origin: 'https://souq-tibbi.respark-os.com' }, body: ok })).code, 204);
});
