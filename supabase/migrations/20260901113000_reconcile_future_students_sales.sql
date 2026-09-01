update public.alunos_futuros
set itens = case
  when jsonb_array_length(coalesce(itens, '[]'::jsonb)) = 0
       and nullif(trim(coalesce(curso, '')), '') is not null
    then jsonb_build_array(jsonb_build_object(
      'tipo', 'curso',
      'nome', trim(curso),
      'valor_sinal', greatest(coalesce(valor_sinal, 0), 0),
      'valor_pendente', 0,
      'data', created_at
    ))
  else itens
end,
updated_at = now()
where jsonb_array_length(coalesce(itens, '[]'::jsonb)) > 0
   or nullif(trim(coalesce(curso, '')), '') is not null;

select pg_notify('pgrst', 'reload schema');