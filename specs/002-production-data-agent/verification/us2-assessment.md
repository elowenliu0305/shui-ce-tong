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

## 待真实 Supabase 环境验证

- `supabase db reset` 与 `supabase test db`（当前主机没有 Docker，尚未执行迁移与 pgTAP）
- `tests/integration/complete-assessment.test.ts` 对本地 Edge Function 的同键重试、单报告写入和快照内容验证
- 企业级联删除与不可变触发器在 PostgreSQL 中的最终约束行为

上述三项完成前，任务 T040 保持未完成，不将 SQL/Edge 链路描述为已上线。
