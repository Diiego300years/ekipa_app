# AGENTS.md

## Read First

- Read `PROJECT_CONTEXT.md` and this file before changing the project.
- Keep changes small, practical, and aligned with the existing app.
- Documentation-only tasks must not change app behavior, tests, schema, or features.

## Global Rules

- Use the current stack: Next.js App Router, React, TypeScript, Tailwind CSS, Supabase Auth, Supabase PostgreSQL with RLS, Vercel, and Playwright.
- Do not introduce a different backend or auth system unless explicitly requested.
- Repository instructions, technical docs, tests, identifiers, filenames, variables, and comments stay in English.
- Visible app UI stays in Polish, including E2E assertions for literal UI text.
- Main mobile navigation labels are `Pomysły`, `Głosowanie`, `Kalendarz`, and `Dodaj`.
- Build mobile-first; touch interactions must be comfortable.

## Supabase Safety

- Never commit `.env.local` or real secrets.
- Only `NEXT_PUBLIC_` variables may be read by browser code.
- Current public Supabase env vars are `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`; `NEXT_PUBLIC_SUPABASE_ANON_KEY` is a legacy fallback.
- Do not add a service-role client unless explicitly planned, server-only, and justified.
- User identity for mutations must come from the server-side Supabase session/cookies, never from client-provided user IDs.
- Keep RLS policies and database constraints as the security backstop.
- Supabase migrations may need to be run manually in the Supabase SQL Editor.

## Commands

```bash
npm run dev
npm run lint
npm run typecheck
npm run build
npm run test:e2e
npm run test:perf
npm run start
```

Performance diagnostics:

- `npm run test:perf` runs Playwright performance diagnostics.
- `PLAYWRIGHT_BASE_URL` targets an existing local or deployed app.
- `PERF_DEBUG=true` enables server-side Supabase timing logs.

Run checks relevant to the task. For documentation-only changes, review the edited docs instead of running app test suites unless a referenced command looks broken.
