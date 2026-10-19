# Tasks: 生产数据与 AI Agent

**Input**: Design documents from `/specs/002-production-data-agent/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/`

**Tests**: 本功能涉及权限隔离、金额结论和不可变快照，按 Constitution 必须包含规则、RLS、集成和关键浏览器验收测试。

**Organization**: 任务按用户故事组织，使账号、评测、资料库、Agent 和文件链路均可独立验收。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 可在不同文件中并行执行，且不依赖未完成任务
- **[Story]**: 对应 `spec.md` 中的用户故事
- 每项均给出明确文件路径

## Phase 1: Setup（共享基础设施）

**Purpose**: 建立 Supabase、本地环境、共享规则 workspace 与安全配置骨架。

- [x] T001 安装 Supabase 客户端并补充后端、数据库和知识导入脚本到 `package.json` 与 `package-lock.json`
- [x] T002 [P] 创建本地 Supabase 配置和目录骨架于 `supabase/config.toml`、`supabase/migrations/.gitkeep`、`supabase/functions/_shared/.gitkeep`、`supabase/tests/.gitkeep`
- [x] T003 [P] 创建浏览器、Edge 和 worker 安全占位配置于 `.env.example` 并补充忽略规则到 `.gitignore`
- [x] T004 [P] 初始化共享规则 workspace 于 `packages/assessment-engine/package.json`、`packages/assessment-engine/tsconfig.json` 并更新根 `tsconfig.json`
- [x] T005 [P] 扩展密钥扫描以覆盖源文件与构建产物于 `scripts/check-secrets.mjs` 和 `tests/security/secrets.test.ts`

---

## Phase 2: Foundational（阻塞所有用户故事）

**Purpose**: 建立所有真实服务共同依赖的配置、数据库安全和 Edge 运行约定。

**⚠️ CRITICAL**: 本阶段完成前不得接入任何真实用户数据链路。

- [x] T006 定义生产后端配置校验和安全失败行为于 `src/services/supabase/config.ts`
- [x] T007 [P] 创建浏览器 Supabase client 单例于 `src/services/supabase/client.ts`
- [x] T008 [P] 定义共享服务错误、请求 ID 与数据库 DTO 于 `src/services/supabase/types.ts`
- [x] T009 创建扩展、私有 schema、更新时间函数与安全辅助函数迁移于 `supabase/migrations/202610190001_foundation.sql`
- [x] T010 创建审计事件、客户端 mutation 去重和通用权限迁移于 `supabase/migrations/202610190002_audit_and_mutations.sql`
- [x] T011 [P] 创建 Edge JWT 鉴权、CORS、错误信封和安全日志工具于 `supabase/functions/_shared/auth.ts`、`supabase/functions/_shared/http.ts`、`supabase/functions/_shared/logging.ts`
- [x] T012 将 Mock/Supabase 后端选择接入服务工厂于 `src/app/providers.tsx` 和 `src/services/contracts/index.ts`
- [x] T013 [P] 建立 pgTAP/RLS 测试辅助身份和断言于 `supabase/tests/000_helpers.sql`
- [x] T014 [P] 建立 Edge Function 本地测试辅助工具于 `tests/integration/helpers/supabase.ts`
- [x] T015 执行并记录 foundation migration、typecheck、lint 与 secret scan 基线于 `specs/002-production-data-agent/verification/foundation.md`

**Checkpoint**: Mock 模式保持可运行，Supabase 模式在缺少配置时明确失败，本地数据库可重建且默认拒绝访问。

---

## Phase 3: User Story 1 - 真实账号与企业数据（Priority: P1）🎯 MVP

**Goal**: 支持邮箱注册/验证/登录/重置、多企业持久化、乐观锁更新和可核对删除，且跨账号访问为零。

**Independent Test**: 账号 A 注册验证并创建两家企业，重新登录后可恢复当前企业；账号 B 无法读取或修改；冲突更新不覆盖；删除企业后其资产不可访问但收藏保留。

### Tests for User Story 1

- [x] T016 [P] [US1] 编写账号、企业和 current enterprise RLS 矩阵测试于 `supabase/tests/010_identity_tenancy_rls.sql`
- [x] T017 [P] [US1] 编写企业 revision、mutation 幂等和越权 RPC 测试于 `supabase/tests/011_enterprise_rpc.sql`
- [x] T018 [P] [US1] 编写真实 Auth 与多企业浏览器链路测试于 `tests/e2e/auth-enterprises.spec.ts`

### Implementation for User Story 1

- [x] T019 [US1] 创建账号档案、企业、当前企业、删除作业表与触发器迁移于 `supabase/migrations/202610190010_identity_tenancy.sql`
- [x] T020 [US1] 创建账号/企业 RLS、乐观锁更新与当前企业 RPC 迁移于 `supabase/migrations/202610190011_identity_tenancy_rls.sql`
- [x] T021 [P] [US1] 实现 Supabase AuthService 于 `src/services/supabase/supabase-auth-service.ts`
- [x] T022 [P] [US1] 实现 Supabase EnterpriseService 与 revision 冲突映射于 `src/services/supabase/supabase-enterprise-service.ts`
- [x] T023 [US1] 将登录、注册、验证和重置页面接入真实 Auth 状态于 `src/app/app-context.tsx`、`src/features/auth/LoginPage.tsx`、`src/features/auth/RegisterPage.tsx`、`src/features/auth/ForgotPasswordPage.tsx`、`src/features/auth/ResetPasswordPage.tsx`
- [x] T024 [US1] 将企业列表、新建、编辑、切换接入真实服务和冲突提示于 `src/features/enterprises/EnterpriseListPage.tsx`、`src/features/enterprises/EnterpriseForm.tsx`
- [x] T025 [US1] 实现企业撤销、Storage 清理、级联删除和摘要于 `supabase/functions/delete-enterprise/index.ts`
- [x] T026 [US1] 在企业删除 UI 展示明确确认、进行中、失败和删除摘要于 `src/features/enterprises/EnterpriseListPage.tsx`
- [x] T027 [US1] 通过 Auth/企业/RLS 测试并记录独立验收结果于 `specs/002-production-data-agent/verification/us1-identity.md`

**Checkpoint**: User Story 1 可作为第一个真实后端 MVP 独立部署和验收。

---

## Phase 4: User Story 2 - 可追溯不可变体检报告（Priority: P1）

**Goal**: 服务端使用固定规则与资料 release 重算体检，幂等创建不可变 run/report，并让历史结果不受后续数据变化影响。

**Independent Test**: 同一固定输入重复计算结果一致；相同幂等键只产生一份报告；修改画像或规则后旧报告 hash 不变；0–2/3–5/6–10 风险边界和金额待补项符合规则。

### Tests for User Story 2

- [x] T028 [P] [US2] 先迁移现有风险、政策、金额和报告黄金测试到 `packages/assessment-engine/tests/assessment-engine.test.ts`
- [x] T029 [P] [US2] 编写草稿 revision、评测幂等、事务回滚和不可变触发器测试于 `supabase/tests/020_assessment.sql`
- [x] T030 [P] [US2] 编写完成评测 Edge 契约和重试集成测试于 `tests/integration/complete-assessment.test.ts`
- [x] T031 [P] [US2] 编写两次不同体检与历史快照浏览器验收于 `tests/e2e/assessment-snapshots.spec.ts`

### Implementation for User Story 2

- [x] T032 [US2] 抽取共享风险、政策、金额、完整度和报告纯函数到 `packages/assessment-engine/src/index.ts` 及分模块文件
- [x] T033 [US2] 让现有前端 Mock assessment service 使用共享规则包于 `src/services/mock/mock-assessment-service.ts`
- [x] T034 [US2] 创建草稿、不可变 release、submission、run、report 和 citation 表迁移于 `supabase/migrations/202610190020_assessment_schema.sql`
- [x] T035 [US2] 创建草稿 RLS、乐观锁保存、begin/finalize submission RPC 与不可变触发器于 `supabase/migrations/202610190021_assessment_rpcs.sql`
- [x] T036 [P] [US2] 创建已确认 10 道题、引擎版本与首批 policy rule release seed 于 `supabase/seed.sql`
- [x] T037 [US2] 实现服务端读取冻结输入、执行共享规则和事务 finalize 于 `supabase/functions/complete-assessment/index.ts`
- [x] T038 [US2] 实现 Supabase AssessmentService 草稿、完成与历史读取于 `src/services/supabase/supabase-assessment-service.ts`
- [x] T039 [US2] 将画像、问卷、确认、分析和报告页面接入 revision/幂等/失败阶段于 `src/features/assessment/assessment-flow.tsx`、`src/features/reports/useReport.ts`
- [x] T040 [US2] 通过规则/事务/快照测试并记录独立验收结果于 `specs/002-production-data-agent/verification/us2-assessment.md`

**Checkpoint**: 风险等级只由 10 题决定，画像只影响政策与金额；完成报告可复现且永不漂移。

---

## Phase 5: User Story 3 - 完整可核验资料库（Priority: P1）

**Goal**: 资料包逐文件对账入库，保留原始来源、解析和版本状态，并提供精确+全文+语义混合检索和稳定引用。

**Independent Test**: 导入包中每个文件都有来源记录；失败和重复不丢失；标题、文号、机构、正文可命中；旧版显示取代关系；未核验资料不进入可靠模式。

### Tests for User Story 3

- [X] T041 [P] [US3] 编写归档路径穿越、压缩炸弹、空文件、MIME 和逐项对账测试于 `scripts/knowledge/tests/import-manifest.test.ts`
- [X] T042 [P] [US3] 编写分块 locator、重复关系和 generation 激活测试于 `scripts/knowledge/tests/chunk-and-generation.test.ts`
- [X] T043 [P] [US3] 编写资料内部表拒绝、公开视图和签名源文件 RLS 测试于 `supabase/tests/030_knowledge_rls.sql`
- [X] T044 [P] [US3] 编写精确/FTS/向量/RRF 与可靠模式黄金检索测试于 `supabase/tests/031_hybrid_search.sql`
- [X] T045 [P] [US3] 编写资料搜索、筛选、详情、原文件和空状态浏览器验收于 `tests/e2e/knowledge-production.spec.ts`

### Implementation for User Story 3

- [X] T046 [US3] 创建资料批次、来源、文档版本、关系、chunks、embedding generations 和 favorites 迁移于 `supabase/migrations/202610190030_knowledge_schema.sql`
- [X] T047 [US3] 创建私有知识 buckets、公开资料视图、Storage/表 RLS 于 `supabase/migrations/202610190031_knowledge_security.sql`
- [X] T048 [US3] 实现安全归档扫描、SHA-256 和 source manifest 于 `scripts/knowledge/import-manifest.ts`
- [X] T049 [P] [US3] 实现格式检测、正文/元数据解析与失败状态于 `scripts/knowledge/parse-source.ts`
- [X] T050 [P] [US3] 实现结构化中文分块、定位和构建时分词于 `scripts/knowledge/chunk-document.ts`
- [X] T051 [US3] 实现 Qwen embedding 批处理、generation 验证与原子激活于 `scripts/knowledge/embed-pending.ts`
- [X] T052 [US3] 创建 trigram/GIN/HNSW 索引与三路 RRF hybrid_search RPC 于 `supabase/migrations/202610190032_knowledge_search.sql`
- [X] T053 [US3] 实现带 reliable/discovery 模式的知识检索 Edge Function 于 `supabase/functions/knowledge-search/index.ts`
- [X] T054 [US3] 实现 Supabase KnowledgeService、收藏和签名来源 URL 于 `src/services/supabase/supabase-knowledge-service.ts`
- [X] T055 [US3] 将首页、资料列表、搜索和详情接入真实检索分页与状态于 `src/features/home/HomePage.tsx`、`src/features/knowledge/KnowledgePage.tsx`、`src/features/knowledge/SearchPage.tsx`、`src/features/knowledge/KnowledgeDetailPage.tsx`
- [ ] T056 [US3] 对给定资料包执行 dry-run、导入对账和搜索抽样并记录于 `specs/002-production-data-agent/verification/us3-knowledge.md`

**Checkpoint**: 资料库搜索可独立上线；每个展示结果都能回到版本与原始来源。

---

## Phase 6: User Story 4 - 带来源的通用 AI Agent（Priority: P1）

**Goal**: Agent 区分普通、税务政策、企业报告和经营金融问题；税务回答强制 RAG 引用或依据不足，企业上下文严格隔离并最小化。

**Independent Test**: 四类问题分别获得正确路由；有依据税务回答带可打开定位引用；无依据不下确定结论；切换企业后不能读取另一企业报告或会话。

### Tests for User Story 4

- [x] T057 [P] [US4] 编写会话、消息、引用跨账号/跨企业 RLS 测试于 `supabase/tests/040_agent_rls.sql`
- [x] T058 [P] [US4] 编写意图路由、强制 RAG、依据不足和引用白名单单元测试于 `supabase/functions/agent-chat/agent.test.ts`
- [x] T059 [P] [US4] 编写企业上下文最小化、模型/检索失败阶段和幂等消息集成测试于 `tests/integration/agent-chat.test.ts`
- [x] T060 [P] [US4] 编写四类问答、引用打开、历史会话和企业切换浏览器验收于 `tests/e2e/agent-production.spec.ts`

### Implementation for User Story 4

- [x] T061 [US4] 创建会话、消息、引用、工具调用与幂等约束迁移于 `supabase/migrations/202610190040_agent_schema.sql`
- [x] T062 [US4] 创建 Agent 企业隔离 RLS 和安全历史读取 RPC 于 `supabase/migrations/202610190041_agent_security.sql`
- [x] T063 [P] [US4] 实现可替换模型客户端、超时、重试和安全错误于 `supabase/functions/_shared/model-provider.ts`
- [x] T064 [P] [US4] 实现确定性意图路由与税务 RAG 强制策略于 `supabase/functions/agent-chat/intent-router.ts`
- [x] T065 [P] [US4] 实现企业/报告归属验证和最小上下文投影于 `supabase/functions/agent-chat/context-builder.ts`
- [x] T066 [US4] 实现工具编排、citation ID 校验、消息持久化与建议追问于 `supabase/functions/agent-chat/index.ts`
- [x] T067 [US4] 实现 Supabase AgentService 和稳定失败状态映射于 `src/services/supabase/supabase-agent-service.ts`
- [x] T068 [US4] 将问答与历史页面接入真实会话、引用卡片和依据不足状态于 `src/features/agent/AgentPage.tsx`、`src/features/agent/AgentHistoryPage.tsx`
- [x] T069 [US4] 通过 Agent 隔离/引用/移动端测试并记录独立验收结果于 `specs/002-production-data-agent/verification/us4-agent.md`

**Checkpoint**: Agent 可回答普通问题，但税务结论始终受资料证据门控。

---

## Phase 7: User Story 5 - 企业文件与分析记录（Priority: P2）

**Goal**: 支持私有上传、处理状态、分析历史与彻底删除，所有文件和派生资产按企业隔离。

**Independent Test**: 两家企业上传的文件互不可见；失败处理不生成事实；删除后原文件、正文、向量和分析均无法访问。

### Tests for User Story 5

- [x] T070 [P] [US5] 编写企业文件表、Storage 路径、签名 URL 和跨企业 RLS 测试于 `supabase/tests/050_enterprise_files_rls.sql`
- [x] T071 [P] [US5] 编写上传状态、失败处理和级联删除集成测试于 `tests/integration/enterprise-files.test.ts`
- [x] T072 [P] [US5] 编写文件选择、处理中、结果、历史和删除浏览器验收于 `tests/e2e/file-analysis-production.spec.ts`

### Implementation for User Story 5

- [x] T073 [US5] 创建文件、派生 artifact、分析记录、删除状态和索引迁移于 `supabase/migrations/202610190050_enterprise_files.sql`
- [x] T074 [US5] 创建 enterprise-files 私有 bucket 与对象路径 RLS 于 `supabase/migrations/202610190051_enterprise_files_security.sql`
- [x] T075 [US5] 实现校验 MIME/大小/归属的签名上传流程于 `supabase/functions/enterprise-file-upload/index.ts`
- [x] T076 [US5] 实现先撤权再清理 Storage、正文、向量和分析的删除流程于 `supabase/functions/delete-enterprise-file/index.ts`
- [x] T077 [US5] 实现 Supabase FileAnalysisService 于 `src/services/supabase/supabase-file-analysis-service.ts`
- [x] T078 [US5] 将文件选择、状态、结果和历史页面接入真实服务于 `src/features/files/FileSelectPage.tsx`、`src/features/files/FileAnalyzingPage.tsx`、`src/features/files/FileResultPage.tsx`、`src/features/files/FileHistoryPage.tsx`
- [x] T079 [US5] 通过文件隔离/失败/删除测试并记录独立验收结果于 `specs/002-production-data-agent/verification/us5-files.md`

**Checkpoint**: 企业文件从上传到删除的完整生命周期可独立验收。

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: 跨故事安全、性能、可观测性和最终移动验收。

- [x] T080 [P] 为 Auth、评测、检索、Agent 和删除补充 request ID、耗时、错误阶段和脱敏审计于 `supabase/functions/_shared/logging.ts`
- [x] T081 [P] 增加 hybrid search exact-scan 对照、p95 性能和 generation 回滚检查于 `tests/integration/knowledge-performance.test.ts`
- [x] T082 [P] 增加 Edge 限流、输入上限和超时配置于 `supabase/config.toml` 与各 `supabase/functions/*/index.ts`
- [x] T083 更新项目架构、环境和本地运行文档于 `README.md`
- [x] T084 运行 typecheck、lint、unit、RLS、integration、E2E、secret scan 和 build 并记录于 `specs/002-production-data-agent/verification/final.md`
- [x] T085 在 360/390/430px 复验账号、体检、资料、Agent 输入框和文件主链路并记录截图索引于 `specs/002-production-data-agent/verification/mobile.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 无依赖，可立即开始。
- **Foundational (Phase 2)**: 依赖 Setup，阻塞所有用户故事。
- **US1 Identity**: 依赖 Foundational；是涉及企业资产故事的安全前提。
- **US2 Assessment**: 依赖 Foundational 与 US1 企业归属；共享规则包可在 US1 之后独立推进。
- **US3 Knowledge**: 依赖 Foundational；公开资料导入可与 US1/US2 并行，收藏集成依赖 US1。
- **US4 Agent**: 依赖 US1、US3；企业报告问答完整验收还依赖 US2。
- **US5 Files**: 依赖 US1；可与 US2/US3 并行。
- **Polish**: 依赖计划交付的所有用户故事。

### User Story Dependency Graph

```text
Setup -> Foundation -> US1 Identity ─┬─> US2 Assessment ─┐
                                    ├─> US5 Files       ├─> US4 Agent
Foundation ─────────────────────────> US3 Knowledge ────┘
```

### Parallel Opportunities

- T002–T005 可并行；T007/T008/T011/T013/T014 可按文件并行。
- 每个用户故事的测试文件可先并行建立并确认失败。
- US3 导入工具与 US1/US2 数据接入可并行；US5 可在 US1 完成后与 US2/US3 并行。
- 各故事内部带 `[P]` 的模块互不修改同一文件。

## Parallel Examples

### US1

```text
T016 RLS matrix | T017 enterprise RPC | T018 browser auth journey
T021 AuthService | T022 EnterpriseService
```

### US2

```text
T028 rule golden tests | T029 database transaction tests | T030 Edge contract | T031 E2E
```

### US3

```text
T041 archive safety | T042 chunk/generation | T043 RLS | T044 search | T045 E2E
T049 parser | T050 chunker
```

### US4

```text
T057 RLS | T058 router/citation | T059 context/integration | T060 E2E
T063 model provider | T064 router | T065 context builder
```

## Implementation Strategy

### MVP First

1. 完成 T001–T015（Setup + Foundation）。
2. 完成 T016–T027（真实账号与企业）。
3. 停止扩展并独立验收 US1：跨账号隔离、持久化、冲突和删除。
4. 再按 US2 → US3 → US4 增加核心产品价值；US5 作为 P2 增量。

### Incremental Delivery

每个阶段必须保持 Mock 模式可用，并在 Supabase 模式中独立通过该故事的测试与验收记录。数据库 schema 先迁移，服务后接入，页面只通过已有 service contracts 访问。

## Notes

- 不在代码、文档示例或日志写入真实 API key。
- 数据库/Edge 测试在本地 Supabase 可用后执行；无凭据不阻塞纯规则与配置测试。
- 任务完成后将对应复选框改为 `[x]`，并保留验证证据路径。
