# Quickstart: 生产数据与 AI Agent

## 1. Prerequisites

- Node.js 与 npm（版本以现有项目锁文件为准）
- Supabase CLI（本地数据库阶段）
- Docker Desktop（运行本地 Supabase）
- 可选：模型与 Embedding 服务凭据；未提供时 Auth/数据库/规则/检索结构仍可开发，Agent 使用安全 stub

## 2. Configure

```bash
cp .env.example .env.local
```

本地浏览器只填写：

```dotenv
VITE_DATA_BACKEND=supabase
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_PUBLISHABLE_KEY=<local-anon-or-publishable-key>
```

特权值使用 `supabase secrets set --env-file <ignored-file>` 或 worker 的本地未跟踪环境文件，绝不写入 `VITE_*`。

## 3. Start local backend

```bash
supabase start
supabase db reset
supabase functions serve --env-file .env.functions.local
```

## 4. Start app

```bash
npm install
npm run dev
```

使用 `VITE_DATA_BACKEND=mock` 可继续运行现有 Mock 全链路；切到 `supabase` 后服务工厂应使用真实 adapters，页面本身不改变。

## 5. Import knowledge package

先 dry-run 输出安全扫描与数量对账；需要保存逐文件清单时单独写入 manifest，再执行幂等导入、向量化和激活：

```bash
npm run knowledge:import -- --archive /absolute/path/to/materials.zip --dry-run
npm run knowledge:manifest -- --archive /absolute/path/to/materials.zip --out /absolute/path/to/manifest.json
npm run knowledge:import -- --archive /absolute/path/to/materials.zip
npm run knowledge:embed -- --generation <uuid>
npm run knowledge:validate -- --generation <uuid>
```

不要将 `SUPABASE_SERVICE_ROLE_KEY` 或 `EMBEDDING_API_KEY` 写入上述命令、清单或仓库文件。导入脚本仅从未跟踪的本地环境读取它们。在激活 generation 前必须核对 source 数、终态解析数、embedding 维度和黄金检索结果。

## 6. Verification gates

```bash
npm run typecheck
npm run lint
npm run test
npm run test:rls
npm run test:integration
npm run test:e2e
npm run check:secrets
npm run build
```

手工抽样：

1. 两个账号互相读取所有企业级表均失败。
2. 同一幂等键重复完成体检，只产生一个 run/report。
3. 修改当前画像与规则后，旧报告 JSON/hash 不变。
4. 精确标题、文号、机构和正文关键词均能命中；无结果明确为空。
5. 税务问题要么有可打开定位引用，要么显示依据不足。
6. 企业与文件删除完成后，数据库、Storage、向量和 Agent 工具均不可访问相关资产。
7. 360/390/430px 下登录、体检、资料搜索、Agent 输入框和底栏均无遮挡。
