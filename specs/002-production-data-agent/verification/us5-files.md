# US5 企业文件与分析记录验收记录

日期：2026-10-19

## 已通过

- `npm run typecheck`
- `npm run lint`
- `npm run test`：26 个测试文件、83 项测试通过；1 个测试文件中的 1 项真实 Supabase Edge 集成测试因未配置测试项目自动跳过。
- `npm run test:e2e -- tests/e2e/file-analysis-production.spec.ts tests/e2e/assets-flow.spec.ts`：360px 和 390px 下共 8 项通过。
- 文件选择限制为 PDF、Word、Excel、CSV、UTF-8 文本、JSON、JPEG 和 PNG，最大 20MB；服务端同时核对名称、扩展名、声明 MIME、实际大小和文件魔数/文本编码。
- 生产模式使用两小时内有效的一次性签名上传 URL，固定对象路径为 `{ownerId}/{enterpriseId}/{fileId}/source.ext`；浏览器不持有 service role key，也不能直接写文件元数据。
- 上传完成后由服务端下载私有对象复核并计算 SHA-256。第一版尚未接正文分析器，因此结果明确记录 `not_read`、空 facts 和 `content_not_read` 限制，不根据文件名或任务类型生成内容事实。
- 文件、派生 artifact、分析记录、失败阶段与删除作业均按账号和当前企业隔离；页面覆盖处理中、正文未读取、处理失败、历史列表和重试状态。
- 删除先把文件设为 revoked，使 RLS 立即隐藏，再删除源对象和所有派生 Storage key，最后级联删除 artifacts/analysis；清理失败时保持不可见并留下 failed deletion job 供重试。
- 移动端浏览器验收覆盖成功流程、失败不产出事实、确认删除、第二企业空历史以及切回原企业恢复历史。
- OpenAPI YAML 已通过本机 YAML 解析。

## 已写好、待真实 Supabase 环境执行

- `supabase/tests/050_enterprise_files_rls.sql`：23 项 pgTAP 断言，覆盖上传准备幂等、完成状态、跨账号/跨企业/current-enterprise 隔离、浏览器禁止直写、派生资产不可见、撤权立即隐藏及数据库级联删除。
- `supabase/migrations/202610190050_enterprise_files.sql` 与 `202610190051_enterprise_files_security.sql` 的真实 PostgreSQL 迁移、私有 bucket 和 Storage policy 行为。
- `enterprise-file-upload` 的真实签名上传/下载、Storage 对象核验，以及 `delete-enterprise-file` 对源对象和派生对象的物理清理。

当前主机没有 Docker，也没有配置生产 Supabase 测试项目，无法执行 `supabase db reset`、`supabase test db` 或真实 Storage/Edge 调用。上述项目完成前 T079 保持未完成，不将真实 Storage、数据库 RLS 或线上文件删除描述为已上线。
