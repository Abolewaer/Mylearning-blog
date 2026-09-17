const { createHash } = require('node:crypto');
const digest = content => createHash('sha256').update(content).digest('hex').slice(0, 12);
function versionHtml(html, versions, root) {
  return html.replace(/\b(src|href|data-script)=(['"])([^'"\s]+)\2/g, (match, attr, quote, url) => {
    if (!url.startsWith(root)) return match;
    const route = url.slice(root.length).split('?')[0];
    return versions.has(route) ? `${attr}=${quote}${root}${route}?v=${versions.get(route)}${quote}` : match;
  });
}
module.exports = { digest, versionHtml };
