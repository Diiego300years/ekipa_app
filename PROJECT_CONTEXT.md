# Project Context

## Product

This is a mobile-first planning app for a small private Polish-speaking group. Users collect ideas, vote on them, discuss them, and schedule chosen ideas on a shared calendar.

Visible app UI is Polish. Repository documentation and technical work are English.

## Current State

Implemented:

- Next.js App Router, React, TypeScript, Tailwind CSS, and Vercel deployment.
- Supabase Auth, PostgreSQL, RLS policies, and cookie-backed server sessions.
- Public app shell with mobile bottom navigation: `Pomysły`, `Głosowanie`, `Kalendarz`, `Dodaj`.
- Login, registration, logout, password recovery, and profiles with `display_name`.
- Persistent ideas with title, description, location, price, author, and timestamps.
- Voting with one vote per user per idea, removable votes, rankings, and derived vote counts.
- Idea comments loaded on `/ideas`.
- Calendar events linked to ideas, plus mobile-friendly scheduling.
- Mobile calendar month/week view.
- Loading and pending states for routes and server actions.
- Playwright E2E tests and Playwright performance diagnostics.

## Roadmap

Planned:

- Edit/delete ideas by owner.
- RSVP for calendar events with `Będę` / `Nie będę`.
- Pagination or load-more for `/ideas`.
- Limited comment previews or an idea details page.
- Further performance optimization if diagnostics show a need.
- PWA installability.
- Push notifications for new ideas.
- In-app notifications.

## Product Rules

- Keep the app simple and optimized for phone use.
- Treat Supabase RLS and constraints as part of product correctness.
- Derive vote counts from `votes`; do not treat cached counts as source of truth.
- Calendar events must reference ideas.
- Mutations must use the authenticated server-side Supabase user.
