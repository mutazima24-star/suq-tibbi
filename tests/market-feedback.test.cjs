const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require.resolve('../api/market-feedback.js'), 'utf8');
function setup({ status = 201, key = 'test-only', networkError = false, reply = [{ id: 42 }] } = {}) {
  let writes = 0; let url; let options; let payload;
  const transport = { request(u, o, callback) {
    url = String(u); options = o; const handlers = {};
    return {
      setTimeout() {}, on(event, fn) { handlers[event] = fn; },
      end(body) { payload = JSON.parse(body); writes++; if (networkError) return handlers.error(new Error('offline'));
        callback({ statusCode: status, on(event, fn) { if (event === 'data') fn(JSON.stringify(reply)); if (event === 'end') fn(); } });
      },
    };
  } };
  const ctx = { require: () => transport, URL, module: { exports: {} }, process: { env: { SUPABASE_SERVICE_ROLE_KEY: key } }, console: { error() {} } };
  vm.runInNewContext(source, ctx);
  return {
    async send(body = { detail: 'A local-only test', type: 'feature', section: 'ad', priority: 'urgent', name: 'Test', contact: 'a@b.co' }, overrides = {}) {
      const result = { headers: {} };
      const res = { setHeader(k, v) { result.headers[k] = v; }, status(n) { result.status = n; return this; }, json(v) { result.body = v; return this; } };
      await ctx.module.exports({ method: 'POST', headers: { host: 'example.com', origin: 'https://example.com', 'content-type': 'application/json' }, body, ...overrides }, res);
      return result;
    }, writes: () => writes, url: () => url, options: () => options, payload: () => payload,
  };
}
test('files a client request for Souq Tibbi and returns its id', async () => {
  const h = setup(); const r = await h.send();
  assert.equal(r.status, 201); assert.equal(r.body.id, 42); assert.equal(h.writes(), 1);
  assert.match(h.url(), /\/rest\/v1\/client_task_requests/);
  const p = h.payload();
  assert.equal(p.client_id, 'dc7a297a-74d9-4e45-8052-14b6334f3ee5');
  assert.equal(p.kind, 'feature'); assert.equal(p.priority, 'urgent'); assert.equal(p.created_side, 'client');
  assert.equal(p.created_by, 'a@b.co'); assert.equal(p.created_by_name, 'Test');
  assert.ok(p.title.length >= 3 && p.title.length <= 160);
  assert.match(p.details, /صفحة الإعلان/);
});
test('notes and bugs are filed as changes', async () => { const h = setup(); await h.send({ detail: 'something odd', type: 'bug' }); assert.equal(h.payload().kind, 'change'); assert.equal(h.payload().priority, 'normal'); });
test('long details keep the title within the dashboard limit', async () => { const h = setup(); await h.send({ detail: 'x'.repeat(4000) }); assert.ok(h.payload().title.length <= 160); });
for (const status of [400, 401, 403, 500]) test(`does not report success on database ${status}`, async () => { const r = await setup({ status }).send(); assert.equal(r.status, 502); });
test('network failure is not a success', async () => assert.equal((await setup({ networkError: true }).send()).status, 502));
test('missing credentials fail before making a request', async () => { const h = setup({ key: '' }); assert.equal((await h.send()).status, 503); assert.equal(h.writes(), 0); });
for (const body of [null, [], { detail: 123 }, { detail: 'hi' }, { detail: 'x'.repeat(5001) }, { detail: 'valid text', type: 'other' }, { detail: 'valid text', section: 'x' }, { detail: 'valid text', priority: 'high' }, { detail: 'valid text', website: 'spam' }])
  test(`rejects malformed input ${JSON.stringify(body).slice(0, 50)}`, async () => { const h = setup(); assert.equal((await h.send(body)).status, 400); assert.equal(h.writes(), 0); });
test('rejects cross-origin submissions', async () => { const h = setup(); assert.equal((await h.send(undefined, { headers: { origin: 'https://other.example', host: 'example.com', 'content-type': 'application/json' } })).status, 403); assert.equal(h.writes(), 0); });
test('limits repeated requests', async () => { const h = setup(); for (let i = 0; i < 5; i++) assert.equal((await h.send()).status, 201); const r = await h.send(); assert.equal(r.status, 429); assert.equal(h.writes(), 5); });
test('GET never inserts', async () => { const h = setup(); assert.equal((await h.send(undefined, { method: 'GET' })).status, 405); assert.equal(h.writes(), 0); });
