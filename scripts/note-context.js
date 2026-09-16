// Publish only already-public article text; preserve original TeX for the assistant.
hexo.extend.generator.register('note-context', locals => locals.posts.toArray()
  .filter(post => post.published !== false && (!post.date || Number(post.date) <= Date.now()))
  .map(post => ({
  path: post.path.replace(/index\.html$/, '') + 'context.json',
  data: JSON.stringify({ title: post.title, body: post.raw.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, ''), path: post.path })
})));
