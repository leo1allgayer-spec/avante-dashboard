-- Mantém uma única venda do Giovani e corrige o curso da venda original.
delete from public.vendas
where id in (
  '3ad6eb36-dc27-4c2a-a624-d37e9ba3e8ee',
  '0e3d6be4-8e4b-453d-94bc-d999df3f707a'
);

update public.vendas
set produto = 'Curso Google Ads',
    aluno_futuro_item = 'curso google ads',
    updated_at = now()
where id = '49eeee6c-737c-42f8-8a39-9799fd2ba148';
