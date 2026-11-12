-- Felipe Raupp concluiu Social Media e respondeu o formulário desse curso.
-- Atualiza somente o curso associado, preservando os dados financeiros.
update public.alunos_futuros
set
  curso = 'Curso de Social Media',
  itens = case
    when jsonb_typeof(itens) = 'array' then (
      select jsonb_agg(
        case
          when lower(trim(item->>'nome')) in ('curso meta ads', 'curso de meta ads')
            then jsonb_set(item, '{nome}', to_jsonb('Curso de Social Media'::text))
          else item
        end
      )
      from jsonb_array_elements(itens) as items(item)
    )
    else itens
  end,
  updated_at = now()
where cpf_limpo = '82304750087'
   or regexp_replace(coalesce(cpf, ''), '\\D', '', 'g') = '82304750087';
