# Data Model: 税策通第一版前端契约

本文件定义 React 前端与 Mock Service 使用的领域模型，并作为后续 Supabase 设计的输入。它不是最终数据库表结构。

## 1. Shared value objects

### FieldValue<T>

用于区分真实零值、未知和未填写。

| Field | Type | Rules |
|---|---|---|
| `status` | `known \| unknown \| unset` | 必填 |
| `value` | `T` | 仅 `known` 时存在 |
| `source` | `user \| ocr-demo \| seed` | 必填 |
| `updatedAt` | ISO datetime | 必填 |

### MoneyValue

| Field | Type | Rules |
|---|---|---|
| `amountYuan` | integer | `>= 0`，数据库与领域层均以人民币元保存 |
| `currency` | `CNY` | 固定 |
| `dataYear` | integer | 与企业数据年度一致 |

### Citation

| Field | Type | Rules |
|---|---|---|
| `documentId` | string | 必填 |
| `sourceId` | string | 必填 |
| `title` | string | 必填 |
| `docNo` | string / null | 可空，不猜测 |
| `locator` | string | 页码、章节、条款或段落定位 |
| `excerpt` | string / null | UI 使用短摘录，不保存无关全文 |

## 2. Account and enterprises

### AccountSession

前端只保存演示会话信息：`accountId`、`emailMasked`、`emailVerified`、`expiresAt`。不得保存密码、验证 token 或模型密钥。

### Enterprise

| Field | Type | Rules |
|---|---|---|
| `id` | string | 稳定唯一 |
| `accountId` | string | 所有者 |
| `name` | string | 1–100 字符，必填 |
| `regionProvince` | string | 必填 |
| `regionCity` | string | 必填 |
| `industry` | string | 必填 |
| `createdAt` / `updatedAt` | ISO datetime | 必填 |

Enterprise 不使用 archived 状态。删除为永久级联删除；Mock Service 和未来数据库必须返回删除摘要并保证账号收藏不被删除。

### CompanyProfileDraft

| Field | Type | Rules |
|---|---|---|
| `id` | string | 唯一 |
| `enterpriseId` | string | 必填 |
| `schemaVersion` | integer | 当前为 2 |
| `fields` | object | 下列固定字段 |
| `completionPercent` | integer | 0–100，由字段状态计算 |
| `updatedAt` | ISO datetime | 必填 |

Fixed fields:

- `companyName: FieldValue<string>`（known/必填）
- `region: FieldValue<{ province; city }>`（known/必填）
- `industry: FieldValue<string>`（known/必填）
- `unifiedSocialCreditCode: FieldValue<string>`
- `establishedDate: FieldValue<ISODate>`
- `taxpayerType: FieldValue<string>`
- `dataYear: FieldValue<number>`
- `annualRevenue: FieldValue<MoneyValue>`
- `totalAssets: FieldValue<MoneyValue>`
- `employeeCount: FieldValue<number>`
- `taxableIncome: FieldValue<MoneyValue>`
- `researchInvestment: FieldValue<MoneyValue>`
- `enjoyedTaxIncentives: FieldValue<string[]>`

## 3. Risk questionnaire

### RiskQuestion

| Field | Type | Rules |
|---|---|---|
| `id` | string | 对应现有 HTML 题目 key，稳定 |
| `order` | 1–10 | 题目顺序固定 |
| `title` / `help` | string | 来自原型基线 |
| `options` | RiskOption[] | 原型中每题选项 |

### RiskOption

| Field | Type | Rules |
|---|---|---|
| `id` | string | 稳定，不使用显示文案作主键 |
| `label` | string | 用户可见 |
| `effect` | `safe \| risk \| unknown` | 第 1 项 safe；异常项 risk；不清楚 unknown |
| `riskPoints` | `0 \| 1` | safe/unknown=0，risk=1 |

第 10 题无 unknown 选项时，第一项 safe，其余全部 risk。

### RiskQuestionnaireDraft

保存 `id`、`enterpriseId`、`answersByQuestionId`、`updatedAt`。完成测评要求 10 题均有答案；unknown 是有效答案。

### RiskSummary

| Field | Type | Rules |
|---|---|---|
| `confirmedRiskCount` | integer | 0–10 |
| `pendingVerificationCount` | integer | 0–10 |
| `level` | `low \| medium \| high` | 0–2 / 3–5 / 6–10 |
| `healthPercent` | integer | `(10 - confirmedRiskCount) × 10` |
| `items` | RiskItem[] | 已确认风险 |
| `pendingItems` | PendingVerification[] | unknown 形成的待核验项 |

## 4. Rules and assessment

### Condition / ConditionEvaluation

Condition 保存 `id`、`fieldPath`、`operator`、`expected`、`basisRefs`。白名单 operator：`eq`、`neq`、`in`、`notIn`、`gte`、`lte`、`between`、`includesAny`、`includesAll`、`isKnown`、`isUnknown`。

ConditionEvaluation 输出 `pass | fail | unknown`，并保存 actual、basisRefs 和输入字段引用。

### PolicyMatch

| Field | Type | Rules |
|---|---|---|
| `policyVersionId` | string | 引用结构化且已核验政策版本 |
| `status` | `eligible \| pending \| ineligible` | UI 报告只显示前两种 |
| `satisfied` | ConditionEvaluation[] | 已满足 |
| `missing` | ConditionEvaluation[] | unknown/待补 |
| `failed` | ConditionEvaluation[] | 不满足 |
| `ruleId` / `ruleVersion` | string | 必填 |
| `evaluatedAt` | ISO datetime | 必填 |

Transition:

```text
任一排除/必需条件 fail → ineligible
无 fail 且至少一个必需条件 unknown → pending
全部必需条件 pass → eligible
```

### SavingsEstimate

| Field | Type | Rules |
|---|---|---|
| `policyVersionId` | string | 必填 |
| `status` | `computed \| pending \| excluded` | 必填 |
| `formulaId` / `formulaVersion` | string / null | computed 时必填 |
| `inputValues` | object | computed 时展示给用户 |
| `amountYuan` | integer / null | computed 时 `>=0` |
| `missingFieldPaths` | string[] | pending 时非空 |
| `overlapGroup` | string / null | 处理互斥/重叠 |

总额只累加可同时享受、没有 overlap 冲突且 status=computed 的项目。

### AssessmentRun

保存 `id`、`enterpriseId`、`status`、`asOfDate`、时间戳、`engineVersion`、`ruleSetVersion`、`catalogVersion`、`profileSnapshot`、`riskAnswersSnapshot` 和结果。completed/failed 均不可原地重启。

### AssessmentResult

保存：

- `profileCompleteness`
- `riskSummary`
- `policyMatches`（含 ineligible，供审计；报告过滤）
- `savingsEstimates`
- `estimatedTotalSavingYuan | null`
- `priorityActions`
- `citations`

### ReportSnapshot

与 completed AssessmentRun 一对一。保存当次企业显示摘要、全部输入快照、风险、eligible/pending 政策、金额、行动建议、版本和引用。创建后深冻结；重新测评创建新记录。

## 5. Knowledge library

### KnowledgeSource

资料包中的每个原始文件均有一条来源记录：`id`、`originalFileName`、`relativePath`、`mimeType`、`byteSize`、`sha256`、`normalizedTextSha256`、`extractionStatus`、`exactDuplicateOf`、`suspectedDuplicateGroup`、`downloadRef`。

所有来源记录均保留；失败与重复不等于删除。

### KnowledgeDocument

| Field | Type | Rules |
|---|---|---|
| `id` | string | 规范资料 ID |
| `kind` | `policy \| news \| case \| other` | 全部可检索 |
| `sourceIds` | string[] | 一个或多个原始来源 |
| `title` | string | 必填 |
| `docNo` | string / null | 可空 |
| `issuer` | string[] | 可空数组，不猜测 |
| `publishedAt` | ISO date / null | 可空 |
| `effectiveStatus` | `effective \| expired \| repealed \| partial \| unknown` | 必填 |
| `parseStatus` | `parsed \| failed \| partial` | 必填 |
| `fullText` | string / null | parsed/partial 时存在 |
| `summary` | string / null | 忠实摘要 |
| `downloadRefs` | string[] | 至少保留原文件下载 |
| `matchEligibility` | `structured-verified \| searchable-only` | 是否可进入规则匹配 |
| `supersedes` / `supersededBy` | string[] | 版本关系 |

### KnowledgeChunk（后端阶段）

保存 `documentId`、`chunkIndex`、`heading`、`content`、`locator`、`embeddingModel`、`embeddingVersion`、1024 维归一化向量。初版模型固定为 `Qwen/Qwen3-Embedding-0.6B`。

## 6. Account assets

### Favorite

账号级实体：`id`、`accountId`、`targetType=policy|news|case|other`、`targetId`、`createdAt`。不包含 enterpriseId。当前企业适用性通过查询时计算。

### AgentConversation / AgentMessage

Conversation 必须包含 `enterpriseId`，可选 `reportSnapshotId`、`knowledgeDocumentId`，并保存 `title`、时间戳。Message 保存 role、plain text/structured content、intent、citations、tool status summary、suggestedFollowUps 和时间戳；不得保存可执行 HTML。

### AgentRequest / AgentResponse

Request 包含 enterpriseId、可选上下文 ID 和用户消息。Response 包含：

- `intent = general | tax-rag | enterprise-context | financial-guidance`
- `status = completed | insufficient-evidence | tool-error | model-error`
- `answer`
- `citations`
- `toolsUsed`
- `suggestedFollowUps`

### FileAnalysisRecord

前端阶段保存 `enterpriseId`、displayName、mediaType、byteSize、selectedTask、status、createdAt、`contentRead=false`。不得保存 File、Blob、base64、Object URL 或正文。后端阶段另行扩展私有 Storage 和解析状态。

## 7. Frontend MockEnvelope

```text
schemaVersion
revision
updatedAt
session
activeEnterpriseId
enterprisesById
profileDraftsByEnterpriseId
riskDraftsByEnterpriseId
assessmentRunsById
reportSnapshotsById
favoritesById                 # account scope
agentConversationsById        # enterprise scope
fileAnalysisRecordsById       # enterprise scope
preferences
```

Validation rules:

- 所有 map key 等于实体 ID。
- enterprise-scoped 记录引用存在的 Enterprise。
- Favorite 只引用 Account 和 KnowledgeDocument。
- ReportSnapshot 引用同企业 completed AssessmentRun。
- 企业删除级联删除 profile/risk/run/report/conversation/file，保留 Favorite。
- session 不保存密码或验证 token。
- API Key、服务端密钥和真实文件内容不属于此模型。

## 8. State transitions

```text
Auth: signed-out → registering → verify-email → signed-in
Enterprise onboarding: no-enterprise → creating → active-enterprise
Assessment: draft → analyzing → completed | failed
Report: created → immutable
Knowledge parse: pending → parsed | partial | failed
Agent message: queued → routing → retrieving/tool-call → generating → completed | insufficient-evidence | failed
File demo: selected → task-selected → demo-analyzing → demo-completed | failed
```

