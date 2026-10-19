# Quickstart Validation Guide

本指南描述当前 React 前端的运行与验收方式；以下命令已经在本仓库建立。

## Prerequisites

- 当前稳定版 Node.js LTS 与 npm
- Google Chrome（当前 Playwright 配置使用本机 Chrome channel）
- 不需要 Supabase、模型 API Key 或真实文件解析服务

## 1. Install and run

```bash
npm install
npm run dev
```

开发服务器应显示本地 URL。登录页可直接进入演示账号，也可体验邮箱注册与任意 6 位演示验证码；应用不发出 Supabase 或模型请求。

## 2. Static quality gates

```bash
npm run typecheck
npm run lint
npm run build
```

Expected:

- TypeScript strict 无错误。
- 不存在页面直接访问 localStorage 或未来 Supabase client。
- 构建产物中不存在 API Key、service role key、密码或验证码。
- 旧原型固定 86%、固定节税区间和固定风险数量未进入正式页面。

## 3. Automated tests

```bash
npm run test
npm run check:secrets
npm run test:e2e
```

Unit/integration expectations:

- 每题安全=0、异常=1、不清楚=0+待核验。
- 0/2/3/5/6/10 命中边界分别得到正确风险等级。
- 健康度始终等于 `(10-riskCount)×10`。
- 政策 pass/fail/unknown 映射为 eligible/pending/ineligible。
- 缺少资格、输入或公式时没有数值金额。
- 互斥/重叠政策不重复累加。
- 报告快照创建后不受当前草稿或规则改变影响。
- 企业删除级联业务资产但保留账号收藏。
- Agent Mock 覆盖 general、tax-rag、enterprise-context、financial-guidance、insufficient-evidence、tool-error 和 model-error。

## 4. Scenario A — first-time onboarding

1. 打开未登录状态。
2. 进入注册，提交无效邮箱并确认字段错误。
3. 使用演示有效数据注册并进入邮箱验证提示。
4. 完成 Mock 验证并登录。
5. 确认没有企业时只能进入首次建企。
6. 创建包含名称、地区和行业的企业。

Expected:

- 登录后进入当前企业首页。
- 首页显示企业上下文、搜索、体检和最新资料入口。
- 刷新后 Mock session 和当前企业可安全恢复，不保存密码。

## 5. Scenario B — assessment rules

1. 补充经营信息，将部分可选字段设为“不清楚”。
2. 第一轮全部选择安全答案并完成体检。
3. 记录风险数量、等级、健康度、政策和金额状态。
4. 第二轮选择 4 个异常答案和 2 个“不清楚”。
5. 完成新体检并比较两份报告。

Expected:

- 第一轮 0 项风险、低风险、健康度 100%。
- 第二轮 4 项已确认风险、中风险、健康度 60%，另有 2 项待核验。
- 缺少经营数据的政策为待确认且没有金额。
- 第一份历史报告保持原值。

## 6. Scenario C — policy and savings

1. 使用满足某个 Mock 政策全部条件的企业数据。
2. 确认政策显示“符合条件”，包含满足条件、依据、版本、公式和输入。
3. 清除一个必需字段并重新体检。
4. 使用确定不符合的企业数据再次体检。

Expected:

- 完整数据产生 eligible 和可解释金额。
- 缺字段产生 pending、缺失字段列表和无金额。
- 确定不符合的政策不进入报告，但在资料库仍可打开。
- 互斥或重叠项目不重复进入预计总额。

## 7. Scenario D — complete knowledge UI

1. 打开政策/时讯/案例全部列表。
2. 搜索已知标题、文号、机构和正文词。
3. 搜索 `不存在的测试词XYZ`。
4. 打开 parsed、failed、effective 和 expired 四类 Mock 详情。
5. 触发原文件下载状态并收藏一条资料。

Expected:

- 已知词正确返回，不存在词返回 0。
- parsed 显示正文；failed 明确解析失败但仍显示下载入口。
- expired 明确失效且不显示为当前企业匹配机会。
- 收藏切换企业后仍存在，适用性标签随企业变化。

## 8. Scenario E — Agent intents

1. 提问普通非税收问题。
2. 提问税务政策问题。
3. 从报告进入并询问当前企业的某条风险。
4. 提交知识库没有依据的税务问题。
5. 触发 Mock tool-error 与 model-error。

Expected:

- 普通问题直接回答且无伪造引用，并提供自然的小微企业延伸建议。
- 税务问题展示 RAG 状态和可点击引用。
- 报告问题展示正确企业/报告上下文。
- 无依据时明确 insufficient-evidence，不输出确定结论。
- 工具和模型错误可区分并重试。

## 9. Scenario F — enterprise isolation and deletion

1. 创建第二家企业，为两家分别生成报告、会话和文件演示记录。
2. 在两家企业之间切换并检查各资产列表。
3. 收藏一条政策。
4. 永久删除当前企业。

Expected:

- 报告、对话、草稿和文件记录不串档。
- 删除需要二次确认并显示进行中/失败状态能力。
- 删除成功后企业资产消失且不可恢复。
- 账号收藏仍存在；如无企业则返回首次建企。

## 10. Scenario G — file analysis demo

1. 选择一个本地文件显示名。
2. 选择分析任务并查看进度和结果。
3. 打开文件历史。

Expected:

- 所有页面明确说明当前未读取真实文件内容。
- 结果不出现具体异常笔数或已核验事实。
- 序列化 Mock 状态中没有 File、Blob、base64、Object URL 或全文。

## 11. Responsive and accessibility

在 360×800 和 390×844 视口跑完整主链路。

Expected:

- `document.documentElement.scrollWidth <= window.innerWidth`。
- `document.body.scrollWidth <= window.innerWidth`。
- 底部导航与粘性操作不遮挡内容。
- 键盘可到达所有主要交互并显示焦点。
- 主要触控目标原则上不小于 44px。
- 页面不只依赖颜色表达风险、状态或错误。
- 主链路无未捕获控制台错误或警告。

