do $$
declare r record;
begin
  for r in
    select 'VENDA'::text as tipo, id, aluno_futuro_id as vinculo, valor as coletado, null::numeric as pendente, status, produto as item, vendedor
    from public.vendas where lower(trim(cliente)) = 'robson morais'
    union all
    select 'FECHAMENTO', id, venda_id, valor_sinal, valor_a_entrar, status, coalesce(nullif(categoria, ''), produto_servico), vendedor
    from public.fechamentos_diarios where lower(trim(cliente)) = 'robson morais'
  loop
    raise notice 'ROBSON_DIAG tipo=% id=% vinculo=% coletado=% pendente=% status=% item=% vendedor=%', r.tipo, r.id, r.vinculo, r.coletado, r.pendente, r.status, r.item, r.vendedor;
  end loop;
end;
$$;