// Neon adapter: Neon Auth (managed Better Auth, REST) for accounts and the
// Neon Data API (PostgREST-compatible, /rest/v1) for data. Plain fetch, no SDK.
//
// Sessions: Neon Auth keeps the session in an HTTP-only cookie on its own
// domain. Browsers that allow that cookie (Chrome, Firefox, Android) use it
// directly. As a fallback the session token returned at sign-in is also sent
// as a Bearer token. Data requests use a short-lived JWT (≈15 min) obtained
// from /token and refreshed automatically.
import { BASE } from "../../lib/base";
import type { Auth, AuthUser, Db, Filter, SelectOptions } from "./types";
import { DbError } from "./types";

interface Stored { user: AuthUser; sessionToken: string | null }
const SESSION_KEY = "3arssi.neon.session.v1";
const PAGE = 1000;

function jwtExp(jwt: string): number {
  try {
    const p = JSON.parse(atob(jwt.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return typeof p.exp === "number" ? p.exp : 0;
  } catch { return 0; }
}

async function readJson(res: Response): Promise<Record<string, any>> {
  const text = await res.text().catch(() => "");
  try { return text ? JSON.parse(text) : {}; } catch { return { message: text }; }
}

function authError(data: Record<string, any>, status: number): DbError {
  return new DbError(data.message || data.code || "auth_error", data.code, status);
}

export class NeonAuth implements Auth {
  readonly mode = "neon" as const;
  private stored: Stored | null = null;
  private jwt: string | null = null;
  private anonJwt: string | null = null;
  private listeners = new Set<(u: AuthUser | null) => void>();
  private pending: Promise<string | null> | null = null;

  constructor(private authUrl: string) {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (raw) this.stored = JSON.parse(raw);
    } catch { this.stored = null; }
  }

  private save(s: Stored | null) {
    this.stored = s;
    if (!s) this.jwt = null;
    try {
      if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s));
      else localStorage.removeItem(SESSION_KEY);
    } catch { /* private mode */ }
    this.listeners.forEach((l) => l(s?.user ?? null));
  }

  private post(path: string, body: object, bearer?: string | null) {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (bearer) headers.Authorization = `Bearer ${bearer}`;
    return fetch(`${this.authUrl}${path}`, { method: "POST", credentials: "include", headers, body: JSON.stringify(body) });
  }

  /** Finishes sign-in/sign-up: keeps the session token and proves a JWT can be obtained. */
  private async establish(res: Response, data: Record<string, any>) {
    const user = data.user;
    if (!user?.id) throw new DbError("auth_error", undefined, res.status);
    const sessionToken = res.headers.get("set-auth-token") || data.token || data.session?.token || null;
    const headerJwt = res.headers.get("set-auth-jwt");
    this.stored = { user: { id: user.id, email: user.email }, sessionToken };
    this.jwt = headerJwt;
    const jwt = headerJwt ?? await this.fetchJwt();
    if (!jwt) {
      this.stored = null;
      // The browser refused the session cookie and the token fallback was not accepted.
      throw new DbError("session_blocked", "session_blocked", 401);
    }
    this.save(this.stored);
  }

  currentUser() { return this.stored?.user ?? null; }

  async signUp(email: string, password: string, displayName: string) {
    const name = displayName.trim() || email.split("@")[0];
    const res = await this.post("/sign-up/email", { email, password, name, callbackURL: location.origin + BASE + "/" });
    const data = await readJson(res);
    if (!res.ok) throw authError(data, res.status);
    if (!data.token && !res.headers.get("set-auth-token") && !data.user) return { needsConfirmation: true };
    await this.establish(res, data);
    return { needsConfirmation: false };
  }

  async signIn(email: string, password: string) {
    const res = await this.post("/sign-in/email", { email, password });
    const data = await readJson(res);
    if (!res.ok) throw authError(data, res.status);
    await this.establish(res, data);
  }

  async signOut() {
    const token = this.stored?.sessionToken;
    this.save(null);
    await this.post("/sign-out", {}, token).catch(() => undefined);
  }

  async resetPassword(email: string) {
    const res = await this.post("/request-password-reset", { email, redirectTo: location.origin + BASE + "/reset-password" });
    if (!res.ok) throw authError(await readJson(res), res.status);
  }

  async completePasswordReset(token: string, newPassword: string) {
    const res = await this.post("/reset-password", { token, newPassword });
    if (!res.ok) throw authError(await readJson(res), res.status);
  }

  onChange(cb: (u: AuthUser | null) => void) {
    this.listeners.add(cb);
    return () => { this.listeners.delete(cb); };
  }

  /** Asks Neon Auth for a fresh JWT: cookie first, then the Bearer session token. */
  private async fetchJwt(): Promise<string | null> {
    const attempts: (Record<string, string> | undefined)[] = [undefined];
    if (this.stored?.sessionToken) attempts.push({ Authorization: `Bearer ${this.stored.sessionToken}` });
    for (const headers of attempts) {
      for (const path of ["/token", "/get-session"]) {
        try {
          const res = await fetch(`${this.authUrl}${path}`, { credentials: "include", headers });
          if (!res.ok) continue;
          const headerJwt = res.headers.get("set-auth-jwt");
          const data = await readJson(res);
          const jwt = headerJwt || (path === "/token" ? data.token : null);
          if (jwt && jwt.split(".").length === 3) { this.jwt = jwt; return jwt; }
        } catch { /* network/CORS: try next */ }
      }
    }
    return null;
  }

  async accessToken(): Promise<string | null> {
    if (!this.stored) return null;
    if (this.jwt && jwtExp(this.jwt) - 60 > Date.now() / 1000) return this.jwt;
    if (!this.pending) {
      this.pending = this.fetchJwt().then((jwt) => {
        if (!jwt) this.save(null); // session expired or revoked
        return jwt;
      }).finally(() => { this.pending = null; });
    }
    return this.pending;
  }

  /** Short-lived JWT for visitors without an account (read-only public content). */
  async anonymousToken(): Promise<string | null> {
    if (this.anonJwt && jwtExp(this.anonJwt) - 30 > Date.now() / 1000) return this.anonJwt;
    try {
      const res = await fetch(`${this.authUrl}/token/anonymous`);
      if (!res.ok) return null;
      const data = await readJson(res);
      this.anonJwt = data.token ?? res.headers.get("set-auth-jwt") ?? null;
      return this.anonJwt;
    } catch { return null; }
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

export class NeonDb implements Db {
  readonly mode = "neon" as const;
  readonly canUpload = false;
  constructor(private restUrl: string, private auth: NeonAuth) {}

  private async request<T>(path: string, init: RequestInit & { headers?: Record<string, string> } = {}): Promise<T> {
    const send = (token: string | null) => fetch(`${this.restUrl}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...init.headers },
    });
    const userToken = await this.auth.accessToken();
    let res = await send(userToken);
    if (!userToken && res.status === 401) {
      // Visitors: the Data API may require an anonymous JWT.
      const anon = await this.auth.anonymousToken();
      if (anon) res = await send(anon);
    }
    if (!res.ok) {
      const data = await readJson(res);
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
      const page = await this.request<T[]>(`/${table}?${q.join("&")}&limit=${PAGE}&offset=${from}`);
      all.push(...page);
      if (page.length < PAGE) break;
    }
    return all;
  }

  insert<T>(table: string, rows: object | object[]) {
    return this.request<T[]>(`/${table}`, { method: "POST", body: JSON.stringify(rows), headers: { Prefer: "return=representation" } });
  }

  update<T>(table: string, filter: Filter, patch: object) {
    return this.request<T[]>(`/${table}?${filterQuery(filter).join("&")}`, {
      method: "PATCH", body: JSON.stringify(patch), headers: { Prefer: "return=representation" },
    });
  }

  upsert<T>(table: string, rows: object | object[], onConflict: string) {
    return this.request<T[]>(`/${table}?on_conflict=${onConflict}`, {
      method: "POST", body: JSON.stringify(rows), headers: { Prefer: "return=representation,resolution=merge-duplicates" },
    });
  }

  async remove(table: string, filter: Filter) {
    const q = filterQuery(filter);
    if (!q.length) throw new DbError("refusing to delete without a filter");
    await this.request(`/${table}?${q.join("&")}`, { method: "DELETE" });
  }

  rpc<T>(fn: string, args: object = {}) {
    return this.request<T>(`/rpc/${fn}`, { method: "POST", body: JSON.stringify(args) });
  }

  async uploadFile(): Promise<{ url: string; path: string }> {
    throw new DbError("uploads_unavailable", "uploads_unavailable");
  }

  async removeFile() { /* nothing stored by the app itself */ }
}
