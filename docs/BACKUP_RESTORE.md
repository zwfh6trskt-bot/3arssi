# Backup, restore and moving the project

## What to back up

| What | Where | How |
|---|---|---|
| Source code & assets | GitHub | Push regularly; download a ZIP from GitHub any time |
| Database (content, users' plans, translations) | Supabase Postgres | `pg_dump` (below) or the dashboard |
| Uploaded images/videos | Supabase Storage bucket `media` | Download from the dashboard or with the CLI |
| User accounts (emails, password hashes) | Supabase `auth` schema | Included in a full `pg_dump` |
| Environment values | Netlify/Vercel settings | Keep a copy in a password manager |

**The Supabase Free plan has no automatic backups.** Make manual backups (or upgrade to Pro, which includes daily backups).

## Database backup

Get the connection string: Supabase → **Connect** → *Session pooler* URI; put it in
`.env` as `SUPABASE_DB_URL` (never commit it). Requires PostgreSQL client tools (`pg_dump`, `psql`).

```bash
bash scripts/backup.sh            # writes backups/3arssi-YYYYMMDD-HHMM.sql
```

What it runs:
```bash
pg_dump "$SUPABASE_DB_URL" --schema=public --no-owner --no-privileges --data-only \
  -f backups/3arssi-data-<date>.sql
pg_dump "$SUPABASE_DB_URL" --schema=auth --data-only --table=auth.users --table=auth.identities \
  -f backups/3arssi-auth-<date>.sql
```

Store backups outside the repository (they contain personal data).

## Restore

Into a **new, empty** Supabase project:
1. Apply the four migrations (DEPLOYMENT.md §2a). Do **not** load the seeds.
2. Restore users first, then data:
   ```bash
   psql "$NEW_DB_URL" -f backups/3arssi-auth-<date>.sql
   psql "$NEW_DB_URL" -c "set session_replication_role = replica;" -f backups/3arssi-data-<date>.sql
   ```
   (`session_replication_role = replica` lets rows load in any order; triggers
   such as profile creation are skipped because the data already contains them.)
3. Re-upload Storage files to the `media` bucket with the same paths.
4. Point the website's `PUBLIC_SUPABASE_*` variables to the new project and redeploy.

**Test your restore** once on a spare project so you know it works.

## Demo data

* Remove: Admin → *Demo content* → **Remove all demo content** (only rows with `is_demo = true`), or `select public.delete_demo_content();`.
* Restore in the hosted database: run `supabase/seed/03_demo.sql` again (idempotent).
* Demo mode (no Supabase): Admin → *Demo content* → *Restore demo content* or *Reset this device*.

## Exporting data from demo mode

Demo-mode data lives in the browser's `localStorage` under `3arssi.localdb.v1`.
To copy it: open the browser console on the site and run
`copy(localStorage.getItem("3arssi.localdb.v1"))`, then paste into a file.
It is not meant as a production store.

## Moving the project to another computer

1. Install Git and Bun on the new computer.
2. `git clone https://github.com/<you>/3arssi.git && cd 3arssi`
3. `bun install`
4. Create `.env` from `.env.example` with the same `PUBLIC_` values (from your password manager or the hosting settings).
5. `bun run dev` — the app connects to the same Supabase project; nothing else to copy.

If you no longer have Git access, download the project ZIP from GitHub
(*Code → Download ZIP*) or use the ZIP delivered with this handover.
