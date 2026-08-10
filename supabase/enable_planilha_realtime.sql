do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'planilha_daily_metrics'
  ) then
    alter publication supabase_realtime add table public.planilha_daily_metrics;
  end if;
end $$;

select pg_notify('pgrst', 'reload schema');
