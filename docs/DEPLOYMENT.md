# Deployment

Target setup: **GitHub** (code) → **Netlify or Vercel** (website) → **Supabase** (database, accounts, files).
All three have free plans; see [COSTS.md](COSTS.md).

> Nothing below has been done for you yet. Follow the steps in order.

## 1. Put the code on GitHub

1. Create a free account at https://github.com and a new **private** repository named `3arssi` (no README).
2. On your computer, in the project folder:
   ```bash
   bun install                 # creates bun.lock — commit it
   git init
   git add .
   git commit -m "3ARSSI initial version"
   git branch -M main
   git remote add origin https://github.com/<your-user>/3arssi.git
   git push -u origin main
   ```
   `.gitignore` already excludes `node_modules/`, `dist/` and `.env` files.

## 2. Create the Supabase project

1. Sign in at https://supabase.com → **New project**.
   * Organisation: yours. Name: `3arssi`. Region: **West EU (Paris)** is the closest to Algeria.
   * Choose a strong database password and store it in a password manager.
   * The Free plan allows **2 active projects per account**. If you already
     have two, pause or delete one, or upgrade (see COSTS.md).
2. Wait until the project status is *Healthy*.

### 2a. Create the database structure

Option A — SQL Editor (no tools needed):
1. Supabase dashboard → **SQL Editor** → *New query*.
2. Paste and run each file **in this order**:
   1. `supabase/migrations/20261123000100_core_schema.sql`
   2. `supabase/migrations/20261123000200_accounts_and_planning.sql`
   3. `supabase/migrations/20261123000300_security_rls.sql`
   4. `supabase/migrations/20261123000400_storage.sql`
3. Then load content:
   1. `supabase/seed/01_reference.sql` (wilayas, communes, service types)
   2. `supabase/seed/02_starter.sql` (events, categories, guidance)
   3. `supabase/seed/03_demo.sql` — **optional**, fictional sample providers and prices.

Option B — Supabase CLI (`bunx supabase`): `supabase link --project-ref <ref>` then
`supabase db push`, and run the seed files with `psql "$SUPABASE_DB_URL" -f supabase/seed/01_reference.sql` etc.

### 2b. Authentication settings

Dashboard → **Authentication → URL Configuration**:
* *Site URL*: your website address (e.g. `https://3arssi.netlify.app`).
* *Redirect URLs*: add the same address and `http://localhost:3000`.

Dashboard → **Authentication → Providers → Email**: keep enabled.
“Confirm email” is recommended; users then confirm before their first sign-in.
For real email volume, configure your own SMTP (Authentication → Emails).

### 2c. Create the first administrator

See [ADMIN_GUIDE.md §1](ADMIN_GUIDE.md#1-create-the-first-administrator).

### 2d. Get the keys for the website

Dashboard → **Project Settings → API Keys**:
* **Project URL** → `PUBLIC_SUPABASE_URL`
* **Publishable key** (`sb_publishable_…`, or the legacy *anon* key) → `PUBLIC_SUPABASE_ANON_KEY`

Never use the `service_role`/secret key in the website.

## 3. Configure locally

```bash
cp .env.example .env      # then fill the two PUBLIC_ values
bun run dev               # the demo-mode banner disappears when connected
```

## 4. Deploy the website

### Netlify
1. https://app.netlify.com → **Add new site → Import from Git** → choose the GitHub repo.
2. Build settings are read from `netlify.toml` (`bun install && bun run build`, publish `dist`, `BUN_VERSION=1.4.4`).
3. **Site configuration → Environment variables**: add `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_ANON_KEY`.
4. **Deploy**. Your site gets an address like `https://<name>.netlify.app` (custom domain: *Domain management*).

### Vercel (alternative)
1. https://vercel.com → **Add New → Project** → import the repo.
2. `vercel.json` sets install/build/output; framework preset: *Other*.
3. **Settings → Environment Variables**: add the two `PUBLIC_` variables (Production and Preview).
4. **Deploy**.

After the first deployment, put the site address into Supabase *Site URL* (step 2b).

## 5. Verify cross-device sync (acceptance)

1. Open the site on your computer, sign in as admin, go to `/admin/events`, rename an event.
2. On your phone, open the site (or reload it): the new name appears.
3. Sign out and in again on both devices: data persists.

## 6. Publishing updates

Commit and push to `main` → Netlify/Vercel rebuild and publish automatically
(1–2 minutes). Pull requests get preview URLs.
Database changes: add a **new** file in `supabase/migrations/` (never edit an
applied one) and run it in the SQL editor or with `supabase db push`.

## 7. Errors and logs

* **Website build:** Netlify → *Deploys* → open a deploy → log. Vercel → *Deployments* → *Build Logs*.
* **In the browser:** open developer tools → Console / Network.
* **Database & API:** Supabase → *Logs & Analytics* (API, Postgres, Auth, Storage).
* **Security/performance:** Supabase → *Advisors*.

## 8. Rolling back

* **Website:** Netlify → *Deploys* → pick an earlier deploy → **Publish deploy**.
  Vercel → *Deployments* → earlier deployment → **Promote to Production** (Instant Rollback).
* **Code:** `git revert <commit>` then push.
* **Database:** restore a backup ([BACKUP_RESTORE.md](BACKUP_RESTORE.md)). Write a new
  migration that undoes a schema change rather than editing history.
