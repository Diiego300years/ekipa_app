-- Votes persistence for the MVP.
-- Run this in the Supabase SQL Editor if migrations are not applied automatically.
-- Vote counts are intentionally derived from public.votes rows in application code.
-- Do not add vote-count triggers, cache tables, views, or RPCs for this phase.

create extension if not exists pgcrypto;

create table if not exists public.votes (
  id uuid primary key default gen_random_uuid(),
  idea_id uuid not null references public.ideas(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint votes_idea_user_unique unique (idea_id, user_id)
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'votes_idea_user_unique'
      and conrelid = 'public.votes'::regclass
  ) then
    alter table public.votes
      add constraint votes_idea_user_unique
      unique (idea_id, user_id);
  end if;
end $$;

create index if not exists votes_idea_id_idx
on public.votes (idea_id);

create index if not exists votes_user_id_idx
on public.votes (user_id);

alter table public.votes enable row level security;

grant usage on schema public to anon, authenticated;

revoke all on public.votes from anon, authenticated;
grant select (idea_id) on public.votes to anon;
grant select (id, idea_id, user_id, created_at) on public.votes to authenticated;
grant insert, delete on public.votes to authenticated;

drop policy if exists "Everyone can read votes for counts" on public.votes;
create policy "Everyone can read votes for counts"
on public.votes
for select
to anon, authenticated
using (true);

drop policy if exists "Authenticated users can create their own votes" on public.votes;
create policy "Authenticated users can create their own votes"
on public.votes
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Authenticated users can delete their own votes" on public.votes;
create policy "Authenticated users can delete their own votes"
on public.votes
for delete
to authenticated
using ((select auth.uid()) = user_id);
