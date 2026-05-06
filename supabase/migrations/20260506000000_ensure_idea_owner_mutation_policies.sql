-- Ensure idea owners can update and delete their own ideas through RLS.
-- Run this in the Supabase SQL Editor if an existing database predates
-- the owner edit/delete policies from the original ideas migration.

alter table public.ideas enable row level security;

grant update, delete on public.ideas to authenticated;

drop policy if exists "Authors can update their own ideas" on public.ideas;
create policy "Authors can update their own ideas"
on public.ideas
for update
to authenticated
using ((select auth.uid()) = created_by)
with check ((select auth.uid()) = created_by);

drop policy if exists "Authors can delete their own ideas" on public.ideas;
create policy "Authors can delete their own ideas"
on public.ideas
for delete
to authenticated
using ((select auth.uid()) = created_by);
