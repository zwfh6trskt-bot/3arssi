// Supabase adapter: talks to PostgREST (/rest/v1), GoTrue (/auth/v1) and
// Storage (/storage/v1) over plain fetch. No SDK dependency, so the bundle
// stays small; it can be swapped for @supabase/supabase-js later without
// touching any page (see docs/ARCHITECTURE.md).
import type { Auth, AuthUser, Db, Filter, SelectOptions } from "./types";
import { DbError } from "./types";

interface Session { access_token: string; refresh_token: string; expires_at: number; user: AuthUser }
const SESSION_KEY = "3arssi.session.v1";
const PAGE = 1000;

export class SupabaseAuth implements Auth {
  readonly mode = "supabase" as const;
  private session: Session | null = null;
  private listeners = new Set<(u: AuthUser | null) => void>();
  private refreshing: Promise<void> | null = null;

  constructor(private url: string, private key: string) {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (raw) this.session = JSON.parse(raw);
    } catch { this.session = null; }
  }

  private headers() { return { apikey: this.key, "Content-Type": "application/json" }; }

  private store(s: Session | null) {
    this.session = s;
    try {
      if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s));
      else localStorage.removeItem(SESSION_KEY);
    } catch { /* private mode */ }
    this.listeners.forEach((l) => l(s?.user ?? null));
  }

  private async tokenRequest(grant: string, body: object) {
    const res = await fetch(`${this.url}/auth/v1/token?grant_type=${grant}`, {
      method: "POST", headers: this.headers(), body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new DbError(data.error_description || data.msg || data.message || "auth_error", data.error_code || data.error, res.status);
    this.store({
      access_token: data.access_token, refresh_token: data.refresh_token,
      expires_at: Math.floor(Date.now() / 1000) + (data.expires_in ?? 3600),
      user: { id: data.user.id, email: data.user.email },
    });
  }

  currentUser() { return this.session?.user ?? null; }

  async signUp(email: string, password: string, displayName: string) {
    const res = await fetch(`${this.url}/auth/v1/signup`, {
      method: "POST", headers: this.headers(),
      body: JSON.stringify({ email, password, data: { display_name: displayName } }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new DbError(data.msg || data.error_description || data.message || "signup_error", data.error_code, res.status);
    if (data.access_token) {
      this.store({
        access_token: data.access_token, refresh_token: data.refresh_token,
        expires_at: Math.floor(Date.now() / 1000) + (data.expires_in ?? 3600),
        user: { id: data.user.id, email: data.user.email },
      });
      return { needsConfirmation: false };
    }
    return { needsConfirmation: true };
  }

  signIn(email: string, password: string) { return this.tokenRequest("password", { email, password }); }

  async signOut() {
    const token = this.session?.access_token;
    this.store(null);
    if (token) {
      await fetch(`${this.url}/auth/v1/logout`, {
        method: "POST", headers: { ...this.headers(), Authorization: `Bearer ${token}` },
      }).catch(() => undefined);
    }
  }

  async resetPassword(email: string) {
    const res = await fetch(`${this.url}/auth/v1/recover`, {
      method: "POST", headers: this.headers(), body: JSON.stringify({ email }),
    });
    if (!res.ok) throw new DbError("reset_error", undefined, res.status);
  }

  onChange(cb: (u: AuthUser | null) => void) {
    this.listeners.add(cb);
    return () => { this.listeners.delete(cb); };
  }

  async accessToken(): Promise<string | null> {
    const s = this.session;
    if (!s) return null;
    if (s.expires_at - 60 > Date.now() / 1000) return s.access_token;
    if (!this.refreshing) {
      this.refreshing = this.tokenRequest("refresh_token", { refresh_token: s.refresh_token })
        .catch(() => this.store(null))
        .finally(() => { this.refreshing = null; });
    }
    await this.refreshing;
    return this.session?.access_token ?? null;
  }
}

function enc(v: string | number | boolean) { return encodeURIComponent(String(v)); }

function filterQuery(filter?: Filter): string[] {
  const q: string[] = [];
  for (const [col, v] of Object.entries(filter ?? {})) {
    if (v === null) q.push(`${col}=is.null`);
    else if (Array.isArray(v)) q.push(`${col}=in.(${v.map((x) => `"${String(x).replace(/"/g, '\\"')}"`).map(encodeURIComponent).join(",")})`);
    else q.push(`${col}=eq.${enc(v)}`);
  }
  return q;
}

export class SupabaseDb implements Db {
  readonly mode = "supabase" as const;
  readonly canUpload = true;
  constructor(private url: string, private key: string, private auth: SupabaseAuth) {}

  private async headers(extra: Record<string, string> = {}) {
    const token = (await this.auth.accessToken()) ?? this.key;
    return { apikey: this.key, Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...extra };
  }

  private async request<T>(path: string, init: RequestInit & { headers?: Record<string, string> } = {}): Promise<T> {
    const res = await fetch(`${this.url}${path}`, { ...init, headers: await this.headers(init.headers) });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new DbError(data.message || res.statusText, data.code, res.status);
    }
    if (res.status === 204) return [] as unknown as T;
    const text = await res.text();
    return (text ? JSON.parse(text) : []) as T;
  }

  async select<T>(table: string, filter?: Filter, opts?: SelectOptions): Promise<T[]> {
    const q = ["select=*", ...filterQuery(filter)];
    if (opts?.order) q.push(`order=${opts.order}`);
    const all: T[] = [];
    for (let from = 0; ; from += PAGE) {
      const page = await this.request<T[]>(`/rest/v1/${table}?${q.join("&")}`, {
        headers: { "Range-Unit": "items", Range: `${from}-${from + PAGE - 1}` },
      });
      all.push(...page);
      if (page.length < PAGE) break;
    }
    return all;
  }

  insert<T>(table: string, rows: object | object[]) {
    return this.request<T[]>(`/rest/v1/${table}`, {
      method: "POST", body: JSON.stringify(rows), headers: { Prefer: "return=representation" },
    });
  }

  update<T>(table: string, filter: Filter, patch: object) {
    return this.request<T[]>(`/rest/v1/${table}?${filterQuery(filter).join("&")}`, {
      method: "PATCH", body: JSON.stringify(patch), headers: { Prefer: "return=representation" },
    });
  }

  upsert<T>(table: string, rows: object | object[], onConflict: string) {
    return this.request<T[]>(`/rest/v1/${table}?on_conflict=${onConflict}`, {
      method: "POST", body: JSON.stringify(rows),
      headers: { Prefer: "return=representation,resolution=merge-duplicates" },
    });
  }

  async remove(table: string, filter: Filter) {
    const q = filterQuery(filter);
    if (!q.length) throw new DbError("refusing to delete without a filter");
    await this.request(`/rest/v1/${table}?${q.join("&")}`, { method: "DELETE" });
  }

  rpc<T>(fn: string, args: object = {}) {
    return this.request<T>(`/rest/v1/rpc/${fn}`, { method: "POST", body: JSON.stringify(args) });
  }

  async uploadFile(file: File, folder: string) {
    const ext = (file.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
    const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const token = (await this.auth.accessToken()) ?? this.key;
    const res = await fetch(`${this.url}/storage/v1/object/media/${path}`, {
      method: "POST",
      headers: { apikey: this.key, Authorization: `Bearer ${token}`, "Content-Type": file.type || "application/octet-stream", "x-upsert": "false" },
      body: file,
    });
    if (!res.ok) throw new DbError("upload_failed", undefined, res.status);
    return { path, url: `${this.url}/storage/v1/object/public/media/${path}` };
  }

  async removeFile(path: string) {
    await this.request(`/storage/v1/object/media`, { method: "DELETE", body: JSON.stringify({ prefixes: [path] }) });
  }
}
