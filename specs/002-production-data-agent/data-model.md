# Data Model: 生产数据与 AI Agent

## Conventions

- 主键使用 UUID；时间使用 `timestamptz`；业务日期使用 `date`。
- 账号字段统一为 `owner_id uuid references auth.users(id)`。
- 企业级记录同时保存 `owner_id` 与 `enterprise_id`，通过 `enterprises(id, owner_id)` 复合外键校验归属。
- 可变记录包含 `revision integer not null default 1` 与 `updated_at`；不可变快照包含 `content_hash` 与版本引用。
- 对用户可见的删除先设置 `deletion_state`，RLS 立即拒绝访问；物理清理由删除作业完成。
- 公共资料写入仅允许导入/审核服务，普通登录用户只读可发布视图或 RPC。

## Identity and tenancy

### `account_profiles`

| Field | Type | Notes |
|---|---|---|
| `user_id` | uuid PK | FK `auth.users(id)` cascade |
| `display_name` | text nullable | 不保存密码或验证码 |
| `current_enterprise_id` | uuid nullable | 需属于当前账号且未删除 |
| `preferences` | jsonb | 非敏感展示偏好 |
| `created_at`, `updated_at` | timestamptz | |

### `enterprises`

| Field | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `owner_id` | uuid | FK auth user；与 id 组成唯一键 |
| `name` | text | 用户可见企业名；不发送给模型 |
| `region_code`, `industry_code` | text nullable | 标准代码 |
| `revision` | integer | 乐观锁 |
| `deletion_state` | enum | `active`, `revoked`, `purging`, `failed` |
| `created_at`, `updated_at` | timestamptz | |

Constraints: unique `(id, owner_id)`；RLS 仅允许 `owner_id = auth.uid()` 且 `deletion_state='active'`。

### `client_mutations`

保存近期幂等写入：`owner_id`, `mutation_id`, `resource_type`, `resource_id`, `result`, `created_at`。唯一 `(owner_id, mutation_id)`，按保留周期清理。

## Mutable assessment input

### `company_profile_drafts`

每个企业一条当前草稿：`enterprise_id`, `owner_id`, `revision`, `answers jsonb`, `completeness jsonb`, `updated_at`。`answers` 中未知值必须显式使用 `{status:'unknown'}`，不得与未填写混淆。

### `questionnaire_drafts`

每个企业一条当前草稿：`enterprise_id`, `owner_id`, `question_set_release_id`, `revision`, `answers jsonb`, `verification_items jsonb`, `updated_at`。服务端校验恰好 10 个已知题号和合法答案枚举。

## Immutable rule releases

### `assessment_engine_releases`

`id`, `version`, `content_hash`, `manifest jsonb`, `status(draft|active|retired)`, `activated_at`, `created_at`。激活后不可修改。

### `question_set_releases`

`id`, `version`, `content_hash`, `questions jsonb`, `status`, `activated_at`。包含 10 道题、安全答案和风险答案映射。

### `policy_rule_releases`

`id`, `knowledge_document_version_id`, `version`, `content_hash`, `effective_from`, `effective_to`, `eligibility jsonb`, `formula jsonb`, `required_fields text[]`, `exclusion_group`, `review_status`, `status`。只有 `verified + active + date valid` 可被评测引用。

### `catalog_releases`

把一次评测使用的 engine、question set、policy rules 与知识版本集合冻结为 manifest：`id`, `version`, `content_hash`, `engine_release_id`, `question_set_release_id`, `policy_rule_ids uuid[]`, `knowledge_generation_id`, `status`, `activated_at`。

## Assessment execution and report snapshots

### `assessment_submissions`

| Field | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `actor_user_id`, `owner_id`, `enterprise_id` | uuid | actor 第一版等于 owner，保留审计语义 |
| `idempotency_key` | text | unique `(actor_user_id, enterprise_id, idempotency_key)` |
| `profile_revision`, `questionnaire_revision` | integer | 冻结客户端期望版本 |
| `as_of_date` | date | 规则生效查询日期 |
| `catalog_release_id` | uuid | begin 阶段冻结 |
| `input_snapshot` | jsonb | 服务端读取并规范化后的原始输入 |
| `input_hash` | text | SHA-256 |
| `status` | enum | `started`, `completed`, `failed` |
| `result_run_id`, `error_code` | uuid/text nullable | |
| `created_at`, `completed_at` | timestamptz | |

### `assessment_runs`

不可变：`id`, `submission_id`, `owner_id`, `enterprise_id`, `catalog_release_id`, `input_snapshot`, `input_hash`, `risk_result`, `policy_results`, `savings_result`, `verification_items`, `result_hash`, `completed_at`。

### `report_snapshots`

与 run 一对一且不可变：`id`, `assessment_run_id`, `owner_id`, `enterprise_id`, `summary`, `risk_items`, `policy_matches`, `savings`, `action_items`, `citations`, `rule_versions`, `content_hash`, `created_at`。

Database triggers reject UPDATE/DELETE on completed submissions, runs and reports for normal roles.

## Knowledge corpus

### `knowledge_import_batches`

`id`, `manifest_name`, `archive_sha256`, `expected_count`, `observed_count`, `status`, `started_at`, `completed_at`, `error_summary`。

### `knowledge_source_objects`

每个输入文件/归档成员一条：`id`, `batch_id`, `relative_path`, `original_name`, `detected_mime`, `byte_size`, `sha256`, `storage_key`, `parse_status`, `duplicate_status`, `duplicate_of_id`, `review_status`, `error_code`, `created_at`。唯一 `(batch_id, relative_path)`。

### `knowledge_documents`

规范资料身份：`id`, `stable_slug`, `category`, `current_version_id`, `visibility`, `created_at`。不保存可变正文。

### `knowledge_document_versions`

| Field | Type | Notes |
|---|---|---|
| `id`, `document_id` | uuid | |
| `version_no` | integer | unique per document |
| `title`, `document_number`, `issuer` | text | 可检索元数据 |
| `published_on`, `effective_from`, `effective_to` | date nullable | |
| `validity_status` | enum | `current`, `partially_effective`, `superseded`, `repealed`, `unknown` |
| `region_codes`, `industry_codes` | text[] | |
| `body_text` | text nullable | 解析失败时为空 |
| `body_hash`, `metadata_hash` | text | |
| `review_status` | enum | `pending`, `verified`, `rejected` |
| `created_at` | timestamptz | 版本不可变 |

### `knowledge_version_sources`

多对多来源关系：`document_version_id`, `source_object_id`, `relation(primary|duplicate|attachment|reference)`。

### `knowledge_document_relations`

`from_version_id`, `to_version_id`, `relation_type(supersedes|superseded_by|amends|related)`, `review_status`。

### `knowledge_chunks`

`id`, `document_version_id`, `ordinal`, `heading_path text[]`, `paragraph_start`, `paragraph_end`, `char_start`, `char_end`, `page_start`, `page_end`, `content`, `content_hash`, `search_tokens text[]`, `search_vector tsvector generated/maintained`, `created_at`。唯一 `(document_version_id, ordinal)`。

### `embedding_generations`

`id`, `model_name`, `model_revision`, `dimension`, `normalized`, `chunking_version`, `status(building|validating|active|retired|failed)`, `created_at`, `activated_at`。同一时刻只允许一个 active generation。

### `chunk_embeddings`

`chunk_id`, `generation_id`, `embedding vector(1024)`, `created_at`。复合主键，按 generation 建 HNSW cosine 索引。

## Favorites

### `favorites`

账号级：`owner_id`, `document_id`, `created_at`；唯一 `(owner_id, document_id)`。企业删除不级联；适用性在读取时按当前企业重新计算。

## Agent

### `agent_conversations`

`id`, `owner_id`, `enterprise_id`, `title`, `status(active|archived)`, `created_at`, `updated_at`。

### `agent_messages`

`id`, `conversation_id`, `owner_id`, `enterprise_id`, `role`, `intent`, `status(pending|completed|insufficient_evidence|failed)`, `content`, `error_stage`, `tool_summary jsonb`, `context_manifest jsonb`, `created_at`。`context_manifest` 只列使用字段和版本，不存无关完整对象。

### `agent_message_citations`

`message_id`, `chunk_id`, `document_version_id`, `rank`, `locator jsonb`, `quote_excerpt`, `created_at`。引用必须属于该消息检索候选集合。

### `agent_tool_calls`

`id`, `message_id`, `tool_name`, `input_hash`, `result_status`, `result_summary`, `duration_ms`, `created_at`。不保存密钥或完整私密正文。

## Enterprise files

### `enterprise_files`

`id`, `owner_id`, `enterprise_id`, `original_name`, `detected_mime`, `byte_size`, `sha256`, `storage_key`, `processing_status`, `deletion_state`, `created_at`, `updated_at`。

### `enterprise_file_artifacts`

`id`, `file_id`, `artifact_type(extracted_text|chunk|embedding|preview)`, `storage_key`, `content_hash`, `status`, `created_at`。

### `file_analysis_records`

`id`, `owner_id`, `enterprise_id`, `file_id`, `task_type`, `status`, `input_manifest`, `result`, `citations`, `error_code`, `created_at`, `completed_at`。完成结果不可覆盖；重跑创建新记录。

## Deletion and audit

### `deletion_jobs`

`id`, `owner_id`, `resource_type`, `resource_id`, `status(queued|running|completed|failed)`, `attempt_count`, `storage_keys`, `last_error_code`, `created_at`, `completed_at`。

### `audit_events`

追加写：`id`, `actor_user_id`, `owner_id`, `enterprise_id nullable`, `event_type`, `resource_type`, `resource_id`, `request_id`, `before_hash`, `after_hash`, `metadata jsonb`, `created_at`。metadata 只保存版本、状态、计数和脱敏摘要。

## State transitions

```text
assessment_submission: started -> completed | failed
knowledge_source.parse: pending -> processing -> parsed | partial | failed
knowledge review: pending -> verified | rejected
embedding generation: building -> validating -> active -> retired
enterprise/file deletion: active -> revoked -> purging -> physically removed
agent message: pending -> completed | insufficient_evidence | failed
```

## Migration and versioning rules

1. 每个 migration 可向前应用且不依赖手工 UI 操作；破坏性列变更使用 expand/migrate/contract。
2. 枚举优先以 CHECK constraint 或 lookup 表表达，避免难回滚的 PostgreSQL enum 变更。
3. 规则、资料版本、报告和完成消息只追加；更正创建新版本并建立关系。
4. 搜索索引与 embedding generation 可重建；原始来源、正文版本和用户报告是权威数据。
