# 税策通 React 前端

税策通第一版正式前端：面向小微企业，以 13 项企业经营资料完成政策筛选与金额估算，以现有 HTML 的 10 道题独立计算风险等级，并把结果固化为不可变报告快照。

## 本地运行

要求 Node.js 20+。

```bash
npm install
npm run dev
```

打开终端显示的本地地址，在登录页点击“直接进入演示账号”，或走邮箱注册、任意 6 位演示验证码、首次建企流程。Mock 数据只保存在当前浏览器的版本化 localStorage 中，不保存明文密码、验证码、API Key 或真实文件内容。

## 质量命令

```bash
npm run typecheck
npm run lint
npm run test
npm run build
npm run check:secrets
npm run test:e2e
```

端到端测试使用本机 Google Chrome。单元与集成测试覆盖风险边界、资料三态、政策三态、金额输入与重叠排除、报告不可变、搜索收藏、Agent 意图和企业资产隔离。Playwright 在 360×800 与 390×844 两个视口运行主链路和响应式检查。

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

React 页面只消费 typed service interfaces。当前实现位于 `src/services/mock/`；下一阶段可在不改页面契约的前提下替换为 Supabase/Auth、服务端规则、知识入库、RAG 与模型接口。

真实模型与 Embedding API Key 只能配置在服务端环境变量中，不能写入 `src/`、构建产物或 Git。税务、政策和案例问题必须先检索并返回引用；没有可靠依据时不得输出确定结论。

更完整的验收步骤见 [quickstart.md](specs/001-tax-assessment-engine/quickstart.md)，产品规则见 [spec.md](specs/001-tax-assessment-engine/spec.md)，任务状态见 [tasks.md](specs/001-tax-assessment-engine/tasks.md)。
