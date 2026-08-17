create table if not exists public.course_enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_type text not null,
  student_name text not null,
  contact text not null default '',
  email text not null default '',
  instagram text not null default '',
  date text not null default '',
  time text not null default '',
  created_at timestamptz not null default now()
);

create unique index if not exists course_enrollments_student_course_schedule_key
  on public.course_enrollments (student_name, course_type, date, time);

alter table public.course_enrollments enable row level security;

drop policy if exists "Users can read own course enrollments" on public.course_enrollments;
drop policy if exists "Users can insert own course enrollments" on public.course_enrollments;
drop policy if exists "Users can update own course enrollments" on public.course_enrollments;
drop policy if exists "Users can delete own course enrollments" on public.course_enrollments;

create policy "Users can read own course enrollments"
on public.course_enrollments for select to authenticated
using (auth.uid() = user_id);

create policy "Users can insert own course enrollments"
on public.course_enrollments for insert to authenticated
with check (auth.uid() = user_id);

create policy "Users can update own course enrollments"
on public.course_enrollments for update to authenticated
using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users can delete own course enrollments"
on public.course_enrollments for delete to authenticated
using (auth.uid() = user_id);

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'course_enrollments'
  ) then
    alter publication supabase_realtime add table public.course_enrollments;
  end if;
end $$;

select pg_notify('pgrst', 'reload schema');
