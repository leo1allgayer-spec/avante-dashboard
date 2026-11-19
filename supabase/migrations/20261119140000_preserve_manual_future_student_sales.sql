begin;

do $migration$
declare
  definition text;
  old_text text;
  new_text text;
begin
  definition := pg_get_functiondef('public.sync_future_student_items_to_sales()'::regprocedure);

  old_text := $old$aluno_futuro_item = v_item_key,$old$;
  new_text := $new$aluno_futuro_item = coalesce(nullif(public.vendas.aluno_futuro_item, ''), v_item_key),$new$;
  if position(old_text in definition) = 0 then raise exception 'Unexpected future student item assignment'; end if;
  definition := replace(definition, old_text, new_text);

  old_text := $old$status = case when lower(coalesce(public.vendas.status, '')) in ('pago','paga') then public.vendas.status when v_pending <= 0 then 'pago' else 'pendente' end,$old$;
  new_text := $new$status = case
          when lower(coalesce(public.vendas.origem, '')) = 'cadastro do aluno' then
            case when lower(coalesce(public.vendas.status, '')) in ('pago','paga') then public.vendas.status when v_pending <= 0 then 'pago' else 'pendente' end
          else public.vendas.status
        end,$new$;
  if position(old_text in definition) = 0 then raise exception 'Unexpected future student sale status sync'; end if;
  definition := replace(definition, old_text, new_text);
  execute definition;

  definition := pg_get_functiondef('public.sync_sale_to_future_student()'::regprocedure);
  old_text := $old$if pg_trigger_depth() > 1 or new.aluno_futuro_id is null then return new; end if;$old$;
  new_text := $new$if pg_trigger_depth() > 1 or new.aluno_futuro_id is null or lower(coalesce(new.status, '')) = 'cancelada' then return new; end if;$new$;
  if position(old_text in definition) = 0 then raise exception 'Unexpected sale-to-student synchronization guard'; end if;
  execute replace(definition, old_text, new_text);
end;
$migration$;

commit;
