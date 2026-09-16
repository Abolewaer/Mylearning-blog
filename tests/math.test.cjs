const test = require('node:test');
const assert = require('node:assert/strict');
const { createMarkdown } = require('../lib/markdown.cjs');
const md = createMarkdown();
test('inline subscripts and display attention render before Markdown escaping', () => {
  const html = md.render(String.raw`行内 $x_i$。

$$
\operatorname{softmax}\left(\frac{QK^\top}{\sqrt{d_k}}\right)V\tag{1}
$$`);
  assert.match(html, /class="katex"/);
  assert.match(html, /katex-display/);
  assert.doesNotMatch(html, /katex-error/);
});
test('matrix rows, aligned derivation and cases survive unchanged', () => {
  for (const tex of [String.raw`\begin{bmatrix}a&b\\c&d\end{bmatrix}`,
    String.raw`\begin{aligned}x&=y\\y&=z\end{aligned}`,
    String.raw`\begin{cases}x&x>0\\0&x\leq0\end{cases}`]) {
    const html = md.render('$$\n'+tex+'\n$$');
    assert.match(html, /katex-display/);
    assert.doesNotMatch(html, /katex-error/);
  }
});
test('code and escaped currency remain literal; duplicate heading ids are unique', () => {
  const html = md.render('`$x_i$`\n\n```latex\n$$x$$\n```\n\n\\$5\n\n## 标题\n\n## 标题');
  assert.doesNotMatch(html, /class="katex"/);
  assert.match(html, /\$5/);
  assert.match(html, /id="标题-1"/);
});
test('invalid TeX is visible and cannot become trusted HTML', () => {
  assert.match(md.render('$$\n\\notacommand{x}\n$$'), /color:/);
  assert.doesNotMatch(md.render('$$\n\\href{javascript:alert(1)}{x}\n$$'), /href="javascript:/);
});
