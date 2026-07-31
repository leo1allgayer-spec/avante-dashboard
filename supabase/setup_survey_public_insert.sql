alter table public.survey_responses enable row level security;

drop policy if exists "Public can submit survey responses" on public.survey_responses;
drop policy if exists "Authenticated can view survey responses" on public.survey_responses;
drop policy if exists "Authenticated can manage survey responses" on public.survey_responses;

create policy "Public can submit survey responses"
on public.survey_responses
for insert
to anon
with check (true);

create policy "Authenticated can view survey responses"
on public.survey_responses
for select
to authenticated
using (true);

create policy "Authenticated can manage survey responses"
on public.survey_responses
for all
to authenticated
using (true)
with check (true);

select pg_notify('pgrst', 'reload schema');
