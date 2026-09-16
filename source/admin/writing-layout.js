/* A document-first layout; field values remain owned by the editor. */
(() => {
  try {
    if (!localStorage.getItem('notebook-document-layout-v1')) {
      localStorage.setItem('cms.preview-visible', 'false');
      localStorage.setItem('cms.notes-visible', 'false');
      localStorage.setItem('notebook-document-layout-v1', 'true');
    }
  } catch {}
  const tools = document.createElement('nav');
  tools.className = 'writing-tools';
  tools.setAttribute('aria-label', '写作布局');
  tools.hidden = true;
  tools.innerHTML = '<strong>写作空间</strong><span>专注正文 · 预览可在右上角开启</span><button type="button" aria-expanded="false">文章信息</button>';
  document.body.append(tools);
  const button = tools.querySelector('button');
  let expanded = false, route = location.hash, pending = false;
  function setExpanded(value) {
    if (expanded === value) return;
    expanded = value;
    document.body.classList.toggle('writing-info-open', value);
    button.setAttribute('aria-expanded', String(value));
    button.textContent = value ? '收起文章信息' : '文章信息';
  }
  button.onclick = () => {
    setExpanded(!expanded);
    if (expanded) document.querySelector('.writing-metadata')?.scrollIntoView({ block: 'nearest' });
  };
  function update() {
    pending = false;
    if (route !== location.hash) { route = location.hash; setExpanded(false); }
    const root = document.getElementById('nc-root');
    const bodyLabel = root?.querySelector('label[for^="body-field-"]');
    const bodyField = bodyLabel?.closest('[class*="ControlContainer"]');
    const active = Boolean(bodyField);
    document.body.classList.toggle('writing-document', active);
    tools.hidden = !active;
    if (!active) return;
    bodyField.classList.add('writing-body');
    const fields = bodyField.parentElement;
    fields.classList.add('writing-fields');
    for (const label of fields.querySelectorAll('label[for]')) {
      const field = label.closest('[class*="ControlContainer"]');
      if (!field || field.parentElement !== fields) continue;
      const id = label.htmlFor;
      field.classList.toggle('writing-title', id.startsWith('title-field-'));
      const metadata = /^(date|updated|categories|tags)-field-/.test(id);
      field.classList.toggle('writing-metadata', metadata);
      // Reveal invalid metadata on save so collapsed fields never hide errors.
      if (metadata && field.querySelector('[class*="ControlErrorsList"] li')) setExpanded(true);
    }
  }
  new MutationObserver(() => {
    if (!pending) { pending = true; requestAnimationFrame(update); }
  }).observe(document.getElementById('nc-root') || document.body, { childList: true, subtree: true });
  window.addEventListener('hashchange', update);
  update();
})();
