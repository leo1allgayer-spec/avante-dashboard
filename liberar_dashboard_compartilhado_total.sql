-- Libera o dashboard como base compartilhada da equipe.
-- Todos os usuarios autenticados podem ver, criar, editar e excluir registros
-- nas tabelas operacionais listadas abaixo, independente de quem criou.
--
-- Rode este arquivo no Supabase SQL Editor.

do $$
declare
  target_table text;
  policy_record record;
  tables_to_share text[] := array[
    'daily_metrics',
    'clients',
    'gestao_clients',
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
    'tasks',
    'meetings',
    'team_members'
  ];
begin
  foreach target_table in array tables_to_share loop
    if to_regclass(format('public.%I', target_table)) is not null then
      execute format('alter table public.%I enable row level security', target_table);

      for policy_record in
        select policyname
        from pg_policies
        where schemaname = 'public'
          and tablename = target_table
      loop
        execute format(
          'drop policy if exists %I on public.%I',
          policy_record.policyname,
          target_table
        );
      end loop;

      execute format(
        'create policy %I on public.%I for select to authenticated using (true)',
        'Shared dashboard select',
        target_table
      );

      execute format(
        'create policy %I on public.%I for insert to authenticated with check (true)',
        'Shared dashboard insert',
        target_table
      );

      execute format(
        'create policy %I on public.%I for update to authenticated using (true) with check (true)',
        'Shared dashboard update',
        target_table
      );

      execute format(
        'create policy %I on public.%I for delete to authenticated using (true)',
        'Shared dashboard delete',
        target_table
      );
    end if;
  end loop;
end $$;

select pg_notify('pgrst', 'reload schema');
