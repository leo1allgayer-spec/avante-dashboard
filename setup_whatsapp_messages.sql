create table if not exists public.whatsapp_message_templates (
  id uuid not null default gen_random_uuid() primary key,
  type text not null unique,
  message_template text not null,
  is_active boolean not null default true,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

alter table public.whatsapp_message_templates enable row level security;

drop policy if exists "Authenticated can view templates" on public.whatsapp_message_templates;
drop policy if exists "Authenticated can insert templates" on public.whatsapp_message_templates;
drop policy if exists "Authenticated can update templates" on public.whatsapp_message_templates;
drop policy if exists "Authenticated can delete templates" on public.whatsapp_message_templates;

create policy "Authenticated can view templates"
  on public.whatsapp_message_templates for select
  to authenticated using (true);

create policy "Authenticated can insert templates"
  on public.whatsapp_message_templates for insert
  to authenticated with check (true);

create policy "Authenticated can update templates"
  on public.whatsapp_message_templates for update
  to authenticated using (true) with check (true);

create policy "Authenticated can delete templates"
  on public.whatsapp_message_templates for delete
  to authenticated using (true);

insert into public.whatsapp_message_templates (type, message_template, is_active)
values
  (
    'confirmation',
    E'Ola, {{nome}}!\n\nSua vaga no curso foi confirmada com sucesso!\n\nCurso: {{curso}}\nData: {{data_agendamento}}\n\nSe precisar de algo, e so responder aqui.',
    true
  ),
  (
    'reminder_24h',
    E'Ola, {{nome}}!\n\nPassando para lembrar que seu curso acontece amanha.\n\nCurso: {{curso}}\nData: {{data_agendamento}}\n\nSe precisar remarcar, chama a gente por aqui.',
    true
  ),
  (
    'reminder_1h',
    E'Ola, {{nome}}!\n\nSeu curso comeca em 1 hora.\n\nCurso: {{curso}}\nData: {{data_agendamento}}',
    true
  ),
  (
    'post_course',
    E'Parabens pela conclusao, {{nome}}!\n\nPara alunos do curso {{curso}}, temos uma condicao especial para o proximo nivel.\n\nQuer que eu envie os detalhes?',
    true
  )
on conflict (type) do update
set
  message_template = excluded.message_template,
  is_active = excluded.is_active,
  updated_at = now();

create table if not exists public.whatsapp_message_logs (
  id uuid not null default gen_random_uuid() primary key,
  booking_id uuid references public.course_bookings(id) on delete set null,
  phone text not null,
  student_name text not null,
  course_name text not null,
  message_type text not null,
  message_text text not null,
  status text not null default 'pending',
  error_message text,
  sent_at timestamp with time zone,
  created_at timestamp with time zone not null default now()
);

alter table public.whatsapp_message_logs enable row level security;

drop policy if exists "Authenticated can view logs" on public.whatsapp_message_logs;
drop policy if exists "Authenticated can insert logs" on public.whatsapp_message_logs;
drop policy if exists "Authenticated can update logs" on public.whatsapp_message_logs;
drop policy if exists "Anon can insert logs" on public.whatsapp_message_logs;
drop policy if exists "Anon can update logs" on public.whatsapp_message_logs;

create policy "Authenticated can view logs"
  on public.whatsapp_message_logs for select
  to authenticated using (true);

create policy "Authenticated can insert logs"
  on public.whatsapp_message_logs for insert
  to authenticated with check (true);

create policy "Authenticated can update logs"
  on public.whatsapp_message_logs for update
  to authenticated using (true) with check (true);

create policy "Anon can insert logs"
  on public.whatsapp_message_logs for insert
  to anon with check (true);

create policy "Anon can update logs"
  on public.whatsapp_message_logs for update
  to anon using (true) with check (true);

create table if not exists public.whatsapp_scheduled_messages (
  id uuid not null default gen_random_uuid() primary key,
  booking_id uuid references public.course_bookings(id) on delete cascade,
  message_type text not null,
  scheduled_for timestamp with time zone not null,
  status text not null default 'pending',
  created_at timestamp with time zone not null default now()
);

alter table public.whatsapp_scheduled_messages enable row level security;

drop policy if exists "Authenticated can view scheduled" on public.whatsapp_scheduled_messages;
drop policy if exists "Authenticated can insert scheduled" on public.whatsapp_scheduled_messages;
drop policy if exists "Authenticated can update scheduled" on public.whatsapp_scheduled_messages;
drop policy if exists "Authenticated can delete scheduled" on public.whatsapp_scheduled_messages;
drop policy if exists "Anon can insert scheduled" on public.whatsapp_scheduled_messages;
drop policy if exists "Anon can update scheduled" on public.whatsapp_scheduled_messages;

create policy "Authenticated can view scheduled"
  on public.whatsapp_scheduled_messages for select
  to authenticated using (true);

create policy "Authenticated can insert scheduled"
  on public.whatsapp_scheduled_messages for insert
  to authenticated with check (true);

create policy "Authenticated can update scheduled"
  on public.whatsapp_scheduled_messages for update
  to authenticated using (true) with check (true);

create policy "Authenticated can delete scheduled"
  on public.whatsapp_scheduled_messages for delete
  to authenticated using (true);

create policy "Anon can insert scheduled"
  on public.whatsapp_scheduled_messages for insert
  to anon with check (true);

create policy "Anon can update scheduled"
  on public.whatsapp_scheduled_messages for update
  to anon using (true) with check (true);

create table if not exists public.whatsapp_message_timing (
  id uuid primary key default gen_random_uuid(),
  message_type text not null unique,
  offset_value integer not null default 1,
  offset_unit text not null default 'hours',
  direction text not null default 'before',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table public.whatsapp_message_timing enable row level security;

drop policy if exists "Authenticated can view timing" on public.whatsapp_message_timing;
drop policy if exists "Authenticated can update timing" on public.whatsapp_message_timing;
drop policy if exists "Authenticated can insert timing" on public.whatsapp_message_timing;

create policy "Authenticated can view timing"
  on public.whatsapp_message_timing for select
  to authenticated using (true);

create policy "Authenticated can update timing"
  on public.whatsapp_message_timing for update
  to authenticated using (true) with check (true);

create policy "Authenticated can insert timing"
  on public.whatsapp_message_timing for insert
  to authenticated with check (true);

insert into public.whatsapp_message_timing (message_type, offset_value, offset_unit, direction)
values
  ('reminder_24h', 24, 'hours', 'before'),
  ('reminder_1h', 1, 'hours', 'before'),
  ('post_course', 7, 'days', 'after')
on conflict (message_type) do update
set
  offset_value = excluded.offset_value,
  offset_unit = excluded.offset_unit,
  direction = excluded.direction,
  updated_at = now();
