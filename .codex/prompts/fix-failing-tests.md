# Fix Failing Tests

Read `AGENTS.md` and `PROJECT_CONTEXT.md`, then find the real failure.

Rules:

- Do not delete tests just to make the suite pass.
- Understand the intended behavior first.
- Fix the implementation, or update the test only if the test is outdated.
- Keep test names and technical text English.
- Keep visible UI expectations Polish.
- Do not translate the application UI to English to satisfy a test.
- Use stable selectors and Playwright expectations instead of random waits.
- Run the smallest relevant test first, then broader checks if needed.

Useful commands:

```bash
npm run test:e2e
npm run test:perf
```

For performance diagnostics, `PLAYWRIGHT_BASE_URL` can target an existing app and `PERF_DEBUG=true` enables server-side Supabase timing logs.
