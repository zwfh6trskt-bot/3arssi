// Application state: public content, signed-in user, profile and personal plan.
// Pages read from here and call the actions; they never touch the db directly.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { auth, db } from "../data/client";
import type { AuthUser } from "../data/db/types";
import {
  CONTENT_TABLES, type CategoryAllocation, type ContentSnapshot, type EventBudget, type Expense, type Plan,
  type PlanCategory, type PlanEstimate, type PlanEvent, type PlanTask, type Profile, type SavedProvider, type Side, type SideScope,
} from "../data/types";
import { useI18n } from "../i18n/i18n";
import { Content } from "./content";

export interface PlanData {
  plan: Plan;
  events: PlanEvent[];
  categories: PlanCategory[];
  budgets: EventBudget[];
  allocations: CategoryAllocation[];
  expenses: Expense[];
  tasks: PlanTask[];
  estimates: PlanEstimate[];
  saved: SavedProvider[];
}

type ListKey = Exclude<keyof PlanData, "plan">;
type RowOf<K extends ListKey> = PlanData[K][number];

interface AppState {
  ready: boolean;
  error: string | null;
  content: Content | null;
  reloadContent: () => Promise<void>;
  user: AuthUser | null;
  profile: Profile | null;
  isStaff: boolean;
  isAdmin: boolean;
  plan: PlanData | null;
  planLoading: boolean;
  actions: ReturnType<typeof makeActions>;
  toast: string | null;
  showToast: (m: string) => void;
}

const Ctx = createContext<AppState | null>(null);
let ensuring: Promise<void> | null = null; // single-flight guard for ensurePlan

async function loadSnapshot(): Promise<ContentSnapshot> {
  const entries = await Promise.all(CONTENT_TABLES.map(async (t) => [t, await db.select(t)] as const));
  return Object.fromEntries(entries) as unknown as ContentSnapshot;
}

async function loadPlan(userId: string): Promise<PlanData | null> {
  const [plan] = await db.select<Plan>("plans", { owner_id: userId });
  if (!plan) return null;
  const events = await db.select<PlanEvent>("plan_events", { plan_id: plan.id }, { order: "sort_order" });
  const eIds = events.map((e) => e.id);
  const none = ["00000000-0000-0000-0000-000000000000"];
  const [categories, budgets, expenses, saved] = await Promise.all([
    db.select<PlanCategory>("plan_categories", { plan_event_id: eIds.length ? eIds : none }),
    db.select<EventBudget>("event_budgets", { plan_event_id: eIds.length ? eIds : none }),
    db.select<Expense>("expenses", { plan_event_id: eIds.length ? eIds : none }, { order: "created_at" }),
    db.select<SavedProvider>("saved_providers", { plan_id: plan.id }),
  ]);
  const cIds = categories.map((c) => c.id);
  const [allocations, tasks, estimates] = await Promise.all([
    db.select<CategoryAllocation>("category_allocations", { plan_category_id: cIds.length ? cIds : none }),
    db.select<PlanTask>("plan_tasks", { plan_category_id: cIds.length ? cIds : none }, { order: "sort_order" }),
    db.select<PlanEstimate>("plan_estimates", { plan_category_id: cIds.length ? cIds : none }, { order: "created_at" }),
  ]);
  return { plan, events, categories, budgets, allocations, expenses, tasks, estimates, saved };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const { lang, setOverrides } = useI18n();
  const [snap, setSnap] = useState<ContentSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(auth.currentUser());
  const [profile, setProfile] = useState<Profile | null>(null);
  const [plan, setPlan] = useState<PlanData | null>(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const planRef = useRef<PlanData | null>(null);
  const toastTimer = useRef<number>(0);

  const showToast = useCallback((m: string) => {
    setToast(m);
    clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2600);
  }, []);

  const reloadContent = useCallback(async () => {
    try {
      const s = await loadSnapshot();
      setSnap(s);
      setOverrides(s.ui_translations);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [setOverrides]);

  const reloadPlan = useCallback(async (u: AuthUser | null): Promise<PlanData | null> => {
    if (!u) { planRef.current = null; setPlan(null); setProfile(null); return null; }
    setPlanLoading(true);
    try {
      const [p] = await db.select<Profile>("profiles", { id: u.id });
      setProfile(p ?? null);
      const data = await loadPlan(u.id);
      planRef.current = data;
      setPlan(data);
      return data;
    } catch (e) {
      console.error(e);
      return null;
    } finally { setPlanLoading(false); }
  }, []);

  useEffect(() => { reloadContent(); }, [reloadContent]);
  useEffect(() => auth.onChange((u) => { setUser(u); reloadPlan(u); }), [reloadPlan]);
  useEffect(() => { reloadPlan(auth.currentUser()); }, [reloadPlan]);

  // Pick up changes made on another device when the app comes back to the foreground.
  useEffect(() => {
    let last = Date.now();
    const onVis = () => {
      if (document.visibilityState === "visible" && Date.now() - last > 15000) {
        last = Date.now();
        reloadContent();
        reloadPlan(auth.currentUser());
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [reloadContent, reloadPlan]);

  const content = useMemo(() => (snap ? new Content(snap, lang) : null), [snap, lang]);

  const actions = useMemo(() => makeActions({
    getPlan: () => planRef.current,
    setPlan: (fn) => {
      if (planRef.current) planRef.current = fn(planRef.current);
      setPlan(planRef.current);
    },
    replacePlan: setPlan,
    getUser: () => auth.currentUser(),
    content: () => content,
    reloadPlan: () => reloadPlan(auth.currentUser()),
  }), [content, reloadPlan]);

  const role = profile?.role ?? "user";
  const value: AppState = {
    ready: !!snap, error, content, reloadContent, user, profile,
    isStaff: role === "editor" || role === "admin", isAdmin: role === "admin",
    plan, planLoading, actions, toast, showToast,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApp outside provider");
  return v;
}

// --------------------------------------------------------------------------
// Plan actions
// --------------------------------------------------------------------------
interface ActionDeps {
  getPlan: () => PlanData | null;
  setPlan: (fn: (p: PlanData) => PlanData) => void;
  replacePlan: (p: PlanData | null) => void;
  getUser: () => AuthUser | null;
  content: () => Content | null;
  reloadPlan: () => Promise<PlanData | null>;
}

function makeActions(d: ActionDeps) {
  const keyOf = (k: ListKey, r: any) => (k === "saved" ? `${r.plan_id}:${r.provider_id}` : r.id);
  const merge = <K extends ListKey>(k: K, rows: RowOf<K>[]) => d.setPlan((p) => {
    const list = [...(p[k] as RowOf<K>[])];
    for (const r of rows) {
      const i = list.findIndex((x) => keyOf(k, x) === keyOf(k, r));
      if (i >= 0) list[i] = r; else list.push(r);
    }
    return { ...p, [k]: list };
  });
  const drop = <K extends ListKey>(k: K, pred: (r: RowOf<K>) => boolean) =>
    d.setPlan((p) => ({ ...p, [k]: (p[k] as RowOf<K>[]).filter((r) => !pred(r)) }));

  const requirePlan = () => {
    const p = d.getPlan();
    if (!p) throw new Error("plan_required");
    return p;
  };

  const ensurePlanOnce = async () => {
    const u = d.getUser();
    const c = d.content();
    if (!u || !c) return;
    let p = d.getPlan();
    if (!p || p.plan.owner_id !== u.id) {
      const [existing] = await db.select<Plan>("plans", { owner_id: u.id });
      if (!existing) {
        const [plan] = await db.insert<Plan>("plans", { owner_id: u.id });
        if (db.mode === "local") await db.insert("plan_members", { plan_id: plan.id, user_id: u.id, role: "owner" });
      }
      p = await d.reloadPlan();
      if (!p) return;
    }
    // Re-read from the database so a concurrent run can never insert duplicates.
    const current = await db.select<PlanEvent>("plan_events", { plan_id: p.plan.id });
    const known = new Set(current.map((e) => e.event_id).filter(Boolean));
    const missing = c.snap.events.filter((e) => e.enabled && !known.has(e.id));
    if (missing.length) {
      const rows = await db.insert<PlanEvent>("plan_events", missing.map((e) => ({
        plan_id: p!.plan.id, event_id: e.id, side: e.side, sort_order: e.sort_order, enabled: true,
      })));
      merge("events", rows);
    }
  };

  const a = {
    /** Creates the user's plan on first sign-in, then adds any new suggested events.
     *  Single-flight: many screens may call it at once; only one run happens. */
    ensurePlan() {
      if (!ensuring) ensuring = ensurePlanOnce().finally(() => { ensuring = null; });
      return ensuring;
    },

    async updateEvent(id: string, patch: Partial<PlanEvent>) {
      merge("events", await db.update<PlanEvent>("plan_events", { id }, patch));
    },
    async addCustomEvent(name: string, side: SideScope) {
      const p = requirePlan();
      const max = Math.max(0, ...p.events.map((e) => e.sort_order));
      const rows = await db.insert<PlanEvent>("plan_events", { plan_id: p.plan.id, event_id: null, custom_name: name, side, sort_order: max + 10 });
      merge("events", rows);
      return rows[0];
    },
    async removeEvent(pe: PlanEvent) {
      if (pe.event_id) await a.updateEvent(pe.id, { removed_at: new Date().toISOString() });
      else { await db.remove("plan_events", { id: pe.id }); drop("events", (r) => r.id === pe.id); }
    },
    async restoreEvent(pe: PlanEvent) { await a.updateEvent(pe.id, { removed_at: null }); },
    async reorderEvents(ordered: PlanEvent[]) {
      const rows: PlanEvent[] = [];
      for (let i = 0; i < ordered.length; i++) {
        if (ordered[i].sort_order !== (i + 1) * 10) rows.push(...(await db.update<PlanEvent>("plan_events", { id: ordered[i].id }, { sort_order: (i + 1) * 10 })));
      }
      merge("events", rows);
    },

    /** Returns (creating if needed) the user's row for an admin category or a custom one. */
    async ensureCategory(planEventId: string, categoryId: string, side: SideScope): Promise<PlanCategory> {
      const p = requirePlan();
      const found = p.categories.find((c) => c.plan_event_id === planEventId && c.category_id === categoryId);
      if (found) return found;
      const cat = d.content()?.category(categoryId);
      const rows = await db.upsert<PlanCategory>("plan_categories", {
        plan_event_id: planEventId, category_id: categoryId, side: cat?.side ?? side, sort_order: cat?.sort_order ?? 0, enabled: true,
      }, "plan_event_id,category_id");
      merge("categories", rows);
      return rows[0];
    },
    async updateCategory(id: string, patch: Partial<PlanCategory>) {
      merge("categories", await db.update<PlanCategory>("plan_categories", { id }, patch));
    },
    async addCustomCategory(planEventId: string, name: string, side: Side) {
      const p = requirePlan();
      const max = Math.max(0, ...p.categories.filter((c) => c.plan_event_id === planEventId).map((c) => c.sort_order), 1000);
      const rows = await db.insert<PlanCategory>("plan_categories", { plan_event_id: planEventId, category_id: null, custom_name: name, side, sort_order: max + 10 });
      merge("categories", rows);
      return rows[0];
    },
    async deleteCustomCategory(id: string) {
      await db.remove("plan_categories", { id });
      drop("categories", (r) => r.id === id);
      drop("allocations", (r) => r.plan_category_id === id);
      drop("tasks", (r) => r.plan_category_id === id);
      drop("estimates", (r) => r.plan_category_id === id);
      d.setPlan((p) => ({ ...p, expenses: p.expenses.map((e) => (e.plan_category_id === id ? { ...e, plan_category_id: null } : e)) }));
    },

    // ---- budgets (per event, per side) ----
    async setEventBudget(planEventId: string, side: Side, amount: number) {
      merge("budgets", await db.upsert<EventBudget>("event_budgets", { plan_event_id: planEventId, side, total_amount: amount }, "plan_event_id,side"));
    },
    async setAllocation(planCategoryId: string, side: Side, amount: number) {
      merge("allocations", await db.upsert<CategoryAllocation>("category_allocations", { plan_category_id: planCategoryId, side, amount }, "plan_category_id,side"));
    },
    async addExpense(row: Omit<Expense, "id" | "created_at" | "updated_at">) {
      merge("expenses", await db.insert<Expense>("expenses", row));
    },
    async updateExpense(id: string, patch: Partial<Expense>) {
      merge("expenses", await db.update<Expense>("expenses", { id }, patch));
    },
    async deleteExpense(id: string) { await db.remove("expenses", { id }); drop("expenses", (r) => r.id === id); },

    // ---- checklist ----
    async toggleItem(planCategoryId: string, contentItemId: string) {
      const p = requirePlan();
      const t = p.tasks.find((x) => x.plan_category_id === planCategoryId && x.content_item_id === contentItemId);
      const done = !(t?.done ?? false);
      merge("tasks", await db.upsert<PlanTask>("plan_tasks", {
        plan_category_id: planCategoryId, content_item_id: contentItemId, done, done_at: done ? new Date().toISOString() : null,
      }, "plan_category_id,content_item_id"));
    },
    async addTask(planCategoryId: string, label: string) {
      const p = requirePlan();
      const max = Math.max(0, ...p.tasks.filter((x) => x.plan_category_id === planCategoryId).map((x) => x.sort_order));
      merge("tasks", await db.insert<PlanTask>("plan_tasks", { plan_category_id: planCategoryId, label, sort_order: max + 10 }));
    },
    async toggleTask(task: PlanTask) {
      merge("tasks", await db.update<PlanTask>("plan_tasks", { id: task.id }, { done: !task.done, done_at: !task.done ? new Date().toISOString() : null }));
    },
    async deleteTask(id: string) { await db.remove("plan_tasks", { id }); drop("tasks", (r) => r.id === id); },

    // ---- estimates ----
    async addEstimate(row: Omit<PlanEstimate, "id" | "created_at" | "updated_at">) {
      merge("estimates", await db.insert<PlanEstimate>("plan_estimates", row));
    },
    async updateEstimate(id: string, patch: Partial<PlanEstimate>) {
      merge("estimates", await db.update<PlanEstimate>("plan_estimates", { id }, patch));
    },
    async deleteEstimate(id: string) { await db.remove("plan_estimates", { id }); drop("estimates", (r) => r.id === id); },

    // ---- saved providers ----
    async toggleSaved(providerId: string) {
      const p = requirePlan();
      if (p.saved.some((s) => s.provider_id === providerId)) {
        await db.remove("saved_providers", { plan_id: p.plan.id, provider_id: providerId });
        drop("saved", (r) => r.provider_id === providerId);
        return false;
      }
      merge("saved", await db.insert<SavedProvider>("saved_providers", { plan_id: p.plan.id, provider_id: providerId }));
      return true;
    },

    reload: d.reloadPlan,
  };
  return a;
}
