begin;
create table if not exists public.future_student_repair_archive (
  repair_key text primary key,
  student_id uuid not null,
  original_record jsonb not null,
  archived_at timestamptz not null default now()
);
alter table public.future_student_repair_archive enable row level security;
revoke all on public.future_student_repair_archive from anon, authenticated;
do $$
declare s public.alunos_futuros%rowtype; repaired jsonb;
begin
  select * into strict s from public.alunos_futuros where cpf_limpo='82921539004' for update;
  if exists(select 1 from public.future_student_repair_archive where repair_key='graziela-meta-duplicate-20261009') then return; end if;
  if jsonb_array_length(s.itens) <>2 or not exists(select 1 from jsonb_array_elements(s.itens) x where x->>'nome'='Curso de Meta Ads' and (x->>'valor_sinal')::numeric=200 and (x->>'valor_pendente')::numeric=1697) or not exists(select 1 from jsonb_array_elements(s.itens) x where x->>'nome'='Curso Meta Ads' and (x->>'valor_sinal')::numeric=200 and (x->>'valor_pendente')::numeric=0) then raise exception 'Cadastro diferente do revisado; nenhuma alteração aplicada'; end if;
  insert into public.future_student_repair_archive(repair_key,student_id,original_record) values('graziela-meta-duplicate-20261009',s.id,to_jsonb(s));
  select jsonb_agg(x) into repaired from jsonb_array_elements(s.itens) x where x->>'nome'<>'Curso Meta Ads';
  update public.alunos_futuros set itens=repaired,valor_sinal=200,curso='Curso de Meta Ads',updated_at=now() where id=s.id;
end $$;
commit;
select jsonb_array_length(itens) as itens,valor_sinal,(itens->0->>'valor_pendente')::numeric as a_receber from public.alunos_futuros where cpf_limpo='82921539004';