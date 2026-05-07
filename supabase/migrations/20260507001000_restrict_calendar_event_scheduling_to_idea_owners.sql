-- Restrict calendar event scheduling to idea owners while preserving public reads.
-- Safe to paste into the Supabase SQL Editor more than once.

alter table public.calendar_events enable row level security;

grant usage on schema public to anon, authenticated;
grant select on public.calendar_events to anon, authenticated;
grant insert, update, delete on public.calendar_events to authenticated;

do $$
begin
  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'calendar_events'
      and policyname = 'Everyone can read calendar events'
  ) then
    execute $policy$
      alter policy "Everyone can read calendar events"
      on public.calendar_events
      to anon, authenticated
      using (true)
    $policy$;
  else
    execute $policy$
      create policy "Everyone can read calendar events"
      on public.calendar_events
      for select
      to anon, authenticated
      using (true)
    $policy$;
  end if;
end $$;

drop policy if exists "Authenticated users can create calendar events" on public.calendar_events;
create policy "Authenticated users can create calendar events"
on public.calendar_events
for insert
to authenticated
with check (
  (select auth.uid()) = scheduled_by
  and exists (
    select 1
    from public.ideas
    where ideas.id = calendar_events.idea_id
      and ideas.created_by = (select auth.uid())
  )
);

drop policy if exists "Schedulers can update their own calendar events" on public.calendar_events;
create policy "Schedulers can update their own calendar events"
on public.calendar_events
for update
to authenticated
using (
  (select auth.uid()) = scheduled_by
  and exists (
    select 1
    from public.ideas
    where ideas.id = calendar_events.idea_id
      and ideas.created_by = (select auth.uid())
  )
)
with check (
  (select auth.uid()) = scheduled_by
  and exists (
    select 1
    from public.ideas
    where ideas.id = calendar_events.idea_id
      and ideas.created_by = (select auth.uid())
  )
);
