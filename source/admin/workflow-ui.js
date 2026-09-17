/* Keep native draft/publish actions, remove the optional review UI. */
(() => {
  if (['localhost', '127.0.0.1'].includes(location.hostname)) return;
  let queued = false;
  function update() {
    queued = false;
    const root = document.getElementById('nc-root');
    if (!root) return;
    // Drafts already appear in the article collection, so the separate
    // review board adds states this single-author site does not use.
    for (const link of root.querySelectorAll('a[href="#/workflow"]')) link.closest('li')?.classList.add('notebook-review-navigation');
    if (location.hash === '#/workflow') {
      location.replace('#/collections/posts');
      return;
    }
    for (const badge of root.querySelectorAll('[class*="WorkflowBadge"]')) {
      badge.classList.add('notebook-draft-badge');
      badge.setAttribute('aria-label', '草稿');
    }
    const editing = !!root.querySelector('label[for^="body-field-"]');
    if (!editing) return;
    for (const button of root.querySelectorAll('button')) {
      const text = button.textContent.trim();
      if (/^状态[:：]/.test(text)) {
        button.classList.add('notebook-draft-status');
        button.setAttribute('aria-label', '草稿');
        button.setAttribute('aria-disabled', 'true');
        button.tabIndex = -1;
        button.onclick = event => { event.preventDefault(); event.stopPropagation(); };
      }
      if (text === '保存' || text === '正在保存...') {
        button.classList.add('notebook-save-draft');
        button.setAttribute('aria-label', text === '保存' ? '保存草稿' : '正在保存草稿');
        button.title = '保存修改为草稿，前台保持原版本；之后点击发布才会公开更新。';
      }
    }
    const hint = document.querySelector('.writing-tools span');
    const help = '保存草稿 → 发布 · 发布后才会更新前台';
    if (hint && hint.textContent !== help) hint.textContent = help;
  }
  // Capture before React's delegated status dropdown handler.
  document.addEventListener('click', event => {
    if (event.target.closest?.('.notebook-draft-status')) {
      event.preventDefault(); event.stopImmediatePropagation();
    }
  }, true);
  new MutationObserver(() => {
    if (!queued) { queued = true; requestAnimationFrame(update); }
  }).observe(document.body, { childList: true, subtree: true });
  window.addEventListener('hashchange', update);
  update();
})();
