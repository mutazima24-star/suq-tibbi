const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require.resolve('../api/feedback.js'), 'utf8');
function setup({ databaseStatus = 201, key = 'test-only', networkError = false, provider = 'supabase', emailResponse = { success: true } } = {}) {
  let writes = 0;
  const transport = { request(url, options, callback) {
    const handlers = {};
    return {
      setTimeout() {}, on(event, fn) { handlers[event] = fn; },
      end() { writes++; if (networkError) return handlers.error(new Error('offline'));
        callback({ statusCode: databaseStatus, resume() {}, on(event, fn) { if(event === 'data') fn(JSON.stringify(emailResponse)); if (event === 'end') fn(); } });
      }
    };
  }};
  const ctx = { require: () => transport, URL, module: { exports: {} }, process: { env: { SUPABASE_SERVICE_ROLE_KEY: key, FEEDBACK_PROVIDER: provider } }, console: { error() {} } };
  vm.runInNewContext(source, ctx);
  return {
    async send(body = { detail: 'A local-only test' }, overrides = {}) {
      const result = { headers: {} };
      const res = { setHeader(k,v) { result.headers[k] = v; }, status(n) { result.status = n; return this; }, json(v) { result.body = v; return this; } };
      await ctx.module.exports({ method: 'POST', headers: { host: 'example.com', origin: 'https://example.com', 'content-type': 'application/json' }, body, ...overrides }, res);
      return result;
    }, writes: () => writes
  };
}
test('confirms only a successful database insert', async () => { const h = setup(); const r = await h.send(); assert.equal(r.status,201); assert.equal(r.body.success,true); assert.equal(h.writes(),1); });
for (const databaseStatus of [400,401,403,500]) test(`does not report success on database ${databaseStatus}`, async () => { const r = await setup({ databaseStatus }).send(); assert.equal(r.status,502); assert.notEqual(r.body.success,true); });
test('network failure is not a success', async () => assert.equal((await setup({ networkError:true }).send()).status,502));
test('missing credentials fail before making a request', async () => { const h=setup({key:''});assert.equal((await h.send()).status,503);assert.equal(h.writes(),0); });
for (const body of [null, [], {detail:123}, {detail:'  '}, {detail:'x'.repeat(5001)}, {detail:'ok',contact:42}, {detail:'ok',website:'spam'}]) test(`rejects malformed input ${JSON.stringify(body).slice(0,55)}`,async()=>{const h=setup();assert.equal((await h.send(body)).status,400);assert.equal(h.writes(),0);});
test('rejects cross-origin submissions',async()=>{const h=setup();assert.equal((await h.send(undefined,{headers:{origin:'https://other.example',host:'example.com','content-type':'application/json'}})).status,403);assert.equal(h.writes(),0);});
test('limits repeated requests',async()=>{const h=setup();for(let i=0;i<5;i++)assert.equal((await h.send()).status,201);const r=await h.send();assert.equal(r.status,429);assert.ok(r.headers['Retry-After']);assert.equal(h.writes(),5);});
test('GET never inserts',async()=>{const h=setup();assert.equal((await h.send(undefined,{method:'GET'})).status,405);assert.equal(h.writes(),0);});

test('email provider works without a database key',async()=>{assert.equal((await setup({provider:'formsubmit',key:''}).send()).status,201);});
test('email rejection does not produce a success',async()=>{assert.equal((await setup({provider:'formsubmit',emailResponse:{success:false}}).send()).status,502);});
test('email HTTP error does not produce a success',async()=>{assert.equal((await setup({provider:'formsubmit',databaseStatus:500}).send()).status,502);});
