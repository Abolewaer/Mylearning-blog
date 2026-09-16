const { stripHTML, escapeHTML } = require('hexo-util');

module.exports = function addExcerpt(post) {
  if (post.layout !== 'post' || post.excerpt || post.description) return post;
  const html = (post.content || '')
    .replace(/<(script|style|pre)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<\/(p|div|h[1-6]|li|tr|blockquote)>/gi, ' ');
  const text = stripHTML(html).replace(/\s+/g, ' ').trim();
  const characters = Array.from(text);
  const preview = characters.slice(0, 180).join('') + (characters.length > 180 ? '…' : '');
  post.excerpt = `<p>${escapeHTML(preview || '打开笔记，查看完整内容。')}</p>`;
  return post;
};
