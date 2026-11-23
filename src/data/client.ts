// Chooses the data backend from public build-time variables:
//   PUBLIC_NEON_AUTH_URL + PUBLIC_NEON_DATA_API_URL   → hosted Neon (production)
//   PUBLIC_SUPABASE_URL + PUBLIC_SUPABASE_ANON_KEY    → hosted Supabase (alternative)
//   none                                              → device-only demo mode
import { LocalAuth, LocalDb } from "./db/local";
import { NeonAuth, NeonDb } from "./db/neon";
import { SupabaseAuth, SupabaseDb } from "./db/supabase";
import type { Auth, Db } from "./db/types";
import { buildSeedStore } from "./seed";

// The bundler replaces these exact expressions at build time; the try/catch
// keeps the dev server working when the variables are not set.
function env(read: () => string | undefined): string { try { return (read() ?? "").trim().replace(/\/+$/, ""); } catch { return ""; } }
const neonAuthUrl = env(() => process.env.PUBLIC_NEON_AUTH_URL);
const neonDataUrl = env(() => process.env.PUBLIC_NEON_DATA_API_URL);
const supaUrl = env(() => process.env.PUBLIC_SUPABASE_URL);
const supaKey = env(() => process.env.PUBLIC_SUPABASE_ANON_KEY);

let db: Db;
let auth: Auth;
let local: LocalDb | null = null;

if (neonAuthUrl && neonDataUrl) {
  const a = new NeonAuth(neonAuthUrl);
  auth = a;
  db = new NeonDb(neonDataUrl, a);
} else if (supaUrl && supaKey) {
  const a = new SupabaseAuth(supaUrl, supaKey);
  auth = a;
  db = new SupabaseDb(supaUrl, supaKey, a);
} else {
  local = new LocalDb(buildSeedStore);
  db = local;
  auth = new LocalAuth(local);
}

export { db, auth, local };
export const isDemoMode = db.mode === "local";
