# 税策通项目进度

> 项目路径：`/Users/jyokann/Documents/ChatGPT/新悦杯/dist/`
> 仓库：github.com/elowenliu0305/shui-ce-tong（main 分支）
> 最后更新：2026-10-19（spec 002 收尾 + 真实云库验证闭环，commit 9d9e839 已推送）

## 当前状态（一句话）

React 正式前端 + Supabase 生产后端已完成 spec 001（100%）和 spec 002（69/70），全部数据库层断言在真实 PostgreSQL 上通过；唯一未完成项 T056（资料库 102 文件真实导入）卡在 service role key 与 Embedding API 凭据。

## 架构

- **前端**：React 19 + TypeScript + Vite，手机优先 SPA。页面只消费 `src/services/contracts/` 的 typed 接口，双实现可切换：`src/services/mock/`（演示，localStorage）/ `src/services/supabase/`（生产）
- **共享规则包**：`packages/assessment-engine/`（浏览器与 Edge 同一份纯函数：风险/政策/金额/完整度/报告）
- **后端**：Supabase 云项目 `shui-ce-tong`（ref `mwrsvolgftqukomfnreg`，ap-southeast-1，免费额度）
  - 14 个 migration（foundation → identity → assessment → knowledge → agent → files → perf validation）
  - 7 个 Edge Function 已部署 ACTIVE（complete-assessment / knowledge-search / knowledge-source-url / agent-chat / enterprise-file-upload / delete-enterprise / delete-enterprise-file），全部 verify_jwt
  - 后端选择：`VITE_DATA_BACKEND`（默认 mock）
- **资料管线**：`scripts/knowledge/`（manifest 对账 → 解析 → 中文分块 → Qwen3-Embedding-0.6B → generation 原子激活）
- **历史原型**：`prototype/legacy/`（vanilla JS 1:1 复刻版，即 GitHub Pages 在线 Demo 的内容，只读参考）

## spec 002 验证结果（2026-10-19）

| 层 | 结果 |
| --- | --- |
| pgTAP（真实 PostgreSQL，7 套） | 101/101 通过（010:9 / 011:8 / 020:23 / 030:10 / 031:10 / 040:18 / 050:23） |
| E2E（360/390/430 三视口） | 39 通过 / 3 跳过（生产账号用例） |
| typecheck / lint / 单测 / build / secret 扫描 | 全绿（单测 91 通过 / 4 跳过） |

完整记录见 `specs/002-production-data-agent/verification/`（foundation / us1-5 / final / mobile）。

## 验证中发现并修复的真实环境缺陷（重要！）

这些 bug 在 mock 和单测里不可见，只有真实 PostgreSQL/部署链路才暴露：

1. `begin_assessment_submission` 误用 `jsonb_object_length`（Postgres 无此函数，MySQL 习惯）→ 改 `jsonb_object_keys` 计数
2. `hybrid_search` / `validate_embedding_recall` 在 `set search_path=''` 下用了未限定符的 pg_trgm `%`、pgvector `<=>` → 改 `extensions.similarity(...) > 0.3`、`extensions.l2_distance(...)`
3. RRF 融合排序未降级失效/未核验文档（违反 spec「过期/未核验必须降级」）→ `effective_score`：superseded/revoked/pending 融合分减半
4. 040 测试 plan 计数 off-by-one（17→18）
5. 部署接口不支持函数目录外相对 import → `_shared/` 与 assessment-engine 以副本入各函数根，部署副本补 `.ts` 扩展名（本地源未动）；并发部署会串扰内容，务必顺序部署 + SHA 校验

**How to apply:** 今后改 migration 里的 SQL 函数，注意 `search_path=''` 下所有跨 schema 对象必须加限定符；云库函数热修用 `create or replace` 单独重建（含 create policy 的 migration 不能整体重放）。

## 待办（凭据/数据受限）

1. Supabase 控制台给项目设 Edge secrets：`MODEL_API_BASE_URL` / `MODEL_API_KEY` / `MODEL_NAME`、`EMBEDDING_API_BASE_URL` / `EMBEDDING_API_KEY`、`ALLOWED_WEB_ORIGINS`
2. 建已验证测试账号 → 跑 3 项生产 E2E（`SUPABASE_E2E_EMAIL/PASSWORD`）+ 4 项真实后端集成测试（`SUPABASE_TEST_URL/PUBLISHABLE_KEY/SERVICE_ROLE_KEY`）
3. T056 收尾：资料包（资料(1).zip，SHA-256 `444ed32d…`）完整导入 + 向量生成 + generation 激活 + 生产检索抽样；随后跑 `RUN_KNOWLEDGE_PERFORMANCE_TESTS=1` 的召回/p95/回滚三项
4. mammoth→sprintf-js 中危依赖：无上游修复，暴露面已评估（仅 library API），待上游发版

## 常用命令

```bash
npm run dev                      # 本地预览（Mock 模式），http://127.0.0.1:4173
npm run typecheck / lint / test / build
npm run check:secrets
npm run test:e2e                 # Playwright 三视口（本机 Chrome）
E2E_SCREENSHOTS=1 npx playwright test   # 带截图
node scripts/check-secrets.mjs
# 资料管线
npm run knowledge:manifest -- <zip> && npm run knowledge:import -- <zip>
npm run knowledge:embed && npm run knowledge:validate
```

## 本地环境备忘

- 本机无 Docker（`supabase start` / `supabase test db` 不可用）；数据库层验证统一走云项目 MCP 通道
- MCP supabase 工具已在 `~/.claude/settings.json` 全局放行（`mcp__supabase__*`）
- 云项目经 MCP 拿不到 service role key——这是所有「待真实凭据」项的共同卡点
