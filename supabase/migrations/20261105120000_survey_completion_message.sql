begin;
create table public.survey_completion_messages (
 survey_id uuid primary key references public.survey_responses(id) on delete cascade,
 status text not null default 'pending' check(status in ('pending','processing','sent','error')),
 last_error text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.survey_completion_messages enable row level security;
revoke all on public.survey_completion_messages from anon,authenticated;
grant all on public.survey_completion_messages to service_role;
create or replace function public.enqueue_survey_completion_message() returns trigger
language plpgsql security definer set search_path='' as $$
declare scheduler_command text;
begin
 insert into public.survey_completion_messages(survey_id) values(new.id) on conflict do nothing;
 -- Reuse the configured, authenticated scheduler invocation. pg_net sends only
 -- after the survey transaction commits; the regular cron remains a fallback.
 begin
  select command into scheduler_command from cron.job where jobname='whatsapp-scheduler-every-5-minutes' and active;
  if scheduler_command is not null then execute scheduler_command; end if;
 exception when others then
  raise warning 'Completion message queued; immediate scheduler unavailable';
 end;
 return new;
end $$;
revoke all on function public.enqueue_survey_completion_message() from public,anon,authenticated;
create trigger survey_completion_message_after_submit after insert on public.survey_responses
for each row execute function public.enqueue_survey_completion_message();
commit;
