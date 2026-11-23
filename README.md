# 3ARSSI · عرسي

A mobile-first web platform for organising the events of an Algerian wedding:
**El 3rossa** and **El 3ris** each get their own planning space, with
event-specific categories, checklists, guidance, providers, independent
per-event budgets and price estimates. Everything is available in Arabic (RTL),
French and English. Content is managed by the owner in an admin dashboard.

> **Live:** https://zwfh6trskt-bot.github.io/3arssi/ — hosted on GitHub Pages,
> data and accounts in **Neon** (Postgres + Neon Auth + Data API), shared
> across devices. Cross-device sync and database security were verified with
> an end-to-end test of the real adapter; sign-in in a real phone browser is
> still to be confirmed. Exact details: [docs/STATUS.md](docs/STATUS.md).

---

## Quick start (on your computer)

Requirements: [Bun](https://bun.sh) ≥ 1.2 (`curl -fsSL https://bun.sh/install | bash`, or `powershell -c "irm bun.sh/install.ps1 | iex"` on Windows).

```bash
bun install          # installs React and dev tools, creates bun.lock (commit it)
bun run dev          # http://localhost:3000  (hot reload)
```

With no `.env`, the app runs in **demo mode**: starter content and fictional
sample providers are loaded into your browser, and data stays in that browser.

To use the hosted database, copy `.env.example` to `.env`, fill in the two
`PUBLIC_NEON_*` URLs, and restart. Full steps: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

| Command | What it does |
|---|---|
| `bun run dev` | Development server with hot reload |
| `bun run build` | Production build into `dist/` |
| `bun run preview` | Serves `dist/` locally (http://localhost:4173) |
| `bun run test` | Unit tests (budget, estimates, contact links) |
| `bun run test:e2e` | Browser acceptance tests (needs `bunx playwright install chromium` once) |
| `bun scripts/check-i18n.ts` | Checks every interface text exists in AR, FR and EN |
| `bun run seed:sql` | Regenerates `supabase/seed/*.sql` from the TypeScript seed |
| `bun run typecheck` | TypeScript check |

## Using the app

* **First visit:** choose a language (saved; change it later in *Profile → Settings → Language*).
* **Landing:** identity, one welcome sentence, *El 3rossa* / *El 3ris* — nothing else.
* **Planning space:** Events · Providers · Budgets · Saved · Profile.
  Visitors can browse everything; an account is needed to tick tasks, set
  budgets, record expenses, save providers and personalise events.
* **Admin dashboard:** `/admin`.
  * Demo mode: use the *“Open admin with the demo account”* button (local only).
  * Hosted mode: sign in with an account whose role is `admin` or `editor`
    (first admin: [docs/ADMIN_GUIDE.md](docs/ADMIN_GUIDE.md#1-create-the-first-administrator)).

## Project structure

```
index.html                 entry page
src/
  main.tsx, App.tsx        bootstrapping and routes
  styles/app.css           design system (exact palette, RTL-safe logical CSS)
  i18n/                    i18n provider + locales/{ar,fr,en}.json (one file per language)
  lib/                     router, ids, contact-link builders
  domain/                  pure business logic: budget.ts, estimate.ts (unit-tested)
  data/
    types.ts               data model (mirrors the SQL schema)
    client.ts              picks Supabase or demo mode from env vars
    db/supabase.ts         PostgREST / Auth / Storage client (fetch, no SDK)
    db/local.ts            demo-mode database in localStorage
    seed/                  reference · starter · demo (fictional) data
  state/                   app state, content read-model, view-models
  components/              UI kit and icons
  pages/                   client screens
  admin/                   admin dashboard
supabase/
  migrations/              ordered SQL migrations (schema, RLS, storage)
  seed/                    01_reference.sql · 02_starter.sql · 03_demo.sql (generated)
public/                    fonts (Instrument Sans/Serif, OFL), favicon, sample images
scripts/                   build, dev, preview, seed generator, i18n check, backup
tests/                     unit/ and e2e/
docs/                      all documentation (see below)
```

## Documentation

| Document | Contents |
|---|---|
| [docs/STATUS.md](docs/STATUS.md) | Functional / simulated / postponed; what was tested |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | How the frontend, backend and database work together |
| [docs/DATA_MODEL.md](docs/DATA_MODEL.md) | Tables, relationships, diagram |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Supabase, GitHub, Netlify/Vercel, env vars, updates, logs, rollback |
| [docs/BACKUP_RESTORE.md](docs/BACKUP_RESTORE.md) | Export, backup, restore, moving to another computer |
| [docs/ADMIN_GUIDE.md](docs/ADMIN_GUIDE.md) | Managing events, categories, providers, prices, translations… |
| [docs/COSTS.md](docs/COSTS.md) | Free tiers, limits and paid plans |
| [docs/ROADMAP.md](docs/ROADMAP.md) | From this foundation to production and native apps |
| [docs/TESTING.md](docs/TESTING.md) | Test suites and the acceptance checklist |
| [LICENSES/THIRD_PARTY.md](LICENSES/THIRD_PARTY.md) | Dependencies and licences |

## Ownership

All source code, assets, schema and content in this repository belong to the
project owner. There is no dependency on Claude or on any temporary
environment: the app builds with Bun and runs on any static host connected to
your own Supabase project.
