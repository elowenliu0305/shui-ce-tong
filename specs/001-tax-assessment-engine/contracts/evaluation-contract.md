# Assessment Engine Contract

## Entry point

```text
assessAssessment(input, ruleSet, catalog, options) -> AssessmentResult
```

The function is pure: it does not read React state, DOM, localStorage, current time, random IDs, network, or mutable global state.

## Input

```text
input
├── enterpriseId
├── profile                 # CompanyProfileDraft snapshot
├── riskAnswers             # RiskQuestionnaireDraft snapshot
└── materialStatus          # metadata/pending only in this phase

options
└── asOfDate                # required ISO date
```

The caller supplies `runId`, timestamps, engine version and snapshot persistence.

## Rule contract

- Allowed operators: `eq`, `neq`, `in`, `notIn`, `gte`, `lte`, `between`, `includesAny`, `includesAll`, `isKnown`, `isUnknown`.
- String expressions, `eval`, `new Function`, arbitrary callbacks and implicit global reads are forbidden.
- Complex calculations use registered `formulaId` values only.
- Every rule has stable `id`, `revision`, non-empty `basisRefs`, and valid field paths.

## Output

The engine returns JSON data only, never HTML. It includes:

- `profileCompleteness`
- `riskSummary` with confirmed count, pending count, level and health percentage
- policy matches with condition evaluations
- confirmed risk items and pending verification items
- pending fields
- savings estimates with status, missing inputs and formula metadata
- non-overlapping computed saving total or null
- prioritized actions

## Mandatory invariants

1. Same input, rule set, catalog and asOfDate produce deeply equal output.
2. Risk options map exactly: safe=0, risk=1, unknown=0 plus one pending verification item.
3. Risk count 0–2/3–5/6–10 maps to low/medium/high and health equals `(10-count)×10`.
4. Unknown condition values never count as pass or fail.
5. Any failed mandatory/disqualifying condition produces `ineligible`; any unknown mandatory condition without a failure produces `pending`; all mandatory conditions passing produces `eligible`.
6. A missing required calculation field prevents any numeric amount.
7. Mutually exclusive or overlapping saving items are not summed together.
8. `document-verified` cannot be emitted when materialStatus contains no verified content.
9. Output explanations reference only existing input, rule, policy version and source IDs.
10. Input objects are not mutated.

## Error behavior

Invalid rule IDs, operators, field paths, formula IDs or catalog references fail validation before assessment. A single runtime rule error marks the run failed; the UI must not present a partial result as a completed report.
