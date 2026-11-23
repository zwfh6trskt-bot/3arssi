// Device-only demo adapter. Emulates the subset of the database the app
// uses (defaults, cascades, unique upserts, demo-reset RPCs) and persists to
// this browser's localStorage. It is NOT shared between devices and has no
// real security — it exists so the product can be explored before the
// hosted database is configured. See docs/ARCHITECTURE.md.
import { newId } from "../../lib/ids";
import type { Auth, AuthUser, Db, Filter, SelectOptions } from "./types";
import { DbError } from "./types";

type RowObj = Record<string, any>;
type Store = Record<string, RowObj[]>;
const STORE_KEY = "3arssi.localdb.v1";
const SESSION_KEY = "3arssi.localsession.v1";

/** Tables whose primary key is composite (no `id` column). */
const COMPOSITE_PK: Record<string, string[]> = {
  category_service_types: ["category_id", "service_type_id"],
  provider_services: ["provider_id", "service_type_id"],
  saved_providers: ["plan_id", "provider_id"],
  plan_members: ["plan_id", "user_id"],
  ui_translations: ["key", "lang"],
};

/** Column defaults mirroring the SQL schema. */
const DEFAULTS: Record<string, RowObj> = {
  _managed: { sort_order: 0, enabled: true, is_demo: false },
  events: { side: "both", icon: null },
  categories: { parent_id: null, side: "both", icon: null, image_url: null },
  content_items: { importance: "optional", wilaya_id: null, commune_id: null, image_url: null },
  service_types: { parent_id: null, icon: null },
  providers: { featured: false, verified: false, enabled: true, is_demo: false, primary_service_type_id: null,
    wilaya_id: null, commune_id: null, address: null, phone: null, whatsapp: null, instagram: null, website: null },
  provider_media: { kind: "image", storage_path: null, sort_order: 0, is_demo: false },
  offers: { valid_from: null, valid_to: null, enabled: true, is_demo: false },
  price_items: { service_type_id: null },
  price_records: { provider_id: null, source_label: null, wilaya_id: null, commune_id: null, min_price: null,
    max_price: null, min_quantity: null, price_status: "indicative", enabled: true, is_demo: false },
  profiles: { role: "user", preferred_lang: null },
  plan_events: { event_id: null, custom_name: null, side: "both", sort_order: 0, enabled: true, removed_at: null, notes: null },
  plan_categories: { category_id: null, custom_name: null, side: "both", enabled: true, sort_order: 0, notes: null },
  event_budgets: { total_amount: 0, currency: "DZD" },
  category_allocations: { amount: 0 },
  expenses: { plan_category_id: null, kind: "paid", provider_id: null, spent_on: null, note: null },
  plan_tasks: { content_item_id: null, label: null, done: false, done_at: null, sort_order: 0 },
  plan_estimates: { wilaya_id: null },
};
const MANAGED = new Set(["wilayas", "communes", "events", "service_types", "categories", "content_items", "price_items"]);

/** Foreign keys: child table → [column, parent table, action]. */
const FKS: Record<string, [string, string, "cascade" | "null"][]> = {
  communes: [["wilaya_id", "wilayas", "cascade"]],
  categories: [["event_id", "events", "cascade"], ["parent_id", "categories", "cascade"]],
  service_types: [["parent_id", "service_types", "null"]],
  category_service_types: [["category_id", "categories", "cascade"], ["service_type_id", "service_types", "cascade"]],
  content_items: [["category_id", "categories", "cascade"], ["wilaya_id", "wilayas", "null"], ["commune_id", "communes", "null"]],
  providers: [["primary_service_type_id", "service_types", "null"], ["wilaya_id", "wilayas", "null"], ["commune_id", "communes", "null"]],
  provider_services: [["provider_id", "providers", "cascade"], ["service_type_id", "service_types", "cascade"]],
  provider_media: [["provider_id", "providers", "cascade"]],
  offers: [["provider_id", "providers", "cascade"]],
  price_items: [["service_type_id", "service_types", "null"]],
  price_records: [["price_item_id", "price_items", "cascade"], ["provider_id", "providers", "null"], ["wilaya_id", "wilayas", "null"], ["commune_id", "communes", "null"]],
  plan_members: [["plan_id", "plans", "cascade"]],
  plan_events: [["plan_id", "plans", "cascade"], ["event_id", "events", "null"]],
  plan_categories: [["plan_event_id", "plan_events", "cascade"], ["category_id", "categories", "null"]],
  event_budgets: [["plan_event_id", "plan_events", "cascade"]],
  category_allocations: [["plan_category_id", "plan_categories", "cascade"]],
  expenses: [["plan_event_id", "plan_events", "cascade"], ["plan_category_id", "plan_categories", "null"], ["provider_id", "providers", "null"]],
  plan_tasks: [["plan_category_id", "plan_categories", "cascade"], ["content_item_id", "content_items", "cascade"]],
  plan_estimates: [["plan_category_id", "plan_categories", "cascade"], ["price_item_id", "price_items", "cascade"], ["wilaya_id", "wilayas", "null"]],
  saved_providers: [["plan_id", "plans", "cascade"], ["provider_id", "providers", "cascade"]],
};
/** Unique constraints mirrored from SQL (NULLs never conflict, as in Postgres). */
const UNIQUES: Record<string, string[][]> = {
  plans: [["owner_id"]], plan_events: [["plan_id", "event_id"]], plan_categories: [["plan_event_id", "category_id"]],
  event_budgets: [["plan_event_id", "side"]], category_allocations: [["plan_category_id", "side"]],
  plan_tasks: [["plan_category_id", "content_item_id"]], translations: [["entity_type", "entity_id", "field", "lang"]],
  events: [["slug"]], providers: [["slug"]], service_types: [["slug"]], price_items: [["slug"]], wilayas: [["code"], ["slug"]],
  categories: [["event_id", "slug"]], communes: [["wilaya_id", "slug"]],
};
const TRANSLATED: Record<string, string> = {
  events: "event", categories: "category", content_items: "content_item", service_types: "service_type",
  providers: "provider", provider_media: "provider_media", offers: "offer", price_items: "price_item",
  price_records: "price_record", wilayas: "wilaya", communes: "commune",
};
const DEMO_TABLES = ["price_records", "price_items", "offers", "provider_media", "providers", "content_items",
  "categories", "events", "service_types", "communes", "wilayas"];

function matches(row: RowObj, filter?: Filter) {
  for (const [k, v] of Object.entries(filter ?? {})) {
    if (Array.isArray(v)) { if (!v.map(String).includes(String(row[k]))) return false; }
    else if (v === null) { if (row[k] !== null && row[k] !== undefined) return false; }
    else if (row[k] !== v) return false;
  }
  return true;
}

function sortRows(rows: RowObj[], order?: string) {
  if (!order) return rows;
  const [col, dir] = order.split(".");
  const m = dir === "desc" ? -1 : 1;
  return [...rows].sort((a, b) => (a[col] > b[col] ? m : a[col] < b[col] ? -m : 0));
}

const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x));

export class LocalDb implements Db {
  readonly mode = "local" as const;
  readonly canUpload = true;
  private store: Store;

  constructor(private seed: () => Store) {
    let s: Store | null = null;
    try { const raw = localStorage.getItem(STORE_KEY); if (raw) s = JSON.parse(raw); } catch { s = null; }
    this.store = s ?? seed();
    this.persist();
  }

  private persist() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(this.store)); }
    catch { throw new DbError("storage_full"); }
  }
  private t(table: string) { return (this.store[table] ??= []); }

  private withDefaults(table: string, row: RowObj): RowObj {
    const now = new Date().toISOString();
    const base: RowObj = { ...(MANAGED.has(table) ? DEFAULTS._managed : {}), ...(DEFAULTS[table] ?? {}) };
    const out: RowObj = { ...base, ...row };
    if (!COMPOSITE_PK[table] && !out.id) out.id = newId();
    out.created_at ??= now;
    out.updated_at = now;
    if (table === "providers") out.last_updated_at ??= now;
    if (table === "price_records") out.updated_on ??= now.slice(0, 10);
    return out;
  }

  private checkFks(table: string, row: RowObj) {
    for (const [col, parent] of FKS[table] ?? []) {
      const v = row[col];
      if (v && !this.t(parent).some((p) => p.id === v)) throw new DbError(`foreign key ${table}.${col}`, "23503");
    }
  }

  async select<T>(table: string, filter?: Filter, opts?: SelectOptions): Promise<T[]> {
    return clone(sortRows(this.t(table).filter((r) => matches(r, filter)), opts?.order)) as T[];
  }

  async insert<T>(table: string, rows: object | object[]): Promise<T[]> {
    const list = (Array.isArray(rows) ? rows : [rows]).map((r) => this.withDefaults(table, r as RowObj));
    for (const r of list) {
      this.checkFks(table, r);
      const pk = COMPOSITE_PK[table];
      if (pk && this.t(table).some((x) => pk.every((k) => x[k] === r[k]))) throw new DbError("duplicate key", "23505");
      if (!pk && this.t(table).some((x) => x.id === r.id)) throw new DbError("duplicate key", "23505");
      for (const cols of UNIQUES[table] ?? []) {
        if (cols.some((c) => r[c] === null || r[c] === undefined)) continue;
        if ([...this.t(table), ...list.filter((x) => x !== r)].some((x) => cols.every((c) => x[c] === r[c])))
          throw new DbError(`duplicate key ${table}(${cols.join(",")})`, "23505");
      }
    }
    this.t(table).push(...list);
    this.persist();
    return clone(list) as T[];
  }

  async update<T>(table: string, filter: Filter, patch: object): Promise<T[]> {
    const out: RowObj[] = [];
    for (const r of this.t(table)) {
      if (matches(r, filter)) {
        Object.assign(r, patch, { updated_at: new Date().toISOString() });
        this.checkFks(table, r);
        out.push(r);
      }
    }
    this.persist();
    return clone(out) as T[];
  }

  async upsert<T>(table: string, rows: object | object[], onConflict: string): Promise<T[]> {
    const keys = onConflict.split(",");
    const out: RowObj[] = [];
    for (const raw of Array.isArray(rows) ? rows : [rows]) {
      const row = raw as RowObj;
      const existing = this.t(table).find((x) => keys.every((k) => (x[k] ?? null) === (row[k] ?? null)));
      if (existing) {
        Object.assign(existing, row, { updated_at: new Date().toISOString() });
        out.push(existing);
      } else {
        const r = this.withDefaults(table, row);
        this.checkFks(table, r);
        this.t(table).push(r);
        out.push(r);
      }
    }
    this.persist();
    return clone(out) as T[];
  }

  private cascadeDelete(table: string, rows: RowObj[]) {
    if (!rows.length) return;
    const ids = new Set(rows.map((r) => r.id).filter(Boolean));
    this.store[table] = this.t(table).filter((r) => !rows.includes(r));
    if (TRANSLATED[table]) {
      this.store.translations = this.t("translations").filter((tr) => !(tr.entity_type === TRANSLATED[table] && ids.has(tr.entity_id)));
    }
    for (const [child, fks] of Object.entries(FKS)) {
      for (const [col, parent, action] of fks) {
        if (parent !== table) continue;
        const affected = this.t(child).filter((r) => ids.has(r[col]));
        if (action === "cascade") this.cascadeDelete(child, affected);
        else affected.forEach((r) => { r[col] = null; });
      }
    }
  }

  async remove(table: string, filter: Filter) {
    if (!Object.keys(filter).length) throw new DbError("refusing to delete without a filter");
    this.cascadeDelete(table, this.t(table).filter((r) => matches(r, filter)));
    this.persist();
  }

  async rpc<T>(fn: string, args: RowObj = {}): Promise<T> {
    if (fn === "delete_demo_content") {
      for (const table of DEMO_TABLES) this.cascadeDelete(table, this.t(table).filter((r) => r.is_demo));
      this.persist();
      return undefined as T;
    }
    if (fn === "set_user_role") {
      await this.update("profiles", { id: args.p_user }, { role: args.p_role });
      return undefined as T;
    }
    if (fn === "admin_list_users") {
      const users = this.t("_users");
      return clone(this.t("profiles").map((p) => ({ ...p, email: users.find((u) => u.id === p.id)?.email ?? "" }))) as T;
    }
    throw new DbError(`rpc ${fn} not available in demo mode`);
  }

  /** Images are downscaled and stored as data URLs (demo mode only). */
  async uploadFile(file: File, folder: string) {
    if (!file.type.startsWith("image/")) throw new DbError("demo_mode_images_only");
    const url = await downscale(file, 1200, 0.82);
    return { url, path: `${folder}/${file.name}` };
  }
  async removeFile() { /* nothing stored separately */ }

  /** Wipes everything on this device and reloads seed content. */
  resetAll() { this.store = this.seed(); this.persist(); }
  /** Reloads only the demo (is_demo) rows from the seed. */
  restoreDemo() {
    const fresh = this.seed();
    for (const table of [...DEMO_TABLES].reverse()) {
      const demoRows = (fresh[table] ?? []).filter((r) => r.is_demo && !this.t(table).some((x) => x.id === r.id));
      this.t(table).push(...demoRows);
    }
    const ids = new Set(DEMO_TABLES.flatMap((t) => this.t(t).filter((r) => r.is_demo).map((r) => r.id)));
    for (const tbl of ["provider_services", "category_service_types"]) {
      const extra = (fresh[tbl] ?? []).filter((r) => Object.values(r).some((v) => ids.has(v as string))
        && !this.t(tbl).some((x) => JSON.stringify(x) === JSON.stringify(r)));
      this.t(tbl).push(...extra);
    }
    const tr = (fresh.translations ?? []).filter((r) => ids.has(r.entity_id) && !this.t("translations").some((x) => x.id === r.id));
    this.t("translations").push(...tr);
    this.persist();
  }

  // ----- demo auth storage helpers -----
  users() { return this.t("_users"); }
  saveUsers() { this.persist(); }
}

async function downscale(file: File, max: number, quality: number): Promise<string> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", quality);
}

async function hash(text: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Demo-mode accounts. Passwords are hashed, but this is NOT real security. */
export class LocalAuth implements Auth {
  readonly mode = "local" as const;
  private user: AuthUser | null = null;
  private listeners = new Set<(u: AuthUser | null) => void>();

  constructor(private db: LocalDb) {
    try { const raw = localStorage.getItem(SESSION_KEY); if (raw) this.user = JSON.parse(raw); } catch { this.user = null; }
    if (this.user && !db.users().some((u) => u.id === this.user!.id)) this.user = null;
  }
  private set(u: AuthUser | null) {
    this.user = u;
    try { u ? localStorage.setItem(SESSION_KEY, JSON.stringify(u)) : localStorage.removeItem(SESSION_KEY); } catch { /* ignore */ }
    this.listeners.forEach((l) => l(u));
  }
  currentUser() { return this.user; }

  async signUp(email: string, password: string, displayName: string) {
    const e = email.trim().toLowerCase();
    if (this.db.users().some((u) => u.email === e)) throw new DbError("user_already_exists", "user_already_exists", 422);
    if (password.length < 8) throw new DbError("weak_password", "weak_password", 422);
    const id = newId();
    const salt = newId();
    this.db.users().push({ id, email: e, salt, pw: await hash(salt + password) });
    this.db.saveUsers();
    await this.db.insert("profiles", { id, display_name: displayName || e.split("@")[0] });
    this.set({ id, email: e });
    return { needsConfirmation: false };
  }

  async signIn(email: string, password: string) {
    const u = this.db.users().find((x) => x.email === email.trim().toLowerCase());
    if (!u || u.pw !== (await hash(u.salt + password))) throw new DbError("invalid_credentials", "invalid_credentials", 400);
    this.set({ id: u.id, email: u.email });
  }
  async signOut() { this.set(null); }
  async resetPassword() { throw new DbError("demo_mode_no_email"); }
  onChange(cb: (u: AuthUser | null) => void) { this.listeners.add(cb); return () => { this.listeners.delete(cb); }; }
  async accessToken() { return null; }
}
