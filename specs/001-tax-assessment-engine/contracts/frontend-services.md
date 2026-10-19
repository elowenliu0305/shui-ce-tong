# Frontend Service Interfaces

The React application depends on interfaces, not storage or network implementations.

## Services

- `AuthService`: register, login, logout, verification state, request/reset password.
- `EnterpriseService`: list, get, create, update, switch and permanently delete.
- `AssessmentService`: load/save drafts, preview, complete assessment, get/list immutable reports.
- `KnowledgeService`: list, filter, full-text search, get detail, describe download and resolve favorite state.
- `AgentService`: create/list conversations, send messages and return intent, status, citations, tool summary and follow-ups.
- `FileAnalysisService`: register display metadata and run demo task with `contentRead=false`.

## Common result shape

```text
ServiceResult<T>
├── status: success | empty | error
├── data: T | null
└── error: { code; message; retryable; fieldErrors? } | null
```

Loading is application state around a pending Promise, not a successful result with fake data.

## Replacement rule

Mock and future real implementations must satisfy the same TypeScript interfaces and contract tests. Pages may not branch on `mock` versus `real`; only the provider composition root selects implementations.

## Security rule

The frontend contract never accepts a model API key, embedding key, Supabase service role key or plaintext password persistence command. Browser-safe Supabase configuration, when later introduced, is separate from server secrets.
