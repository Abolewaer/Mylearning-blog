const MarkdownIt = require('markdown-it');
const texmath = require('markdown-it-texmath');
const katex = require('katex');

function createMarkdown() {
  const md = new MarkdownIt({ html: true, linkify: true, typographer: false });
  md.use(texmath, { engine: katex, delimiters: ['dollars', 'brackets'],
    katexOptions: { trust: false, strict: 'warn', throwOnError: false, maxExpand: 1000 } });
  md.core.ruler.push('heading_ids', state => {
    const seen = new Map();
    state.tokens.forEach((token, i) => {
      if (token.type !== 'heading_open') return;
      const base = state.tokens[i + 1].content.trim().replace(/\s+/g, '-');
      const count = seen.get(base) || 0;
      seen.set(base, count + 1);
      token.attrSet('id', base + (count ? '-' + count : ''));
    });
  });
  return md;
}
module.exports = { createMarkdown, katex };
