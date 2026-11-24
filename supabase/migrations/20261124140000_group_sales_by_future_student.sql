begin;

-- Backfill historic sales into the one student profile only when the complete
-- normalized customer name identifies exactly one profile. Keep money and
-- course rows untouched; the student id is only the package/grouping key.
create or replace function public.normalize_student_sales_name(p_value text)
returns text
language sql
immutable
set search_path = ''
as $$
  select trim(regexp_replace(
    translate(lower(coalesce(p_value, '')),
      'áàãâäéêëíïóôõöúüç',
      'aaaaaeeeiioooouuc'),
    '\s+', ' ', 'g'
  ));
$$;

create or replace function public.link_sales_to_student_package(p_student_id uuid, p_student_name text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name_key text := public.normalize_student_sales_name(p_student_name);
  v_sale record;
begin
  if v_name_key = '' then return; end if;

  -- Profiles are identified by CPF at registration. Name is only the safe
  -- bridge for older sales that predate storing the student profile id.
  if (select count(*) from public.alunos_futuros student
      where public.normalize_student_sales_name(student.nome) = v_name_key) <> 1 then
    return;
  end if;

  for v_sale in
    select sale.id,
           public.student_course_key(coalesce(nullif(sale.produto, ''), sale.servico)) as course_key,
           lower(coalesce(sale.status, '')) as sale_status
    from public.vendas sale
    where sale.aluno_futuro_id is null
      and public.normalize_student_sales_name(sale.cliente) = v_name_key
      and public.student_course_key(coalesce(nullif(sale.produto, ''), sale.servico)) <> ''
    order by sale.created_at, sale.id
  loop
    -- The database still prevents duplicate active sales for the same student
    -- and course. Skip those ambiguous duplicates instead of changing them.
    if v_sale.sale_status <> 'cancelada' and exists (
      select 1
      from public.vendas existing
      where existing.aluno_futuro_id = p_student_id
        and lower(coalesce(existing.status, '')) <> 'cancelada'
        and public.student_course_key(coalesce(nullif(existing.produto, ''), existing.servico)) = v_sale.course_key
    ) then
      continue;
    end if;

    update public.vendas
    set aluno_futuro_id = p_student_id,
        updated_at = now()
    where id = v_sale.id
      and aluno_futuro_id is null;
  end loop;
end;
$$;

create or replace function public.link_sales_to_student_package_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*) from public.alunos_futuros student
      where public.normalize_student_sales_name(student.nome) = public.normalize_student_sales_name(new.nome)) = 1 then
    perform public.link_sales_to_student_package(new.id, new.nome);
  end if;
  return new;
end;
$$;

revoke all on function public.link_sales_to_student_package(uuid, text) from public, anon, authenticated;

drop trigger if exists link_sales_to_student_package_trigger on public.alunos_futuros;
create trigger link_sales_to_student_package_trigger
after insert or update of nome on public.alunos_futuros
for each row execute function public.link_sales_to_student_package_trigger();

-- Apply the same conservative linking to existing profiles and sales.
do $$
declare
  student record;
begin
  for student in
    select profile.id, profile.nome
    from public.alunos_futuros profile
    where public.normalize_student_sales_name(profile.nome) <> ''
      and (select count(*) from public.alunos_futuros same_name
           where public.normalize_student_sales_name(same_name.nome) = public.normalize_student_sales_name(profile.nome)) = 1
    order by profile.created_at, profile.id
  loop
    perform public.link_sales_to_student_package(student.id, student.nome);
  end loop;
end;
$$;

commit;
