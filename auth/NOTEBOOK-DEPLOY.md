# 笔记助手与作者密码入口

当前状态：界面和服务代码已完成；必须部署 Worker 并配置真实密钥后才能使用模型与在线写作。不要把本文中的占位符当作真实凭据。

## 部署

在 Cloudflare Workers 部署 `auth/wrangler.toml` 指定的入口 `notebook-worker.mjs`。它复用 `worker.mjs` 的 Decap 回调握手，包含用于原子配额计数的 SQLite Durable Object `QuotaStore`。不能只上传单个文件而漏掉导入文件或绑定。

配置以下 **Secrets**，不要放进前端配置或 Git 仓库：

- `OWNER_PIN`：作者指定的密码。
- `SESSION_SECRET`：随机生成的至少 32 字节签名密钥。
- `MIMO_API_KEY`：小米官方平台 API Key。
- `GITHUB_TOKEN`：**只允许 Mylearning-blog 仓库**的写作 Token；需 Contents 和 Pull requests 的读写权限。不应使用拥有其他仓库权限的令牌。

配置变量：

- `SITE_ORIGIN=https://abolewaer.github.io`
- `MIMO_MODEL`：账户实际可用的模型名。

模型请求固定发送到 `https://api.xiaomimimo.com/v1/chat/completions`，不会把密钥发到浏览器提供的 URL。

部署后将 Worker 的 HTTPS 地址写入：

1. `source/assistant/settings.json` 的 `endpoint`。
2. `source/admin/settings.json` 的 `oauthBaseUrl`。

重新发布博客，再验证真实模型请求和 Decap 文章保存。Cloudflare 部署需要账号权限，MiMo 接入需要实际 API Key；模拟测试不能替代联调。

## 约束与使用

- 游客：每 IP 每 UTC 日 10 次，每分钟 2 次；共享网络会共享额度。请求开始就计数，模型失败也会占用一次，防止利用重试绕过限流。
- 作者：验证后取得 2 小时有效的签名会话，不受游客次数限制；最多同时处理 2 个模型请求。关闭或刷新页面需再次验证。
- 单次问题 4000 字符、当前笔记 100000 字符、最近 8 条历史消息、输出上限 4096 tokens。作者同样受单次长度约束。
- 当前版本返回完整回答，不提供逐字流式输出。
- 前台只带入当前公开文章原文，后台带入当前编辑草稿。默认不保存服务端聊天记录。
- 润色输出仅作为建议，可复制，不会自动覆盖正文或发布。
- 写作后台登录时使用同一作者密码，授权回调会把限仓库 GitHub Token 交给 Decap。密码不能视作高强度身份认证。
- 后台主题针对已固定的 Decap vendor；升级 vendor 后需重新检查控件颜色。

## 验证

`node --test auth/*.test.mjs` 验证密码、会话、游客限额、错误处理和写作回调。
`npm test` 验证公式解析。`npm run build` 构建博客和浏览器助手资源。
