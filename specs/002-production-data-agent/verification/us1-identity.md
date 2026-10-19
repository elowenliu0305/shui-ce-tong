# US1 真实账号与企业数据验收记录

日期：2026-10-19

执行环境：Supabase 云项目 `shui-ce-tong`（ref `mwrsvolgftqukomfnreg`，ap-southeast-1，PostgreSQL 17），pgTAP 1.3.3（extensions schema），经 MCP 通道执行。本机无 Docker，改在云库验证。

## 已通过

数据库层（pgTAP，真实 PostgreSQL + 真实 RLS 策略）：

- `supabase/tests/010_identity_tenancy_rls.sql`：**9/9 通过**——账号/企业/current-enterprise 隔离矩阵：匿名拒绝、跨账号读不到企业、切换 current enterprise 后旧企业资产立即不可见、浏览端禁止直写内部表
- `supabase/tests/011_enterprise_rpc.sql`：**8/8 通过**——企业 revision 乐观锁（冲突 40001）、mutation 幂等（同 key 同内容重放返回原行、同 key 不同内容 23505）、越权 RPC 拒绝（P0002）
- 所有测试在 begin/rollback 事务内执行，`auth.users`、`enterprises` 等表夹具零残留（执行后计数均为 0）

浏览器层：

- `tests/e2e/auth-enterprises.spec.ts` 的演示账号链路在 mock 模式三个视口（360/390/430）通过：登录进入 → 当前企业展示 → 企业切换数据随迁（详见 `mobile.md`）
- 生产凭据版 E2E（`SUPABASE_E2E_EMAIL/PASSWORD`）保持跳过：云项目经 MCP 无法获取 service role key 创建并确认测试用户；该用例目标「已验证用户登录恢复持久化企业状态」与 010/011 的 RLS 断言相互印证，待具备 service role 后补齐（见 `final.md` 待办）

前端集成（`tests/integration/auth-onboarding.test.tsx`）：注册/验证/登录/建企状态机与失败映射通过（本机单测套件 91 项之一）。

## 待真实环境补齐

- 生产凭据 E2E 用例（需 service role 创建确认过的测试用户）
- 企业永久删除的浏览器→Edge→Storage 全链路实测（数据库级联行为已由 `011` + `050` 覆盖，`delete-enterprise` Edge Function 已部署，待可用测试账号实测）

## 结论

US1 的核心不变量——真实持久化、多企业不串档、乐观锁不覆盖、跨账号零访问——在真实 PostgreSQL 上通过独立验收。T027 通过（生产凭据 E2E 项如实保留为待办）。
