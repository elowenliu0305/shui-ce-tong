# Implementation Plan: 生产数据与 AI Agent

**Branch**: `002-production-data-agent` | **Date**: 2026-10-19 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-production-data-agent/spec.md`

## Summary

在已验收的 React/TypeScript 前端和服务契约后接入 Supabase 生产后端：使用邮箱密码鉴权、PostgreSQL 与 RLS 隔离账号和企业数据、私有 Storage 管理原始文件、事务化规则引擎生成不可变报告，并以完整资料库、混合检索和可定位引用支撑 RAG Agent。浏览器只持有 Supabase publishable key；规则、检索、模型和删除等特权流程通过 Edge Functions 与受限 RPC 完成，任何服务端密钥都不进入仓库或前端包。

## Technical Context

**Language/Version**: TypeScript 5.9；Supabase Edge Runtime（Deno 兼容 TypeScript）；PostgreSQL SQL/PLpgSQL  
**Primary Dependencies**: React 19、Vite 7、`@supabase/supabase-js`、Supabase Auth/Postgres/Storage/Edge Functions、pgvector、Vitest、Playwright  
**Storage**: Supabase PostgreSQL；私有 Storage buckets；pgvector HNSW；浏览器不再把生产业务数据持久化到 localStorage  
**Testing**: Vitest 领域/服务单元测试；pgTAP/RLS 数据库测试；Edge Function 集成测试；Playwright 关键用户链路与 360/390/430px 响应式验收  
**Target Platform**: 现代移动与桌面浏览器；Supabase 托管 Postgres、Auth、Storage 与 Edge Functions  
**Project Type**: 现有单页 Web 应用 + 托管后端 + 离线资料导入工具  
**Performance Goals**: 常见搜索 p95 首批结果 <2s；普通持久化读写 p95 <1s；评测提交不重复且可安全重试；Agent 首个可见状态 <2s  
**Constraints**: 360–430px 无遮挡；RLS 默认拒绝；服务端重算评测；已完成报告不可更新；税务回答必须检索并引用或明确依据不足；Embedding 不在 Edge Runtime 内执行  
**Scale/Scope**: 第一版单账号拥有多企业、无多人协作；约百级初始资料文件，可扩展至十万级 chunks；10 道固定等权风险题；一个可替换的模型与 Embedding 提供层

## Constitution Check

*GATE: Phase 0 research 前检查，并在 Phase 1 设计后复查。*

| Principle | Design evidence | Result |
|---|---|---|
| 证据先于结论 | `knowledge_source → document_version → chunk → citation` 全链路；只有已核验且当前有效规则可参与计算；Agent 无可靠依据时返回 `insufficient_evidence` | PASS |
| 结果必须由输入驱动 | 共享纯函数规则包；服务端只接受原始输入标识并重算；报告保存输入、引擎、规则、资料版本哈希 | PASS |
| 数据最小化与企业隔离 | 企业级表均含 `owner_id + enterprise_id`；RLS 默认拒绝；私有 bucket；发送模型前生成最小化上下文 | PASS |
| 移动优先、可访问、可验收 | 复用已验收页面；真实服务接入后重复执行 360/390/430px、键盘与底栏遮挡测试 | PASS |
| 契约优先与渐进交付 | 数据模型、RLS 矩阵、Edge OpenAPI、导入与环境契约先于实现；保留 Mock/生产适配器切换 | PASS |

Phase 1 复查结论：无原则冲突。特权逻辑没有下放浏览器；复杂流程都有事务边界、版本与失败状态。

## Architecture

### Runtime boundaries

```text
React UI
  ├─ Supabase Auth（邮箱/密码、会话）
  ├─ RLS 保护的普通 CRUD（企业、草稿、收藏、历史读取）
  └─ Edge Functions（评测完成、检索、Agent、级联删除、签名 URL）
          ├─ PostgreSQL RPC / pgvector
          ├─ shared assessment-engine
          ├─ private Storage
          └─ 可替换模型与 Embedding 服务

离线/受控 worker
  └─ 资料包校验、解析、分块、Embedding、核验状态导入
```

### Key decisions

1. `packages/assessment-engine` 是前端预览与服务端完成评测共同使用的唯一规则实现；最终报告仍由服务端重算和落库。
2. 评测采用 `begin_assessment_submission` + `finalize_assessment_submission` 事务协议，以用户、企业和幂等键去重；完成记录与报告只追加不可更新。
3. 资料库使用精确元数据、预分词中文全文检索和 Qwen 向量检索三路召回，通过 RRF 融合；初始向量模型为 `Qwen3-Embedding-0.6B`、1024 维、归一化余弦距离。
4. 每个原始文件都保留来源记录；解析失败、重复、疑似重复不会静默丢弃。正文以不可变版本和稳定 locator 支持引用。
5. Agent 先进行意图路由。税务/政策/案例必须检索；企业/报告问题还必须验证企业归属。普通问题可直接回答但不得伪造政策引用。
6. 删除企业和文件先撤销可见性，再由删除作业清理 Storage 和派生索引；只有资源全部不可访问后才向用户返回成功。
7. 浏览器仅暴露 `VITE_SUPABASE_URL` 与 publishable key。service role、模型 API key、Embedding 凭据只存在 Edge/worker secret manager 或未跟踪的本地环境文件。

## Project Structure

### Documentation (this feature)

```text
specs/002-production-data-agent/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── database-contract.md
│   ├── edge-functions.openapi.yaml
│   ├── environment-contract.md
│   ├── ingestion-contract.md
│   └── rls-matrix.md
└── tasks.md
```

### Source Code (repository root)

```text
packages/
└── assessment-engine/
    ├── src/
    └── tests/

src/
├── app/
├── domain/
├── features/
└── services/
    ├── contracts/
    ├── mock/
    └── supabase/

supabase/
├── config.toml
├── migrations/
├── functions/
│   ├── _shared/
│   ├── agent-chat/
│   ├── complete-assessment/
│   ├── delete-enterprise/
│   ├── delete-enterprise-file/
│   └── knowledge-search/
└── tests/

scripts/
└── knowledge/
    ├── import-manifest.ts
    ├── parse-source.ts
    ├── chunk-document.ts
    └── embed-pending.ts

tests/
├── e2e/
├── integration/
└── rls/
```

**Structure Decision**: 保留现有 React 单项目结构，用 `services/supabase` 替换 Mock 实现而不改页面契约；共享确定性规则独立到 workspace package；Supabase migrations、functions 与数据库测试使用官方目录；资料导入作为受控离线工具，不与浏览器或 Edge Runtime 混在一起。

## Delivery Phases

1. **Foundation**: Supabase 配置、环境校验、迁移框架、类型和共享错误格式。
2. **Identity & tenancy**: 邮箱账号、账号档案、企业 CRUD、当前企业、RLS 和并发版本。
3. **Assessment snapshots**: 共享规则包、草稿、幂等提交、不可变 run/report、历史报告。
4. **Knowledge corpus**: Storage、导入清单、解析分块、版本/重复关系、全文与向量检索。
5. **Agent**: 意图路由、检索工具、最小企业上下文、引用校验、会话持久化与安全失败。
6. **Enterprise files**: 私有上传、处理状态、分析记录和可验证删除。
7. **Hardening**: RLS/幂等/快照/删除/检索黄金集、密钥扫描、移动端 E2E 与可观测性。

## Complexity Tracking

无 Constitution 例外。使用 Edge Functions 和独立 Embedding worker 是职责与运行时限制所需，不构成额外产品边界：Edge 负责短事务与鉴权，worker 负责模型推理和批处理。
