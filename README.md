# 学习札记

Hexo 8 + NexT Mist + 中文 Decap CMS 可视化后台。

## 当前状态

- 博客、分类、标签、归档、搜索和关于页面已建立。
- 本机富文本编辑、预览和保存可使用，不需要手写 Markdown。
- GitHub 自动发布工作流已准备。
- 仓库为 `Abolewaer/Mylearning-blog`，网站地址为 `https://abolewaer.github.io/Mylearning-blog/`。
- 在线后台尚需部署独立 OAuth 服务；配置完成前只提供本机编辑。

## 在这台电脑上使用

在项目目录中打开两个 PowerShell 终端：

```powershell
npm run preview
```

```powershell
npm run cms
```

打开 `http://127.0.0.1:4000/admin/`，点击「登录」进入本地编辑器。此处不要求 GitHub 登录，仅在本机开放。本地保存会写入文章文件，**不会自动发布到公网**。

阅读预览：`http://127.0.0.1:4000/`。

## 线上版本

配置 `source/admin/settings.json`（仅公开信息）：

```json
{
  "repo": "用户名/learning-blog",
  "siteUrl": "https://用户名.github.io/learning-blog",
  "oauthBaseUrl": "https://你的认证服务.workers.dev"
}
```

同时将 `_config.yml` 的 `url` 改为正式博客网址，`author` 改为作者名。GitHub 仓库 Settings → Pages → Source 选择 GitHub Actions。

线上后台启用审核工作流：保存草稿、设为待审核/准备发布、发布到 main 分支，GitHub Actions 随后更新网页。公开仓库的草稿分支也可被访问，**不适合保存私密草稿**。

认证服务配置见 `auth/README.md`。未配置时公网后台明确提示尚未就绪，不会提供绕过认证的本地入口。

## 日常写作

文章支持标题、发布日期、分类、标签、富文本正文、图片和代码块。选中正文可加粗，工具栏可插入标题和列表，右侧可预览文章。

`source/_posts/welcome.md` 是可修改或删除的示例文章，不代表作者真实学习成果。

## 检查与构建

```powershell
npm run build
node --test auth/worker.test.mjs
```

生成网页在 `public/`，文章在 `source/_posts/`，样式在 `source/_data/styles.styl`。不要把凭据文件放进项目。

## 第三方软件

Hexo、NexT 和 Decap CMS 使用各自开源许可证。后台固定使用 Decap CMS 3.16.2，浏览器脚本及相关许可证位于 `source/admin/vendor/`。
