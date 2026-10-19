# Contracts

这些契约定义 React 页面、领域规则与 Mock Service 的稳定边界，并作为后续 Supabase/API 设计输入。本阶段没有真实远程接口。

| File | Purpose |
|---|---|
| `company-profile.schema.json` | 已确认的 13 项企业经营信息及 known/unknown/unset 状态 |
| `knowledge-item.schema.json` | 全部可搜索政策/时讯/案例/其他资料 |
| `assessment-snapshot.schema.json` | 不可变体检与报告快照 |
| `storage-envelope.schema.json` | 前端 Mock 持久化信封 |
| `state-service.md` | 企业、草稿、报告、收藏、会话和文件记录服务命令 |
| `evaluation-contract.md` | 纯规则引擎输入、输出和不变量 |
| `frontend-services.md` | React 页面依赖的服务接口与替换规则 |
| `agent-contract.md` | 通用 Agent 的意图、上下文、工具、引用与错误契约 |

JSON Schema 使用 Draft 2020-12。新增字段或改变枚举时必须更新 `schemaVersion` 与迁移测试。页面不得绕过这些契约直接读取 Mock 数据或未来 Supabase 表。
