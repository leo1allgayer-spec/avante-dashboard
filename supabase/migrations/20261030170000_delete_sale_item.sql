begin;
create function public.delete_sale_item(p_sale_id uuid,p_closing_id uuid default null,p_creative_id uuid default null,p_expected_updated_at timestamptz default null) returns boolean language plpgsql security invoker set search_path='' as $$
declare sale public.vendas%rowtype;closing public.fechamentos_diarios%rowtype;creative public.criativos_vendas%rowtype;removed uuid;
begin
 if auth.uid() is null then raise exception 'Entre novamente para remover o item';end if;
 select * into sale from public.vendas where id=p_sale_id for update;
 if not found then return false;end if;
 if p_expected_updated_at is not null and sale.updated_at is distinct from p_expected_updated_at then raise exception 'Este item foi alterado. Atualize a venda antes de remover.';end if;
 if p_closing_id is not null then
  select * into closing from public.fechamentos_diarios where id=p_closing_id for update;
  if found and closing.venda_id is distinct from p_sale_id then
   if closing.venda_id is not null or lower(trim(closing.cliente))<>lower(trim(sale.cliente)) or lower(trim(closing.vendedor))<>lower(trim(sale.vendedor)) or closing.data<>sale.data then raise exception 'O lançamento financeiro não está vinculado a este item. Revise antes de remover.';end if;
   if (select count(*) from public.vendas v where v.data=sale.data and lower(trim(v.cliente))=lower(trim(sale.cliente)) and lower(trim(v.vendedor))=lower(trim(sale.vendedor)) and coalesce(nullif(v.servico,''),v.produto)=coalesce(nullif(sale.servico,''),sale.produto))<>1 then raise exception 'Há lançamentos antigos ambíguos. Vincule o financeiro ao item antes de remover.';end if;
   if public.canonical_course_name(coalesce(closing.categoria,closing.produto_servico,''))<>public.canonical_course_name(coalesce(nullif(sale.servico,''),sale.produto,'')) then raise exception 'A categoria financeira não corresponde ao item';end if;
  end if;
  if closing.id is not null then
   delete from public.fechamentos_diarios where id=closing.id returning id into removed;
   if removed is null then raise exception 'Sem permissão para remover o financeiro deste item';end if;
  end if;
 end if;
 for closing in select * from public.fechamentos_diarios where venda_id=p_sale_id for update loop
  removed:=null;delete from public.fechamentos_diarios where id=closing.id returning id into removed;
  if removed is null then raise exception 'Sem permissão para remover o financeiro deste item';end if;
 end loop;
 if p_creative_id is not null then
  select * into creative from public.criativos_vendas where id=p_creative_id for update;
  if found then
   if creative.data<>sale.data or lower(trim(creative.nome_aluno))<>lower(trim(sale.cliente)) or creative.valor_curso<>sale.valor then raise exception 'O criativo não corresponde ao item';end if;
   if (select count(*) from public.vendas v where v.data=sale.data and lower(trim(v.cliente))=lower(trim(sale.cliente)) and v.valor=sale.valor)<>1 then raise exception 'O vínculo do criativo é ambíguo. Revise antes de remover.';end if;
   removed:=null;delete from public.criativos_vendas where id=creative.id returning id into removed;
   if removed is null then raise exception 'Sem permissão para remover o criativo deste item';end if;
  end if;
 end if;
 removed:=null;delete from public.vendas where id=p_sale_id returning id into removed;
 if removed is null then raise exception 'Sem permissão para remover este item';end if;
 return true;
end;$$;
revoke all on function public.delete_sale_item(uuid,uuid,uuid,timestamptz) from public,anon;
grant execute on function public.delete_sale_item(uuid,uuid,uuid,timestamptz) to authenticated;
select pg_notify('pgrst','reload schema');
commit;
