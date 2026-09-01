-- IDs confirmados pelo diagnostico restrito de 01/09/2026.
update public.vendas
set aluno_futuro_id = null,
    aluno_futuro_item = null,
    status = 'cancelada',
    updated_at = now()
where id = '257f9349-ed3e-42e5-937a-870b26484050';

update public.fechamentos_diarios
set venda_id = null,
    status = 'cancelado',
    updated_at = now()
where id = '3dca3036-d54c-4f76-ace0-9aecd052e5b8';

update public.vendas
set valor = 2000,
    comissao = 112.50,
    status = 'pendente',
    updated_at = now()
where id = '839973b7-7b6b-4bd6-89d3-ebdfafe25abd';

update public.fechamentos_diarios
set venda_id = '839973b7-7b6b-4bd6-89d3-ebdfafe25abd',
    valor_sinal = 750,
    valor_sinal_liquido = 750,
    valor_a_entrar = 1250,
    status = 'a receber',
    updated_at = now()
where id = '97cfd441-ef17-4294-9b0b-cf7ad29e3b36';

create or replace function public.validate_future_student_sale_identity()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_key text;
begin
  if new.aluno_futuro_id is null then return new; end if;
  v_key := trim(regexp_replace(' ' || lower(trim(regexp_replace(coalesce(nullif(new.produto, ''), new.servico), '\s+', ' ', 'g'))) || ' ', '\s+de\s+', ' ', 'g'));
  if v_key = '' then
    raise exception using errcode = '23514', message = 'Venda vinculada ao aluno precisa ter produto ou servico definido';
  end if;
  if exists (
    select 1 from public.vendas existing
    where existing.id <> new.id
      and existing.aluno_futuro_id = new.aluno_futuro_id
      and lower(coalesce(existing.status, '')) <> 'cancelada'
      and trim(regexp_replace(' ' || lower(trim(regexp_replace(coalesce(nullif(existing.produto, ''), existing.servico), '\s+', ' ', 'g'))) || ' ', '\s+de\s+', ' ', 'g')) = v_key
  ) then
    raise exception using errcode = '23505', message = 'Ja existe uma venda ativa deste curso para o aluno';
  end if;
  return new;
end;
$$;

drop trigger if exists validate_future_student_sale_identity_trigger on public.vendas;
create trigger validate_future_student_sale_identity_trigger
before insert or update of aluno_futuro_id, produto, servico, status on public.vendas
for each row execute function public.validate_future_student_sale_identity();

select pg_notify('pgrst', 'reload schema');