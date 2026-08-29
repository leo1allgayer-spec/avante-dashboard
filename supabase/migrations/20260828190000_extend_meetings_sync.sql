alter table public.meetings
  add column if not exists service text not null default '',
  add column if not exists external_id text;

create unique index if not exists meetings_external_id_unique
  on public.meetings (external_id)
  where external_id is not null;