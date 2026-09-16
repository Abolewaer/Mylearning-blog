/* Keep deletion inside Decap's authenticated, state-aware lifecycle. */
(() => {
  let pending = null, scheduled = false;
  function update() {
    scheduled = false;
    const root = document.getElementById('nc-root');
    if (!root) return;
    for (const link of root.querySelectorAll('a[href*="/collections/posts/entries/"]')) {
      const card = link.closest('li');
      if (!card || card.querySelector('.note-trash')) continue;
      card.classList.add('note-action-card');
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'note-trash';
      button.innerHTML = '<svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 10v7m4-7v7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg><span>删除</span>';
      button.setAttribute('aria-label', '删除这篇笔记');
      button.onclick = event => {
        event.preventDefault(); event.stopPropagation();
        const heading = link.querySelector('[class*="ListCardTitle"], [class*="CardHeading"]');
        const title = heading?.firstChild?.textContent?.trim() || link.textContent.trim();
        if (!window.confirm(`第一次确认：准备删除《${title}》？\n接下来会打开该笔记，并弹出最终删除确认。`)) return;
        const route = new URL(link.href).hash;
        pending = { route, expires: Date.now() + 20000 };
        link.click();
        setTimeout(() => {
          if (pending?.route === route) {
            pending = null;
            window.alert('未能自动打开删除确认。请在笔记顶部点击“删除已发布的内容”或“删除未发布的内容”。');
          }
        }, 20000);
      };
      card.append(button);
    }
    if (!pending) return;
    if (location.hash !== pending.route || Date.now() > pending.expires) { pending = null; return; }
    // Wait for the actual entry form; never click a deletion action on a list or modal.
    if (!root.querySelector('label[for^="body-field-"]')) return;
    const buttons = [...root.querySelectorAll('button')];
    if (buttons.some(b => b.textContent.trim() === '删除未发布的修改')) {
      pending = null;
      window.alert('这篇笔记还有未发布的修改。请先发布或删除这些修改，再返回列表删除整篇笔记。“删除未发布的修改”不会删除原文章。');
      return;
    }
    const action = buttons.find(b => ['删除已发布的内容', '删除未发布的内容', '删除内容'].includes(b.textContent.trim()) && !b.disabled);
    if (action) {
      pending = null;
      // This native handler always asks for the second confirmation before deleting.
      action.click();
    }
  }
  new MutationObserver(() => {
    if (!scheduled) { scheduled = true; requestAnimationFrame(update); }
  }).observe(document.body, { childList: true, subtree: true });
  window.addEventListener('hashchange', () => {
    if (pending && location.hash !== pending.route) pending = null;
    update();
  });
  update();
})();
