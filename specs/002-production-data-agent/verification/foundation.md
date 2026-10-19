# Foundation 基线验收记录（T015）

日期：2026-10-19

## 执行环境

- 前端/脚本：本机 Node.js 20+，`dist/` 工程目录
- 数据库：Supabase 云项目 `shui-ce-tong`（ref `mwrsvolgftqukomfnreg`，ap-southeast-1，PostgreSQL 17），经 MCP 应用迁移
- 说明：本机无 Docker，Phase 2 基线首次改在真实云数据库上验证（此前所有 migration 从未在真实 PostgreSQL 执行过）

## 已通过

- 14 个 migration 全部成功应用于云项目（含 0001 foundation、0002 audit_and_mutations 至 0080 knowledge_performance_validation）
- `npm run typecheck`
- `npm run lint`
- `npm run test`：28 个测试文件，91 项通过、4 项跳过（跳过项为需 `SUPABASE_TEST_*` 凭据的真实后端集成项，见 final.md）
- `npm run check:secrets`：无内嵌密钥
- private schema 对 anon/authenticated 拒绝访问；审计事件表强制 RLS 且仅 service_role 可写
- `append_audit_event` 对含 password/secret/token 等键的 metadata 抛 22023 拒绝写入

## 真实数据库暴露并已修复的缺陷

首次上云时发现 2 处仅真实环境可暴露的问题，已修复源文件后全量重放：

1. `hybrid_search`（0032）与 `validate_embedding_recall`（0080）在 `set search_path = ''` 下使用了未加限定符的 pg_trgm `%` 算子和 pgvector `<=>` 算子，云库报 `operator does not exist: text % text`。修复：改为 `extensions.similarity(...) > 0.3` 与 `extensions.l2_distance(...)`，语义与原算子一致（trigram 阈值 0.3 为 pg_trgm 默认相似度阈值）。
2. 重建 public schema 重放时，`auth.users` 上残留旧触发器 `auth_user_created_profile`、`storage.objects` 上残留 4 个 `enterprise_files_storage_no_direct_*` 旧策略，导致 0010/0051 报 42710 冲突。属环境残留而非 migration 缺陷；清理后原样重放成功。

## 待办关联

- 后续 US1–US5 的 RLS/pgTAP 断言见各 `us*-*.md` 与本次 `specs/002-production-data-agent/verification/final.md` 中的 pgTAP 执行记录。

## 结论

Foundation 阶段在真实 PostgreSQL 上建立：扩展（pgcrypto/pg_trgm/vector/pgTAP）、private schema 隔离、审计与幂等 mutation 表、全部 32 张业务表与 RPC。T015 通过。
