# Definition Of Done

Before considering a task complete, verify the relevant items below.

## Documentation-Only Tasks

- Codex-facing instructions are written in English.
- Literal examples of visible UI copy remain Polish.
- Documentation agrees with `AGENTS.md` and `PROJECT_CONTEXT.md`.
- No app behavior or product feature implementation changed.

## Code Tasks

- The implementation matches `PROJECT_CONTEXT.md`.
- The code is simple and readable.
- There is no unnecessary abstraction.
- There is no dead code.
- No secrets are committed to the repository.
- Visible application UI text is Polish.

## TypeScript

Run the configured script when it exists:

```bash
npm run typecheck
```

Until that script exists, run:

```bash
npx tsc --noEmit
```

## Lint

Run:

```bash
npm run lint
```

## Build

Run:

```bash
npm run build
```

## E2E Tests

When Playwright is configured and the task affects user-facing behavior, run the relevant E2E tests.

Use the configured script when it exists:

```bash
npm run test:e2e
```

Until that script exists, run:

```bash
npx playwright test
```
