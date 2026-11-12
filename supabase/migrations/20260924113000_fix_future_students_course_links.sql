-- Corrige o curso do Rafael para coincidir com o formulário respondido.
update public.alunos_futuros
set curso = 'Curso Meta Ads',
    itens = (
      select jsonb_agg(jsonb_set(item, '{nome}', to_jsonb('Curso Meta Ads'::text)))
      from jsonb_array_elements(itens) as items(item)
    ),
    updated_at = now()
where cpf_limpo = '83277684091';

-- Remove o item duplicado da Alana e preserva o primeiro lançamento com saldo pendente.
update public.alunos_futuros
set itens = (
      select jsonb_agg(item order by (item->>'data'))
      from jsonb_array_elements(itens) as items(item)
      where coalesce(item->>'valor_pendente', '0')::numeric > 0
         or item = (select first_items.item from jsonb_array_elements(itens) as first_items(item) order by item->>'data' limit 1)
    ),
    curso = 'Curso Meta Ads',
    valor_sinal = 250,
    updated_at = now()
where cpf_limpo = '02984267060';
