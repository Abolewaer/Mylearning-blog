const { createMarkdown, katex } = require('./markdown.cjs');
const md = createMarkdown();
// Preview HTML is disabled: notebook text should never execute inside the CMS.
md.set({ html: false });
const renderImage = md.renderer.rules.image;
md.renderer.rules.image = (tokens, index, options, env, self) => {
  const token = tokens[index];
  if (env.getAsset) token.attrSet('src', String(env.getAsset(token.attrGet('src'))));
  return renderImage(tokens, index, options, env, self);
};
window.registerNotebookMath = function () {
  const CMS = window.CMS;
  CMS.registerPreviewStyle(new URL('../vendor/katex/katex.min.css', location.href).href);
  CMS.registerEditorComponent({
    id: 'latex', label: 'LaTeX 公式',
    fields: [{ name: 'tex', label: '公式（不需要填写 $$）', widget: 'text',
      default: String.raw`\mathcal{L}(\theta) = -\frac{1}{N}\sum_{i=1}^{N}\log p_\theta(y_i\mid x_i)` }],
    pattern: /^\$\$\s*\n([\s\S]*?)\n\$\$$/m,
    fromBlock: match => ({ tex: match[1] }),
    toBlock: data => '$$\n' + data.tex + '\n$$',
    toPreview: data => katex.renderToString(data.tex || '', { displayMode: true, throwOnError: false, trust: false })
  });
  const Preview = window.createClass({
    render() {
      const entry = this.props.entry;
      const body = entry.getIn(['data', 'body']) || '';
      window.notebookDraft = { title: entry.getIn(['data', 'title']) || '未命名笔记', body };
      window.dispatchEvent(new Event('notebook-draft-change'));
      const html = md.render(body.replace(/^<!--\s*more\s*-->\s*$/m, ''), { getAsset: this.props.getAsset });
      return window.h('article', { className: 'notebook-preview' },
        window.h('h1', {}, entry.getIn(['data', 'title']) || '未命名笔记'),
        window.h('div', { dangerouslySetInnerHTML: { __html: html } }));
    }
  });
  CMS.registerPreviewTemplate('posts', Preview);
  CMS.registerPreviewTemplate('about', Preview);
};
window.addEventListener('hashchange', () => {
  if (!/\/entries\/|\/new(?:$|[/?])/.test(location.hash)) {
    window.notebookDraft = null;
    window.dispatchEvent(new Event('notebook-draft-change'));
  }
});
