# AI Agent Contract

## Request

```text
AgentRequest
├── conversationId?
├── enterpriseId
├── reportSnapshotId?
├── knowledgeDocumentId?
└── message
```

The service resolves allowed context by ID. The browser does not send hidden full enterprise records or secrets in free-form prompts.

## Intent routing

- `general`: ordinary non-tax question; no tax RAG required.
- `tax-rag`: tax, policy or case question; retrieval and citations required.
- `enterprise-context`: asks about current enterprise, assessment or report; load minimal allowed context, then retrieve when relevant.
- `financial-guidance`: small-business financing, cash flow, cost, budget or operating guidance; use authorized metrics when relevant and state high-impact boundaries.

## Response

```text
AgentResponse
├── intent
├── status: completed | insufficient-evidence | tool-error | model-error
├── answer
├── citations[]
├── toolsUsed[]
├── suggestedFollowUps[]
└── contextSummary
```

## Mandatory behavior

1. Tax/policy/case answers have at least one valid citation or use `insufficient-evidence`.
2. General answers do not invent citations or retrieve irrelevant tax documents.
3. Enterprise context excludes email, enterprise name, unified social credit code and unrelated full documents before model invocation.
4. Switching enterprise starts or selects a conversation under the new enterprise; prior enterprise context is not reused.
5. Follow-up suggestions may naturally guide users toward small-business finance and operations, but must remain relevant and must not force every topic into tax.
6. Financing, investment, legal and medical answers state appropriate information boundaries.
7. Tool and model failures are distinguishable and retryable when safe.

## Mock scenarios required in frontend phase

`general`, `tax-rag-with-citations`, `enterprise-report`, `financial-guidance`, `insufficient-evidence`, `tool-error`, `model-error`.
