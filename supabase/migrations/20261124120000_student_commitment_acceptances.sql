create extension if not exists pgcrypto with schema extensions;

create table if not exists public.student_commitment_acceptances (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.alunos_futuros(id) on delete restrict,
  student_name text not null,
  student_cpf text not null,
  student_phone text not null,
  student_identity jsonb not null,
  accepted_at timestamptz not null default now(),
  accepted boolean not null check (accepted is true),
  acceptance_text text not null,
  term_version text not null,
  term_content text not null,
  content_sha256 text not null check (content_sha256 ~ '^[0-9a-f]{64}$'),
  course_name text not null,
  course_date date,
  course_shift text,
  signal_value numeric(12,2),
  ip_address inet,
  user_agent text,
  request_id uuid not null unique,
  created_at timestamptz not null default now()
);

create index if not exists student_commitment_acceptances_student_time_idx
  on public.student_commitment_acceptances (student_id, accepted_at desc);

alter table public.student_commitment_acceptances enable row level security;
revoke all on public.student_commitment_acceptances from anon, authenticated;

drop policy if exists "Authenticated can view commitment acceptances" on public.student_commitment_acceptances;
create policy "Authenticated can view commitment acceptances"
on public.student_commitment_acceptances for select to authenticated using (true);

create or replace view public.student_commitment_acceptances_dashboard as
select id, student_id, student_name, student_cpf, student_phone, student_identity,
       accepted_at, accepted, acceptance_text, term_version, term_content,
       content_sha256, course_name, course_date, course_shift, signal_value, request_id
from public.student_commitment_acceptances;
revoke all on public.student_commitment_acceptances_dashboard from public, anon;
grant select on public.student_commitment_acceptances_dashboard to authenticated;

create or replace function public.prevent_student_commitment_acceptance_mutation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception 'Registros de aceite são imutáveis';
end;
$$;

drop trigger if exists student_commitment_acceptances_immutable on public.student_commitment_acceptances;
create trigger student_commitment_acceptances_immutable
before update or delete on public.student_commitment_acceptances
for each row execute function public.prevent_student_commitment_acceptance_mutation();

create or replace function public.record_student_commitment_acceptance(
  p_cpf text,
  p_course_name text,
  p_course_date date,
  p_course_shift text,
  p_accepted boolean,
  p_request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_student public.alunos_futuros%rowtype;
  v_term_version constant text := '2026-11-24-v1';
  v_term_content constant text := $term$TERMO DE COMPROMISSO E RESERVA DE VAGA

Ao realizar meu cadastro, declaro estar ciente de que os treinamentos presenciais da Avante Digital possuem vagas limitadas e exigem planejamento prévio de professores, equipe e estrutura.

Reserva da vaga: o valor pago como sinal será integralmente abatido do valor total do treinamento contratado, quando realizado.

Compromisso de comparecimento: comprometo-me a comparecer ao treinamento na data e horário previamente acordados. Caso não seja possível comparecer, deverei comunicar a Avante Digital com, no mínimo, 24 horas de antecedência.

Primeiro não comparecimento: será disponibilizada uma oportunidade de reagendamento sem custo adicional, conforme disponibilidade e mediante confirmação da nova data pelo aluno.

Segundo não comparecimento: caso eu não compareça injustificadamente em duas datas previamente acordadas, minha reserva poderá ser encerrada, com retenção proporcional do valor do sinal, observados os prejuízos decorrentes da reserva e a legislação aplicável. Uma nova reserva poderá exigir o pagamento de um novo sinal.

Situações excepcionais: emergências, situações de força maior e demais imprevistos justificados serão analisados individualmente, inclusive quando não for possível respeitar o prazo de 24 horas.

Direitos do consumidor: permanecem assegurados o direito de arrependimento, quando aplicável, e todos os demais direitos previstos no Código de Defesa do Consumidor.$term$;
  v_acceptance_text constant text := 'Declaro que li, compreendi e concordo com os termos de compromisso e reserva de vaga, assumindo o compromisso de comparecer ao treinamento na data acordada.';
  v_headers jsonb;
  v_ip inet;
  v_ip_header text;
  v_student_identity jsonb;
  v_record public.student_commitment_acceptances%rowtype;
begin
  if p_accepted is distinct from true then
    raise exception 'É necessário aceitar o termo para continuar';
  end if;
  if p_request_id is null then
    raise exception 'Identificador da solicitação não informado';
  end if;
  if length(regexp_replace(coalesce(p_cpf, ''), '\D', '', 'g')) <> 11 then
    raise exception 'CPF inválido para registrar o aceite';
  end if;
  if nullif(trim(p_course_name), '') is null then
    raise exception 'Treinamento não informado';
  end if;

  select * into v_student
  from public.alunos_futuros
  where cpf_limpo = regexp_replace(coalesce(p_cpf, ''), '\D', '', 'g')
  order by created_at desc
  limit 1;

  if v_student.id is null then
    raise exception 'Cadastro do aluno não encontrado para registrar o aceite';
  end if;

  v_student_identity := jsonb_strip_nulls(jsonb_build_object(
    'nome', v_student.nome,
    'cpf', v_student.cpf,
    'telefone', v_student.telefone,
    'data_nascimento', v_student.data_nascimento,
    'email', v_student.email,
    'instagram', v_student.instagram,
    'cep', v_student.cep,
    'cidade', v_student.cidade,
    'endereco', v_student.endereco,
    'nome_certificado', v_student.nome_certificado
  ));

  select coalesce(nullif(current_setting('request.headers', true), ''), '{}')::jsonb into v_headers;
  v_ip_header := coalesce(nullif(v_headers->>'cf-connecting-ip', ''), nullif(v_headers->>'x-real-ip', ''), nullif(split_part(coalesce(v_headers->>'x-forwarded-for', ''), ',', 1), ''));
  begin
    v_ip := v_ip_header::inet;
  exception when others then
    v_ip := null;
  end;

  insert into public.student_commitment_acceptances (
    student_id, student_name, student_cpf, student_phone, student_identity, accepted, acceptance_text, term_version,
    term_content, content_sha256, course_name, course_date, course_shift,
    signal_value, ip_address, user_agent, request_id
  ) values (
    v_student.id, v_student.nome, v_student.cpf, v_student.telefone, v_student_identity, true, v_acceptance_text, v_term_version,
    v_term_content, encode(digest(convert_to(v_term_content, 'UTF8'), 'sha256'), 'hex'),
    trim(p_course_name), p_course_date, nullif(trim(p_course_shift), ''),
    v_student.valor_sinal, v_ip, nullif(v_headers->>'user-agent', ''), p_request_id
  )
  on conflict (request_id) do nothing;

  select * into v_record
  from public.student_commitment_acceptances
  where request_id = p_request_id;

  return jsonb_build_object(
    'id', v_record.id,
    'student_id', v_record.student_id,
    'student_name', v_record.student_name,
    'student_cpf', v_record.student_cpf,
    'student_phone', v_record.student_phone,
    'student_identity', v_record.student_identity,
    'accepted_at', v_record.accepted_at,
    'accepted', v_record.accepted,
    'acceptance_text', v_record.acceptance_text,
    'term_version', v_record.term_version,
    'term_content', v_record.term_content,
    'content_sha256', v_record.content_sha256,
    'course_name', v_record.course_name,
    'course_date', v_record.course_date,
    'course_shift', v_record.course_shift,
    'signal_value', v_record.signal_value
  );
end;
$$;

revoke all on function public.record_student_commitment_acceptance(text, text, date, text, boolean, uuid) from public;
grant execute on function public.record_student_commitment_acceptance(text, text, date, text, boolean, uuid) to anon, authenticated;

-- The public booking flow must not be able to create/update its signup without
-- recording the explicit acceptance in the same database transaction.
revoke all on function public.register_future_student_from_booking(text, text, text, text, numeric, date, text, text, text, text, text, text, text, text) from public, anon, authenticated;

create or replace function public.register_future_student_with_commitment(
  p_nome text,
  p_telefone text,
  p_cpf text,
  p_curso text,
  p_valor_sinal numeric,
  p_data_nascimento date,
  p_email text,
  p_instagram text,
  p_cep text,
  p_cidade text,
  p_endereco text,
  p_nome_certificado text,
  p_prazo text,
  p_observacao text,
  p_accepted boolean,
  p_request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student_id uuid;
  v_acceptance jsonb;
begin
  if p_accepted is distinct from true then
    raise exception 'É necessário aceitar o Termo de Compromisso para concluir o cadastro';
  end if;

  v_student_id := public.register_future_student_from_booking(
    p_nome, p_telefone, p_cpf, p_curso, p_valor_sinal, p_data_nascimento,
    p_email, p_instagram, p_cep, p_cidade, p_endereco, p_nome_certificado,
    p_prazo, p_observacao
  );
  v_acceptance := public.record_student_commitment_acceptance(
    p_cpf, p_curso, null, null, p_accepted, p_request_id
  );

  return jsonb_build_object('student_id', v_student_id, 'acceptance', v_acceptance);
end;
$$;

revoke all on function public.register_future_student_with_commitment(text, text, text, text, numeric, date, text, text, text, text, text, text, text, text, boolean, uuid) from public;
grant execute on function public.register_future_student_with_commitment(text, text, text, text, numeric, date, text, text, text, text, text, text, text, text, boolean, uuid) to anon, authenticated;

select pg_notify('pgrst', 'reload schema');
