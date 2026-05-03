# Project: Calendar PWA Application

## Description

This project is a web-based calendar PWA for a small private group of around 10 users.

The application should help the group add ideas, vote on them, and agree on shared dates in a calendar.

The main project priorities are:

- excellent mobile experience
- simplicity of use
- fast MVP delivery
- installable PWA support
- easy deployment to Vercel

---

## Language

Repository instructions and technical documentation should be written in English.

The visible application UI should be written in Polish.

Examples of Polish UI copy include bottom navigation labels such as `Pomysły`, `Głosowanie`, `Kalendarz`, and `Dodaj`.

---

## Main Features

Users can:

- register and log in
- add ideas
- vote on ideas
- view idea rankings
- assign ideas to dates in the calendar
- add a location to an idea
- add a price to an idea
- receive notifications about new ideas, votes, and scheduled dates

---

## Ideas

Each idea should include these core data fields:

- `title`
- `description`
- `location`
- `price`
- `created_by`
- `created_at`

The UI may also show derived or joined fields:

- author display name
- creation date
- vote count

Vote count should come from vote data rather than being treated as the primary source of truth.

---

## Users

The application is intended for a small group of around 10 people.

Each user should have their own account, so it is clear:

- who added an idea
- who voted
- who proposed a date

Each user can vote only once for a single idea.

---

## Voting

The voting system should be simple:

- one user equals one vote for one idea
- a user cannot vote twice on the same idea
- the application shows the number of votes
- the application shows an idea ranking

---

## Calendar

Ideas can be assigned to dates in the calendar.

Calendar events should reference ideas.

On desktop, drag and drop can be used.

On mobile, the main UX should not rely on drag and drop. A better mobile flow is:

1. the user taps an idea
2. the user selects a date
3. the user selects a time
4. the user saves the scheduled date

---

## Mobile-First UX

The application should be designed mobile-first.

On mobile, it should have simple bottom navigation for:

- ideas
- voting
- calendar
- add

Visible navigation labels should be Polish.

Mobile views should be simple, readable, and comfortable to use with touch.

---

## PWA And Notifications

The application should eventually work as a PWA.

The user should be able to add it to the phone home screen.

Notifications should cover:

- new ideas
- new votes
- scheduled dates

The app icon badge or count can be treated as an optional bonus because support depends on the platform.

The application should include internal counters or notification indicators, for example a Polish UI message for new ideas.

---

## Technology Stack

Preferred stack:

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- Supabase Auth
- Supabase PostgreSQL
- Vercel
- Playwright for E2E tests

---

## MVP Goal

The goal of the MVP is to quickly create a working application that allows users to:

1. register and log in
2. add an idea
3. vote on an idea
4. view the ranking
5. assign an idea to a scheduled date
6. comfortably use the application on a phone

Advanced PWA features and push notifications can follow the core MVP unless explicitly requested earlier.
