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
- Keep test names and descriptions in English.
- Assert visible UI text in Polish.

## Required Checks

Run the configured script when it exists:

```bash
npm run test:e2e
```

Until that script exists, run Playwright directly after Playwright is configured:

```bash
npx playwright test
```
