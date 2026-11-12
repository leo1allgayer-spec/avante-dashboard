begin;
create or replace function public.route_meeting_away_from_closer()
returns trigger language plpgsql set search_path='' as $$
begin
 if new.agenda_category in ('geral','reunioes') then
  new.agenda_category := case when lower(regexp_replace(btrim(coalesce(new.responsible,'')),'\s+',' ','g'))='leonardo webster' and new.meeting_type='reuniao_vendas' then 'reunioes' else 'geral' end;
 end if;
 return new;
end;
$$;
drop trigger if exists route_non_closer_meeting on public.meetings;
create trigger route_non_closer_meeting before insert or update of responsible,agenda_category,meeting_type
on public.meetings for each row execute function public.route_meeting_away_from_closer();
update public.meetings set agenda_category=agenda_category where agenda_category in ('geral','reunioes');
commit;
