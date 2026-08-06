alter table public.course_bookings
  add column if not exists updated_at timestamptz not null default now();
