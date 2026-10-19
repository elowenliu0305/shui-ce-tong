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
6. schema 重建后 service_role 丢失表/视图平台默认授权（导入脚本报 `permission denied`）→ 新增迁移 `202610200001`（表）/`202610200002`（视图）显式补齐。
7. Supabase Storage 拒绝非 ASCII key（中文文件名；服务端 URL 解码路径，percent-encoding 同样无效）→ 导入对象名固定 `{batchId}/{sourceId}/source`，原始文件名存库并经签名 URL `download` 参数还原（`import-knowledge.ts`）。

## 真实语料管线（2026-10-20，T056 闭环）

- 102/102 文件导入成功（0 失败），101 个当前版本、656 分块；经用户确认批量标记 verified + current
- qwen3.7-text-embedding（1024 维，DashScope 兼容端点）656/656 向量化，generation 校验后原子激活
- 生产检索抽样 4 类全部符合预期（精确标题/词法/真实向量混合/reliable，详见 `us3-knowledge.md`）
- `knowledge-performance.test.ts` 真实语料 **3/3 通过**（召回 ≥0.9、exact-scan 对照、p95 <2s、generation 回滚路径）
- MODEL_*（DeepSeek deepseek-v4-pro）与 EMBEDDING_* Edge secrets 已配置，AI 问答与可靠检索解锁

## Edge Functions 部署清单（mwrsvolgftqukomfnreg）

complete-assessment v1 / knowledge-search v2 / knowledge-source-url v2 / agent-chat v2 / enterprise-file-upload v2 / delete-enterprise v4 / delete-enterprise-file v2，均 verify_jwt=true，ACTIVE。

## 待办（如实保留）

1. 需已验证浏览器测试账号的项：3 项生产 E2E（`SUPABASE_E2E_EMAIL/PASSWORD`）与其余真实后端集成测试（`tests/integration/`）；service role 直连的数据库/RPC/检索/性能层已全部验收
2. mammoth→sprintf-js 中危依赖风险记录于 `us3-knowledge.md`（无上游修复，已评估暴露面）

## 结论

T084 通过：代码层全部质量门、数据库层全部 RLS/事务/检索断言、真实语料导入与向量管线、生产检索抽样与性能基线，均已在真实环境验收通过。**spec 002 全部 70 项任务完成。**
