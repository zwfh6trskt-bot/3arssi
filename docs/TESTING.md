# Testing

| Suite | Command | Covers |
|---|---|---|
| Unit | `bun run test` | Budget formulas (brief example 80,000/70,000/10,000), spending vs allocation, estimate ranges and statuses (200 × 80–120 → 16,000–24,000, “May exceed budget”), unit isolation, wilaya preference, minimum quantities, amount parsing (incl. Arabic digits), WhatsApp/phone/Instagram links |
| i18n | `bun scripts/check-i18n.ts` | Every interface key exists in AR, FR, EN; placeholders match |
| End-to-end | `bun run test:e2e` | 47 browser checks: opening experience, RTL, spaces, event-specific categories, accounts, budgets, expenses, estimates, persistence after refresh, personalisation, providers, favourites, admin CRUD, client visibility of admin changes, and **no horizontal overflow on 16 screens × 7 widths (320–1440 px) × English and Arabic** |

First run of the e2e suite on a new computer: `bunx playwright install chromium`.
Screenshots: `SCREENSHOTS=1 node tests/e2e/run.mjs` → `tests/screenshots/`.

## Last results (23 Nov 2026, demo mode)
* Unit: 21 passed, 0 failed
* i18n: 403 keys used, 470 defined, 0 problems
* E2E: 47 passed, 0 failed

## Acceptance items that need the hosted database (to run after deployment)
- [ ] Deploy the application
- [ ] Open it on a second device
- [ ] Admin change on device 1 appears on device 2
- [ ] Data persists after refresh and signing in again (hosted)
- [ ] Backup and restore (BACKUP_RESTORE.md) on a spare project
- [ ] Clone from GitHub and run with the README on another computer
- [ ] Supabase *Advisors* show no security warnings after migrations
