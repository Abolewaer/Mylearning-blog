const MarkdownIt = require('markdown-it');
const texmath = require('markdown-it-texmath');
const katex = require('katex');

function createMarkdown() {
  const md = new MarkdownIt({ html: true, linkify: true, typographer: false });
  md.use(texmath, { engine: katex, delimiters: ['dollars', 'brackets'],
    katexOptions: { trust: false, strict: 'warn', throwOnError: false, maxExpand: 1000 } });
  // Accept pasted TeX such as (\varepsilon_t), while leaving ordinary prose
  // parentheses alone. Standard $...$ and \(...\) remain available.
  md.core.ruler.after('text_join', 'parenthesized_tex', state => {
    const pattern = /\((\\[a-zA-Z]+[^()\r\n]{0,999})\)/g;
    for (const block of state.tokens) {
      if (!block.children) continue;
      block.children = block.children.flatMap(token => {
        if (token.type !== 'text') return [token];
        const parts = [];
        let cursor = 0, match;
        pattern.lastIndex = 0;
        while ((match = pattern.exec(token.content))) {
          if (match.index > cursor) {
            const text = new state.Token('text', '', 0);
            text.content = token.content.slice(cursor, match.index);
            parts.push(text);
          }
          const math = new state.Token('math_inline', 'math', 0);
          math.content = match[1].replace(/\\_/g, '_');
          math.markup = '()';
          parts.push(math);
          cursor = pattern.lastIndex;
        }
        if (!parts.length) return [token];
        if (cursor < token.content.length) {
          const text = new state.Token('text', '', 0);
          text.content = token.content.slice(cursor);
          parts.push(text);
        }
        return parts;
      });
    }
  });
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
