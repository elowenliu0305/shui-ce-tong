# Implementation Plan: 税策通第一版 React 前端

**Branch**: `001-tax-assessment-engine` | **Date**: 2026-10-15 | **Spec**: [spec.md](./spec.md)  
**Scope of this plan**: 只实施 React 前端、确定性浏览器规则与 Mock Service；Supabase 和真实 AI/RAG 在前端验收后另行设计  

## Summary

将现有 HTML/CSS/JavaScript 交互稿作为视觉与题目基线，重构为 React、TypeScript、Vite 的移动优先单页应用。前端通过稳定服务契约消费 Mock 数据，完整实现邮箱账号演示、企业管理、经营信息、10 道题、输入驱动体检、不可变报告、完整资料库页面、通用 AI Agent 演示、文件分析演示和个人资产页面。

本阶段不连接 Supabase、不调用真实模型、不解析真实文件。规则引擎必须真实计算风险、健康度、政策状态和金额门槛；Agent Mock 必须按通用问题、税务 RAG、企业上下文和依据不足等意图区分返回，不能只播放固定单一路径。

## Technical Context

**Language**: TypeScript（strict）、React JSX、CSS  
**Build**: Vite，npm scripts 统一开发、构建、类型检查和测试  
**Routing**: React Router；页面可直接访问并支持浏览器前进/后退  
**State**: React Context + reducer 管理会话/UI；领域数据只通过 service interfaces 读写  
**Mock persistence**: 版本化 localStorage，仅保存演示结构化数据，不保存密钥或真实文件  
**Domain logic**: 无 DOM 依赖的纯 TypeScript 函数，负责问卷评分、政策三态条件、金额门槛和报告快照  
**Testing**: Vitest、React Testing Library、Playwright；高风险规则使用参数化单元测试  
**Target**: 现代移动与桌面浏览器；360–430px 为主设计宽度，大屏居中展示移动画布  
**Performance goals**: Mock 首屏可交互 <2s；本地规则计算 <50ms；静态搜索目录 <100ms  
**Security constraints**: 浏览器产物不得包含 API Key、Supabase service role key、密码、验证码或真实税务文件  

## Approved Product Rules

| Area | Locked rule |
|---|---|
| Auth | 邮箱+密码；邮箱验证和重置流程先做 Mock 页面与状态 |
| First entry | 无企业必须先建企；名称、地区、行业必填 |
| Company deletion | 永久级联删除企业业务资产，账号收藏保留 |
| Profile | 13 项固定字段，除名称/地区/行业外允许 unknown |
| Risk | 10 题同权；安全=0，异常=1，不清楚=0+待核验 |
| Risk bands | 0–2 低、3–5 中、6–10 高 |
| Health | `(10 - riskCount) × 10%` |
| Policy | 报告只显示 eligible 与 pending；ineligible 隐藏 |
| Savings | 仅完整资格+输入+公式计算；互斥/重叠不重复相加 |
| Reports | 每次完成创建不可变快照 |
| Knowledge | 全部资料可检索/查看/下载；仅核验并结构化政策参与匹配 |
| Favorites | 账号级；随当前企业重新显示适用性 |
| Agent | 通用问题可回答；税务问题强制 RAG+引用；可自然引导小微企业金融经营问题 |
| Files | 前端只做演示交互，不声称读取真实内容 |

## Constitution Check

| Principle | Status | Plan evidence |
|---|---|---|
| I. 证据先于结论 | PASS | 规则输出携带来源/版本；Agent 税务回答使用带引用 Mock 契约；无依据状态独立验收。 |
| II. 结果必须由输入驱动 | PASS | 纯函数计算风险、健康度、政策状态和金额门槛；禁止固定报告数据。 |
| III. 数据最小化与企业隔离 | PASS | service 方法显式接收 enterpriseId；收藏为 account scope；Mock 不存密钥/真实文件。 |
| IV. 移动优先、可访问、可验收 | PASS | 360/390px Playwright、键盘焦点、触控尺寸和错误/空状态纳入质量门。 |
| V. 契约优先与渐进交付 | PASS | 先实现 types + service contracts，再以 Mock 完整验收，Supabase 后置替换。 |

## Architecture

```text
React pages/components
        ↓
feature hooks / application services
        ↓
typed service interfaces
        ├── Mock services（本阶段）
        └── Supabase/API services（后续阶段）
        ↓
pure domain rules + immutable snapshots
```

### Boundary rules

1. 页面不得直接读取 localStorage、静态 fixture 或未来 Supabase client。
2. 页面不得自行计算健康度、政策状态、金额或拼接权威结论。
3. 规则引擎不得读取 React state、DOM、当前时间、随机值或网络。
4. 所有异步服务返回统一的 loading/success/empty/error 语义。
5. Mock 与未来真实服务必须实现同一 TypeScript interface。
6. 现有 HTML 中的视觉、文案和题目可迁移；旧的固定结果逻辑不得迁移。

## Project Structure

```text
index.html
package.json
tsconfig.json
vite.config.ts
src/
├── main.tsx
├── app/
│   ├── App.tsx
│   ├── router.tsx
│   ├── providers.tsx
│   └── route-guards.tsx
├── domain/
│   ├── account.ts
│   ├── enterprise.ts
│   ├── assessment.ts
│   ├── report.ts
│   ├── knowledge.ts
│   ├── agent.ts
│   ├── file-analysis.ts
│   └── rules/
│       ├── evaluate-risk.ts
│       ├── evaluate-policy.ts
│       ├── calculate-savings.ts
│       └── build-report.ts
├── services/
│   ├── contracts/
│   │   ├── auth-service.ts
│   │   ├── enterprise-service.ts
│   │   ├── assessment-service.ts
│   │   ├── knowledge-service.ts
│   │   ├── agent-service.ts
│   │   └── file-analysis-service.ts
│   └── mock/
│       ├── mock-database.ts
│       ├── mock-auth-service.ts
│       ├── mock-enterprise-service.ts
│       ├── mock-assessment-service.ts
│       ├── mock-knowledge-service.ts
│       ├── mock-agent-service.ts
│       └── mock-file-analysis-service.ts
├── features/
│   ├── auth/
│   ├── home/
│   ├── enterprises/
│   ├── assessment/
│   ├── reports/
│   ├── knowledge/
│   ├── agent/
│   ├── files/
│   └── profile/
├── components/
│   ├── layout/
│   ├── feedback/
│   ├── forms/
│   └── data-display/
├── fixtures/
│   ├── accounts.ts
│   ├── enterprises.ts
│   ├── policies.ts
│   ├── cases.ts
│   └── agent-scenarios.ts
├── styles/
│   ├── tokens.css
│   ├── globals.css
│   └── components.css
└── test/
    ├── setup.ts
    └── factories.ts
tests/
├── unit/
├── integration/
└── e2e/
public/
└── prototype-assets/
prototype/
└── legacy/                    # 当前 HTML/CSS/JS 的只读参考副本
```

## Route and Page Groups

### Auth

- `/login`, `/register`, `/verify-email`, `/forgot-password`, `/reset-password`

### Home and enterprises

- `/`, `/enterprises/new`, `/enterprises`, `/enterprises/:id/edit`
- 企业切换和删除确认使用可访问对话框/底部面板

### Assessment and reports

- `/assessment`, `/assessment/method`, `/assessment/profile`, `/assessment/questions/:index`, `/assessment/confirm`, `/assessment/analyzing`
- `/reports/:reportId`, `/reports/:reportId/policies`, `/reports/:reportId/policies/:policyId`
- `/reports/:reportId/risks`, `/reports/:reportId/risks/:riskId`, `/reports/history`

### Knowledge

- `/knowledge`, `/search`, `/knowledge/:documentId`, `/knowledge/:documentId/download`

### Agent, files, and profile

- `/agent`, `/agent/history`, `/files`, `/files/task`, `/files/analyzing`, `/files/result`, `/files/history`
- `/me`, `/favorites`, `/settings`

## Frontend Service Contracts

### AuthService

提供注册、登录、退出、验证状态、忘记密码和重置密码。Mock 只模拟状态，不保存或记录明文密码。

### EnterpriseService

提供 list/get/create/update/switch/delete。delete 返回级联结果摘要；当前企业删除后返回新的 activeEnterpriseId 或 `null`。

### AssessmentService

提供读取/保存经营信息草稿、读取/保存问卷草稿、预览计算、完成体检、读取报告与历史。完成体检必须原子地产生 run 和 snapshot。

### KnowledgeService

提供列表、筛选、全文搜索、详情、收藏状态和下载描述。Mock 覆盖所有 UI 状态；最终全量正文与原文件由后端/Storage 提供。

### AgentService

接收 conversationId、enterpriseId、可选 report/document context 和用户消息，返回 intent、status、answer、citations、tool trace summary 和 suggested follow-ups。Mock 至少覆盖 general、tax-rag、enterprise-context、insufficient-evidence、tool-error、model-error。

### FileAnalysisService

第一阶段只注册文件元数据并返回演示任务进度/结果；契约明确 `contentRead=false`，防止 UI 宣称已解析。

## Design and Implementation Phases

### Phase A — Scaffold and contracts

1. 保存当前原型只读副本，并建立 React/TypeScript/Vite 项目。
2. 建立路由、移动画布、设计 token、底部导航和通用反馈组件。
3. 定义领域类型、服务接口、统一错误类型和 Mock database envelope。
4. 建立 Vitest、Testing Library 与 Playwright 基线。

**Exit gate**: 构建、类型检查和空壳路由通过；无业务页面直接访问存储。

### Phase B — Deterministic domain engine

1. 固化 13 项经营字段和 10 道题数据。
2. 实现问卷记分、风险区间、健康度公式和待核验项。
3. 实现 policy condition 的 pass/fail/unknown，但 UI 只暴露 eligible/pending。
4. 实现金额门槛、互斥/重叠标记和不可变报告 builder。
5. 为边界值、相同输入确定性和不可变性建立单元测试。

**Exit gate**: 0/2/3/5/6/10 风险命中边界、unknown、金额缺失、快照不变测试全部通过。

### Phase C — Auth, onboarding, and enterprises

1. 完成邮箱账号五个页面及成功/错误/未验证/重置状态。
2. 完成首次建企拦截、首页当前企业、切换、新增和编辑。
3. 完成永久删除二次确认、进行中、失败、级联和无企业回流。

**Exit gate**: 新用户与老用户两条入口可独立验收；收藏在删除企业后保留。

### Phase D — Assessment and reports

1. 完成体检介绍、录入方式、经营信息、10 题、确认和分析进度。
2. 实现按企业自动保存与恢复唯一草稿。
3. 完成报告总览、政策/风险列表与详情、行动建议和历史快照。
4. 所有展示只消费规则输出，不读取 fixture 中的固定分数/金额。

**Exit gate**: 两组不同输入产生可解释差异；旧报告不随当前企业数据变化。

### Phase E — Knowledge and favorites

1. 完成政策/时讯/案例列表、筛选、搜索、空状态和详情正文布局。
2. 完成有效/失效、是否可参与匹配、解析失败、下载状态。
3. 完成账号级收藏与当前企业适用性标签。
4. Mock catalog 覆盖重复来源关系和代表性正文；全量导入留给后端阶段。

**Exit gate**: 精确标题/文号/正文词正确命中，不存在词返回 0；收藏跨企业保留。

### Phase F — Agent and file demo

1. 完成 Agent 上下文条、消息、引用、工具状态和建议追问。
2. Mock 实现六类意图/错误情景，并展示自然的小微企业金融经营引导。
3. 完成文件选择、任务、进度、结果和历史记录，持续显示 `contentRead=false` 语义。

**Exit gate**: 通用回答无伪引用；税务回答有引用或依据不足；切换企业不串上下文。

### Phase G — Quality and handoff

1. 跑通所有单元、组件和 E2E 测试。
2. 验证 360×800、390×844、键盘焦点、44px 触控、空/错/重试状态。
3. 扫描构建产物和 Git 变更，确认没有密钥或真实文件内容。
4. 冻结 service contracts，作为下一阶段 Supabase 与 Agent 后端设计输入。

**Exit gate**: spec 的 SC-001 至 SC-011 全部在 Mock 范围内通过，后端未实现项明确标注。

## Testing Strategy

### Unit

- 问卷选项映射、风险区间、健康度公式。
- policy pass/fail/unknown 与 eligible/pending/ineligible 映射。
- 金额必需字段、互斥与重叠。
- 报告深拷贝与不可变性。
- 企业删除级联与账号收藏保留。

### Component / integration

- 表单校验、unknown、自动保存和恢复。
- 路由 guard、首次建企、企业切换。
- 报告列表/详情读取指定 snapshot。
- 搜索、无结果、正文/下载状态。
- Agent intent 状态、引用和上下文切换。

### E2E

1. 注册演示 → 首次建企 → 首页。
2. 经营信息 → 10 题 → 报告 → 单条详情 → Agent。
3. 修改输入 → 再次体检 → 比较历史快照。
4. 资料搜索 → 正文 → 收藏 → 切企业后仍收藏。
5. 创建第二企业 → 验证资产隔离 → 永久删除。
6. 普通 Agent 问题、税务 RAG 问题、依据不足和失败重试。
7. 文件分析演示全链路。

## Backend Handoff After Frontend Acceptance

前端通过验收后，再基于冻结 contracts 设计：

1. Supabase Auth 邮箱认证与 session。
2. Postgres 表、外键、级联删除、不可变报告和版本迁移。
3. RLS 账号/企业隔离与 Storage 权限。
4. 资料 Word 解析、正文清洗、哈希去重、完整导入与原文件下载。
5. 规则服务、金额公式和政策版本治理。
6. `Qwen/Qwen3-Embedding-0.6B`、pgvector、混合检索和可选 reranker。
7. Agent 意图路由、工具调用、会话记忆、引用和安全边界。
8. 本地/部署环境 secret 管理；真实值不进入 Git。

本计划不提前决定 Supabase 表结构、Edge Function 与独立后端的最终边界；该决策在前端 contracts 冻结后进行。

## Risk Controls

- **原型迁移风险**：先保存只读原型；只迁视觉、题目和有效交互，不迁固定结果。
- **范围膨胀风险**：当前只做 Mock 前端；真实 Auth/资料/RAG 不夹带进入 React 阶段。
- **规则误导风险**：结果只来自纯函数；未知与不适用分离；金额缺输入即不计算。
- **Agent 伪权威风险**：Mock 明确意图与引用状态；税务无依据时必须拒绝确定结论。
- **跨企业串档风险**：service 写操作显式要求 enterpriseId，E2E 覆盖双企业。
- **删除风险**：二次确认、级联摘要、失败不清空本地有效状态。
- **密钥泄漏风险**：本阶段无真实模型密钥；构建产物与仓库执行 secret 扫描。

## Complexity Tracking

| Decision | Why required | Simpler alternative rejected because |
|---|---|---|
| React + TypeScript + Vite | 已批准的 39 个页面、多状态、多企业上下文和后续 Supabase 替换需要组件化与类型契约 | 继续扩展单文件原生 JS 会让路由、状态和规则再次耦合，难以可靠替换后端 |
| Typed service layer + Mock implementations | 支持“前端先完成、后端后设计”，同时防止页面依赖临时 fixture | 页面直接读 localStorage/JSON 会在接入 Supabase 时造成全面重写 |
| Three test layers | 税务规则需要单元确定性，页面状态需要组件验收，主链路需要移动端 E2E | 只做人工页面验收无法覆盖边界、历史快照和企业隔离 |

