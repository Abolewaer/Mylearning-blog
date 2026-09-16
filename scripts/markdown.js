const { createMarkdown } = require('../lib/markdown.cjs');
const md = createMarkdown();
for (const extension of ['md', 'markdown', 'mkd', 'mkdn', 'mdown']) {
  hexo.extend.renderer.register(extension, 'html', data => md.render(data.text), true);
}
