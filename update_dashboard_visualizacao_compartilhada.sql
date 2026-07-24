do $$
declare
  table_name text;
  tables_to_share text[] := array[
    'daily_metrics',
    'clients',
    'vendas',
    'cursos_dados',
    'pagamentos_variaveis',
    'survey_responses',
    'instagram_metrics',
    'criativos_vendas',
    'criativos_resumo',
    'fechamentos_diarios',
    'booking_settings',
    'course_blocked_dates',
    'course_bookings',
    'course_disabled_days',
    'course_slots',
    'course_enrollments',
    'meta_ads_exceptions',
    'whatsapp_message_templates',
    'whatsapp_message_logs',
    'whatsapp_scheduled_messages',
    'whatsapp_message_timing',
    'gestao_clients',
    'tasks',
    'meetings',
    'team_members'
  ];
begin
  foreach table_name in array tables_to_share loop
    if to_regclass(format('public.%I', table_name)) is not null then
      execute format('alter table public.%I enable row level security', table_name);
      execute format('drop policy if exists %I on public.%I', 'Dashboard shared view', table_name);
      execute format(
        'create policy %I on public.%I for select to authenticated using (true)',
        'Dashboard shared view',
        table_name
      );
    end if;
  end loop;
end $$;

select pg_notify('pgrst', 'reload schema');
