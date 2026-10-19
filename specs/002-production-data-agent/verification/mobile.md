# T085 移动端三宽度复验记录

日期：2026-10-19

## 执行方式

```bash
E2E_SCREENSHOTS=1 npx playwright test
```

视口：`mobile-360`（360×800）、`mobile-390`（390×844）、`mobile-430`（430×932），本机 Google Chrome。
`playwright.config.ts` 新增 `mobile-430` project 与 `E2E_SCREENSHOTS=1` 截图开关（默认关闭，截图落在 gitignore 的 `test-results/` 下，每个通过用例一张 `test-finished-1.png`）。

## 结果

**39 通过 / 3 跳过 / 0 失败**（19.0s）。

跳过的 3 项为同一用例 `auth-enterprises.spec.ts › production auth and enterprise isolation` 在三个视口下的实例，需要 `SUPABASE_E2E_EMAIL/PASSWORD`（真实已验证账号）。远程验证项目无法通过 MCP 获取 service role key 来创建并确认测试用户，故保持跳过；该用例覆盖的「登录后恢复持久化企业状态」在 mock 模式由 `core-flow` 与 `auth-enterprises` 的演示账号链路等价覆盖。

## 主链路覆盖（每视口各一次）

| 链路 | 用例 |
| --- | --- |
| 账号 | 演示账号进入、主页面不溢出、底栏触控尺寸 ≥44px、焦点可见（responsive） |
| 体检 | demo 完成 10 题体检并打开上下文 Agent 回答（core-flow）；两次体检生成独立不可变历史快照（assessment-snapshots） |
| 资料 | 首页与资料库同源、类型筛选（knowledge-production 1）；全库搜索、详情、原文件与空状态闭环（knowledge-production 2）；筛选 Tab 紧凑布局（responsive 2）；搜索/收藏在账号资产可见（assets-flow 2） |
| Agent | 四类问题规则路由、税务引用可打开、无依据降级（agent-production 1）；历史会话按企业隔离、切回恢复（agent-production 2）；输入框始终可见于底栏之上（responsive 3） |
| 文件 | 未读取状态、失败不生成事实、彻底删除（file-analysis-production 1）；文件历史按企业隔离（file-analysis-production 2）；文件正文分析演示（assets-flow 1） |

## 截图索引

以下路径相对 `dist/`，`test-results/` 被 gitignore，重新执行上方命令即可再生。目录名格式：`<spec 文件>-<用例名截断>-<视口>/test-finished-1.png`。

- `test-results/agent-production-历史会话按当前企业隔离，切换回原企业后可继续查看-mobile-{360,390,430}/test-finished-1.png`
- `test-results/agent-production-四类问题按规则路由，税务引用可打开且无依据时明确降级-mobile-{360,390,430}/test-finished-1.png`
- `test-results/assessment-snapshots-two-a-a3443-immutable-history-snapshots-mobile-{360,390,430}/test-finished-1.png`
- `test-results/assets-flow-runs-the-file--7fdee-unread-content-was-analyzed-mobile-{360,390,430}/test-finished-1.png`
- `test-results/assets-flow-searches-favor-9b0e8-m-visible-in-account-assets-mobile-{360,390,430}/test-finished-1.png`
- `test-results/core-flow-demo-account-com-d8918-s-a-contextual-Agent-answer-mobile-{360,390,430}/test-finished-1.png`
- `test-results/file-analysis-production-文件历史随当前企业隔离，切回原企业后恢复-mobile-{360,390,430}/test-finished-1.png`
- `test-results/file-analysis-production-文件流程显示未读取状态，失败时不生成事实并可彻底删除记录-mobile-{360,390,430}/test-finished-1.png`
- `test-results/knowledge-production-全库搜索、详情、原文件和空状态形成闭环-mobile-{360,390,430}/test-finished-1.png`
- `test-results/knowledge-production-首页和资料库使用同一数据源并可按类型筛选-mobile-{360,390,430}/test-finished-1.png`
- `test-results/responsive-agent-composer--21ff3-above-the-bottom-navigation-mobile-{360,390,430}/test-finished-1.png`
- `test-results/responsive-knowledge-filte-bfe3e-a-tab-has-few-or-no-results-mobile-{360,390,430}/test-finished-1.png`
- `test-results/responsive-main-pages-do-n-78415-keep-accessible-touch-sizes-mobile-{360,390,430}/test-finished-1.png`

共 13 个用例 × 3 视口 = 39 张截图，与通过数一致。

## 结论

账号、体检、资料、Agent 输入框与文件五条主链路在 360/390/430px 下无横向溢出、触控目标达标、Agent 输入框不被底栏遮挡，T085 通过。
