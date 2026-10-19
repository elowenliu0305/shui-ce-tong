# US3 全量资料库与可追溯搜索验收记录

日期：2026-10-19

## 已通过

- `npm run typecheck`
- `npm run lint`
- `npm run test`：22 个测试文件、69 项测试通过；1 项真实 Supabase Edge 集成测试因未配置本地项目自动跳过。
- `npx playwright test tests/e2e/knowledge-production.spec.ts`：360px 和 390px 下共 4 项通过。
- `npx playwright test`：全量 360px/390px 回归 18 项通过；2 项仅因未配置生产 Supabase 测试账号而跳过。
- 首页快讯、资料列表、类型 Tab、全库搜索、详情、收藏和原文件入口共用 `KnowledgeService`，失败不再伪装成空数据。
- 演示环境下原文件入口显示可验收提示；Supabase 环境通过需登录的 `knowledge-source-url` 返回 120 秒私有 Storage 签名 URL。
- 安全单元测试覆盖路径穿越、重复规范路径、单文件/总展开大小、压缩比、空文件和 MIME/扩展名不匹配。
- 分块测试覆盖中文结构边界、heading path、段落/字符 locator、搜索分词、重复哈希与 1024 维 embedding 验证。
- 生产依赖 `npm audit --omit=dev`：0 个漏洞。

## 资料包 dry-run 对账

输入：`资料(1).zip`

- 归档 SHA-256：`444ed32d237da63b5bc01a5f8eb5ef3590704ee092e6d76fb12ac04b35f98b6c`
- 归档大小：75,742,498 bytes；展开大小：79,940,195 bytes
- 实际文件：102；通过：102；拒绝：0
- 扩展名：82 个 `.doc`、20 个 `.docx`
- 实际格式：80 个 MHTML 网页归档、2 个 OLE Word、20 个 DOCX
- 发现 1 组二进制完全重复，包含 2 个跨境税费缴库退库通知文件；导入管道会保留两条 source row，关联到同一资料版本，不会静默丢弃。

## 已写好、待真实 Supabase 环境执行

- `supabase/tests/030_knowledge_rls.sql`：公开视图可读，内部表、chunks 和原始 Storage 对浏览器直连不可读；收藏只允许本账号。
- `supabase/tests/031_hybrid_search.sql`：精确标题、文号、机构、中文 FTS、向量排序、RRF 与 reliable mode 黄金样本。
- 完整导入、原文件上传、Qwen3-Embedding-0.6B 向量生成、generation 激活和生产检索抽样需要可用的 Supabase URL/service role 与本地私密 Embedding API 配置。

当前主机没有 Docker，无法执行 `supabase db reset` / `supabase test db`；上述项目完成前 T056 保持未完成，不将 SQL、RLS、Storage 或真实向量检索描述为已上线。

## 已记录的开发依赖风险

`npm audit` 对全部依赖报告 3 个中危，来自 `mammoth -> argparse -> sprintf-js`。它存在格式化精度无上限导致拒绝服务的公告，且当前无修复版本。本项目仅通过 Mammoth library API 解析 DOCX，不调用使用 `argparse/sprintf-js` 的 Mammoth CLI；同时归档大小、成员数、单文件大小与压缩比已受限。不采用 `npm audit fix --force` 提议的破坏性降级；待上游提供修复版本后升级。
