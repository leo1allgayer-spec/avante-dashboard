begin;
alter table public.meetings add column if not exists client_phone text;
alter table public.meetings add column if not exists notify_client boolean not null default true;
comment on column public.meetings.client_phone is 'WhatsApp do cliente para esta reunião; vazio utiliza telefone do cadastro quando o nome identifica um único cliente.';
comment on column public.meetings.notify_client is 'Enviar lembrete ao cliente uma hora antes da reunião.';
commit;
select column_name from information_schema.columns where table_schema = 'public' and table_name = 'meetings' and column_name in ('client_phone','notify_client');
