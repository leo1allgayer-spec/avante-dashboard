update public.fechamentos_diarios
set status = 'cancelado', updated_at = now()
where id in (
  '5736089d-3ee8-430f-81cf-3e40a08526a5',
  '9f880821-29b9-452c-99ca-1685ecd45b5c',
  '871c9ed0-16ac-4d8d-be36-2d59b76fa274',
  'a2889686-27b8-45be-9843-569ef1dbed8e',
  '31c211fc-631d-4bcd-94db-cecbc2bfa612',
  '253f845a-0bd4-4813-af21-4b24ba7d2144',
  '3dbcff45-1fe1-4895-9c9d-dd09375b0835'
);

update public.fechamentos_diarios
set valor_sinal = 0, valor_a_entrar = 1000, status = 'a receber', updated_at = now()
where id = '09de01d3-9447-478e-8773-2064a11ecba6';

update public.fechamentos_diarios
set valor_sinal = 2000, valor_a_entrar = 0, status = 'recebido', updated_at = now()
where id = '2f9ed5a6-9eb2-4a6b-8714-726fa992ff89';

update public.fechamentos_diarios
set valor_sinal = 0, valor_a_entrar = 2500, status = 'a receber', updated_at = now()
where id in (
  'e2a3ffb4-ae71-4acb-ab5a-ad3dbb7deafb',
  'a9e7bbba-6cb7-4f22-bc05-acef58701a14'
);

update public.vendas
set status = 'pendente', comissao = 0, updated_at = now()
where id in (
  'a79949dc-d65e-4111-8e9e-7b3c90bd9f20',
  '0764dd74-4720-4a53-a581-b3ca5c61be10',
  'f1b2eec2-3e55-48ac-994b-097b98d58850'
);

update public.vendas
set status = 'aprovada', comissao = 300, updated_at = now()
where id = 'a0a8d5b4-00d6-4391-8558-d744913c7b8f';
