begin;

-- Keep the support booking and the signed-term snapshot, but detach them from
-- a student registration that an authorized user removes from the dashboard.
alter table public.support_bookings
  drop constraint if exists support_bookings_student_id_fkey;
alter table public.support_bookings
  alter column student_id drop not null;
alter table public.support_bookings
  add constraint support_bookings_student_id_fkey
  foreign key (student_id) references public.alunos_futuros(id) on delete set null;

alter table public.student_commitment_acceptances
  drop constraint if exists student_commitment_acceptances_student_id_fkey;
alter table public.student_commitment_acceptances
  alter column student_id drop not null;
alter table public.student_commitment_acceptances
  add constraint student_commitment_acceptances_student_id_fkey
  foreign key (student_id) references public.alunos_futuros(id) on delete set null;

create or replace function public.prevent_student_commitment_acceptance_mutation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  -- FK cascade may only detach the mutable link. Preserve the signed snapshot
  -- byte-for-byte, including the accepted identity and term contents.
  if tg_op = 'UPDATE'
     and old.student_id is not null
     and new.student_id is null
     and (to_jsonb(new) - 'student_id') = (to_jsonb(old) - 'student_id') then
    return new;
  end if;
  raise exception 'Registros de aceite são imutáveis';
end;
$$;

-- Group deletion uses the existing validated per-item routine inside one
-- transaction, so a failed item cannot leave a partially deleted sale group.
create or replace function public.delete_sale_items(p_items jsonb)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_item jsonb;
  v_removed integer := 0;
  v_deleted boolean;
begin
  if auth.uid() is null then
    raise exception 'Entre novamente para remover a venda';
  end if;
  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Nenhum item de venda foi informado';
  end if;

  for v_item in select value from jsonb_array_elements(p_items) loop
    if nullif(v_item->>'sale_id', '') is null then
      raise exception 'Um item está sem identificador de venda';
    end if;
    v_deleted := public.delete_sale_item(
      (v_item->>'sale_id')::uuid,
      nullif(v_item->>'closing_id', '')::uuid,
      nullif(v_item->>'creative_id', '')::uuid,
      nullif(v_item->>'expected_updated_at', '')::timestamptz
    );
    if not v_deleted then
      raise exception 'Uma das vendas já foi removida. Atualize a lista e tente novamente.';
    end if;
    v_removed := v_removed + 1;
  end loop;
  return v_removed;
end;
$$;

revoke all on function public.delete_sale_items(jsonb) from public, anon;
grant execute on function public.delete_sale_items(jsonb) to authenticated;

select pg_notify('pgrst', 'reload schema');
commit;
