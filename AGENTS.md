# AGENTS.md

## Project Rules

This project is a mobile-first calendar PWA for a small private group of around 10 users.

Before making changes, read:

- `PROJECT_CONTEXT.md`
- this `AGENTS.md`

Build a simple, working MVP first. Keep solutions small and avoid unnecessary abstraction.

Documentation-only tasks must not change app behavior or implement product features.

---

## Source Of Truth

- `PROJECT_CONTEXT.md` describes the product goal and feature scope.
- `AGENTS.md` defines implementation rules for agents.
- `.codex/skills/*/SKILL.md` files provide task-specific guidance.
- `.codex/prompts/*` files should follow the same priorities and language rules as this file.
- `.codex/checklists/definition-of-done.md` defines completion checks.

When these files disagree, update the documentation before implementing features.

---

## Language Rules

All repository instructions, technical documentation, tests, test names, identifiers, filenames, function names, variable names, and code comments should be written in English.

The application UI must be written in Polish because the target users are Polish-speaking.

Use Polish only for user-facing copy, including:

- visible labels in the app UI
- button text
- form labels
- validation messages shown to users
- notification messages shown to users
- literal UI text asserted in E2E tests

Use Polish visible labels for the main mobile navigation:

- `Pomysły`
- `Głosowanie`
- `Kalendarz`
- `Dodaj`

---

## Tech Stack

Use:

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- Supabase Auth
- Supabase PostgreSQL
- Vercel deployment
- Playwright for E2E tests

Do not introduce another backend framework unless explicitly requested.

---

## Product Rules

Users must be able to:

- register and log in
- add ideas
- vote on ideas
- see idea rankings
- schedule ideas on a calendar
- add location and price to ideas

Each idea should have these core data fields:

- `title`
- `description`
- `location`
- `price`
- `created_by`
- `created_at`

Display-friendly fields such as author name, creation date, and vote count may be derived from related user and vote data.

Each user must be uniquely identifiable.

One user can vote only once per idea.

Calendar events must be linked to ideas.

---

## UX Rules

Design mobile-first. Mobile is the main target.

Use bottom navigation on mobile for these feature areas:

- ideas
- voting
- calendar
- add

The visible labels for those areas must be Polish, following the language rules above.

On desktop, drag and drop can be used for calendar scheduling.

On mobile, do not rely on drag and drop as the main interaction. Use tap/click plus a date/time form for scheduling.

Buttons, forms, and navigation must be comfortable for touch screens.

---

## PWA Rules

The app should be prepared for PWA support.

Implement the core MVP before advanced PWA features unless the current task explicitly asks for PWA work.

Target PWA features:

- installable PWA
- service worker
- push notifications
- notifications for new ideas
- notifications for new votes
- notifications for scheduled dates
- in-app unread indicators

Do not rely only on the app icon badge because platform support is inconsistent.

Always provide in-app notification indicators.

---

## Supabase Rules

Use Supabase for:

- authentication
- PostgreSQL database
- user identity

Never expose `SUPABASE_SERVICE_ROLE_KEY` in the browser.

Only variables prefixed with `NEXT_PUBLIC_` may be used client-side.

Expected environment variables:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Database logic should enforce:

- `ideas.created_by` references the authenticated user
- `votes.user_id` references the authenticated user
- one vote per user per idea
- calendar events reference ideas

Prefer database-level constraints where possible, for example a unique constraint on `(idea_id, user_id)` in votes.

Use Row Level Security policies where appropriate.

---

## Testing Rules

Use Playwright for E2E tests.

Add or update tests when implementing user-facing functionality.

Tests should be placed in:

```txt
tests/e2e/
```

Use stable selectors where useful, for example:

```tsx
data-testid="add-idea-button"
```

Avoid random waits or timeouts. Prefer Playwright expectations.

Visible UI text in E2E tests should be Polish. Test names and descriptions should be English.

Required E2E flows:

- user can open the login screen
- user can register and log in
- user can add an idea
- user can vote on an idea
- user cannot vote twice on the same idea
- user can view idea rankings
- user can schedule an idea
- mobile user can schedule with a date/time form
- mobile navigation works

---

## Commands

Current package scripts:

```bash
npm run dev
npm run lint
npm run build
npm run start
```

Use these checks when they are available or after adding the related tooling:

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

If Playwright browsers are missing, run:

```bash
npx playwright install
```

---

## Definition Of Done

For code tasks, a task is complete only when:

- implementation matches `PROJECT_CONTEXT.md`
- TypeScript passes
- lint passes
- relevant Playwright tests pass when E2E coverage exists
- build passes
- mobile layout is considered
- visible UI copy is Polish
- no secrets are committed
- code remains simple and maintainable

For documentation-only tasks, a task is complete when:

- Codex-facing instructions are in English
- any literal user-facing UI examples remain Polish
- documentation is internally consistent
- no app behavior or product feature implementation changed

---

## Development Approach

Work in small steps.

Preferred implementation order:

1. basic Next.js structure
2. mobile-first layout
3. bottom navigation
4. login/register screen
5. Supabase Auth
6. ideas CRUD
7. voting
8. ranking
9. calendar scheduling
10. Playwright E2E tests
11. PWA support
12. push notifications

Do not build advanced features before the MVP works.
