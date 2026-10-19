-- 补齐 service_role 对 public 视图的 select 授权（schema 重建后平台默认授权丢失，同 202610200001）。
-- 注：ALTER DEFAULT PRIVILEGES 语法不支持 views，新视图需显式 grant。
begin;

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

commit;
