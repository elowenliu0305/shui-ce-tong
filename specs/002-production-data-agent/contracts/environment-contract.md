# Environment and Secret Contract

## Browser-visible variables

```dotenv
VITE_DATA_BACKEND=mock|supabase
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<publishable-key>
```

These values may be present in the browser bundle. Security MUST rely on RLS, not secrecy of the publishable key.

## Edge Function secrets

```dotenv
SUPABASE_URL=<injected-or-configured>
SUPABASE_SERVICE_ROLE_KEY=<secret>
MODEL_API_BASE_URL=<secret-config>
MODEL_API_KEY=<secret>
MODEL_NAME=<config>
```

## Ingestion worker secrets/config

```dotenv
SUPABASE_URL=<project-url>
SUPABASE_SERVICE_ROLE_KEY=<secret>
EMBEDDING_API_BASE_URL=<secret-config>
EMBEDDING_API_KEY=<secret>
EMBEDDING_MODEL=Qwen/Qwen3-Embedding-0.6B
EMBEDDING_DIMENSION=1024
```

## Rules

- Commit `.env.example` with names and safe placeholders only.
- Ignore `.env`, `.env.local`, `.env.*.local`, Supabase temp files and generated credentials.
- Never prefix privileged values with `VITE_`.
- Logs may include secret name and request ID, never value, bearer token, password, reset link or full prompt/file text.
- `check:secrets` must run before build/release and inspect tracked source plus built assets.
- Local development may operate entirely in Mock mode until Supabase/project credentials are supplied.

