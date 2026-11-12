begin;
create or replace function public.route_meeting_away_from_closer()
returns trigger language plpgsql set search_path='' as $$
begin
 if new.agenda_category='reunioes' and btrim(coalesce(new.responsible,''))<>''
 and lower(regexp_replace(btrim(new.responsible),'\s+',' ','g'))<>'leonardo webster' then
  new.agenda_category := 'geral';
 end if;
 return new;
end;
$$;
drop trigger if exists route_non_closer_meeting on public.meetings;
create trigger route_non_closer_meeting before insert or update of responsible,agenda_category
on public.meetings for each row execute function public.route_meeting_away_from_closer();
update public.meetings set agenda_category='geral'
where id='359b4020-71db-4af0-b3ac-09a52897b945' and responsible='Emanoel Bull' and agenda_category='reunioes';
commit;
