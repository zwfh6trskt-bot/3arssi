# Roadmap

## Phase 1 — go live (next)
1. Provision Supabase, apply migrations and seeds, create the first admin.
2. Deploy to Netlify/Vercel; run the cross-device acceptance test (DEPLOYMENT.md §5).
3. Replace fictional providers with real, consented provider listings (Algiers first); remove demo data.
4. Review all starter guidance with people from several wilayas; tag regional items.
5. Own SMTP for emails; Supabase Pro for backups and no pausing.
6. Add a self-hosted Arabic web font for a consistent Arabic look.

## Phase 2 — collaboration & quality
* Invite family members to a plan (`plan_members` already exists): invite links, editor/viewer roles.
* Offline-friendly PWA (service worker caching of content).
* Content versioning / audit log for admin changes.
* Image optimisation on upload (resize, WebP).
* Error monitoring (e.g. Sentry) and privacy-friendly analytics.

## Phase 3 — providers
* Provider accounts with their own dashboard (edit profile, portfolio, prices) under admin approval.
* Reviews with moderation (only from verified users; never fabricated).
* Availability calendars and booking requests; later deposits/payments with an Algerian payment provider.
* Notifications (email, then push).

## Phase 4 — native apps
* React Native / Expo app reusing `src/domain`, `src/data`, `src/i18n` and `src/state`
  (they contain no browser-only code except `localStorage` in the demo adapter and router).
* Same Supabase backend; add deep links and push notifications.
* Publish to the App Store and Google Play.

Each phase adds tables or screens without rebuilding the existing ones;
migrations are additive and the data layer is behind one interface.
