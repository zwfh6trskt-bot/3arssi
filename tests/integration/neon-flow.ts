// End-to-end check of the real Neon adapter (src/data/db/neon.ts) against the
// hosted Neon Auth + Data API. Runs outside a browser, so it shims
// localStorage, location and a per-"device" cookie jar that behaves like a
// browser sending the Neon Auth session cookie (credentials: "include").
// Bundle:  bun build tests/integration/neon-flow.ts --target=node --format=esm --outfile=/tmp/flow/index.mjs
// It is deployed as a temporary Neon Function and writes results with report().
import { NeonAuth, NeonDb } from "../../src/data/db/neon";

type Report = (step: string, ok: boolean, detail?: unknown) => Promise<void>;
const ORIGIN = "https://zwfh6trskt-bot.github.io";

/** A simulated browser profile: its own cookies and its own localStorage. */
function device(name: string) {
  const jar = new Map<string, string>();
  const store = new Map<string, string>();
  const realFetch = globalThis.fetch;
  const fetchImpl = async (input: string | URL | Request, init: RequestInit = {}) => {
    const url = new URL(String(input instanceof Request ? input.url : input));
    const headers = new Headers(init.headers);
    headers.set("Origin", ORIGIN);
    if (init.credentials === "include" && jar.size) headers.set("Cookie", [...jar].map(([k, v]) => `${k}=${v}`).join("; "));
    const res = await realFetch(url, { ...init, headers });
    for (const c of res.headers.getSetCookie?.() ?? []) {
      const [kv, ...attrs] = c.split(";");
      const i = kv.indexOf("=");
      const k = kv.slice(0, i).trim(), v = kv.slice(i + 1).trim();
      if (!v || attrs.some((a) => /max-age=0/i.test(a))) jar.delete(k); else jar.set(k, v);
    }
    return res;
  };
  const localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
  };
  /** Runs fn with this device's globals installed. */
  const use = async <T>(fn: () => Promise<T>): Promise<T> => {
    const g = globalThis as any;
    const prev = { fetch: g.fetch, localStorage: g.localStorage, location: g.location };
    g.fetch = fetchImpl; g.localStorage = localStorage; g.location = { origin: ORIGIN };
    try { return await fn(); } finally { Object.assign(g, prev); }
  };
  return { name, use };
}

export async function runFlow(authUrl: string, restUrl: string, report: Report) {
  const step = async <T>(name: string, fn: () => Promise<T>, check?: (v: T) => boolean): Promise<T | undefined> => {
    try {
      const v = await fn();
      const ok = check ? check(v) : true;
      await report(name, ok, Array.isArray(v) ? { rows: v.length } : v);
      return v;
    } catch (e: any) { await report(name, false, { error: e?.message, code: e?.code, status: e?.status }); return undefined; }
  };
  const expectFail = async (name: string, fn: () => Promise<unknown>) => {
    try { const v = await fn(); await report(name, Array.isArray(v) && v.length === 0, { unexpected: v }); }
    catch (e: any) { await report(name, true, { blocked: e?.message }); }
  };

  const phone = device("phone"), laptop = device("laptop"), other = device("other");
  const email = `flow-${Date.now()}@example.com`, password = "Flow-test-pass-123";

  // Visitor (no account) can read public content
  await phone.use(async () => {
    const a = new NeonAuth(authUrl), db = new NeonDb(restUrl, a);
    await step("visitor reads events", () => db.select<any>("events", { enabled: true }, { order: "sort_order" }), (r) => r.length === 9);
    await step("visitor reads translations (paged)", () => db.select<any>("translations"), (r) => r.length > 1000);
    await expectFail("visitor cannot read profiles", () => db.select("profiles"));
  });

  // Phone: sign up, build a plan
  const ids: Record<string, string> = {};
  await phone.use(async () => {
    const a = new NeonAuth(authUrl), db = new NeonDb(restUrl, a);
    await step("sign up", () => a.signUp(email, password, "Flow Bride"), (r) => !r.needsConfirmation);
    const p = await step("ensure_profile", () => db.rpc<any>("ensure_profile"), (r) => r?.display_name === "Flow Bride" && r.role === "user");
    ids.user = p?.id;
    const [plan] = (await step("create plan (insert returning)", () => db.insert<any>("plans", { owner_id: ids.user }), (r) => r.length === 1)) ?? [];
    ids.plan = plan?.id;
    const events = await db.select<any>("events", { enabled: true });
    await step("add suggested events", () => db.insert<any>("plan_events", events.map((e) => ({ plan_id: ids.plan, event_id: e.id, side: e.side, sort_order: e.sort_order }))), (r) => r.length === 9);
    const [pe] = await db.select<any>("plan_events", { plan_id: ids.plan }, { order: "sort_order" });
    ids.pe = pe.id;
    await step("rename + disable event", () => db.update<any>("plan_events", { id: ids.pe }, { custom_name: "Jehaz dyali", enabled: false }), (r) => r[0]?.custom_name === "Jehaz dyali");
    await step("custom event", () => db.insert<any>("plan_events", { plan_id: ids.plan, event_id: null, custom_name: "Sbou3", side: "both", sort_order: 999 }), (r) => r.length === 1);
    await step("event budget upsert", () => db.upsert<any>("event_budgets", { plan_event_id: ids.pe, side: "bride", total_amount: 80000 }, "plan_event_id,side"), (r) => Number(r[0]?.total_amount) === 80000);
    await step("event budget upsert again (merge)", () => db.upsert<any>("event_budgets", { plan_event_id: ids.pe, side: "bride", total_amount: 90000 }, "plan_event_id,side"), (r) => Number(r[0]?.total_amount) === 90000);
    const cats = await db.select<any>("categories", { event_id: pe.event_id });
    const [pc] = (await step("plan category upsert", () => db.upsert<any>("plan_categories", { plan_event_id: ids.pe, category_id: cats[0].id, side: "bride", notes: "n" }, "plan_event_id,category_id"), (r) => r.length === 1)) ?? [];
    ids.pc = pc?.id;
    await step("allocation upsert", () => db.upsert<any>("category_allocations", { plan_category_id: ids.pc, side: "bride", amount: 70000 }, "plan_category_id,side"), (r) => Number(r[0]?.amount) === 70000);
    const [ex] = (await step("expense insert", () => db.insert<any>("expenses", { plan_event_id: ids.pe, plan_category_id: ids.pc, side: "bride", label: "Tissu", amount: 12000 }), (r) => r.length === 1)) ?? [];
    await step("expense update", () => db.update<any>("expenses", { id: ex.id }, { amount: 15000 }), (r) => Number(r[0]?.amount) === 15000);
    await step("task upsert", () => db.upsert<any>("plan_tasks", { plan_category_id: ids.pc, label: "Choisir le tissu", done: true }, "plan_category_id,content_item_id"), (r) => r.length === 1);
    const [pi] = await db.select<any>("price_items");
    await step("estimate insert", () => db.insert<any>("plan_estimates", { plan_category_id: ids.pc, side: "bride", price_item_id: pi.id, quantity: 200 }), (r) => r.length === 1);
    const [prov] = await db.select<any>("providers");
    await step("save provider", () => db.insert<any>("saved_providers", { plan_id: ids.plan, provider_id: prov.id }), (r) => r.length === 1);
    await step("profile language update", () => db.update<any>("profiles", { id: ids.user }, { preferred_lang: "fr" }), (r) => r[0]?.preferred_lang === "fr");
    await expectFail("user cannot make themselves admin", () => db.update("profiles", { id: ids.user }, { role: "admin" }));
    await expectFail("user cannot edit content", () => db.insert("events", { slug: "x", side: "both" }));
    await expectFail("user cannot list users", () => db.rpc("admin_list_users"));
    ids.expenseCount = String((await db.select("expenses")).length);
  });

  // Same phone, app reopened later: session restored from storage + cookie
  await phone.use(async () => {
    const a = new NeonAuth(authUrl), db = new NeonDb(restUrl, a);
    await step("reopen: still signed in", async () => a.currentUser()?.email, (v) => v === email);
    await step("reopen: data still there", () => db.select<any>("plan_events", { plan_id: ids.plan }), (r) => r.length === 10);
  });

  // Laptop: sign in with the same account → sees the same plan (cross-device sync)
  await laptop.use(async () => {
    const a = new NeonAuth(authUrl), db = new NeonDb(restUrl, a);
    await step("laptop sign in", () => a.signIn(email, password));
    await step("laptop sees same events", () => db.select<any>("plan_events", { plan_id: ids.plan }), (r) => r.length === 10 && r.some((e) => e.custom_name === "Jehaz dyali"));
    await step("laptop sees budget", () => db.select<any>("event_budgets", { plan_event_id: ids.pe }), (r) => Number(r[0]?.total_amount) === 90000);
    await step("laptop edits budget", () => db.upsert<any>("event_budgets", { plan_event_id: ids.pe, side: "bride", total_amount: 95000 }, "plan_event_id,side"), (r) => Number(r[0]?.total_amount) === 95000);
  });
  await phone.use(async () => {
    const a = new NeonAuth(authUrl), db = new NeonDb(restUrl, a);
    await step("phone sees laptop change", () => db.select<any>("event_budgets", { plan_event_id: ids.pe }), (r) => Number(r[0]?.total_amount) === 95000);
  });

  // Another account cannot see or change it
  await other.use(async () => {
    const a = new NeonAuth(authUrl), db = new NeonDb(restUrl, a);
    await step("other user sign up", () => a.signUp(`other-${Date.now()}@example.com`, password, "Other"));
    await step("other ensure_profile", () => db.rpc<any>("ensure_profile"), (r) => !!r?.id);
    await step("other sees no plans", () => db.select<any>("plans"), (r) => r.length === 0);
    await step("other sees no expenses", () => db.select<any>("expenses"), (r) => r.length === 0);
    await step("other cannot update first user's event", () => db.update<any>("plan_events", { id: ids.pe }, { custom_name: "hacked" }), (r) => r.length === 0);
    await step("other cannot delete first user's expenses (no rows hit)", async () => { await db.remove("expenses", { plan_event_id: ids.pe }); return "ok"; });
  });
  await phone.use(async () => {
    const a = new NeonAuth(authUrl), db = new NeonDb(restUrl, a);
    await step("first user's data intact", () => db.select<any>("expenses"), (r) => String(r.length) === ids.expenseCount);
    await step("sign out", () => a.signOut());
    await step("after sign out: not signed in", async () => a.currentUser(), (v) => v === null);
    await step("after sign out: reads as visitor", () => db.select<any>("plans"), (r) => r.length === 0);
  });
  await phone.use(async () => {
    const a = new NeonAuth(authUrl);
    await expectFail("wrong password rejected", () => a.signIn(email, "wrong-password-123"));
  });
}
