-- Calendar events persistence for the MVP.
-- Run this in the Supabase SQL Editor if migrations are not applied automatically.
-- Calendar events are linked to ideas and scheduled by authenticated users.
-- Do not add service-role access, drag-and-drop support, or notification logic here.

create extension if not exists pgcrypto;

create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  idea_id uuid not null references public.ideas(id) on delete cascade,
  scheduled_by uuid not null references auth.users(id) on delete cascade,
  start_at timestamptz not null,
  end_at timestamptz,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint calendar_events_start_at_finite check (isfinite(start_at)),
  constraint calendar_events_end_after_start check (
    end_at is null or end_at > start_at
  ),
  constraint calendar_events_note_max_length check (
    note is null or char_length(note) <= 500
  )
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'calendar_events_start_at_finite'
      and conrelid = 'public.calendar_events'::regclass
  ) then
    alter table public.calendar_events
      add constraint calendar_events_start_at_finite
      check (isfinite(start_at));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'calendar_events_end_after_start'
      and conrelid = 'public.calendar_events'::regclass
  ) then
    alter table public.calendar_events
      add constraint calendar_events_end_after_start
      check (end_at is null or end_at > start_at);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'calendar_events_note_max_length'
      and conrelid = 'public.calendar_events'::regclass
  ) then
    alter table public.calendar_events
      add constraint calendar_events_note_max_length
      check (note is null or char_length(note) <= 500);
  end if;
end $$;

create index if not exists calendar_events_start_at_idx
on public.calendar_events (start_at asc);

create index if not exists calendar_events_idea_id_idx
on public.calendar_events (idea_id);

create index if not exists calendar_events_scheduled_by_idx
on public.calendar_events (scheduled_by);

alter table public.calendar_events enable row level security;

grant usage on schema public to anon, authenticated;

revoke all on public.calendar_events from anon, authenticated;
grant select on public.calendar_events to anon, authenticated;
grant insert, update, delete on public.calendar_events to authenticated;

drop policy if exists "Everyone can read calendar events" on public.calendar_events;
create policy "Everyone can read calendar events"
on public.calendar_events
for select
to anon, authenticated
using (true);

drop policy if exists "Authenticated users can create calendar events" on public.calendar_events;
create policy "Authenticated users can create calendar events"
on public.calendar_events
for insert
to authenticated
with check ((select auth.uid()) = scheduled_by);

drop policy if exists "Schedulers can update their own calendar events" on public.calendar_events;
create policy "Schedulers can update their own calendar events"
on public.calendar_events
for update
to authenticated
using ((select auth.uid()) = scheduled_by)
with check ((select auth.uid()) = scheduled_by);

drop policy if exists "Schedulers can delete their own calendar events" on public.calendar_events;
create policy "Schedulers can delete their own calendar events"
on public.calendar_events
for delete
to authenticated
using ((select auth.uid()) = scheduled_by);

create or replace function public.set_calendar_event_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_calendar_events_updated_at on public.calendar_events;
create trigger set_calendar_events_updated_at
before update on public.calendar_events
for each row
execute function public.set_calendar_event_updated_at();
