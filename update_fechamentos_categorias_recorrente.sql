alter table public.fechamentos_diarios
  add column if not exists categoria text,
  add column if not exists valor_recorrente numeric not null default 0,
  add column if not exists parcelas_total integer,
  add column if not exists valor_parcela numeric not null default 0;

update public.fechamentos_diarios
set categoria = coalesce(nullif(categoria, ''), nullif(produto_servico, ''), 'Sem categoria')
where categoria is null or categoria = '';

update public.fechamentos_diarios
set status = 'a receber'
where status = 'para entrar';

select pg_notify('pgrst', 'reload schema');
