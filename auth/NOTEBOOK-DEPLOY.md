# 作者写作与笔记助手

## 当前架构

后台直接验证作者密码；浏览器只持有可撤销的博客设备凭证。编辑器使用 `/github` 服务端代理读写固定仓库 `Abolewaer/Mylearning-blog`。GitHub Token 与 MiMo Key 都只保存在 Cloudflare Secrets，不下发浏览器。旧 `/auth` 和 `/owner/writing-token` 入口返回 410。

服务部署：`npx wrangler deploy --config auth/wrangler.toml`。Secrets 为 OWNER_PIN、SESSION_SECRET、MIMO_API_KEY、GITHUB_TOKEN。保持 SESSION_SECRET 不变才能保留现有设备登录。模型为 mimo-v2.5。

前端 source/assistant/settings.json 的 endpoint 和 source/admin/settings.json 的 oauthBaseUrl 指向同一个 Worker。oauthBaseUrl 字段为历史名称，现在仅代表作者服务地址，不再执行 OAuth。

## 设备与额度

勾选长期记住时，设备凭证无自动到期时间，保存在本博客 localStorage；取消勾选时会话为两小时。设备撤销后，助手和文章读写都会拒绝该凭证。清理浏览器数据或换浏览器需要重验。IP 仅作识别展示，不作为免密依据。

游客每 IP 每 UTC 日 10 次问答，每分钟 2 次；作者不受游客次数限制，最多同时两条模型请求。模型调用仍消耗小米账户额度。文章当前正文作为上下文，不自动修改正文。问题 4000 字符，笔记 100000 字符，最近 8 条消息，回答上限 4096 tokens。

## 验证与网络

`node --test auth/*.test.mjs` 验证身份、额度、设备撤销、服务端代理范围及旧令牌接口关闭。`npm test` 验证公式，`npm run build` 构建静态博客。

部分网络无法直连 workers.dev；本机测试使用系统现有代理。博客仍可独立阅读，写作和助手需要作者服务可达。
