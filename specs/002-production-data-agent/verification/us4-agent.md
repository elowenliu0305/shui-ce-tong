# US4 带来源的通用 AI Agent 验收记录

日期：2026-10-19

## 已通过

- `npm run typecheck`
- `npm run lint`
- `npm run test`：25 个测试文件、80 项测试通过；1 个测试文件中的 1 项真实 Supabase Edge 集成测试因未配置测试项目自动跳过。
- `npm run test:e2e -- tests/e2e/agent-production.spec.ts`：360px 和 390px 下共 4 项通过。
- 普通、税务政策、企业报告和小微经营金融四类问题使用确定性路由；普通问题不伪造政策引用，并可自然引导至小微企业现金流、融资、成本和经营管理。
- 税务/政策问题强制先走 `reliable_tax` 检索；无候选、检索失败、模型未返回白名单 citation ID 时均不输出确定税务结论。
- 引用只接受当次检索返回的 citation ID，并保留资料版本、分块 locator、文号、机构、有效性和摘录；前端引用卡片可打开资料详情。
- 企业上下文只投影地区、行业、允许的画像字段以及报告风险/行动/金额摘要，不向模型发送企业名称、统一社会信用代码、邮箱或完整文件内容。
- 会话写入使用请求 hash 和幂等键，用户消息、助手消息、引用、工具调用与审计事件在同一数据库函数中提交；相同请求可重放，不重复创建消息。
- 模型密钥只从 Edge 本地环境读取；模型客户端覆盖缺少配置、JSON 输出校验、20,000 字上限、超时和有界重试。
- 移动端浏览器验收覆盖四类问答、税务引用打开、无依据降级、历史会话、创建第二企业、切换后隔离以及切回原企业恢复历史。

## 已写好、待真实 Supabase 环境执行

- `supabase/tests/040_agent_rls.sql`：17 项 pgTAP 断言，覆盖账号隔离、当前企业隔离、切换后立即隐藏、浏览器禁止直写/改写消息、当前企业会话删除和幂等重放只产生一对消息。
- `supabase/migrations/202610190040_agent_schema.sql` 与 `202610190041_agent_security.sql` 的真实 PostgreSQL 迁移、触发器和事务行为。
- `supabase/functions/agent-chat/index.ts` 对真实 `knowledge-search`、私密模型 API 和数据库持久化的端到端调用。

当前主机没有 Docker，也没有配置生产 Supabase/模型私密凭据，无法执行 `supabase db reset`、`supabase test db` 或真实 Edge 调用。上述项目完成前 T069 保持未完成，不将数据库 RLS、真实模型或线上 Agent 描述为已上线。
