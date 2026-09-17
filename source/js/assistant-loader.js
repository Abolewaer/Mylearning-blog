/* Keep the Markdown/TeX runtime off the reading path. */
(() => {
  const mount = document.getElementById('notebook-assistant');
  if (!mount) return;
  mount.className = 'notebook-assistant';
  const button = document.createElement('button');
  button.className = 'assistant-launcher';
  button.type = 'button';
  button.innerHTML = '<span class="assistant-ghost" aria-hidden="true"></span><span>笔记助手</span>';
  mount.append(button);
  button.addEventListener('click', () => {
    button.disabled = true;
    button.lastElementChild.textContent = '正在加载…';
    const script = document.createElement('script');
    script.src = mount.dataset.script;
    script.onload = () => mount.querySelector('.assistant-launcher')?.click();
    script.onerror = () => {
      script.remove();
      button.disabled = false;
      button.lastElementChild.textContent = '加载失败，点击重试';
    };
    document.head.append(script);
  });
})();
