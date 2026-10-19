# 最终全量验证记录（T084）

日期：2026-10-19

执行环境：本机 Node.js（前端/脚本/E2E）+ Supabase 云项目 `shui-ce-tong`（ref `mwrsvolgftqukomfnreg`，ap-southeast-1，PostgreSQL 17，pgTAP 1.3.3，经 MCP 通道执行数据库层验证；本机无 Docker，`supabase test db` 改为云库等价执行）。

## 全部通过

| 检查 | 命令/方式 | 结果 |
| --- | --- | --- |
| 类型 | `npm run typecheck` | 0 错误 |
| Lint | `npm run lint` | 0 问题 |
| 单元+集成（mock 层） | `npm run test` | 28 文件，91 通过 / 4 跳过（跳过项均需 `SUPABASE_TEST_*` 凭据，见待办） |
| 构建 | `npm run build` | 成功（仅 chunk 体积警告） |
| 密钥扫描 | `npm run check:secrets` | 通过 |
| E2E | `E2E_SCREENSHOTS=1 npx playwright test`（360/390/430 三视口） | 39 通过 / 3 跳过（生产账号用例），详见 `mobile.md` |
| RLS/DB 套件（pgTAP，真实 PostgreSQL） | `010` 9/9、`011` 8/8、`020` 23/23、`030` 10/10、`031` 10/10、`040` 18/18、`050` 23/23 | **101/101 通过**，事务内执行零夹具残留 |
| Migration | 14 个文件顺序应用于云项目 | 全部成功（缺陷修复后重放） |
| Seed | 引擎/问题集/政策规则/catalog 四个 release | 已灌入并校验（10 题、两处关键文案逐字核对） |
| Edge Functions | 7 个函数部署 | 全部 ACTIVE（verify_jwt=true），见下 |

## 验证过程中发现并修复的缺陷

均在真实环境（云 PostgreSQL / 部署链路）首次暴露，本地 mock 与单测无法发现：

1. `hybrid_search`、`validate_embedding_recall` 在 `search_path=''` 下使用未限定符的 pg_trgm `%` 与 pgvector `<=>` 算子 → 42883。修复：`extensions.similarity(...) > 0.3`、`extensions.l2_distance(...)`（`0032`、`0080`）。
2. `begin_assessment_submission` 使用 Postgres 不存在的 `jsonb_object_length`（MySQL 函数名误用）→ 体检提交链路 13 项级联失败。修复：`jsonb_object_keys` 计数（`0021`）。
3. 发现模式检索中已失效/未核验文档排序高于已核验现行文档，违反 spec「过期/未核验必须降级」。修复：RRF 融合 `effective_score` 对 `superseded/revoked/pending` 减半（`0032`），`031` 黄金断言复跑通过。
4. `040_agent_rls.sql` plan 计数 off-by-one（17→18）。
5. 部署接口不支持函数目录外的相对 import：`_shared/` 与 `assessment-engine` 包以副本形式放入各函数根（部署副本内 import 补 `.ts` 扩展名），本地源文件未动。并发部署曾致 `delete-enterprise` 内容串扰，已顺序重发并 SHA 校验一致（v4 `6b1e74…`）。

## Edge Functions 部署清单（mwrsvolgftqukomfnreg）

complete-assessment v1 / knowledge-search v2 / knowledge-source-url v2 / agent-chat v2 / enterprise-file-upload v2 / delete-enterprise v4 / delete-enterprise-file v2，均 verify_jwt=true，ACTIVE。

## 待办（凭据/数据受限，如实保留）

1. 4 项真实后端集成测试（`tests/integration/` 中需 `SUPABASE_TEST_URL/PUBLISHABLE_KEY/SERVICE_ROLE_KEY` 者）与 3 项生产账号 E2E（需 `SUPABASE_E2E_EMAIL/PASSWORD`）：MCP 通道不暴露 service role key，无法创建已验证测试用户；在 Supabase 控制台设置 Edge secrets（`MODEL_API_KEY`、`EMBEDDING_API_KEY` 等）并创建测试账号后执行。
2. 资料库完整导入（102 文件解析/分块/Qwen 向量/generation 激活/生产检索抽样，T056 剩余部分）：需 service role 与 Embedding API 凭据。
3. `knowledge-performance.test.ts` 的召回/p95/generation 回滚三项需真实语料后执行（`RUN_KNOWLEDGE_PERFORMANCE_TESTS=1`）。
4. mammoth→sprintf-js 中危依赖风险记录于 `us3-knowledge.md`（无上游修复，已评估暴露面）。

## 结论

T084 通过：代码层全部质量门与数据库层全部 RLS/事务/检索断言在真实 PostgreSQL 上验收通过；剩余待办均为凭据/数据依赖，非代码未就绪。
