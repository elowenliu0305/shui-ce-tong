# 税策通项目进度

> 项目路径：`/Users/jyokann/Documents/ChatGPT/新悦杯/dist/`
> 仓库：github.com/elowenliu0305/shui-ce-tong（main 分支）
> 最后更新：2026-10-20（spec 002 全部 70/70 完成，真实语料管线闭环，Vercel 生产部署上线）

## 当前状态（一句话）

spec 001/002 全部完成。React 前端 + Supabase 云后端（102 份真实政策资料已入库、656 向量、AI 问答已接 DeepSeek）已部署 Vercel 生产环境：https://dist-elowenliu0305-6335s-projects.vercel.app

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
6. schema 重建后 service_role 丢失表/视图平台默认授权 → 迁移 `202610200001/0002` 显式补齐（新环境务必应用）
7. Storage 拒绝非 ASCII key（服务端 URL 解码路径，percent-encoding 也无效）→ 导入对象名固定 `{batchId}/{sourceId}/source`

**How to apply:** 今后改 migration 里的 SQL 函数，注意 `search_path=''` 下所有跨 schema 对象必须加限定符；云库函数热修用 `create or replace` 单独重建（含 create policy 的 migration 不能整体重放）。

## 待办

1. 需已验证浏览器测试账号的项：3 项生产 E2E（`SUPABASE_E2E_EMAIL/PASSWORD`）与其余真实后端集成测试（数据库/RPC/检索层已用 service role 全部验收）
2. mammoth→sprintf-js 中危依赖：无上游修复，暴露面已评估（仅 library API），待上游发版
3. Vercel 项目名目前是 `dist`（控制台 Settings 可改成 shui-ce-tong，域名随之更新；改了记得同步 Supabase 的 `ALLOWED_WEB_ORIGINS` secret）

## 部署与环境

- **Vercel 生产**：https://dist-elowenliu0305-6335s-projects.vercel.app（备用别名 dist-blue-tau-48）；生产环境变量 `VITE_DATA_BACKEND=supabase` + 云项目 URL/publishable key
- **Supabase Edge secrets 已配**：`ALLOWED_WEB_ORIGINS`（两个 Vercel 域名）、`MODEL_*`（DeepSeek deepseek-v4-pro）、`EMBEDDING_*`（DashScope qwen3.7-text-embedding 1024 维，工作空间 ws-sk906y6jxrs4ubt0）
- **资料库现状**：102 文件 / 101 当前版本 / 656 分块 / 656 向量（generation e67fdf77 active），全部 verified+current（2026-10-20 用户确认批量核验）

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
