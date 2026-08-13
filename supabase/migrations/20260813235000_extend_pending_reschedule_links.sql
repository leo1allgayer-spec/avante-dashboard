update public.course_reschedule_requests
set expires_at = greatest(expires_at, created_at + interval '24 hours'),
    updated_at = now()
where status = 'pending'
  and created_at > now() - interval '24 hours';
