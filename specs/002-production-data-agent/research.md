# Research: 生产数据与 AI Agent

## 1. Supabase 身份、RLS 与 Storage

### Decision

- 使用 Supabase Auth 托管邮箱+密码、邮箱验证、登录、退出和密码重置；业务表只保存 `auth.users.id` 外键，不复制密码或验证凭据。
- 浏览器使用 publishable key 与用户 JWT。所有业务表启用 RLS，先撤销宽泛权限，再显式授予已验证账号需要的最小操作。
- 企业级表同时保存 `owner_id` 和 `enterprise_id`，并用复合外键保证企业确实属于该账号；安全辅助函数放入私有 schema、`security definer` 且固定 `search_path = ''`。
- 原始资料和企业文件存入私有 bucket。对象路径使用稳定所有权前缀：`{ownerId}/{enterpriseId}/{fileId}/source.ext`；下载与上传通过短期签名 URL，禁止客户端 upsert 覆盖。

### Rationale

Supabase 的浏览器访问模型以 JWT + RLS 为安全边界；publishable key 可以公开，但 secret/service key 会绕过 RLS，必须仅在受控服务端使用。数据库 RLS 与 Storage `storage.objects` policy 能把账号、企业和对象路径统一到同一隔离模型。

### Alternatives rejected

- **自建账号密码表**：会引入密码哈希、邮件验证、找回和会话安全负担，也违反不持久化密码的边界。
- **仅在前端过滤 enterprise_id**：不是安全控制，攻击者可直接调用 API。
- **公开 bucket + 难猜 URL**：URL 泄漏后永久可读，无法表达企业删除和会话撤销。

### Sources

- [Supabase Password-based Auth](https://supabase.com/docs/guides/auth/passwords)
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase Storage access control](https://supabase.com/docs/guides/storage/security/access-control)
- [Supabase Edge Function authorization](https://supabase.com/docs/guides/functions/auth)

## 2. 多端并发与删除一致性

### Decision

- 可变草稿与企业资料使用整数 `revision` 乐观锁：更新必须携带上次读取的 revision，SQL 仅在 revision 匹配时更新并 `+1`，否则返回 `conflict`。
- 每次客户端写入还携带 `mutation_id`，服务端保留近期去重记录，避免网络重试重复写入。
- 企业/文件删除采用可审计删除 saga：事务内先设 `deletion_state='revoked'` 使 RLS 立即不可见并创建 `deletion_job`；后台通过 Storage API 删除对象和派生资产，最后级联数据库记录。只有清理完成才返回最终成功状态。

### Rationale

数据库行删除与对象存储删除不是同一事务。先撤销访问可满足“报告成功时已不可访问”，作业记录则允许重试、审计和处理部分失败。

### Alternatives rejected

- **last-write-wins**：会静默覆盖另一个设备的更新。
- **数据库级联后再尝试删除 Storage**：对象删除失败会形成无主但仍存在的私密文件。
- **客户端逐项删除**：中途断网会产生不一致且难以恢复。

## 3. 评测规则、幂等和不可变快照

### Decision

- 抽出纯 TypeScript `packages/assessment-engine`，前端预览和 Edge Function 共用，但生产最终结论必须由服务端从原始答案、画像快照、查询日期和已激活 release 重算。
- 客户端只提交企业、草稿 revision、`as_of_date` 和 `idempotency_key`，不得提交可信分数、等级或金额。
- 建立 `assessment_submissions` 幂等信封，唯一键为 `(actor_user_id, enterprise_id, idempotency_key)`。`begin_assessment_submission` 冻结输入与 release；`finalize_assessment_submission` 在一个事务中创建 completed run、report snapshot、引用与 audit event。
- 引擎、风险题、政策规则、公式和资料目录都通过不可变 release manifest 与内容哈希版本化。完成的 run/report 由触发器拒绝 UPDATE/DELETE（除合规保留策略外的受控管理流程）。

### Rationale

共享纯函数避免预览和服务端规则漂移；最终服务端重算避免篡改。幂等信封覆盖“请求已成功但响应丢失”的常见重试场景。不可变 release 和输入快照让旧报告可以复现。

### Alternatives rejected

- **只保存最终 JSON**：无法解释结果来自哪些输入、规则和资料版本。
- **浏览器算完直接写报告**：可被篡改，也无法保证当前规则版本。
- **对同一企业覆盖最新报告**：破坏历史时间快照。

## 4. 全量资料入库与版本关系

### Decision

- 每次导入创建 `knowledge_import_batch`；每个归档成员创建 `knowledge_source_object`，记录相对路径、魔数 MIME、字节数、SHA-256、Storage key、解析/审核/重复状态。
- 资料规范化为 `knowledge_document` 与不可变 `knowledge_document_version`；一个版本可关联多个原始来源。取代、废止和相关版本用显式关系表表达。
- 分块以标题层级、条款和段落为边界，目标 450–800 中文字符、80–120 字重叠；每个 chunk 保存 heading path、段落范围、字符偏移和内容哈希。PDF 页码仅在可可靠提取时补充。
- 导入前防御路径穿越、压缩炸弹、伪造扩展名、空文件和超限文件。精确哈希重复可自动关联，正文近似重复只标记待人工核验。
- 未核验、解析失败或非当前有效资料可以被用户发现和下载，但不能进入政策匹配或税务“可靠依据”集合。

### Rationale

来源对象与规范资料分离，既满足资料包逐文件对账，又避免重复文件制造重复搜索结果。不可变版本和定位信息是稳定引用的前提。

### Alternatives rejected

- **只保留解析正文**：解析失败时会丢失证据，无法重新处理。
- **按固定字符无结构切块**：引用定位差，容易截断条款条件。
- **发现同名/相似文件直接覆盖**：可能错误合并不同效力或不同附件。

## 5. 中文混合检索与 Embedding

### Decision

- 搜索采用三路候选：标题/文号/机构精确和 `pg_trgm` 相似匹配；构建时中文分词形成 `array_to_tsvector` 的 FTS；Qwen 向量 + pgvector HNSW 语义召回。
- 用 Reciprocal Rank Fusion 融合，初始参数 `k=50`，词法权重 1.2、语义权重 1.0；最终返回 6–10 个结果，同一文档最多 2 个 chunk，并优先已核验、当前有效版本。
- 初始模型选择 `Qwen/Qwen3-Embedding-0.6B`，1024 维、归一化余弦向量。Embedding 在私有 worker 或受控提供商执行，不把 0.6B 模型加载进 Edge Function。
- `embedding_generation` 保存模型、维度、归一化、分块版本和状态；新 generation 全量建好并验证后原子激活，旧 generation 保留以便回滚。

### Rationale

精确/FTS 保住文号、机构和专有名词，向量补充语义召回；RRF 不依赖不同评分尺度直接可比。Qwen3 Embedding 对中文和多语言支持较好，1024 维在质量、存储和索引成本间适合第一版。

### Alternatives rejected

- **只用向量**：文号、精确标题和短查询不稳定，且难做可预期排序。
- **只用 PostgreSQL 默认 FTS**：中文不分词时正文召回不足。
- **Edge Function 内运行本地 Embedding 模型**：冷启动、内存和运行时间不适合批量索引。

### Sources

- [Supabase Hybrid Search](https://supabase.com/docs/guides/ai/hybrid-search)
- [Supabase pgvector](https://supabase.com/docs/guides/database/extensions/pgvector)
- [Qwen3-Embedding-0.6B model card](https://huggingface.co/Qwen/Qwen3-Embedding-0.6B)

## 6. Agent 路由、引用和安全边界

### Decision

- Agent 意图区分 `general`、`tax_policy_case`、`enterprise_report`、`sme_finance_operations`。
- `tax_policy_case` 强制调用知识检索，只有 `review_status=verified` 且效力/日期满足条件的 chunk 可作为可靠引用；无可靠候选时返回 `insufficient_evidence`，不调用模型生成确定税务结论。
- `enterprise_report` 先验证企业归属，再把报告摘要、待补项和必要画像字段构造成脱敏上下文；默认排除邮箱、企业名称、统一社会信用代码和完整文件正文。
- 模型输出引用只能选择服务端提供的 citation IDs；服务端校验引用存在、属于本次检索且可访问，再持久化回答。
- 保存会话、消息、意图、工具摘要、引用和错误阶段；不记录完整模型密钥、完整私密文件或不必要的企业明细。

### Rationale

把检索和引用控制放在模型外部，可防止模型伪造来源；把上下文最小化和企业归属验证放在工具层，可阻止跨企业泄漏。

### Alternatives rejected

- **让模型自行决定是否需要检索**：税务问题可能跳过证据步骤。
- **让模型自由输出 URL/文号**：无法区分真实引用与幻觉。
- **把完整企业对象加入 prompt**：增加无关敏感数据暴露。

## 7. 可测试性与上线门槛

### Decision

- pgTAP 建立账号 A/B、同账号企业 A/B、匿名、已删除资源、service RPC 的 RLS 矩阵。
- 评测黄金样例覆盖 0–2/3–5/6–10、`unknown` 待核验、金额输入缺失、互斥政策和重复提交。
- 资料导入对账必须满足“source object 数 = 清单项数”；搜索黄金集覆盖精确标题、文号、机构、正文和无结果；HNSW 结果定期与 exact scan 对比召回。
- Agent 测试强制验证：税务回答有可靠引用或依据不足；普通问题无伪造引用；企业/报告上下文不串企业。
- CI/本地门槛包含 typecheck、lint、unit、RLS、Edge integration、Playwright mobile 和 secret scan。

### Rationale

这些门槛直接对应 Constitution 的证据、确定性、隔离和移动验收原则，避免只验证 happy path。
