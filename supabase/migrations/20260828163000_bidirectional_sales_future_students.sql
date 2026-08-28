create or replace function public.update_future_student_item_values(
  p_student_id uuid,
  p_item_key text,
  p_signal numeric,
  p_pending numeric,
  p_item_name text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_items jsonb;
  v_key text := lower(trim(regexp_replace(coalesce(p_item_key, ''), '\s+', ' ', 'g')));
  v_signal numeric := greatest(coalesce(p_signal, 0), 0);
  v_pending numeric := greatest(coalesce(p_pending, 0), 0);
  v_total_signal numeric;
begin
  if p_student_id is null or v_key = '' then return; end if;

  select coalesce(jsonb_agg(
    case
      when lower(trim(regexp_replace(coalesce(item->>'nome', ''), '\s+', ' ', 'g'))) = v_key then
        jsonb_set(
          jsonb_set(
            case when nullif(trim(coalesce(p_item_name, '')), '') is not null
              then jsonb_set(item, '{nome}', to_jsonb(trim(p_item_name)), true)
              else item
            end,
            '{valor_sinal}', to_jsonb(v_signal), true
          ),
          '{valor_pendente}', to_jsonb(v_pending), true
        )
      else item
    end
  ), '[]'::jsonb)
  into v_items
  from public.alunos_futuros student,
       lateral jsonb_array_elements(coalesce(student.itens, '[]'::jsonb)) item
  where student.id = p_student_id;

  if v_items is null or jsonb_array_length(v_items) = 0 then return; end if;

  select coalesce(sum(
    greatest(coalesce(nullif(replace(regexp_replace(coalesce(item->>'valor_sinal', '0'), '[^0-9,.-]', '', 'g'), ',', '.'), '')::numeric, 0), 0)
  ), 0)
  into v_total_signal
  from jsonb_array_elements(v_items) item;

  update public.alunos_futuros
  set itens = v_items,
      valor_sinal = v_total_signal,
      updated_at = now()
  where id = p_student_id;
end;
$$;

create or replace function public.sync_sale_to_future_student()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item_key text;
  v_item_name text;
  v_signal numeric := 0;
  v_pending numeric := 0;
  v_item jsonb;
begin
  if pg_trigger_depth() > 1 or new.aluno_futuro_id is null then return new; end if;

  v_item_name := trim(coalesce(nullif(new.produto, ''), new.servico, ''));
  v_item_key := lower(trim(regexp_replace(coalesce(nullif(new.aluno_futuro_item, ''), v_item_name), '\s+', ' ', 'g')));
  if v_item_key = '' then return new; end if;

  select item into v_item
  from public.alunos_futuros student,
       lateral jsonb_array_elements(coalesce(student.itens, '[]'::jsonb)) item
  where student.id = new.aluno_futuro_id
    and lower(trim(regexp_replace(coalesce(item->>'nome', ''), '\s+', ' ', 'g'))) = v_item_key
  limit 1;

  v_signal := greatest(coalesce(nullif(replace(regexp_replace(coalesce(v_item->>'valor_sinal', '0'), '[^0-9,.-]', '', 'g'), ',', '.'), '')::numeric, 0), 0);
  if lower(coalesce(new.status, '')) = 'pago' then
    v_signal := greatest(coalesce(new.valor, 0), 0);
    v_pending := 0;
  else
    v_signal := least(v_signal, greatest(coalesce(new.valor, 0), 0));
    v_pending := greatest(coalesce(new.valor, 0) - v_signal, 0);
  end if;

  perform public.update_future_student_item_values(
    new.aluno_futuro_id, v_item_key, v_signal, v_pending, v_item_name
  );
  return new;
end;
$$;

drop trigger if exists sync_sale_to_future_student_trigger on public.vendas;
create trigger sync_sale_to_future_student_trigger
after update of valor, status, produto, servico, cliente on public.vendas
for each row execute function public.sync_sale_to_future_student();

create or replace function public.sync_closing_to_future_student()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sale public.vendas%rowtype;
  v_item_name text;
  v_match_key text;
begin
  if pg_trigger_depth() > 1 then return new; end if;

  v_item_name := trim(coalesce(nullif(new.categoria, ''), new.produto_servico, ''));
  v_match_key := lower(trim(regexp_replace(v_item_name, '\s+', ' ', 'g')));
  if v_match_key = '' then return new; end if;

  select sale.* into v_sale
  from public.vendas sale
  where sale.aluno_futuro_id is not null
    and lower(trim(sale.cliente)) = lower(trim(new.cliente))
    and lower(trim(regexp_replace(coalesce(nullif(sale.aluno_futuro_item, ''), nullif(sale.produto, ''), sale.servico), '\s+', ' ', 'g'))) = v_match_key
  order by sale.updated_at desc
  limit 1;

  if v_sale.id is null then return new; end if;

  perform public.update_future_student_item_values(
    v_sale.aluno_futuro_id,
    coalesce(nullif(v_sale.aluno_futuro_item, ''), v_match_key),
    greatest(coalesce(new.valor_sinal, 0), 0),
    greatest(coalesce(new.valor_a_entrar, 0), 0),
    v_item_name
  );
  return new;
end;
$$;

drop trigger if exists sync_closing_to_future_student_trigger on public.fechamentos_diarios;
drop trigger if exists sync_closing_to_future_student_insert_trigger on public.fechamentos_diarios;
drop trigger if exists sync_closing_to_future_student_update_trigger on public.fechamentos_diarios;

create trigger sync_closing_to_future_student_insert_trigger
after insert on public.fechamentos_diarios
for each row execute function public.sync_closing_to_future_student();

create trigger sync_closing_to_future_student_update_trigger
after update of valor_sinal, valor_a_entrar, categoria, produto_servico, cliente, status
on public.fechamentos_diarios
for each row execute function public.sync_closing_to_future_student();

select pg_notify('pgrst', 'reload schema');