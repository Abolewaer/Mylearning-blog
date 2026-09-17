const { digest, versionHtml } = require('../lib/asset-versions.cjs');
hexo.extend.filter.register('after_generate', async function () {
  const route = this.route;
  async function read(name) {
    const chunks = [];
    for await (const chunk of route.get(name)) chunks.push(Buffer.from(chunk));
    return Buffer.concat(chunks).toString();
  }
  const names = route.list();
  const assets = ['css/main.css', 'css/notebook-ui.css', 'js/neural-background.js',
    'js/stellar-orbits.js', 'js/assistant-loader.js', 'js/notebook-assistant.js'];
  const versions = new Map(await Promise.all(assets.filter(name => names.includes(name))
    .map(async name => [name, digest(await read(name))])));
  for (const name of names.filter(name => name.endsWith('.html'))) {
    route.set(name, versionHtml(await read(name), versions, this.config.root));
  }
});
