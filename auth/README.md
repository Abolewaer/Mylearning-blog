# 在线登录服务（尚未部署）

博客托管在 GitHub Pages，GitHub OAuth 的密钥交换必须在独立服务中运行。`worker.mjs` 是独立的 Cloudflare Worker；它不属于公开静态网站，不能复制到 `source/`。

## 配置顺序

1. 在自己的 Cloudflare 账号中创建 Worker，上传 `worker.mjs`，取得 `https://名称.账号.workers.dev`。
2. 在 GitHub Settings → Developer settings → OAuth Apps → New OAuth App 创建应用。Homepage URL 填博客网址，Authorization callback URL 填 Worker 地址加 `/callback`。
3. 在 Worker 的 Variables and Secrets 中设置：
   - `GITHUB_CLIENT_ID`：OAuth App 的 Client ID。
   - `GITHUB_CLIENT_SECRET`：OAuth App 的 Client Secret，必须设置为 Secret。
   - `ALLOWED_USER`：唯一允许登录的 GitHub 用户名。
   - `SITE_ORIGIN`：博客来源，例如 `https://用户名.github.io`，不含路径或末尾斜杠。
4. 将 `source/admin/settings.json` 的 `oauthBaseUrl` 设置为 Worker 地址（不带末尾斜杠）。
5. 发布后在博客 `/admin/` 点击 GitHub 登录，并实际验证发布文章成功。

此服务限定允许登录的用户，并通过随机 state、HttpOnly Cookie 和固定 postMessage 来源保护授权流程。GitHub 仓库权限仍是文章写入权限的最终控制。

应用申请 `public_repo`，这是 GitHub OAuth App 对公开仓库的标准权限，可能覆盖账号内其他公开仓库；它不是初次配置使用的细粒度 Token。用户需在 GitHub 授权页检查权限。若需要严格限制运行期授权只覆盖一个仓库，应改用 GitHub App 方案。

不要把个人 Token、账号密码或 Client Secret 写入源码、`settings.json` 或静态网页。

测试：`node --test auth/worker.test.mjs`。单元测试使用模拟 GitHub 返回值，不能替代部署后的真实 OAuth 测试。
