# Playwright E2E Skill

Use this skill whenever you implement or verify user-facing functionality.

## Goal

Ensure the application actually works from the user's perspective.

## Rules

- Prefer E2E tests for critical flows.
- Add tests in `tests/e2e`.
- Use stable selectors such as `data-testid`.
- Do not rely on random timing.
- Use `await expect(...)` instead of manual sleeps.
- Test mobile viewport for mobile-specific UX.
- Keep test names and technical text in English.
- Assert visible UI text in Polish.
- Keep `.env.local` and real credentials out of commits.

## Required Checks

E2E:

```bash
npm run test:e2e
```

Performance diagnostics:

```bash
npm run test:perf
```

Use `PLAYWRIGHT_BASE_URL` to target an existing app. Use `PERF_DEBUG=true` when server-side Supabase timing logs are needed.
