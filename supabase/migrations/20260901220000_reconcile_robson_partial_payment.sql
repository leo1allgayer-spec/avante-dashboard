create table if not exists public.financial_reconciliation_audit (
  id uuid primary key default gen_random_uuid(), reason text not null, client_name text not null,
  snapshot jsonb not null, created_at timestamptz not null default now()
);
alter table public.financial_reconciliation_audit enable row level security;
drop policy if exists "Authenticated can view financial reconciliation audit" on public.financial_reconciliation_audit;
create policy "Authenticated can view financial reconciliation audit" on public.financial_reconciliation_audit for select to authenticated using (true);
do $$
declare primary_sale uuid; primary_closing uuid; student_id uuid; student_item text;
total_value numeric; collected_value numeric; collected_net numeric;
begin
 select max(greatest(coalesce(valor,0),0)) into total_value from public.vendas
 where lower(trim(cliente))='robson morais'
 and trim(regexp_replace(' '||lower(trim(regexp_replace(coalesce(nullif(produto,''),servico),'\s+',' ','g')))||' ','\s+de\s+',' ','g'))='curso meta ads'
 and lower(coalesce(status,''))<>'cancelada';
 if total_value is null then return; end if;
 select id into primary_sale from public.vendas where lower(trim(cliente))='robson morais'
 and trim(regexp_replace(' '||lower(trim(regexp_replace(coalesce(nullif(produto,''),servico),'\s+',' ','g')))||' ','\s+de\s+',' ','g'))='curso meta ads'
 and lower(coalesce(status,''))<>'cancelada'
 order by ((nullif(trim(coalesce(origem,'')),'') is not null and lower(origem)<>'cadastro do aluno')::int+
 (nullif(trim(coalesce(pagamento,'')),'') is not null and lower(pagamento)<>'a definir')::int+
 (nullif(trim(coalesce(vendedor,'')),'') is not null and lower(vendedor)<>'a preencher')::int) desc,updated_at desc limit 1;
 select aluno_futuro_id,aluno_futuro_item into student_id,student_item from public.vendas
 where lower(trim(cliente))='robson morais' and aluno_futuro_id is not null order by updated_at desc limit 1;
 select max(greatest(coalesce(valor_sinal,0),0)),max(greatest(coalesce(valor_sinal_liquido,valor_sinal,0),0))
 into collected_value,collected_net from public.fechamentos_diarios
 where lower(trim(cliente))='robson morais' and lower(coalesce(status,''))<>'cancelado'
 and trim(regexp_replace(' '||lower(trim(regexp_replace(coalesce(nullif(categoria,''),produto_servico),'\s+',' ','g')))||' ','\s+de\s+',' ','g'))='curso meta ads';
 collected_value:=least(coalesce(collected_value,0),total_value);
 collected_net:=least(coalesce(collected_net,collected_value),collected_value);
 insert into public.financial_reconciliation_audit(reason,client_name,snapshot)
 select 'Consolidacao de pagamento parcial duplicado','Robson Morais',jsonb_build_object(
 'sales',(select coalesce(jsonb_agg(to_jsonb(v)),'[]'::jsonb) from public.vendas v where lower(trim(v.cliente))='robson morais'),
 'closings',(select coalesce(jsonb_agg(to_jsonb(f)),'[]'::jsonb) from public.fechamentos_diarios f where lower(trim(f.cliente))='robson morais'));
 update public.vendas set aluno_futuro_id=null,aluno_futuro_item=null where id<>primary_sale
 and lower(trim(cliente))='robson morais'
 and trim(regexp_replace(' '||lower(trim(regexp_replace(coalesce(nullif(produto,''),servico),'\s+',' ','g')))||' ','\s+de\s+',' ','g'))='curso meta ads';
 if student_id is not null then update public.vendas set aluno_futuro_id=student_id,
 aluno_futuro_item=coalesce(nullif(student_item,''),'curso de meta ads') where id=primary_sale; end if;
 select id into primary_closing from public.fechamentos_diarios where lower(trim(cliente))='robson morais'
 and lower(coalesce(status,''))<>'cancelado'
 and trim(regexp_replace(' '||lower(trim(regexp_replace(coalesce(nullif(categoria,''),produto_servico),'\s+',' ','g')))||' ','\s+de\s+',' ','g'))='curso meta ads'
 order by valor_sinal desc,updated_at desc limit 1;
 if primary_closing is not null then
  update public.fechamentos_diarios set venda_id=null where venda_id=primary_sale and id<>primary_closing;
  update public.fechamentos_diarios set venda_id=primary_sale,valor_sinal=collected_value,
  valor_sinal_liquido=collected_net,valor_a_entrar=greatest(total_value-collected_value,0),
  status=case when total_value-collected_value<=0 then 'recebido' else 'a receber' end,updated_at=now()
  where id=primary_closing;
  update public.fechamentos_diarios set status='cancelado',venda_id=null,updated_at=now() where id<>primary_closing and lower(trim(cliente))='robson morais'
  and lower(coalesce(status,''))<>'cancelado'
  and trim(regexp_replace(' '||lower(trim(regexp_replace(coalesce(nullif(categoria,''),produto_servico),'\s+',' ','g')))||' ','\s+de\s+',' ','g'))='curso meta ads';
 end if;
 update public.vendas set status='cancelada',updated_at=now() where id<>primary_sale and lower(trim(cliente))='robson morais'
 and trim(regexp_replace(' '||lower(trim(regexp_replace(coalesce(nullif(produto,''),servico),'\s+',' ','g')))||' ','\s+de\s+',' ','g'))='curso meta ads';
 update public.vendas set valor=total_value,comissao=round(collected_net*
 case when lower(coalesce(origem,''))='social seller' then 0.10 else 0.15 end,2),
 status=case when total_value-collected_value<=0 then 'pago' else 'pendente' end,updated_at=now()
 where id=primary_sale;
end; $$;
select pg_notify('pgrst','reload schema');
