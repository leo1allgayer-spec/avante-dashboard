-- Novos agendamentos ficam aguardando a confirmação feita pelo aluno no link
-- enviado com o lembrete de 24 horas.
alter table public.course_bookings
  alter column course_status set default 'a confirmar';

-- Corrige agendamentos futuros legados que nasceram confirmados, mas ainda não
-- receberam a mensagem de 24 horas que contém o link de confirmação.
update public.course_bookings as booking
set course_status = 'a confirmar',
    updated_at = now()
where booking.date >= (now() at time zone 'America/Sao_Paulo')::date
  and booking.status = 'confirmed'
  and coalesce(booking.course_status, '') = 'confirmado'
  and not exists (
    select 1
    from public.whatsapp_message_logs as message
    where message.booking_id = booking.id
      and message.message_type = 'reminder_24h'
      and message.status in ('sent', 'delivered', 'read')
  );

-- Garante o estado correto mesmo se algum fluxo antigo inserir nulo ou vazio.
create or replace function public.ensure_pending_course_confirmation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if nullif(trim(coalesce(new.course_status, '')), '') is null then
    new.course_status := 'a confirmar';
  end if;
  return new;
end;
$$;

drop trigger if exists ensure_pending_course_confirmation_on_insert on public.course_bookings;
create trigger ensure_pending_course_confirmation_on_insert
before insert on public.course_bookings
for each row execute function public.ensure_pending_course_confirmation();

select pg_notify('pgrst', 'reload schema');
