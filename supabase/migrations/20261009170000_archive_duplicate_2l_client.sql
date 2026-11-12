-- Preserve the duplicate and its history; archive it from operational client lists.
update public.gestao_clients
set notes = coalesce(notes, '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
  'id', '__duplicate_of__', 'date', '2026-10-09',
  'text', '137e95d3-1351-4b68-888c-558cee3ae7fd'
))
where id = '032a40dd-2ff6-421c-a986-c40a9343e906'
  and name = '2L REBOQUES' and status = 'Pausado' and contract_value = 0
  and not exists(select 1 from jsonb_array_elements(coalesce(notes,'[]'::jsonb)) n where n->>'id'='__duplicate_of__');
