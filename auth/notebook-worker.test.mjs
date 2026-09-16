import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handleNotebook, ownerSession, verifyOwner, QuotaStore } from './notebook-worker.mjs';
const base = { OWNER_PIN: 'test-pin', SESSION_SECRET: 'test-secret-long-enough-not-production', SITE_ORIGIN: 'https://owner.example', MIMO_MODEL: 'test-model', MIMO_API_KEY: 'test-key', GITHUB_TOKEN: 'test-github-token' };
function environment() {
  const objects = new Map();
  return { ...base, QUOTAS: { idFromName: x=>x, get(id) {
    if (!objects.has(id)) {
      let data; const storage = { get:async()=>structuredClone(data), put:async(k,v)=>{data=structuredClone(v);}, transaction:async fn=>fn(storage) };
      objects.set(id,new QuotaStore({storage}));
    }
    return { fetch:(url,opts)=>objects.get(id).fetch(new Request(url,opts)) };
  } } };
}
function request(path, body, extra = {}) { return new Request('https://worker.example'+path, { method:'POST',headers:{Origin:base.SITE_ORIGIN,'Content-Type':'application/json','CF-Connecting-IP':'192.0.2.1',...extra},body:JSON.stringify(body) }); }
const question = { question: '解释公式', note: { title:'矩阵',body:'$x_i$' } };
test('PIN lives on server; invalid PIN and forged role cannot grant owner',async()=>{
  const env=environment();
  assert.equal((await handleNotebook(request('/owner/login',{pin:'wrong'}),env)).status,401);
  const success=await (await handleNotebook(request('/owner/login',{pin:base.OWNER_PIN}),env)).json();
  assert.equal(await verifyOwner(success.token,env),true);
  assert.equal(await verifyOwner(success.token+'x',env),false);
  assert.equal(await verifyOwner(await ownerSession(env,0),env),false);
  const r=await handleNotebook(request('/chat',{...question,role:'owner'}),env,async()=>Response.json({choices:[{message:{content:'answer'}}]}));
  assert.equal((await r.json()).role,'guest');
});
test('guest burst limit is enforced server-side and blocks upstream calls',async()=>{
  const env=environment(); let calls=0;
  const upstream=async()=>{calls++;return Response.json({choices:[{message:{content:'answer'}}]});};
  assert.equal((await handleNotebook(request('/chat',question),env,upstream)).status,200);
  assert.equal((await handleNotebook(request('/chat',question),env,upstream)).status,200);
  assert.equal((await handleNotebook(request('/chat',question),env,upstream)).status,429);
  assert.equal(calls,2);
});
test('owner bypasses guest count, raw TeX reaches provider, key stays out of response',async()=>{
  const env=environment(); const token=await ownerSession(env);
  for(let i=0;i<3;i++){
    const r=await handleNotebook(request('/chat',question,{Authorization:'Bearer '+token}),env,async(url,opts)=>{
      assert.equal(url,'https://api.xiaomimimo.com/v1/chat/completions');
      assert.ok(JSON.parse(opts.body).messages.at(-1).content.includes('$x_i$'));
      return Response.json({choices:[{message:{content:'answer'}}]});
    });
    assert.equal(r.status,200);assert.doesNotMatch(await r.text(),/test-key/);
  }
});
test('cross-origin, expired session, oversized note and malformed body fail closed',async()=>{
  const env=environment();const never=()=>{throw Error('upstream must not be called');};
  assert.equal((await handleNotebook(request('/chat',question,{Origin:'https://evil.example'}),env,never)).status,403);
  assert.equal((await handleNotebook(request('/chat',question,{Authorization:'Bearer invalid'}),env,never)).status,401);
  assert.equal((await handleNotebook(request('/chat',{...question,note:{title:'x',body:'x'.repeat(100001)}}),env,never)).status,400);
  assert.equal((await handleNotebook(request('/chat',null),env,never)).status,400);
});
test('writing auth requires CSRF and correct PIN before delivering GitHub token',async()=>{
  const env=environment();const csrf=crypto.randomUUID();
  const req=(pin,withCookie)=>new Request('https://worker.example/auth',{method:'POST',headers:{Origin:'https://worker.example','CF-Connecting-IP':'192.0.2.1',Cookie:withCookie?'__Host-notebook-csrf='+csrf:''},body:new URLSearchParams({pin,csrf})});
  assert.equal((await handleNotebook(req(base.OWNER_PIN,false),env)).status,403);
  assert.doesNotMatch(await (await handleNotebook(req('wrong',true),env)).text(),/test-github-token/);
  const r=await handleNotebook(req(base.OWNER_PIN,true),env);
  assert.match(await r.text(),/event.source !== window.opener/);
});
