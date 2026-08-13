create table if not exists public.alunos_futuros (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  telefone text not null,
  cpf text not null,
  cpf_limpo text generated always as (regexp_replace(coalesce(cpf, ''), '\D', '', 'g')) stored,
  valor_sinal numeric not null default 0,
  status text not null default 'sinal_pago',
  observacao text default '',
  survey_response_id uuid references public.survey_responses(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists alunos_futuros_cpf_limpo_key
  on public.alunos_futuros (cpf_limpo)
  where cpf_limpo <> '';

alter table public.alunos_futuros enable row level security;

drop policy if exists "Public can register future students" on public.alunos_futuros;
drop policy if exists "Authenticated can view future students" on public.alunos_futuros;
drop policy if exists "Authenticated can manage future students" on public.alunos_futuros;

create policy "Public can register future students"
on public.alunos_futuros for insert to anon, authenticated with check (true);

create policy "Authenticated can view future students"
on public.alunos_futuros for select to authenticated using (true);

create policy "Authenticated can manage future students"
on public.alunos_futuros for all to authenticated using (true) with check (true);

alter table public.survey_responses
  add column if not exists aluno_futuro_id uuid references public.alunos_futuros(id) on delete set null;

create or replace function public.link_survey_to_future_student()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  v_future_id uuid;
begin
  if new.cpf is null or regexp_replace(new.cpf, '\D', '', 'g') = '' then
    return new;
  end if;

  select id into v_future_id
  from public.alunos_futuros
  where cpf_limpo = regexp_replace(new.cpf, '\D', '', 'g')
  order by created_at desc
  limit 1;

  if v_future_id is not null then
    new.aluno_futuro_id := v_future_id;
  end if;
  return new;
end;
$$;

drop trigger if exists survey_responses_link_future_student on public.survey_responses;
create trigger survey_responses_link_future_student
before insert or update of cpf on public.survey_responses
for each row execute function public.link_survey_to_future_student();

select pg_notify('pgrst', 'reload schema');
