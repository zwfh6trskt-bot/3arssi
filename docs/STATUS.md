# Status — what works, what is simulated, what is postponed

_Last updated 23 Nov 2026._

## Honest summary

* **Live site:** https://zwfh6trskt-bot.github.io/3arssi/ (GitHub Pages,
  rebuilt automatically on every push to `main`).
* **Hosted database: Neon** (project `3arssi`, Frankfurt): Postgres + Neon Auth
  (accounts) + Neon Data API. Schema, Row Level Security and starter content are
  applied. Supabase was dropped because no free project slot was available; the
  Supabase adapter and SQL are kept in `supabase/` as an alternative.
* The interface passes **47 browser acceptance checks** and **21 unit tests**
  (demo mode), and the **real Neon adapter passed a 40-step end-to-end test**
  against the hosted services (see TESTING.md) — including cross-device sync.
* Not yet seen working **in a real phone browser**: sign-in depends on the
  browser accepting Neon Auth's session cookie (see “Known limitations”).

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

## Verified against the hosted Neon services (23 Nov 2026)

Run by `tests/integration/neon-flow.ts`, which drives the real
`src/data/db/neon.ts` adapter from a server, simulating three browsers
(“phone”, “laptop”, “other user”), each with its own cookies and storage:

| Check | Result |
|---|---|
| Visitor without account reads events and all 1,332 translations (paged) | ✅ |
| Visitor cannot read profiles | ✅ |
| Sign up, profile created (`ensure_profile`), plan + 9 events created | ✅ |
| Rename/disable event, custom event, per-event budget (insert + merge), allocation, expense (insert/update), task, estimate, saved provider, language preference | ✅ |
| User cannot make themselves admin, edit content, or list users | ✅ (blocked by the database) |
| App reopened: still signed in, data still there | ✅ |
| **Second device signs in → sees the same plan; edits budget → first device sees the change** | ✅ |
| Another account sees none of it and cannot modify or delete it | ✅ |
| Sign out, wrong password rejected | ✅ |

Test accounts were deleted afterwards; the database contains no users.

## Not yet verified

| Item | Why |
|---|---|
| Sign-in in a real phone browser (Safari iPhone, Chrome Android) | Could not open the site from this workspace; please test |
| Password-reset email (sent by Neon's shared email sender) | Needs a real mailbox |
| Admin dashboard against the hosted database | Needs your account promoted to admin |
| Media uploads | **Not available with Neon** in this version: admins paste image/video links instead (upload buttons are hidden) |

## Simulated / limited in demo mode

* **Storage (demo mode only):** browser `localStorage`; not shared between devices. The live site uses Neon.
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

* **Sign-in relies on a cookie set by Neon Auth's domain** (Partitioned/CHIPS,
  SameSite=None). Neon Auth does not accept the session token as a header
  (tested), so a browser that blocks this cookie cannot sign in: the app then
  shows a clear message. If this affects iPhones, the fix is to serve the site
  and auth from the same domain (custom domain + proxy) — see ROADMAP.md.
* **No file uploads in hosted mode** (Neon storage needs a server to sign
  uploads). Admins paste links; a small Neon Function can add uploads later.

* Budgets are **per event and per side**. An event shared by both sides has
  one checklist but two independent budgets (bride's family and groom's family).
* Allocations are made on top-level categories; subcategories carry guidance and checklists.
* If an admin **deletes** an event or category, users' budgets/expenses are
  kept but lose the link — hiding is recommended and the UI says so.
* Arabic uses the device's Arabic system font (Noto/Geeza/Segoe). A
  self-hosted Arabic web font can be added in `public/fonts/fonts.css`.
* The main bundle includes the demo seed (~100 KB gzipped total). It can be
  lazy-loaded later for hosted-only builds.
