# Tasks: 税策通第一版 React 前端

**Input**: `spec.md`、`plan.md`、`research.md`、`data-model.md`、`contracts/`、`quickstart.md`  
**Scope**: React + TypeScript + Vite、确定性浏览器规则、Mock Service；不接 Supabase、真实 RAG、真实模型或文件解析  
**Tests**: Vitest + React Testing Library + Playwright，规则测试先于实现

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 可在不同文件中并行执行，不依赖尚未完成的同文件任务
- **[USn]**: 对应 `spec.md` 用户故事
- 每项任务均包含明确文件路径

## Phase 1: Setup（工程初始化）

**Purpose**: 保存原型、建立 React 工程和质量命令。

- [X] T001 将当前 `index.html`、`app.js`、`styles.css` 与图片资产保存为只读参考到 `prototype/legacy/`
- [X] T002 创建 React + TypeScript + Vite 依赖与脚本配置到 `package.json`
- [X] T003 [P] 创建 TypeScript 与 Vite 配置到 `tsconfig.json`、`tsconfig.app.json`、`vite.config.ts`
- [X] T004 [P] 创建 ESLint、Vitest、Testing Library 与 Playwright 基线到 `eslint.config.js`、`src/test/setup.ts`、`playwright.config.ts`
- [X] T005 [P] 建立设计 token、全局样式和原型资产目录到 `src/styles/tokens.css`、`src/styles/globals.css`、`public/prototype-assets/`
- [X] T006 更新 Node/Vite 忽略项并确保环境文件不入库到 `.gitignore`

**Checkpoint**: `npm run typecheck`、`npm run test`、`npm run build` 能在空壳项目运行。

---

## Phase 2: Foundational（共享基础，阻塞所有用户故事）

**Purpose**: 建立领域契约、版本化 Mock 状态、服务边界、路由和通用 UI。

- [X] T007 [P] 定义统一结果、字段值、会话和错误类型到 `src/domain/shared.ts`、`src/services/contracts/service-result.ts`
- [X] T008 [P] 定义企业、体检、报告、知识、Agent 和文件领域类型到 `src/domain/enterprise.ts`、`src/domain/assessment.ts`、`src/domain/report.ts`、`src/domain/knowledge.ts`、`src/domain/agent.ts`、`src/domain/file-analysis.ts`
- [X] T009 [P] 定义六类稳定服务接口到 `src/services/contracts/`
- [X] T010 创建 v2 MockEnvelope、种子、校验、克隆和版本化 localStorage 读写到 `src/services/mock/mock-database.ts`、`src/fixtures/`
- [X] T011 创建依赖注入、会话上下文和应用 reducer 到 `src/app/providers.tsx`、`src/app/app-context.tsx`
- [X] T012 创建 React Router 路由表与登录/建企守卫到 `src/app/router.tsx`、`src/app/route-guards.tsx`
- [X] T013 [P] 创建移动画布、页面头、底部导航、按钮、卡片、状态徽标和反馈组件到 `src/components/`
- [X] T014 [P] 固化 10 道风险题和代表性知识目录 fixture 到 `src/fixtures/risk-questions.ts`、`src/fixtures/knowledge.ts`
- [X] T015 创建入口与应用壳到 `index.html`、`src/main.tsx`、`src/app/App.tsx`

**Checkpoint**: 页面不直接访问 localStorage/fixture；所有路由可渲染 loading/empty/error 边界。

---

## Phase 3: User Story 1 — 注册并管理第一家企业（Priority: P1）

**Goal**: 邮箱账号演示、首次建企、当前企业、多企业切换和永久删除。

**Independent Test**: 新账号完成注册/验证/建企进入首页；老账号回到上次企业；删除企业级联资产但保留收藏。

### Tests

- [X] T016 [P] [US1] 为 AuthService 邮箱、验证和重置状态编写测试到 `tests/unit/mock-auth-service.test.ts`
- [X] T017 [P] [US1] 为 EnterpriseService 必填校验、切换、级联删除与收藏保留编写测试到 `tests/unit/mock-enterprise-service.test.ts`
- [X] T018 [P] [US1] 为首次建企路由守卫和登录页面编写集成测试到 `tests/integration/auth-onboarding.test.tsx`

### Implementation

- [X] T019 [US1] 实现不持久化明文密码的 MockAuthService 到 `src/services/mock/mock-auth-service.ts`
- [X] T020 [US1] 实现显式 enterpriseId 写入和删除摘要的 MockEnterpriseService 到 `src/services/mock/mock-enterprise-service.ts`
- [X] T021 [P] [US1] 实现登录、注册、验证、忘记密码和重置页面到 `src/features/auth/`
- [X] T022 [P] [US1] 实现首次建企、企业列表、编辑、切换和删除对话框到 `src/features/enterprises/`
- [X] T023 [US1] 实现带当前企业上下文的首页到 `src/features/home/HomePage.tsx`
- [X] T024 [US1] 将 Auth/Enterprise 服务接入路由守卫和全局上下文到 `src/app/providers.tsx`、`src/app/route-guards.tsx`

**Checkpoint**: US1 可独立验收，账号无企业时不能进入业务首页。

---

## Phase 4: User Story 2 — 输入驱动税务体检（Priority: P1）

**Goal**: 13 项经营资料与 10 道风险题独立保存，规则严格计算风险、健康度和待核验。

**Independent Test**: 同一企业全安全得到低风险/100%；4 个异常、2 个 unknown 得到中风险/60%/2 项待核验。

### Tests

- [X] T025 [P] [US2] 为 0/2/3/5/6/10 边界、unknown 和第 10 题编写参数化测试到 `tests/unit/evaluate-risk.test.ts`
- [X] T026 [P] [US2] 为 13 字段 known/unknown/unset、金额元和完整度编写测试到 `tests/unit/company-profile.test.ts`
- [X] T027 [P] [US2] 为唯一草稿、自动保存与恢复编写集成测试到 `tests/integration/assessment-draft.test.tsx`

### Implementation

- [X] T028 [US2] 实现纯风险规则到 `src/domain/rules/evaluate-risk.ts`
- [X] T029 [US2] 实现经营资料完整度与字段校验到 `src/domain/rules/profile-completeness.ts`
- [X] T030 [US2] 实现按企业保存资料/问卷草稿和预览的 MockAssessmentService 到 `src/services/mock/mock-assessment-service.ts`
- [X] T031 [P] [US2] 实现体检介绍、录入方式和 13 字段资料页到 `src/features/assessment/AssessmentIntroPage.tsx`、`src/features/assessment/ProfilePage.tsx`
- [X] T032 [P] [US2] 实现 10 题、进度、unknown、确认和分析页到 `src/features/assessment/QuestionnairePage.tsx`、`src/features/assessment/AssessmentConfirmPage.tsx`、`src/features/assessment/AnalyzingPage.tsx`
- [X] T033 [US2] 接通自动保存、继续填写和未答完禁止完成到 `src/features/assessment/assessment-flow.tsx`

**Checkpoint**: US2 的所有结果来自纯函数；企业经营资料不参与风险等级。

---

## Phase 5: User Story 3 — 可解释、不可变报告（Priority: P1）

**Goal**: 确定性政策三态、金额门槛、不可变快照、报告列表与详情。

**Independent Test**: 两次不同输入生成不同报告；修改草稿与规则后第一份报告序列化值不变。

### Tests

- [X] T034 [P] [US3] 为 pass/fail/unknown 和 eligible/pending/ineligible 编写测试到 `tests/unit/evaluate-policy.test.ts`
- [X] T035 [P] [US3] 为缺失输入、公式白名单和重叠排除编写测试到 `tests/unit/calculate-savings.test.ts`
- [X] T036 [P] [US3] 为报告深拷贝、不可变与版本引用编写测试到 `tests/unit/build-report.test.ts`
- [X] T037 [P] [US3] 为报告路由读取指定 snapshot 编写集成测试到 `tests/integration/report-snapshot.test.tsx`

### Implementation

- [X] T038 [US3] 实现条件运算白名单和政策三态到 `src/domain/rules/evaluate-policy.ts`
- [X] T039 [US3] 实现金额门槛、公式注册和重叠排除到 `src/domain/rules/calculate-savings.ts`
- [X] T040 [US3] 实现 AssessmentResult 与不可变 ReportSnapshot builder 到 `src/domain/rules/build-report.ts`
- [X] T041 [US3] 在 MockAssessmentService 原子追加 run/snapshot 并禁止覆盖到 `src/services/mock/mock-assessment-service.ts`
- [X] T042 [P] [US3] 实现报告总览、政策列表/详情和风险列表/详情到 `src/features/reports/`
- [X] T043 [P] [US3] 实现历史报告列表与时间快照入口到 `src/features/reports/ReportHistoryPage.tsx`
- [X] T044 [US3] 将报告上下文接入“问 AI”入口到 `src/features/reports/ReportAgentAction.tsx`

**Checkpoint**: 建企→资料→10 题→报告 MVP 闭环完成，旧报告不漂移。

---

## Phase 6: User Story 4 — 完整资料库体验（Priority: P1）

**Goal**: 政策/时讯/案例列表、全文搜索、详情、状态、下载描述与账号收藏。

**Independent Test**: 标题/文号/机构/正文命中，不存在词返回 0；解析失败仍有下载；失效政策不进入新报告。

### Tests

- [X] T045 [P] [US4] 为搜索字段、0 结果、状态筛选和下载描述编写测试到 `tests/unit/mock-knowledge-service.test.ts`
- [X] T046 [P] [US4] 为收藏跨企业保留和适用性重算编写集成测试到 `tests/integration/knowledge-favorites.test.tsx`

### Implementation

- [X] T047 [US4] 实现 KnowledgeService 搜索、筛选、详情、下载描述和收藏状态到 `src/services/mock/mock-knowledge-service.ts`
- [X] T048 [P] [US4] 实现资料库列表、搜索、筛选和空/错/重试状态到 `src/features/knowledge/KnowledgePage.tsx`、`src/features/knowledge/SearchPage.tsx`
- [X] T049 [P] [US4] 实现正文、元数据、效力/解析状态、来源和下载入口到 `src/features/knowledge/KnowledgeDetailPage.tsx`
- [X] T050 [US4] 实现账号级收藏交互和当前企业适用性标签到 `src/features/profile/FavoritesPage.tsx`、`src/features/knowledge/FavoriteButton.tsx`

**Checkpoint**: Mock catalog 覆盖代表性 parsed/failed/effective/expired；102 份真实导入明确留给后端阶段。

---

## Phase 7: User Story 5 — 通用 AI Agent（Priority: P1）

**Goal**: 普通问题、税务 RAG、企业报告、经营金融、依据不足和错误状态使用不同 Mock 路径。

**Independent Test**: 普通问题无伪引用；税务问题有引用或 insufficient-evidence；切换企业不串对话。

### Tests

- [X] T051 [P] [US5] 为七类 Agent 场景、引用约束和脱敏上下文编写测试到 `tests/unit/mock-agent-service.test.ts`
- [X] T052 [P] [US5] 为企业/报告/资料上下文切换编写集成测试到 `tests/integration/agent-context.test.tsx`

### Implementation

- [X] T053 [US5] 实现意图路由、引用、工具摘要与错误状态 MockAgentService 到 `src/services/mock/mock-agent-service.ts`
- [X] T054 [P] [US5] 实现 Agent 对话、上下文条、引用卡、建议追问和重试 UI 到 `src/features/agent/AgentPage.tsx`
- [X] T055 [P] [US5] 实现按企业隔离的会话历史到 `src/features/agent/AgentHistoryPage.tsx`
- [X] T056 [US5] 将报告和资料详情入口接入受限上下文 ID 到 `src/features/agent/agent-navigation.ts`

**Checkpoint**: Agent 不读取 API Key，不在浏览器模拟真实模型或伪造无来源税务结论。

---

## Phase 8: User Story 6 — 历史资产与文件分析演示（Priority: P2）

**Goal**: 历史报告、收藏、会话、文件记录按范围展示；文件流程始终 `contentRead=false`。

**Independent Test**: 两家企业各有报告/会话/文件且互不串档；收藏共享；文件结果不声称读取内容。

### Tests

- [X] T057 [P] [US6] 为文件元数据、任务状态和 `contentRead=false` 编写测试到 `tests/unit/mock-file-analysis-service.test.ts`
- [X] T058 [P] [US6] 为双企业资产隔离编写集成测试到 `tests/integration/enterprise-assets.test.tsx`

### Implementation

- [X] T059 [US6] 实现只保存文件显示元数据的 MockFileAnalysisService 到 `src/services/mock/mock-file-analysis-service.ts`
- [X] T060 [P] [US6] 实现文件选择、任务、进度、结果和历史页面到 `src/features/files/`
- [X] T061 [P] [US6] 实现“我的”、报告/收藏/会话/文件资产入口到 `src/features/profile/ProfilePage.tsx`
- [X] T062 [US6] 在企业切换与删除后刷新所有企业级资产视图到 `src/app/app-context.tsx`

**Checkpoint**: 文件状态序列化后不含 File、Blob、base64、Object URL 或正文。

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: 主链路 E2E、响应式、可访问性、安全与交付文档。

- [X] T063 [P] 编写注册/建企/体检/报告/Agent 主链路到 `tests/e2e/core-flow.spec.ts`
- [X] T064 [P] 编写搜索/收藏/双企业/删除/文件演示链路到 `tests/e2e/assets-flow.spec.ts`
- [X] T065 执行并修复 `npm run typecheck`、`npm run lint`、`npm run test`、`npm run build`、`npm run test:e2e`
- [X] T066 验证 360×800 与 390×844 无横向溢出、44px 触控和键盘焦点到 `tests/e2e/responsive.spec.ts`
- [X] T067 扫描源码与构建产物中的密码、API Key、service role key、验证码和真实文件内容到 `scripts/check-secrets.mjs`
- [X] T068 更新前端运行、验收和后端交接说明到 `README.md`、`specs/001-tax-assessment-engine/quickstart.md`
- [X] T069 更新阶段工作簿和实施状态到 `../docs/workbook.md`、`specs/001-tax-assessment-engine/spec.md`

---

## Dependencies & Execution Order

### Phase dependencies

```text
Setup → Foundational → US1 → US2 → US3 (MVP)
                         ├────→ US4
                         ├────→ US5
                         └────→ US6
US1–US6 → Polish
```

- Setup 必须先完成，Foundational 阻塞所有用户故事。
- US1 提供 session 与 enterprise context，US2–US6 依赖它。
- US2 提供草稿和风险结果，US3 依赖它。
- US4、US5、US6 在 US1 后可并行，但本项目按 US2/US3 核心闭环优先顺序推进。
- Polish 只在所需用户故事完成后执行。

### Parallel examples

- Setup：T003、T004、T005 可并行。
- Foundational：T007、T008、T009、T013、T014 可在不同文件中并行。
- US1：T016–T018 测试可并行；T021 与 T022 可并行。
- US2：T025–T027 测试可并行；T031 与 T032 可并行。
- US3：T034–T037 测试可并行；T042 与 T043 可并行。
- US4/US5/US6：各故事测试和不同 feature 目录 UI 可并行。

## Implementation Strategy

### MVP first

1. 完成 T001–T015（工程和基础）。
2. 完成 T016–T024（登录与企业）。
3. 完成 T025–T033（输入驱动体检）。
4. 完成 T034–T044（不可变报告）。
5. 停止并按 quickstart 场景 A–C 独立验收。

### Incremental delivery

1. MVP 通过后增加 US4 资料库。
2. 增加 US5 Agent。
3. 增加 US6 资产与文件演示。
4. 执行跨故事质量与安全门。

## Completion checklist

- 所有任务采用 `- [ ] Tnnn [P?] [US?] 描述 + 文件路径` 格式。
- 每个用户故事包含独立测试标准、测试任务和实现任务。
- 页面只消费 service interfaces，不直接读 localStorage 或 fixture。
- 完成任务后必须将对应复选框更新为 `[X]`。
