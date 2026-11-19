begin;

-- Use the shared course catalog for sale/student matching so aliases such as
-- "Curso Captacao/Edicao" and "Curso Captação e Edição de Vídeo" share one key.
do $migration$
declare
  definition text;
  old_text text;
  new_text text;
begin
  definition := pg_get_functiondef('public.sync_future_student_items_to_sales()'::regprocedure);

  old_text := $old$v_item_match_key := trim(regexp_replace(' ' || v_item_key || ' ', '\s+de\s+', ' ', 'g'));$old$;
  new_text := $new$v_item_match_key := public.student_course_key(v_item_name);$new$;
  if position(old_text in definition) = 0 then raise exception 'Unexpected future student item identity key'; end if;
  definition := replace(definition, old_text, new_text);

  old_text := $old$trim(regexp_replace(' ' || lower(trim(regexp_replace(coalesce(nullif(venda.aluno_futuro_item, ''), nullif(venda.produto, ''), venda.servico), '\s+', ' ', 'g'))) || ' ', '\s+de\s+', ' ', 'g'))$old$;
  new_text := $new$public.student_course_key(coalesce(nullif(venda.aluno_futuro_item, ''), nullif(venda.produto, ''), venda.servico))$new$;
  if position(old_text in definition) = 0 then raise exception 'Unexpected linked sale identity expression'; end if;
  definition := replace(definition, old_text, new_text);

  old_text := $old$trim(regexp_replace(' ' || lower(trim(regexp_replace(coalesce(nullif(venda.produto, ''), venda.servico), '\s+', ' ', 'g'))) || ' ', '\s+de\s+', ' ', 'g'))$old$;
  new_text := $new$public.student_course_key(coalesce(nullif(venda.produto, ''), venda.servico))$new$;
  if position(old_text in definition) = 0 then raise exception 'Unexpected unlinked sale identity expression'; end if;
  definition := replace(definition, old_text, new_text);

  old_text := $old$trim(regexp_replace(' ' || lower(trim(regexp_replace(coalesce(nullif(fechamento.categoria, ''), fechamento.produto_servico), '\s+', ' ', 'g'))) || ' ', '\s+de\s+', ' ', 'g'))$old$;
  new_text := $new$public.student_course_key(coalesce(nullif(fechamento.categoria, ''), fechamento.produto_servico))$new$;
  if position(old_text in definition) = 0 then raise exception 'Unexpected closing identity expression'; end if;
  definition := replace(definition, old_text, new_text);

  old_text := $old$where venda.aluno_futuro_id = new.id$old$;
  new_text := $new$where venda.aluno_futuro_id = new.id
      and lower(coalesce(venda.status, '')) <> 'cancelada'$new$;
  if position(old_text in definition) = 0 then raise exception 'Unexpected linked sales lookup'; end if;
  definition := replace(definition, old_text, new_text);

  old_text := $old$order by venda.updated_at desc$old$;
  new_text := $new$order by case when lower(coalesce(venda.origem, '')) = 'cadastro do aluno' then 1 else 0 end, venda.updated_at desc$new$;
  if position(old_text in definition) = 0 then raise exception 'Unexpected linked sales ordering'; end if;
  definition := replace(definition, old_text, new_text);

  old_text := $old$where venda.aluno_futuro_id is null$old$;
  new_text := $new$where venda.aluno_futuro_id is null
        and lower(coalesce(venda.status, '')) <> 'cancelada'$new$;
  if position(old_text in definition) = 0 then raise exception 'Unexpected legacy sales lookup'; end if;
  definition := replace(definition, old_text, new_text);

  execute definition;
end;
$migration$;

create or replace function public.validate_future_student_sale_identity()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_key text;
  v_old_key text;
begin
  if new.aluno_futuro_id is null then return new; end if;
  if lower(coalesce(new.status, '')) = 'cancelada' then return new; end if;

  v_key := public.student_course_key(coalesce(nullif(new.produto, ''), new.servico));
  if v_key = '' then
    raise exception using errcode = '23514', message = 'Venda vinculada ao aluno precisa ter produto ou servico definido';
  end if;

  if tg_op = 'UPDATE' and new.aluno_futuro_id is not distinct from old.aluno_futuro_id then
    v_old_key := public.student_course_key(coalesce(nullif(old.produto, ''), old.servico));
    if v_key is not distinct from v_old_key then return new; end if;
  end if;

  if exists (
    select 1
    from public.vendas existing
    where existing.id <> new.id
      and existing.aluno_futuro_id = new.aluno_futuro_id
      and lower(coalesce(existing.status, '')) <> 'cancelada'
      and public.student_course_key(coalesce(nullif(existing.produto, ''), existing.servico)) = v_key
  ) then
    raise exception using errcode = '23505', message = 'Ja existe uma venda ativa deste curso para o aluno';
  end if;
  return new;
end;
$$;

do $migration$
declare
  definition text;
  old_text text := $old$lower(trim(regexp_replace(coalesce(item->>'nome', ''), '\s+', ' ', 'g'))) = v_key$old$;
  new_text text := $new$public.student_course_key(coalesce(item->>'nome', '')) = public.student_course_key(v_key)$new$;
begin
  definition := pg_get_functiondef('public.update_future_student_item_values(uuid,text,numeric,numeric,text)'::regprocedure);
  if position(old_text in definition) = 0 then raise exception 'Unexpected future student item update identity'; end if;
  execute replace(definition, old_text, new_text);

  definition := pg_get_functiondef('public.sync_sale_to_future_student()'::regprocedure);
  old_text := $old$lower(trim(regexp_replace(coalesce(item->>'nome', ''), '\s+', ' ', 'g'))) = v_item_key$old$;
  new_text := $new$public.student_course_key(coalesce(item->>'nome', '')) = public.student_course_key(v_item_key)$new$;
  if position(old_text in definition) = 0 then raise exception 'Unexpected sale-to-student lookup identity'; end if;
  execute replace(definition, old_text, new_text);
end;
$migration$;

commit;
