create table if not exists public.course_reschedule_requests (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.course_bookings(id) on delete cascade,
  course_name text not null,
  date date not null,
  time text not null,
  student_name text not null,
  email text not null,
  phone text not null,
  instagram text default '',
  certificate_name text default '',
  token uuid not null default gen_random_uuid() unique,
  status text not null default 'pending',
  expires_at timestamptz not null default (now() + interval '2 hours'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.course_reschedule_requests enable row level security;

create or replace function public.confirm_public_course_reschedule(p_token uuid)
returns table (
  success boolean,
  message text,
  booking_id uuid,
  student_name text,
  course_name text,
  course_date date,
  course_time text,
  course_status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.course_reschedule_requests%rowtype;
begin
  select *
  into v_request
  from public.course_reschedule_requests
  where token = p_token
    and status = 'pending'
    and expires_at > now()
  order by created_at desc
  limit 1
  for update;

  if not found then
    return query select
      false,
      'Link de remarcação inválido ou expirado.'::text,
      null::uuid,
      null::text,
      null::text,
      null::date,
      null::text,
      null::text;
    return;
  end if;

  update public.course_bookings
  set
    student_name = v_request.student_name,
    course_name = v_request.course_name,
    date = v_request.date,
    time = v_request.time,
    email = lower(trim(v_request.email)),
    phone = regexp_replace(v_request.phone, '\D', '', 'g'),
    instagram = nullif(trim(v_request.instagram), ''),
    certificate_name = coalesce(nullif(trim(v_request.certificate_name), ''), v_request.student_name),
    status = 'confirmed',
    course_status = 'confirmado'
  where id = v_request.booking_id;

  update public.whatsapp_scheduled_messages
  set status = 'cancelled',
      updated_at = now()
  where booking_id = v_request.booking_id
    and status = 'pending'
    and message_type in ('reminder_24h', 'reminder_1h', 'post_course');

  update public.course_reschedule_requests
  set status = 'confirmed',
      updated_at = now()
  where id = v_request.id;

  return query select
    true,
    'Sua remarcação foi confirmada com sucesso.'::text,
    v_request.booking_id,
    v_request.student_name,
    v_request.course_name,
    v_request.date,
    v_request.time,
    'confirmado'::text;
end;
$$;

grant execute on function public.confirm_public_course_reschedule(uuid) to anon, authenticated;

select pg_notify('pgrst', 'reload schema');
