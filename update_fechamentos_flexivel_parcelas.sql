alter table public.fechamentos_diarios
  add column if not exists parcelas_datas jsonb not null default '[]'::jsonb;

alter table public.fechamentos_diarios
  alter column cliente set default '',
  alter column vendedor set default '',
  alter column produto_servico set default '',
  alter column cliente drop not null,
  alter column vendedor drop not null,
  alter column produto_servico drop not null;

select pg_notify('pgrst', 'reload schema');
