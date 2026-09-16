import test from 'node:test';
import assert from 'node:assert/strict';
import { handle } from './worker.mjs';
const env = { GITHUB_CLIENT_ID: 'test-id', GITHUB_CLIENT_SECRET: 'test-secret', ALLOWED_USER: 'owner', SITE_ORIGIN: 'https://owner.github.io' };
const state = '00000000-0000-0000-0000-000000000001';
const callback = () => new Request(`https://auth.example/callback?state=${state}&code=one-use-code`, { headers: { Cookie: `__Host-blog-oauth=${state}` } });
test('missing configuration fails closed', async () => {
  assert.equal((await handle(new Request('https://auth.example/auth'), {})).status, 503);
});
test('login has random state, secure cookie and public-only scope', async () => {
  const r = await handle(new Request('https://auth.example/auth?provider=github'), env);
  assert.equal(r.status, 302);
  const target = new URL(r.headers.get('location'));
  assert.equal(target.origin, 'https://github.com');
  assert.equal(target.searchParams.get('scope'), 'public_repo');
  assert.match(r.headers.get('set-cookie'), /Secure; HttpOnly; SameSite=Lax/);
  assert.equal(target.searchParams.get('redirect_uri'), 'https://auth.example/callback');
});
test('missing or mismatched state is rejected without token exchange', async () => {
  for (const cookie of ['', '__Host-blog-oauth=wrong']) {
    const r = await handle(new Request(`https://auth.example/callback?state=${state}&code=x`, { headers: { Cookie: cookie } }), env, () => { throw new Error('must not call'); });
    assert.equal(r.status, 403);
  }
});
test('another GitHub user is rejected and receives no token', async () => {
  const r = await handle(callback(), env, async url => Response.json(url.includes('access_token') ? { access_token: 'fake-sensitive-token' } : { login: 'visitor' }));
  assert.equal(r.status, 403);
  assert.doesNotMatch(await r.text(), /fake-sensitive-token/);
});
test('owner token is delivered only to the configured opener origin', async () => {
  const r = await handle(callback(), env, async url => Response.json(url.includes('access_token') ? { access_token: 'fake-token' } : { login: 'OWNER' }));
  assert.equal(r.status, 200);
  const html = await r.text();
  assert.match(html, /event\.source !== window\.opener/);
  assert.match(html, /https:\/\/owner.github.io/);
  assert.match(html, /authorization:github:success:/);
  assert.equal(r.headers.get('cache-control'), 'no-store');
  assert.match(r.headers.get('set-cookie'), /Max-Age=0/);
});
