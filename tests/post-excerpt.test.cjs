const { test } = require('node:test');
const assert = require('node:assert/strict');
const addExcerpt = require('../lib/post-excerpt.cjs');
test('new posts get a bounded excerpt while their full content stays intact', () => {
  const content = '<p>' + '深度学习'.repeat(100) + '</p><img src="data:image/png;base64,AAAA">';
  const post = addExcerpt({ layout: 'post', content });
  assert.equal(post.content, content);
  assert.equal(Array.from(post.excerpt.replace(/<[^>]+>/g, '')).length, 181);
  assert.ok(!post.excerpt.includes('base64'));
});
test('manual excerpts, descriptions and standalone pages are preserved', () => {
  for (const post of [{layout:'post',excerpt:'manual'}, {layout:'post',description:'custom'}, {layout:'page',content:'about'}]) {
    const original = { ...post };
    assert.deepEqual(addExcerpt(post), original);
  }
});
test('short and image-only posts still expose the full-article entry', () => {
  assert.equal(addExcerpt({layout:'post',content:'<p>短笔记</p>'}).excerpt, '<p>短笔记</p>');
  assert.match(addExcerpt({layout:'post',content:'<img src="data:image/png;base64,AA">'}).excerpt, /查看完整内容/);
});
