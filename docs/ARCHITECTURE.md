# Architecture

> **Update (23 Nov 2026):** production now runs on **Neon** instead of
> Supabase — Neon Auth replaces Supabase Auth, the Neon Data API (same
> PostgREST interface) replaces Supabase's REST API, and there is no file
> storage yet. The client adapter is `src/data/db/neon.ts`, chosen in
> `src/data/client.ts`; the SQL lives in `neon/`. Everything below that says
> “Supabase” applies equally to Neon unless it mentions Storage.

## Overview

```
 Browser (phone / tablet / desktop)
 ┌──────────────────────────────────────────────────────────────┐
 │ React 19 single-page app (static files from Netlify/Vercel)   │
 │                                                              │
 │  pages/ + admin/  →  state/ (app, content, view-models)       │
 │                         │                                    │
 │                  domain/ (budget, estimate — pure functions)  │
 │                         │                                    │
 │                  data/client.ts  ── chooses one adapter ──┐   │
 │                     │                                     │   │
 │        db/supabase.ts (fetch)                db/local.ts   │   │
 └─────────────│────────────────────────────────────│────────┘   │
               │ HTTPS (publishable key + user JWT) │ localStorage
               ▼                                    ▼ (demo mode)
 ┌──────────────────────────── Supabase ───────────────────────┐
 │ Auth (GoTrue)  ·  PostgREST (/rest/v1)  ·  Storage (media)   │
 │ PostgreSQL: tables, constraints, triggers, RLS policies      │
 └──────────────────────────────────────────────────────────────┘
```

**Frontend** — static HTML/JS/CSS built by Bun's bundler. No server code of
our own: everything the app needs is served by Supabase.

**Backend** — Supabase provides authentication, a REST API generated from the
database (PostgREST), file storage and the PostgreSQL database.

**Security lives in the database.** Every table has Row Level Security:

| Data | Read | Write |
|---|---|---|
| Content (events, categories, guidance, providers, prices, regions, translations) | everyone (only `enabled` rows unless staff) | `editor` or `admin` |
| Personal plan (events, categories, budgets, allocations, expenses, tasks, estimates, favourites) | plan members | plan owner / editor members |
| Profiles | yourself (admins: all) | yourself — name & language only; roles only via `set_user_role()` (admins) |

The publishable (anon) key in the browser is designed to be public; it cannot
bypass these policies. The `service_role` key and database password are
**never** used by the frontend and must never be put in `PUBLIC_*` variables.

## Data access

All reads and writes go through one interface (`src/data/db/types.ts`):
`select`, `insert`, `update`, `upsert`, `remove`, `rpc`, `uploadFile`.
Pages never import an adapter directly, so:

* demo mode and hosted mode run exactly the same UI and logic;
* the fetch-based Supabase client can later be swapped for `@supabase/supabase-js`
  (or another backend) by writing one new adapter.

Content is small (hundreds of rows), so it is loaded once into a read model
(`state/content.ts`) and refreshed after admin edits and when the app returns
to the foreground — that is how changes made on another device appear.
Personal plan data is loaded for the signed-in user.

## Business rules (pure, unit-tested)

* `domain/budget.ts` — per-event figures: `unallocated = total − Σ allocations`;
  `remaining = allocation − spent`; spending never changes allocations.
  **There is no function that combines events.**
* `domain/estimate.ts` — a price range only combines records of the **same
  price item**, which has exactly **one unit**; disabled records, missing
  prices and `quote` items give “Price unavailable”. Status:
  within (max ≤ budget) · may exceed (min ≤ budget < max) · over (min > budget).
  Ranges prefer records of the user's wilaya when they exist.

## Content model

Admin content is **data, not code**: events → categories → subcategories →
content items (checklist, suggestion, tip, tradition, note, image), each with
side (`bride`/`groom`/`both`), order, enabled flag, importance and optional
wilaya tag. Users personalise on top of it with their own rows
(`plan_events`, `plan_categories`) that reference admin rows by stable UUID —
renaming never breaks anything; a user's custom name overrides the suggested one.

## Languages

* **Interface text:** `src/i18n/locales/{ar,fr,en}.json` — one file per
  language, edited independently. Admins can override any key per language
  (`ui_translations` table). `scripts/check-i18n.ts` fails if a key is missing.
* **Content text:** `translations` table — one row per entity, field and
  language. Editing French never touches Arabic or English. The admin shows
  missing translations with a dot and in *Translations → Content missing*.
* **RTL:** `<html dir="rtl" lang="ar">` is set from the chosen language; CSS
  uses logical properties (`margin-inline`, `inset-inline-end`…), so layouts
  mirror automatically; directional icons use `.flip-rtl`. Numbers use Latin
  digits in Arabic (`ar-DZ-u-nu-latn`), and amounts accept Arabic-Indic digits.

## Toolchain decision

The project uses **Bun** for install, dev server, bundling and tests, and has
only two runtime dependencies (React, React DOM). Routing and the Supabase
client are small in-house modules. This was chosen because the build
environment had no package access; it is also simple to maintain. Netlify and
Vercel both build Bun projects. Migrating to Vite/Next later only touches the
`scripts/` folder.

## Extension points

| Future feature | Where it plugs in |
|---|---|
| Family collaboration | `plan_members` table + RLS already in place; add invite UI |
| Provider accounts | add `provider_users` + RLS on `providers` rows they own |
| Bookings / payments | new tables referencing `providers` and `plan_events`; profile page has a dedicated contact section to extend |
| Notifications | Supabase Edge Functions / database webhooks |
| Native apps | reuse `domain/`, `data/`, `i18n/`, `state/` in React Native/Expo |
