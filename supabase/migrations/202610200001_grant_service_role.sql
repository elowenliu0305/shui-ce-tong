-- 显式补齐 service_role 的表级授权。
-- Supabase 平台初始化时对 public schema 有默认授权（含 service_role），
-- 但在 drop/recreate schema 重建后默认授权丢失；显式授权使迁移自包含，
-- 不再依赖环境默认值。设计保持：anon/authenticated 一律默认拒绝，按表显式 grant。
begin;

do $$
declare
  t record;
begin
  for t in
    select tablename
    from pg_tables
    where schemaname = 'public'
    order by tablename
  loop
    execute format('grant select, insert, update, delete on public.%I to service_role', t.tablename);
  end loop;
end
$$;

alter default privileges in schema public grant select, insert, update, delete on tables to service_role;

do $$
declare
  v record;
begin
  for v in
    select table_name
    from information_schema.views
    where table_schema = 'public'
    order by table_name
  loop
    execute format('grant select on public.%I to service_role', v.table_name);
  end loop;
end
$$;

-- 注：ALTER DEFAULT PRIVILEGES 语法不支持 views，新视图需显式 grant

commit;
