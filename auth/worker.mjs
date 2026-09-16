// Deploy this file separately as a Cloudflare Worker, never under source/.
const cookieName = '__Host-blog-oauth';
const clearCookie = `${cookieName}=; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=0`;
const baseHeaders = {
  'Cache-Control': 'no-store',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
};
function text(message, status = 200, extra = {}) {
  return new Response(message, { status, headers: { ...baseHeaders, 'Content-Type': 'text/plain; charset=utf-8', ...extra } });
}
function safeJSON(value) { return JSON.stringify(value).replace(/</g, '\\u003c'); }
export function completed(token, origin) {
  const nonce = crypto.randomUUID();
  const message = `authorization:github:success:${JSON.stringify({ token, provider: 'github' })}`;
  const html = `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>登录成功</title><p>登录成功，正在返回编辑器。</p><script nonce="${nonce}">
    const target = ${safeJSON(origin)};
    window.addEventListener('message', function receive(event) {
      if (event.origin !== target || event.source !== window.opener || event.data !== 'authorizing:github') return;
      window.removeEventListener('message', receive);
      window.opener.postMessage(${safeJSON(message)}, target);
    });
    if (window.opener) window.opener.postMessage('authorizing:github', target);
  </script></html>`;
  return new Response(html, { headers: { ...baseHeaders, 'Content-Type': 'text/html; charset=utf-8',
    'Set-Cookie': clearCookie,
    'Content-Security-Policy': `default-src 'none'; script-src 'nonce-${nonce}'; frame-ancestors 'none'; base-uri 'none'` } });
}
export async function handle(request, env, fetcher = fetch) {
  const url = new URL(request.url);
  if (request.method !== 'GET') return text('Method not allowed', 405);
  if (!['/auth', '/callback'].includes(url.pathname)) return text('Blog sign-in service');
  if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET || !env.ALLOWED_USER || !env.SITE_ORIGIN) return text('Sign-in is not configured', 503);
  let origin;
  try {
    const site = new URL(env.SITE_ORIGIN);
    if (site.protocol !== 'https:' || site.origin !== env.SITE_ORIGIN) throw new Error();
    origin = site.origin;
  } catch { return text('Invalid site origin', 503); }
  const callback = url.origin + '/callback';
  if (url.pathname === '/auth') {
    if (url.searchParams.get('provider') !== 'github') return text('Unsupported provider', 400);
    const state = crypto.randomUUID();
    const auth = new URL('https://github.com/login/oauth/authorize');
    auth.search = new URLSearchParams({ client_id: env.GITHUB_CLIENT_ID, redirect_uri: callback,
      scope: 'public_repo', state, login: env.ALLOWED_USER }).toString();
    return new Response(null, { status: 302, headers: { ...baseHeaders, Location: auth.href,
      'Set-Cookie': `${cookieName}=${state}; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=600` } });
  }
  const cookies = request.headers.get('Cookie') || '';
  const savedState = cookies.split(';').map(x => x.trim()).find(x => x.startsWith(cookieName + '='))?.slice(cookieName.length + 1);
  if (!savedState || !/^[a-f0-9-]{36}$/.test(savedState) || url.searchParams.get('state') !== savedState) return text('Invalid login state. Please sign in again.', 403, { 'Set-Cookie': clearCookie });
  if (!url.searchParams.get('code') || url.searchParams.has('error')) return text('Login was not completed.', 400, { 'Set-Cookie': clearCookie });
  try {
    const exchange = await fetcher('https://github.com/login/oauth/access_token', { method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ client_id: env.GITHUB_CLIENT_ID, client_secret: env.GITHUB_CLIENT_SECRET,
        code: url.searchParams.get('code'), redirect_uri: callback }) });
    if (!exchange.ok) return text('GitHub sign-in failed', 502, { 'Set-Cookie': clearCookie });
    const result = await exchange.json();
    if (!result.access_token) return text('GitHub did not authorize access', 403, { 'Set-Cookie': clearCookie });
    const userResponse = await fetcher('https://api.github.com/user', { headers: { Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${result.access_token}`, 'User-Agent': 'learning-blog-auth' } });
    if (!userResponse.ok) return text('Could not verify account', 403, { 'Set-Cookie': clearCookie });
    const user = await userResponse.json();
    if (String(user.login).toLowerCase() !== env.ALLOWED_USER.toLowerCase()) return text('Only the blog owner may sign in.', 403, { 'Set-Cookie': clearCookie });
    return completed(result.access_token, origin);
  } catch { return text('GitHub is temporarily unavailable. Please retry.', 502, { 'Set-Cookie': clearCookie }); }
}
export default { fetch(request, env) { return handle(request, env); } };
