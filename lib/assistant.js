const { createMarkdown } = require('./markdown.cjs');
const md = createMarkdown();
md.set({ html: false });
// Model output must not silently load tracking images.
md.renderer.rules.image = () => '[图片已省略]';
(async () => {
  const mount = document.getElementById('notebook-assistant');
  if (!mount) return;
  mount.className = 'notebook-assistant';
  mount.innerHTML = `<button class="assistant-launcher" type="button" aria-expanded="false" aria-controls="assistant-panel"><span class="assistant-ghost" aria-hidden="true"></span><span>笔记助手</span></button>
    <section class="assistant-panel" id="assistant-panel" role="dialog" aria-label="笔记助手" hidden>
    <header class="assistant-heading"><strong>游标幽灵 · 笔记助手</strong><button type="button" class="assistant-close" aria-label="关闭助手">×</button></header>
    <div class="assistant-controls"><select aria-label="使用身份"><option value="guest">游客模式</option><option value="owner">作者模式</option></select><button type="button" class="assistant-login">验证作者</button><button type="button" class="assistant-devices" hidden>已验证设备</button><a class="assistant-write" hidden>写作 ↗</a></div>
    <form class="assistant-auth" hidden><label>作者密码<input type="password" name="pin" autocomplete="current-password" required maxlength="128"></label><label>设备名称<input name="device" maxlength="80" placeholder="例如：我的电脑"></label><label><input type="checkbox" name="remember" checked>长期记住此浏览器</label><button type="submit">确认</button></form><div class="assistant-device-list" hidden></div>
    <p class="assistant-context"></p><p class="assistant-status" role="status">正在连接配置…</p>
    <div class="assistant-messages" role="log" aria-label="对话"></div>
    <form class="assistant-compose"><textarea aria-label="向助手提问" placeholder="解释这个公式，或帮我润色一段文字…" maxlength="4000"></textarea>
    <div class="assistant-actions"><button type="button" class="assistant-polish">润色当前笔记</button><button class="assistant-send" type="submit" disabled>发送</button></div>
    <p class="assistant-hint">发送时会将当前笔记和对话交给 MiMo。建议不会自动修改或发布文章。</p></form></section>`;
  const $ = selector => mount.querySelector(selector);
  const panel = $('.assistant-panel'), launcher = $('.assistant-launcher'), status = $('.assistant-status');
  const input = $('textarea'), send = $('.assistant-send'), mode = $('select');
  const messages = $('.assistant-messages');
  const history = [];
  let config = {}, note = null, ownerToken = '', busy = false;
  const storageKey = 'learning-blog-owner-device';
  function saveToken(token) { try { if (token) localStorage.setItem(storageKey,token); else localStorage.removeItem(storageKey); } catch { status.textContent='浏览器未允许保存设备凭证，本次会话仍可使用。'; } }
  function clearOwner() { ownerToken=''; saveToken(''); $('.assistant-write').hidden=true; $('.assistant-devices').hidden=true; $('.assistant-device-list').hidden=true; }
  let contextKey = location.pathname + location.hash;
  function toggle(open) { panel.hidden = !open; launcher.setAttribute('aria-expanded', String(open)); if (open) input.focus(); else launcher.focus(); }
  launcher.onclick = () => toggle(panel.hidden);
  $('.assistant-close').onclick = () => toggle(false);
  panel.addEventListener('keydown', e => { if (e.key === 'Escape') toggle(false); });
  function currentNote() { return window.notebookDraft || note; }
  function updateContext() {
    const key = location.pathname + location.hash;
    if (key !== contextKey) { history.length = 0; messages.replaceChildren(); contextKey = key; }
    const n = currentNote();
    $('.assistant-context').textContent = n ? `当前上下文：${n.title || '未命名笔记'}` : '当前未打开文章，可以直接提问。';
  }
  window.addEventListener('notebook-draft-change', updateContext);
  $('.assistant-write').href = mount.dataset.admin;
  mode.onchange = () => {
    if (mode.value === 'owner' && !ownerToken) status.textContent = '请输入作者密码验证身份。';
    else status.textContent = mode.value === 'owner' ? '作者模式 · 不受游客次数限制' : '游客模式 · 额度由服务端计算';
    send.disabled = busy || !config.endpoint || (mode.value === 'owner' && !ownerToken);
  };
  $('.assistant-login').onclick = () => {
    if (!config.endpoint) { status.textContent = '作者验证服务尚未部署。'; return; }
    $('.assistant-auth').hidden = false; $('.assistant-auth input').focus();
  };
  $('.assistant-auth').onsubmit = async event => {
    event.preventDefault();
    const pinInput = $('.assistant-auth input');
    const pin = pinInput.value;
    const loginButton = $('.assistant-auth button'); loginButton.disabled = true;
    try {
      const r = await fetch(config.endpoint + '/owner/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pin, remember: $('[name="remember"]').checked, name: $('[name="device"]').value || navigator.platform || '作者浏览器' }) });
      const result = await r.json();
      if (!r.ok) throw new Error(result.error || '验证失败');
      ownerToken = result.token; saveToken($('[name="remember"]').checked ? ownerToken : '');
      pinInput.value = ''; $('.assistant-auth').hidden = true;
      mode.value = 'owner'; $('.assistant-write').hidden = false; $('.assistant-devices').hidden=false; mode.onchange();
    } catch (e) { status.textContent = e.message || '无法连接作者验证服务'; }
    finally { loginButton.disabled = false; }
  };
  async function ownerRequest(path, data = {}) {
    const r=await fetch(config.endpoint+path,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+ownerToken},body:JSON.stringify(data)});
    const result=await r.json();
    if (!r.ok) { if(r.status===401) clearOwner(); throw new Error(result.error || '设备服务不可用'); }
    return result;
  }
  $('.assistant-devices').onclick=async()=>{
    const box=$('.assistant-device-list');box.hidden=false;box.textContent='正在读取设备…';
    try {
      const result=await ownerRequest('/owner/devices');box.replaceChildren();
      for(const device of result.devices) {
        const row=document.createElement('div'), text=document.createElement('p'), revoke=document.createElement('button');
        text.textContent=`${device.name}${device.id===result.currentId ? '（当前）' : ''} · IP ${device.lastIP || '未知'} · 验证 ${new Date(device.createdAt).toLocaleString()} · 最近 ${new Date(device.lastSeen).toLocaleString()} · ${device.exp===null ? '长期有效' : '临时会话'}`;
        revoke.type='button';revoke.textContent='撤销设备';
        revoke.onclick=async()=>{revoke.disabled=true;try{await ownerRequest('/owner/revoke',{id:device.id});row.remove();if(device.id===result.currentId){clearOwner();mode.value='guest';mode.onchange();}}catch(e){status.textContent=e.message;revoke.disabled=false;}};
        row.append(text,revoke);box.append(row);
      }
    }catch(e){box.textContent=e.message;}
  };
  function addMessage(text, role) {
    const block = document.createElement('div'); block.className = 'assistant-message ' + role;
    if (role === 'assistant') {
      block.innerHTML = md.render(text);
      const copy = document.createElement('button'); copy.type = 'button'; copy.className = 'copy-reply'; copy.textContent = '复制建议';
      copy.onclick = async () => { try { await navigator.clipboard.writeText(text); copy.textContent = '已复制'; } catch { copy.textContent = '请选中文字复制'; } };
      block.append(copy);
    } else block.textContent = text;
    messages.append(block); messages.scrollTop = messages.scrollHeight;
  }
  $('.assistant-polish').onclick = () => { input.value = '请润色当前笔记的语言，保留原意、事实、代码和 LaTeX 公式，给出修改建议和润色后的文本。'; input.focus(); };
  $('.assistant-compose').onsubmit = async event => {
    event.preventDefault();
    const question = input.value.trim();
    if (busy || !question || !config.endpoint) return;
    if (mode.value === 'owner' && !ownerToken) { mode.onchange(); return; }
    const context = currentNote();
    if (context?.body?.length > 100000) { status.textContent = '当前笔记超过单次长度限制，请拆分文章或复制需要讨论的段落。'; return; }
    busy = true; send.disabled = true; mode.disabled = true;
    addMessage(question, 'user'); input.value = ''; status.textContent = '正在思考…';
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (mode.value === 'owner') headers.Authorization = 'Bearer ' + ownerToken;
      const r = await fetch(config.endpoint + '/chat', { method: 'POST', headers,
        body: JSON.stringify({ question, note: context, history: history.slice(-8) }), signal: AbortSignal.timeout(60000) });
      const result = await r.json();
      if (!r.ok) { if (r.status === 401) { clearOwner(); } throw new Error(result.error || '请求失败'); }
      addMessage(result.reply, 'assistant');
      history.push({ role: 'user', content: question }, { role: 'assistant', content: result.reply });
      status.textContent = result.role === 'owner' ? '作者模式 · 不受游客次数限制' : `游客今日剩余 ${result.remaining} 次`;
    } catch (e) { status.textContent = e.name === 'TimeoutError' ? '请求超时，请稍后重试。' : e.message || '服务暂时不可用'; input.value = question; }
    finally { busy = false; mode.disabled = false; send.disabled = !config.endpoint || (mode.value === 'owner' && !ownerToken); }
  };
  try {
    const response = await fetch(mount.dataset.config, { cache: 'no-store' });
    if (!response.ok) throw new Error();
    config = await response.json();
    if (config.endpoint && new URL(config.endpoint).protocol !== 'https:') throw new Error();
    config.endpoint = (config.endpoint || '').replace(/\/$/, '');
    status.textContent = config.endpoint ? '游客模式 · 额度由服务端计算' : 'MiMo 尚未接通，暂时无法发送。';
    send.disabled = !config.endpoint;
    if (config.endpoint) {
      try { ownerToken=localStorage.getItem(storageKey) || ''; } catch {}
      if(ownerToken) {
        try { await ownerRequest('/owner/check');mode.value='owner';$('.assistant-write').hidden=false;$('.assistant-devices').hidden=false;mode.onchange(); }
        catch(e) { status.textContent=e.message; }
      }
    }
  } catch { status.textContent = '助手配置暂时不可用。'; }
  if (mount.dataset.context) {
    try { const r = await fetch(mount.dataset.context); if (r.ok) note = await r.json(); } catch { /* Visible context state below. */ }
  }
  updateContext();
})();
