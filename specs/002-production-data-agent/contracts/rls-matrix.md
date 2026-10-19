# RLS Matrix

Legend: `O` allowed, `-` denied, `RPC` only through validated function.

| Resource | anon | owner/account A | same account other enterprise | account B | privileged service |
|---|---:|---:|---:|---:|---:|
| account profile | - | O own | n/a | - | RPC/admin only |
| enterprise | - | O own active | O own active | - | delete RPC only |
| profile/question drafts | - | O selected enterprise | O if explicitly queried and owned | - | assessment RPC |
| assessment/report snapshots | - | O read | O read if owned | - | insert via finalize RPC |
| favorites | - | O account | O same account | - | no broad write |
| public knowledge view | read published | read published | read published | read published | ingestion write |
| knowledge internal tables | - | - | - | - | scoped functions/worker |
| agent conversations/messages | - | O same enterprise | - by enterprise context | - | agent function scoped |
| enterprise files | - | O metadata same enterprise | - | - | signed/upload/delete functions |
| storage enterprise-files | - | signed/current owner | - | - | cleanup worker |
| storage knowledge-raw | - | signed published source only | same | same | ingestion worker |
| audit events | - | - | - | - | append-only function |
| deletion jobs | - | status via RPC | - | - | cleanup worker |

## Required test identities

1. anonymous
2. unverified user
3. account A / enterprise A1
4. account A / enterprise A2
5. account B / enterprise B1
6. service role using approved RPC path

For every enterprise-level table test SELECT/INSERT/UPDATE/DELETE across all identities, active/revoked states, and forged `owner_id`. Also test that security-definer helpers have fixed search paths and are not executable by public unless explicitly required.

