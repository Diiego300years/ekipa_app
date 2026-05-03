# Calendar PWA

A mobile-first calendar PWA for a small private group. The app helps users add ideas, vote on them, rank them, and schedule selected ideas in a shared calendar.

## Product Direction

- Build a simple MVP first.
- Prioritize mobile usability.
- Keep the visible application UI in Polish.
- Keep repository instructions, technical documentation, tests, identifiers, and comments in English.
- Use Supabase for authentication, database storage, and user identity.
- Deploy on Vercel.

## Tech Stack

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- Supabase Auth
- Supabase PostgreSQL
- Playwright for E2E tests

## Current Scripts

```bash
npm run dev
npm run lint
npm run build
npm run start
```

## Planned Checks

The project documentation expects these checks once the related scripts and tools are configured:

```bash
npm run typecheck
npm run test:e2e
```

Until a `typecheck` script exists, use:

```bash
npx tsc --noEmit
```

Until a `test:e2e` script exists, use Playwright directly after Playwright is configured:

```bash
npx playwright test
```

## Development Notes

Read `AGENTS.md` and `PROJECT_CONTEXT.md` before implementing product changes.

Do not implement advanced PWA or push-notification features before the core MVP works unless the current task explicitly asks for them.
