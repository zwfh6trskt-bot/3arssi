// Chooses the data backend from public environment variables.
// PUBLIC_SUPABASE_URL + PUBLIC_SUPABASE_ANON_KEY set → hosted Supabase.
// Otherwise → device-only demo mode.
import { LocalAuth, LocalDb } from "./db/local";
import { SupabaseAuth, SupabaseDb } from "./db/supabase";
import type { Auth, Db } from "./db/types";
import { buildSeedStore } from "./seed";

// The bundler replaces these exact expressions at build time; the try/catch
// keeps the dev server working when the variables are not set.
function readUrl(): string { try { return process.env.PUBLIC_SUPABASE_URL ?? ""; } catch { return ""; } }
function readKey(): string { try { return process.env.PUBLIC_SUPABASE_ANON_KEY ?? ""; } catch { return ""; } }
const url = readUrl().trim().replace(/\/$/, "");
const key = readKey().trim();

let db: Db;
let auth: Auth;
let local: LocalDb | null = null;

if (url && key) {
  const a = new SupabaseAuth(url, key);
  auth = a;
  db = new SupabaseDb(url, key, a);
} else {
  local = new LocalDb(buildSeedStore);
  db = local;
  auth = new LocalAuth(local);
}

export { db, auth, local };
export const isDemoMode = db.mode === "local";
