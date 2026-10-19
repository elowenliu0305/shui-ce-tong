# US2 评测与不可变报告验收记录

日期：2026-10-19

## 已通过

- `npm run typecheck`
- `npm run lint`
- `npm run test`：20 个测试文件、62 项测试通过；真实 Supabase Edge 集成测试因未配置测试项目自动跳过 1 项
- `npm run check:secrets`
- `npm run test:e2e -- assessment-snapshots.spec.ts --project=mobile-390`：1 项通过
- 风险边界黄金测试覆盖 0–2 低、3–5 中、6–10 高，10 道题同等权重
- 浏览器验收连续生成 100 分低风险和 70 分中风险报告，并确认旧报告仍显示原始 100 分快照
- 客户端对同一 revision 的失败重试复用幂等键；草稿 RPC 记录 mutation 并拒绝 revision 冲突
- 活跃 catalog 不包含未核验的演示政策规则，因此不会输出无真实依据的政策金额

## 真实 Supabase 云库验证（2026-10-19 补做）

执行环境：云项目 `shui-ce-tong`（ref `mwrsvolgftqukomfnreg`，PostgreSQL 17），pgTAP 1.3.3，经 MCP 通道执行（本机无 Docker，改在云库验证）。

- 14 个 migration 全部在真实 PostgreSQL 上应用成功（过程中暴露并修复的缺陷见 `foundation.md`）
- `supabase/tests/020_assessment.sql`：**23/23 通过**——冻结输入快照、同 key 幂等重放返回原行、同 key 不同内容 23505、finalize 失败整体回滚不留半截数据、重试可成功、completed 不可重放、report_snapshots 更新/删除被不可变触发器拒绝（55000）
- 测试在 begin/rollback 事务内执行，零夹具残留
- 顺带发现并修复：`begin_assessment_submission` 使用了 Postgres 不存在的 `jsonb_object_length`（MySQL 习惯函数名），已改为 `jsonb_object_keys` 计数（本地迁移文件与云库函数均已更新）

## 待补齐

- `tests/integration/complete-assessment.test.ts` 对已部署 Edge Function 的真实调用（需 service role / 已验证测试账号，见 `final.md`）

数据库层规则/事务/快照行为已在真实 PostgreSQL 验收通过；Edge 链路补齐前不描述为已上线。
