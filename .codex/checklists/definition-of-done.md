# Definition Of Done

Use the relevant checks for the task.

## Documentation

- Codex-facing docs are concise, practical, and English.
- Literal visible UI examples remain Polish.
- Docs agree with `AGENTS.md` and `PROJECT_CONTEXT.md`.
- No app code, tests, schema, or behavior changed.

## Code

- Implementation matches `PROJECT_CONTEXT.md`.
- Code is simple, typed, and scoped to the task.
- Visible app UI is Polish.
- `.env.local` and secrets are not committed.
- Supabase mutations use server-side session/cookie identity, not client user IDs.
- No service-role client is added unless explicitly planned and server-only.
- Required migrations are documented; they may need manual Supabase SQL Editor execution.

## Checks

```bash
npm run lint
npm run typecheck
npm run build
```

Run Playwright when user-facing behavior changes:

```bash
npm run test:e2e
```

Run performance diagnostics when performance is relevant:

```bash
npm run test:perf
```

Use `PLAYWRIGHT_BASE_URL` to target an existing app and `PERF_DEBUG=true` for server-side Supabase timing logs.
