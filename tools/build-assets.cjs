const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const vendor = path.join(root, 'source/vendor/katex');
fs.mkdirSync(vendor, { recursive: true });
const dist = path.join(root, 'node_modules/katex/dist');
fs.copyFileSync(path.join(dist, 'katex.min.css'), path.join(vendor, 'katex.min.css'));
fs.copyFileSync(path.join(root, 'node_modules/katex/LICENSE'), path.join(vendor, 'LICENSE'));
fs.cpSync(path.join(dist, 'fonts'), path.join(vendor, 'fonts'), { recursive: true });
require('esbuild').buildSync({
  entryPoints: [path.join(root, 'lib/editor-math.js')], bundle: true, minify: true,
  platform: 'browser', outfile: path.join(root, 'source/admin/math-preview.js'),
  legalComments: 'eof'
});
