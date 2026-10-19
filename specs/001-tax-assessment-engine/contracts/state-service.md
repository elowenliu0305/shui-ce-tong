# Frontend State Service Contract

React pages and components must not call localStorage, fixtures, Supabase or model APIs directly. They use the following service boundary. Mock implementations persist a versioned envelope; later implementations may use Supabase without changing page contracts.

## Read operations

```text
getSession() -> AccountSession | null
getActiveEnterprise() -> Enterprise | null
listEnterprises() -> Enterprise[]
getProfileDraft(enterpriseId) -> CompanyProfileDraft
getRiskDraft(enterpriseId) -> RiskQuestionnaireDraft
getAssessmentRun(runId) -> AssessmentRun
getReportSnapshot(reportId) -> ReportSnapshot
listReports(enterpriseId) -> ReportSnapshot[]
listFavorites(accountId) -> Favorite[]
listConversations(enterpriseId) -> AgentConversation[]
listFileAnalysisRecords(enterpriseId) -> FileAnalysisRecord[]
```

Read operations return clones or frozen values; callers cannot mutate stored objects by reference.

## Write operations

```text
createEnterprise(input) -> Enterprise
updateEnterprise(enterpriseId, patch) -> Enterprise
switchEnterprise(enterpriseId)
deleteEnterprise(enterpriseId) -> DeleteEnterpriseSummary
saveProfileDraft(enterpriseId, patch)
saveRiskDraft(enterpriseId, patch)
completeAssessment({ run, report }) -> { runId, reportId }
addFavorite({ accountId, targetType, targetId })
removeFavorite(favoriteId)
createConversation({ enterpriseId, reportSnapshotId?, knowledgeDocumentId? })
appendConversationMessage(conversationId, message)
registerFileAnalysisRecord(enterpriseId, metadata)
resetMockData()
```

## Persistence guarantees

- Primary key: `shuicetong:frontend-mock:v2`.
- Backup key during migration: `shuicetong:frontend-mock:backup`.
- Temporary key during verified replacement: `shuicetong:frontend-mock:next`.
- Every successful write increments `revision` and updates `updatedAt`.
- Save catches quota errors before replacing valid state.
- Assessment run and report snapshot are appended atomically in one envelope write.
- Completed runs and reports are immutable; corrections create new records.
- Enterprise deletion is atomic: profile/risk/run/report/conversation/file records are removed while account favorites remain.

## Migration guarantees

```text
legacy prototype -> migratePrototypeToV2 -> validate current -> persist
```

- Migrations are pure, adjacent-version and idempotent.
- Legacy full phone numbers are discarded and never copied into v2.
- Legacy fixed reports are not migrated as real assessment snapshots；它们只保留在只读原型副本中。
- Failure preserves the old key and displays recovery choices; it must not silently reset.

## Scope rules

`activeEnterpriseId` is a UI selection, never an implicit write target. Every enterprise write requires an explicit `enterpriseId`. Agent conversations always belong to the current enterprise even when the message is a general question. Favorites belong to the account and never require an enterprise ID.
