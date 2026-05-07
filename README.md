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
npm run typecheck
npm run build
npm run start
npm run test:e2e
npm run test:perf
```

## Performance Diagnostics

`npm run test:perf` runs Playwright performance diagnostics separately from
normal E2E tests. Without `PLAYWRIGHT_BASE_URL`, the performance config may
start a local development server on `http://127.0.0.1:3000`.

For local production-mode performance testing, use two terminals:

```bash
npm run build && npm run start
```

```bash
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000 npm run test:perf
```

When `PLAYWRIGHT_BASE_URL` is provided, performance tests target that existing
server and do not start the local development server fallback.

## Checks

```bash
npm run typecheck
npm run lint
npm run test:e2e
npm run build
```

## Development Notes

Read `AGENTS.md` and `PROJECT_CONTEXT.md` before implementing product changes.

Do not implement advanced PWA or push-notification features before the core MVP works unless the current task explicitly asks for them.
