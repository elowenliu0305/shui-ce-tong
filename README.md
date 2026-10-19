# 税策通 React 前端

税策通第一版正式前端：面向小微企业，以 13 项企业经营资料完成政策筛选与金额估算，以现有 HTML 的 10 道题独立计算风险等级，并把结果固化为不可变报告快照。

## 架构总览

```
React 19 + TS + Vite（手机优先 SPA）
  └── typed service contracts（src/services/contracts/）
        ├── src/services/mock/        演示后端：版本化 localStorage
        └── src/services/supabase/    生产后端：Supabase
              ├── PostgREST + RPC     企业/草稿/报告/资料/文件（RLS 隔离）
              └── Edge Functions      complete-assessment、knowledge-search、
                                      knowledge-source-url、agent-chat、
                                      enterprise-file-upload、delete-enterprise(-file)

共享纯规则包 packages/assessment-engine/（浏览器与 Edge 同一份代码）
supabase/
  ├── migrations/   14 个迁移：foundation → identity → assessment → knowledge → agent → files
  ├── tests/        pgTAP RLS 与安全断言（supabase test db）
  ├── functions/    7 个 Edge Function + _shared（鉴权/限流/日志/模型客户端）
  └── seed.sql      10 道题、引擎版本与 policy rule release
scripts/knowledge/  资料包导入管线：manifest 对账 → 解析 → 中文分块 → Qwen 嵌入 → generation 激活
```

后端由 `VITE_DATA_BACKEND` 切换（默认 `mock`）；生产模式下缺少 Supabase 配置时服务层明确失败，不静默回退 Mock。

## 本地运行

要求 Node.js 20+。

```bash
npm install
npm run dev
```

打开终端显示的本地地址，在登录页点击“直接进入演示账号”，或走邮箱注册、任意 6 位演示验证码、首次建企流程。Mock 数据只保存在当前浏览器的版本化 localStorage 中，不保存明文密码、验证码、API Key 或真实文件内容。

### 本地 Supabase 栈（生产模式开发）

要求 Docker。

```bash
supabase start            # 应用 migrations + seed，API 在 127.0.0.1:54321
supabase secrets set MODEL_API_KEY=... MODEL_API_BASE_URL=... MODEL_NAME=...
supabase secrets set EMBEDDING_API_KEY=... EMBEDDING_API_BASE_URL=...

cp .env.example .env      # 填入 VITE_SUPABASE_URL 与本地 publishable key
# .env 中 VITE_DATA_BACKEND=supabase
npm run dev
```

Edge Function 本地调试：`supabase functions serve agent-chat`（其余函数同理）。模型与 Embedding Key 只存在于 `supabase secrets` / Edge 环境变量，绝不进入 `.env`（浏览器可见）或 Git。

### 资料库导入管线

```bash
npm run knowledge:manifest -- <资料包.zip>   # dry-run 对账（SHA-256、大小、成员数）
npm run knowledge:import   -- <资料包.zip>   # 解析 + 分块 + 入队 embedding
npm run knowledge:embed    # 批量生成 Qwen3-Embedding-0.6B 向量并验证
npm run knowledge:validate # generation 激活前校验
```

## 质量命令

```bash
npm run typecheck
npm run lint
npm run test
npm run build
npm run check:secrets
npm run test:e2e
npm run test:rls             # 需要本地 supabase 栈
npm run test:integration     # 真实后端项需要 SUPABASE_TEST_* 环境变量
```

端到端测试使用本机 Google Chrome。单元与集成测试覆盖风险边界、资料三态、政策三态、金额输入与重叠排除、报告不可变、搜索收藏、Agent 意图、企业资产隔离和 Edge 限流/日志脱敏。Playwright 在 360×800、390×844 与 430×932 三个视口运行主链路和响应式检查；`E2E_SCREENSHOTS=1` 时留存每个用例的截图。

Edge Function 统一约定：JWT 校验 + 按用户限流（`_shared/rate-limit.ts`）+ 请求体 64KB 上限 + 输入长度/UUID 校验 + `X-Request-Id` 贯穿日志（request ID、耗时、错误阶段、敏感字段脱敏）；函数级超时在 `supabase/config.toml` 中按依赖耗时之和设置。

## 当前能力

- 邮箱注册、验证、登录、找回密码和直接演示入口。
- 一个账号管理多家企业；永久删除企业级联业务资产，账号收藏保留。
- 13 项经营资料 known / unknown / unset 三态与唯一草稿自动保存。
- 10 道题等权评分：0–2 低、3–5 中、6–10 高；健康度为 `(10-riskCount)×10`。
- 结构化政策 eligible / pending / ineligible 判断、公式白名单、金额缺失提示和重叠排除。
- 每次完成体检创建新的 AssessmentRun 和不可变 ReportSnapshot。
- 政策、时讯、案例列表、全文字段搜索、效力/解析状态、下载描述和账号收藏。
- 通用 AI Agent Mock：普通问题、经营金融、报告上下文、税务 RAG 引用、依据不足和错误状态。
- 文件选择、任务、进度、结果和历史演示；持久化记录始终 `contentRead=false`。

## 架构边界

React 页面只消费 typed service interfaces（`src/services/contracts/`），同一套契约有两个实现：`src/services/mock/`（演示）与 `src/services/supabase/`（生产），页面不感知后端差异。

真实模型与 Embedding API Key 只能配置在服务端环境变量（`supabase secrets`）中，不能写入 `src/`、构建产物或 Git。税务、政策和案例问题必须先检索并返回引用；没有可靠依据时不得输出确定结论。

更完整的验收步骤见 [quickstart.md](specs/002-production-data-agent/quickstart.md)，生产规格见 [spec.md](specs/002-production-data-agent/spec.md)，任务状态见 [tasks.md](specs/002-production-data-agent/tasks.md)；第一版前端规格见 [specs/001-tax-assessment-engine/](specs/001-tax-assessment-engine/spec.md)。
