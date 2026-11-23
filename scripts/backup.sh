#!/usr/bin/env bash
# Backs up the 3ARSSI Supabase database (public data + auth users).
# Needs: pg_dump, and SUPABASE_DB_URL in .env or the environment.
set -euo pipefail
cd "$(dirname "$0")/.."
if [ -f .env ]; then set -a; . ./.env; set +a; fi
: "${SUPABASE_DB_URL:?Set SUPABASE_DB_URL (Supabase → Connect → Session pooler URI)}"
stamp=$(date +%Y%m%d-%H%M)
mkdir -p backups
pg_dump "$SUPABASE_DB_URL" --schema=public --no-owner --no-privileges --data-only -f "backups/3arssi-data-$stamp.sql"
pg_dump "$SUPABASE_DB_URL" --data-only --table=auth.users --table=auth.identities -f "backups/3arssi-auth-$stamp.sql"
echo "Backup written: backups/3arssi-data-$stamp.sql and backups/3arssi-auth-$stamp.sql"
echo "Keep these files private (they contain personal data) and store a copy off this computer."
