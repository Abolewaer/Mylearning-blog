const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const admin = path.join(__dirname, '../source/admin');

function loadGuard() {
  let hook;
  const context = {
    TextEncoder, WeakSet, setTimeout() {}, clearTimeout() {},
    window: { CMS: { registerEventListener(value) { hook = value; } } },
    document: {
      createElement: () => ({ setAttribute() {}, classList: { toggle() {} } }),
      body: { append() {} }, addEventListener() {}
    }
  };
  vm.runInNewContext(fs.readFileSync(path.join(admin, 'paste-images.js'), 'utf8'), context);
  context.window.installImageSaveGuard();
  return hook;
}

// Run the pinned editor's actual event dispatcher, including its data replacement rule.
function dispatcher(hook) {
  const vendor = fs.readFileSync(path.join(admin, 'vendor/decap-cms.js'), 'utf8');
  const start = vendor.indexOf('async function Ns({name:e,data:t})');
  const end = vendor.indexOf('function Fs(', start);
  assert.ok(start >= 0 && end > start, 'Update the dispatcher fixture when upgrading Decap');
  return vm.runInNewContext(`(${vendor.slice(start, end)})`, {
    Ms() {}, ks: { eventHandlers: { preSave: [hook] } }
  });
}
class Entry {
  constructor(values) { this.values = values; }
  get(key) { return this.values[key]; }
  set(key, value) { return new Entry({ ...this.values, [key]: value }); }
}
test('preSave preserves title, body and new/existing entry metadata through Decap', async () => {
  const invoke = dispatcher(loadGuard());
  for (const newRecord of [true, false]) {
    const fields = { title: '深度学习笔记', body: '公式 $x_i$\n![图](data:image/png;base64,YQ==)', date: '2026-09-16' };
    const data = { toJS: () => fields, get: key => fields[key] };
    const entry = new Entry({ data, newRecord, slug: 'note', path: 'source/_posts/note.md' });
    const result = await invoke({ name: 'preSave', data: { entry } });
    assert.equal(result, entry);
    assert.equal(result.get('data').get('title'), fields.title);
    assert.equal(result.get('data').get('body'), fields.body);
  }
});
test('preSave rejects oversized UTF-8 documents without changing their data', async () => {
  const invoke = dispatcher(loadGuard());
  const data = { toJS: () => ({ title: '大笔记', body: '汉'.repeat(2 * 1024 * 1024) }) };
  const entry = new Entry({ data });
  await assert.rejects(invoke({ name: 'preSave', data: { entry } }), /过大/);
  assert.equal(entry.get('data'), data);
});
