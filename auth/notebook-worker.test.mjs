import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handleNotebook, ownerSession, verifyOwner, QuotaStore } from './notebook-worker.mjs';
const base = { OWNER_PIN: 'test-pin', SESSION_SECRET: 'test-secret-long-enough-not-production', SITE_ORIGIN: 'https://owner.example', MIMO_MODEL: 'test-model', MIMO_API_KEY: 'test-key', GITHUB_TOKEN: 'test-github-token' };
function environment() {
  const objects = new Map();
  return { ...base, QUOTAS: { idFromName: x=>x, get(id) {
    if (!objects.has(id)) {
      const data=new Map(); const storage = { get:async k=>structuredClone(data.get(k)), put:async(k,v)=>{data.set(k,structuredClone(v));}, transaction:async fn=>fn(storage) };
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
test('remembered devices survive IP changes and revocation blocks reuse',async()=>{
 const env=environment();
 const login=await (await handleNotebook(request('/owner/login',{pin:base.OWNER_PIN,remember:true,name:'我的电脑'}),env)).json();
 assert.equal(login.expiresIn,null);assert.equal(await verifyOwner(login.token,env,Date.now()+10*365*86400000),true);
 const headers={Authorization:'Bearer '+login.token,'CF-Connecting-IP':'192.0.2.99'};
 const list=await (await handleNotebook(request('/owner/devices',{},headers),env)).json();
 assert.equal(list.devices.length,1);assert.equal(list.devices[0].lastIP,'192.0.2.99');
 assert.equal(list.devices[0].name,'我的电脑');
 assert.equal((await handleNotebook(request('/owner/devices',{}),env)).status,401);
 assert.equal((await handleNotebook(request('/owner/revoke',{id:list.currentId},headers),env)).status,200);
 assert.equal((await handleNotebook(request('/owner/check',{},headers),env)).status,401);
});

test('legacy credential delivery endpoints are disabled',async()=>{
 const env=environment();for(const path of ['/auth','/owner/writing-token']){
 const r=await handleNotebook(request(path,{pin:base.OWNER_PIN}),env);
 assert.equal(r.status,410);assert.doesNotMatch(await r.text(),/test-github-token/);
 }
});
test('writing proxy keeps GitHub secret server-side and restricts repository and origin',async()=>{
 const env=environment(),token=await ownerSession(env);let calls=0;
 const req=(path,auth=token,origin=base.SITE_ORIGIN)=>new Request('https://worker.example/github'+path,{headers:{Origin:origin,Authorization:'token '+auth}});
 const upstream=async(url,opts)=>{calls++;assert.equal(opts.headers.Authorization,'Bearer '+base.GITHUB_TOKEN);assert.match(url,/^https:\/\/api.github.com\//);return Response.json({login:'owner'},{headers:{Link:'<https://api.github.com/repos/Abolewaer/Mylearning-blog/contents?page=2>; rel="next"'}});};
 const r=await handleNotebook(req('/user'),env,upstream);assert.equal(r.status,200);assert.doesNotMatch(await r.text(),/test-github-token/);assert.match(r.headers.get('Link'),/worker.example\/github/);
 assert.equal((await handleNotebook(req('/repos/Abolewaer/Mylearning-blog/contents/source/_posts'),env,upstream)).status,200);
 for(const path of ['/repos/other/repo/contents','/repos/Abolewaer/Mylearning-blog/hooks','/user/repos']) assert.equal((await handleNotebook(req(path),env,upstream)).status,403);
 assert.equal((await handleNotebook(req('/user','invalid'),env,upstream)).status,401);
 assert.equal((await handleNotebook(req('/user',token,'https://evil.example'),env,upstream)).status,403);
 const list=await (await handleNotebook(request('/owner/devices',{}, {Authorization:'Bearer '+token}),env)).json();
 await handleNotebook(request('/owner/revoke',{id:list.currentId},{Authorization:'Bearer '+token}),env);
 assert.equal((await handleNotebook(req('/user'),env,upstream)).status,401);assert.equal(calls,2);
});
