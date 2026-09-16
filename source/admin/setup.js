/* Only public configuration belongs here. Credentials must never be bundled. */
(async function () {
  const status = document.getElementById('status');
  try {
    if (!window.CMS) throw new Error('编辑器加载失败，请刷新页面重试。');
    const response = await fetch('./settings.json', { cache: 'no-store' });
    if (!response.ok) throw new Error('无法读取后台配置。');
    const settings = await response.json();
    const local = ['localhost', '127.0.0.1'].includes(location.hostname);
    if (!local && (!settings.repo || !settings.oauthBaseUrl)) {
      status.textContent = '博客可以阅读。在线写作尚未完成作者服务配置，请联系站点作者完成配置。';
      return;
    }
    const repoBase = settings.siteUrl ? new URL(settings.siteUrl).pathname.replace(/\/$/, '') : '';
    const config = {
      load_config_file: false,
      locale: 'zh_Hans',
      backend: { name: 'github', repo: settings.repo || 'unconfigured/learning-blog', branch: 'main',
        ...(settings.oauthBaseUrl ? { base_url: settings.oauthBaseUrl, auth_endpoint: 'auth' } : {}) },
      local_backend: local ? { url: 'http://127.0.0.1:8081/api/v1' } : false,
      publish_mode: local ? 'simple' : 'editorial_workflow',
      site_url: local ? location.origin : settings.siteUrl,
      display_url: local ? location.origin : settings.siteUrl,
      logo_url: '../images/avatar.svg',
      media_folder: 'source/images/uploads',
      public_folder: (local ? '' : repoBase) + '/images/uploads',
      slug: { encoding: 'unicode', clean_accents: false, sanitize_replacement: '-' },
      collections: [
        { name: 'posts', label: '文章', label_singular: '文章', folder: 'source/_posts', create: true,
          slug: '{{year}}-{{month}}-{{day}}-{{slug}}', summary: '{{title}}', preview_path: 'posts/{{slug}}/',
          sortable_fields: ['date', 'title'], editor: { preview: true },
          fields: [
            { label: '标题', name: 'title', widget: 'string' },
            { label: '发布日期', name: 'date', widget: 'datetime', date_format: 'YYYY-MM-DD', time_format: 'HH:mm', format: 'YYYY-MM-DD HH:mm:ss' },
            { label: '更新日期', name: 'updated', widget: 'datetime', required: false, format: 'YYYY-MM-DD HH:mm:ss' },
            { label: '分类', name: 'categories', widget: 'select', multiple: true, default: ['学习笔记'], options: ['学习笔记', '论文阅读', '项目实践', '工具与方法'] },
            { label: '标签', name: 'tags', widget: 'list', required: false, hint: '用逗号分隔，例如：Python, 机器学习' },
            { label: '正文', name: 'body', widget: 'markdown', default: '## 问题与背景\n\n## 学习与实践\n\n## 总结与疑问', modes: ['rich_text', 'raw'], editor_components: ['image', 'code-block', 'latex'], hint: '可视化编辑中用 + 插入 LaTeX 公式；行内公式可在源码模式写 $...$，右侧实时预览。保存后自动发布。' }
          ] },
        { name: 'pages', label: '关于我', files: [
          { name: 'about', label: '关于我', file: 'source/about/index.md', fields: [
            { label: '标题', name: 'title', widget: 'string' },
            { label: '内容', name: 'body', widget: 'markdown', modes: ['rich_text', 'raw'] }
          ] }
        ] }
      ]
    };
    window.CMS.registerPreviewStyle('body { font-family: SimHei, Heiti SC, Microsoft YaHei, sans-serif; color: #d0dfd9; background: #0a1014; font-size: 17px; line-height: 1.95; padding: 24px; } img { max-width: 100%; } pre { overflow: auto; padding: 16px; background: #15232b; } h1,h2,h3 { line-height: 1.5; } .katex-display { overflow-x: auto; overflow-y: hidden; padding: 12px 0; } a { color: #8cebb3; } img { max-width:100%; } table { border-collapse:collapse; } td,th { border:1px solid #365047; padding:8px; }', { raw: true });
    window.registerNotebookMath();
    window.CMS.init({ config });
    document.getElementById('loading').remove();
  } catch (error) { status.textContent = error.message || '后台加载失败，请重试。'; }
})();
