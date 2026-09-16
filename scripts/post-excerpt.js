// Give every newly authored post a compact index preview without changing its source.
hexo.extend.filter.register('after_post_render', require('../lib/post-excerpt.cjs'), 20);
