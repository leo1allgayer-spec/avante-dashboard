begin;
create or replace function public.route_meeting_away_from_closer()
returns trigger language plpgsql set search_path='' as $$
begin
 if new.agenda_category in ('geral','reunioes') then
  new.agenda_category := case when lower(regexp_replace(btrim(coalesce(new.responsible,'')),'\s+',' ','g'))='leonardo webster'
  and (new.meeting_type='reuniao_vendas' or (nullif(btrim(new.external_id),'') is not null and coalesce(new.meeting_type,'reuniao') in ('reuniao','reuniao_vendas','reuniao_cliente')))
  then 'reunioes' else 'geral' end;
 end if;
 return new;
end;
$$;
drop trigger if exists route_non_closer_meeting on public.meetings;
create trigger route_non_closer_meeting before insert or update of responsible,agenda_category,meeting_type,external_id
on public.meetings for each row execute function public.route_meeting_away_from_closer();
update public.meetings set agenda_category=agenda_category where agenda_category in ('geral','reunioes') and nullif(btrim(external_id),'') is not null;
commit;
