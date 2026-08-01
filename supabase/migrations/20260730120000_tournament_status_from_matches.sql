-- Tournament status comes from the Liquipedia dates on every scrape, which is
-- only a guess. Once matches exist they are the better signal, so this sweep
-- closes out tournaments whose matches are all done. The trigger stops the next
-- date-derived upsert from re-opening them.

create or replace function public.refresh_tournament_status()
returns integer
language sql
set search_path = public
as $$
    with updated as (
        update tournaments t
        set status = 'finished'
        where t.status <> 'finished'
          and t.end_date < now() - interval '1 day'
          and exists (
              select 1 from matches m where m.tournament_id = t.id
          )
          and exists (
              select 1 from matches m
              where m.tournament_id = t.id
                and m.date::date >= t.end_date::date
          )
          and not exists (
              select 1 from matches m
              where m.tournament_id = t.id
                and m.status <> 'finished'
          )
        returning 1
    )
    select count(*)::int from updated;
$$;

revoke execute on function public.refresh_tournament_status() from public, anon, authenticated;

create or replace function public.keep_tournament_finished()
returns trigger
language plpgsql
set search_path = public
as $$
begin
    if old.status = 'finished' and new.status <> 'finished' then
        new.status := 'finished';
    end if;
    return new;
end;
$$;

drop trigger if exists tournaments_keep_finished on public.tournaments;

create trigger tournaments_keep_finished
    before update on public.tournaments
    for each row
    execute function public.keep_tournament_finished();
