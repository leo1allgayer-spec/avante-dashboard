-- Giovani concluiu o curso de Google Ads. Corrige apenas o curso associado,
-- preservando os valores de sinal e saldo do cadastro.
update public.alunos_futuros
set
  curso = 'Curso Google Ads',
  itens = case
    when jsonb_typeof(itens) = 'array' then (
      select jsonb_agg(
        case
          when lower(trim(item->>'nome')) in ('curso meta ads', 'curso de meta ads')
            then jsonb_set(item, '{nome}', to_jsonb('Curso Google Ads'::text))
          else item
        end
      )
      from jsonb_array_elements(itens) as items(item)
    )
    else itens
  end,
  updated_at = now()
where cpf_limpo = '01069819000'
   or regexp_replace(coalesce(cpf, ''), '\D', '', 'g') = '01069819000';
