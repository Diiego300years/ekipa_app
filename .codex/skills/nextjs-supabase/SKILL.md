# Next.js Supabase Skill

Use this skill when working with authentication, database queries, server actions, route handlers, or Supabase integration.

## Rules

- Use TypeScript.
- Keep database access secure.
- Do not expose the service role key to the browser.
- Use `NEXT_PUBLIC_` only for public Supabase keys.
- Use Supabase RLS policies where needed.
- Validate user identity before mutations.
- Enforce one vote per user per idea at the database level where possible.
- Link calendar events to ideas.

## Environment Variables

Expected variables:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

## Data Rules

- `ideas.created_by` should reference the authenticated user.
- `votes.user_id` should reference the authenticated user.
- `votes` should have a unique constraint for `(idea_id, user_id)`.
- Calendar events should reference ideas.
- Vote counts should be derived from vote data.
