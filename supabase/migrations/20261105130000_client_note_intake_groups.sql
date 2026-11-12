begin;
alter table public.client_contract_notes add column is_new_contract boolean not null default false;
alter table public.client_contract_notes alter column is_new_contract set default true;
update public.client_contract_notes set is_new_contract=true where id in (
 '69dac5c2-50be-4cbe-b561-4f816c182dbc','38cf162f-e908-410a-be5e-c804a67f1eb4','0e58e752-2458-43d7-a9d5-d2c1284b6f86'
);
commit;
