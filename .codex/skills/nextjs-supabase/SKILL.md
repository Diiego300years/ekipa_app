# Next.js Supabase Skill

Use this skill when working with authentication, database queries, server actions, route handlers, or Supabase integration.

## Rules

- Use TypeScript and existing App Router patterns.
- Keep database access secure.
- Use server-side Supabase session/cookies as the source of user identity.
- Never trust client-submitted user IDs for ownership or mutation identity.
- Do not expose secret keys to the browser.
- Do not add a service-role client unless explicitly planned, server-only, and justified.
- Use Supabase RLS policies and database constraints as the security backstop.
- Enforce one vote per user per idea at the database level.
- Link calendar events to ideas.
- Supabase migrations may need to be run manually in the Supabase SQL Editor.

## Environment Variables

Current variables:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

`NEXT_PUBLIC_SUPABASE_ANON_KEY` is a legacy fallback. `SUPABASE_SERVICE_ROLE_KEY` must stay server-only and is not used by default.

## Data Rules

- `ideas.created_by` should reference the authenticated user.
- `votes.user_id` should reference the authenticated user.
- `votes` should have a unique constraint for `(idea_id, user_id)`.
- Calendar events should reference ideas.
- Vote counts should be derived from vote data.
