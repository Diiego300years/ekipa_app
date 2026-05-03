# Fix Failing Tests

Find and fix failing tests.

Read:

- `AGENTS.md`
- `PROJECT_CONTEXT.md`

Rules:

- Do not delete tests just to make the suite pass.
- Understand the intended behavior first.
- Fix the implementation, or update the test only if the test is outdated.
- Keep test names, descriptions, and technical comments in English.
- Keep visible UI text expectations in Polish.
- Do not translate the application UI to English to satisfy a test.
- Run the relevant test after fixing.
- Then run the full E2E suite when Playwright is configured.
