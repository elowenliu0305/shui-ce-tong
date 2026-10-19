# Database Contract

## Client-visible operations

普通登录用户只能通过 RLS 访问以下资源：

- `account_profiles`: 读取/更新自己。
- `enterprises`: 读取/创建/乐观锁更新自己的 active 企业。
- `company_profile_drafts`, `questionnaire_drafts`: 读取和乐观锁 upsert 当前企业草稿。
- `assessment_runs`, `report_snapshots`: 只读自己的历史快照。
- `knowledge_public_documents`: 只读已发布资料视图。
- `favorites`: 读写自己的账号级收藏。
- `agent_conversations`, `agent_messages`, `agent_message_citations`: 只读自己的企业会话；新消息通过 Edge Function 创建。
- `enterprise_files`, `file_analysis_records`: 只读元数据；上传/删除通过签名流程和 Edge Function。

## RPCs

### `update_enterprise(input_id, expected_revision, patch, mutation_id)`

- 验证 `auth.uid()` 是 owner、企业 active、revision 匹配。
- 成功返回更新后行和新 revision。
- 重复 mutation 返回原结果。
- revision 不匹配返回 `conflict`，不得覆盖。

### `save_profile_draft(enterprise_id, expected_revision, answers, mutation_id)`

### `save_questionnaire_draft(enterprise_id, expected_revision, answers, mutation_id)`

两者遵守相同乐观锁和幂等约定；数据库校验字段/题号，不接受客户端计算结果。

### `begin_assessment_submission(...)`

输入：企业、两类草稿 revision、查询日期、幂等键。输出：submission、冻结 input snapshot、active catalog release。相同幂等键返回同一 submission；不允许另一个 payload 重用同一键。

### `finalize_assessment_submission(submission_id, computed_result, result_hash)`

仅允许 `complete-assessment` 服务角色调用。验证 submission 状态、输入哈希和 release 后，在单事务中写 run、report、citations、audit 并将 submission 标记 completed。重复 finalize 返回既有 run。

### `hybrid_search(query, filters, as_of_date, generation_id, limit)`

仅允许 `knowledge-search` 调用。返回已发布候选与 `citation_id`，包括融合分数、标题/文号/机构/效力、locator 和短 excerpt。税务可靠模式额外限制 `verified`、日期有效和可引用状态。

### `revoke_resource_for_deletion(resource_type, resource_id)`

验证 owner；设置 revoked、创建 deletion job 并返回 job ID。物理清理必须由服务端继续执行。

## Error envelope

```json
{
  "error": {
    "code": "conflict",
    "message": "数据已在其他设备更新，请刷新后重试。",
    "requestId": "uuid",
    "retryable": false,
    "details": { "currentRevision": 7 }
  }
}
```

稳定错误码：`unauthorized`, `forbidden`, `not_found`, `validation_failed`, `conflict`, `idempotency_mismatch`, `dependency_unavailable`, `rate_limited`, `internal_error`。越权读取统一返回 `not_found`，避免泄露资源存在性。

## Immutability

- `assessment_engine_releases`, `question_set_releases`, active/retired `policy_rule_releases`, completed `assessment_submissions`, `assessment_runs`, `report_snapshots`, `knowledge_document_versions`、完成的 Agent 消息禁止普通角色 UPDATE/DELETE。
- 任何更正创建新版本或新记录，并以关系/审计事件连接。

