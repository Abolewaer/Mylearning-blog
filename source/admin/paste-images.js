/* Clipboard images belong to the document, not the shared media library. */
(() => {
  const generated = new WeakSet();
  let busy = false;
  const status = document.createElement('div');
  status.className = 'paste-image-status';
  status.setAttribute('role', 'status');
  status.hidden = true;
  document.body.append(status);
  let timer;
  function message(text, error = false) {
    clearTimeout(timer);
    status.textContent = text;
    status.hidden = false;
    status.classList.toggle('is-error', error);
    timer = setTimeout(() => { status.hidden = true; }, error ? 12000 : 4500);
  }
  function read(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('图片读取失败，请重新复制。'));
      reader.readAsDataURL(file);
    });
  }
  document.addEventListener('paste', async event => {
    if (generated.has(event)) return;
    const target = event.target;
    if (!(target instanceof Element)) return;
    const field = target.closest('.writing-body');
    const editor = target.closest('[contenteditable="true"]');
    if (!field || !editor || !event.clipboardData) return;
    const files = [...event.clipboardData.items].filter(item => item.kind === 'file' && item.type.startsWith('image/')).map(item => item.getAsFile()).filter(Boolean);
    if (!files.length) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (busy) { message('正在插入上一张图片，请稍后再粘贴。'); return; }
    if (files.some(f => !['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(f.type))) {
      message('支持粘贴 PNG、JPEG、WebP 和 GIF 图片。', true); return;
    }
    if (files.reduce((n, f) => n + f.size, 0) > 2 * 1024 * 1024) {
      message('本次图片超过 2MB，请缩小截图后粘贴。图片直接保存在正文中。', true); return;
    }
    const selection = window.getSelection();
    const range = selection?.rangeCount ? selection.getRangeAt(0).cloneRange() : null;
    const route = location.hash;
    busy = true;
    try {
      const urls = await Promise.all(files.map(read));
      if (!editor.isConnected || route !== location.hash) return;
      editor.focus();
      if (range && editor.contains(range.startContainer) && editor.contains(range.endContainer)) {
        selection.removeAllRanges(); selection.addRange(range);
      }
      const clipboard = new DataTransfer();
      clipboard.setData('text/plain', urls.map(url => `\n![粘贴图片](${url})\n`).join('\n'));
      if (!editor.closest('[class*="RawEditorContainer"]')) {
        const fragment = urls.flatMap(url => [{ type: 'image', data: { url, alt: '粘贴图片', title: '' }, children: [{ text: '' }] }, { type: 'paragraph', children: [{ text: '' }] }]);
        clipboard.setData('application/x-slate-fragment', btoa(encodeURIComponent(JSON.stringify(fragment))));
      }
      const paste = new ClipboardEvent('paste', { clipboardData: clipboard, bubbles: true, cancelable: true });
      generated.add(paste);
      let accepted = !editor.dispatchEvent(paste);
      if (!accepted) {
        const input = new InputEvent('beforeinput', { inputType: 'insertFromPaste', dataTransfer: clipboard, bubbles: true, cancelable: true });
        accepted = !editor.dispatchEvent(input);
      }
      if (!accepted) throw new Error('编辑器未接收图片，请点击正文后重新粘贴。');
      message('图片已插入正文，保存文章后生效；不会加入媒体库。');
    } catch (error) { message(error.message || '粘贴失败，请重新复制图片。', true); }
    finally { busy = false; }
  }, true);
})();
