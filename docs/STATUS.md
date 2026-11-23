# Status — what works, what is simulated, what is postponed

_Last updated 23 Nov 2026._

## Honest summary

* The full application (client and admin) is built and passes **47 browser
  acceptance checks** and **21 unit tests** in **demo mode** (data in the browser).
* The **hosted database layer is written but not yet verified.** A Supabase
  project could not be created: the account had already reached Supabase's
  limit of 2 active free projects. Until it is provisioned and tested,
  **cross-device synchronisation is not claimed to work.**
* Nothing has been deployed to Netlify/Vercel yet.

## Genuinely functional (tested in the browser, demo mode)

| Area | Status |
|---|---|
| First-launch language selection, saved; not asked again | ✅ tested |
| Change language in Profile → Settings → Language | ✅ tested |
| Arabic RTL (layout, navigation order, icons that point a direction, forms) | ✅ tested at 7 widths |
| Minimal landing: identity + welcome + El 3rossa / El 3ris only | ✅ tested |
| Separate El 3rossa / El 3ris spaces with side-specific categories | ✅ tested |
| Events: add, remove (restorable), rename, reorder, enable/disable, assign side (user) | ✅ tested (add/remove), UI for all |
| Categories: hide, rename, reorder, add custom (user) | ✅ implemented |
| Checklists (suggested + own tasks), notes per event and category | ✅ tested (ticking persists) |
| Independent budget per event and per side — no wedding-wide total | ✅ tested (80,000 / 70,000 / 10,000 DA) |
| Allocations separate from spending; warnings on over-allocation/overspending | ✅ tested |
| Expenses (paid / committed) | ✅ tested |
| Price estimates with unit-compatible ranges and 4 statuses | ✅ tested (200 × 80–120 DA → 16,000–24,000 DA, “May exceed budget”) |
| Provider directory: filter by context (event/category), service, wilaya, search | ✅ |
| Provider profile: portfolio, prices with units/conditions, offers, location, availability, last update, badges | ✅ |
| Contact via WhatsApp / phone / Instagram / website (Algerian numbers normalised) | ✅ unit-tested link generation |
| Favourites (saved providers) | ✅ tested |
| Admin: events, categories, subcategories, guidance items (CRUD, duplicate, reorder, enable/disable, regional tags, images) | ✅ tested (create event, category, 2 subcategories, reorder) |
| Admin: providers (fields, services, media upload/URL, captions, offers, prices) | ✅ tested (create provider) |
| Admin: service types, price items & records, regions, UI & content translations with missing-translation report | ✅ implemented |
| Admin: demo content identification and removal | ✅ |
| Admin: users & roles | ✅ implemented (hosted mode only — needs the database) |
| No horizontal overflow: 16 screens × 7 widths (320→1440 px) × EN & AR | ✅ tested |

## Written, not yet verified (needs your Supabase project)

| Item | Why not verified |
|---|---|
| SQL migrations, Row Level Security, roles, storage bucket | No database could be provisioned |
| Sign-up / sign-in with Supabase Auth, email confirmation, password reset | Same |
| Cross-device sync (admin change on device A visible on device B) | Same |
| Media uploads to Supabase Storage | Same |
| Netlify / Vercel deployment | No hosting account connected |
| `bun install` from the public registry, `bun run typecheck` | This workspace had no internet access for packages; the build was verified with locally available React 19.2.8 |

As soon as you free a Supabase project slot (pause or delete one project, or
upgrade), these can be applied and tested — see [DEPLOYMENT.md](DEPLOYMENT.md).

## Simulated / limited in demo mode

* **Storage:** browser `localStorage` only; not shared between devices or browsers.
* **Accounts:** local accounts with hashed passwords — *not* real security.
* **Admin access:** guarded in the interface only. In hosted mode, the
  database enforces roles (RLS); in demo mode there is nothing to protect.
* **Uploads:** images are downscaled and stored inside the browser; videos are URL-only.
* **Demo providers and prices are fictional** and labelled “Fictional sample”
  everywhere. Phone numbers are deliberately invalid (`+213 00 00 00 0x`).

## Intentionally postponed (per the brief)

* Provider accounts and self-service dashboards
* Booking requests, availability calendars, deposits, online payments
* Push notifications, analytics, promotions engine
* Reviews / ratings (no fabricated reviews — none are shown)
* Family collaboration: the data model is ready (`plan_members` with
  owner/editor/viewer roles); invitations UI is not built
* Native iOS/Android apps (see [ROADMAP.md](ROADMAP.md))

## Known limitations / decisions to revisit

* Budgets are **per event and per side**. An event shared by both sides has
  one checklist but two independent budgets (bride's family and groom's family).
* Allocations are made on top-level categories; subcategories carry guidance and checklists.
* If an admin **deletes** an event or category, users' budgets/expenses are
  kept but lose the link — hiding is recommended and the UI says so.
* Arabic uses the device's Arabic system font (Noto/Geeza/Segoe). A
  self-hosted Arabic web font can be added in `public/fonts/fonts.css`.
* The main bundle includes the demo seed (~100 KB gzipped total). It can be
  lazy-loaded later for hosted-only builds.
