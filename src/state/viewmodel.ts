// Merges admin content with the user's personalisation into what a page shows.
// URL references: admin events/categories use their stable id; the user's own
// custom events/categories use "c-<plan row id>".
import { computeEventBudget, type EventBudgetFigures } from "../domain/budget";
import type { Category, EventRow, PlanCategory, PlanEvent, Side, SideScope } from "../data/types";
import type { PlanData } from "./app";
import { visibleFor, type Content } from "./content";

export interface EventVM {
  ref: string; event: EventRow | null; pe: PlanEvent | null;
  name: string; description: string; icon: string; side: SideScope; enabled: boolean; removed: boolean;
}
export interface CategoryVM {
  ref: string; category: Category | null; pc: PlanCategory | null;
  name: string; description: string; icon: string; side: SideScope; enabled: boolean; custom: boolean;
  subs: CategoryVM[];
}

function eventVM(c: Content, pe: PlanEvent | null, ev: EventRow | null): EventVM {
  return {
    ref: ev ? ev.id : `c-${pe!.id}`, event: ev, pe,
    name: pe?.custom_name?.trim() || c.eventName(ev) || "—",
    description: ev ? c.text("event", ev.id, "description") : "",
    icon: ev?.icon || "arch",
    side: pe?.side ?? ev?.side ?? "both",
    enabled: pe ? pe.enabled : true,
    removed: !!pe?.removed_at,
  };
}

export function spaceEvents(c: Content, plan: PlanData | null, side: Side, opts: { all?: boolean } = {}): EventVM[] {
  if (!plan) return c.eventsFor(side).map((e) => eventVM(c, null, e));
  return plan.events
    .filter((pe) => !pe.event_id || c.event(pe.event_id)?.enabled)
    .filter((pe) => visibleFor(pe.side, side))
    .filter((pe) => opts.all || (pe.enabled && !pe.removed_at))
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((pe) => eventVM(c, pe, c.event(pe.event_id)));
}

/** Every plan event (both sides), for the personalisation screen. */
export function allPlanEvents(c: Content, plan: PlanData): EventVM[] {
  return plan.events
    .filter((pe) => !pe.event_id || c.event(pe.event_id)?.enabled)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((pe) => eventVM(c, pe, c.event(pe.event_id)));
}

export function resolveEvent(c: Content, plan: PlanData | null, ref: string): EventVM | null {
  if (ref.startsWith("c-")) {
    const pe = plan?.events.find((e) => e.id === ref.slice(2));
    return pe ? eventVM(c, pe, null) : null;
  }
  const ev = c.event(ref);
  if (!ev || !ev.enabled) return null;
  const pe = plan?.events.find((e) => e.event_id === ev.id) ?? null;
  return eventVM(c, pe, ev);
}

function catVM(c: Content, cat: Category | null, pc: PlanCategory | null, side: Side, plan: PlanData | null, peId?: string): CategoryVM {
  return {
    ref: cat ? cat.id : `c-${pc!.id}`, category: cat, pc,
    name: pc?.custom_name?.trim() || c.categoryName(cat) || "—",
    description: cat ? c.text("category", cat.id, "description") : "",
    icon: cat?.icon || "list",
    side: pc?.side ?? cat?.side ?? side,
    enabled: pc ? pc.enabled : true,
    custom: !cat,
    subs: cat ? c.categoriesOf(cat.event_id, side, cat.id).map((s) => catVM(c, s, findPc(plan, peId, s.id), side, plan, peId)) : [],
  };
}
const findPc = (plan: PlanData | null, peId: string | undefined, catId: string) =>
  (peId && plan?.categories.find((x) => x.plan_event_id === peId && x.category_id === catId)) || null;

export function eventCategories(c: Content, plan: PlanData | null, ev: EventVM, side: Side, opts: { all?: boolean } = {}): CategoryVM[] {
  const pcs = ev.pe ? plan?.categories.filter((x) => x.plan_event_id === ev.pe!.id) ?? [] : [];
  const out: { vm: CategoryVM; order: number }[] = [];
  if (ev.event) {
    for (const cat of c.categoriesOf(ev.event.id, side)) {
      const pc = pcs.find((x) => x.category_id === cat.id) ?? null;
      out.push({ vm: catVM(c, cat, pc, side, plan, ev.pe?.id), order: pc?.sort_order || cat.sort_order });
    }
  }
  for (const pc of pcs.filter((x) => !x.category_id && visibleFor(x.side, side))) {
    out.push({ vm: catVM(c, null, pc, side, plan, ev.pe?.id), order: pc.sort_order });
  }
  return out.filter((x) => opts.all || x.vm.enabled).sort((a, b) => a.order - b.order).map((x) => x.vm);
}

export function resolveCategory(c: Content, plan: PlanData | null, ev: EventVM, side: Side, ref: string): CategoryVM | null {
  const flat = eventCategories(c, plan, ev, side, { all: true }).flatMap((x) => [x, ...x.subs]);
  return flat.find((x) => x.ref === ref) ?? null;
}

export interface EventBudgetVM extends EventBudgetFigures {
  hasBudget: boolean;
  lines: { vm: CategoryVM; allocated: number; spent: number; remaining: number; overspent: boolean }[];
  uncategorisedSpent: number;
}

/** Budget for ONE event and ONE side. Never aggregates across events. */
export function eventBudget(c: Content, plan: PlanData | null, ev: EventVM, side: Side): EventBudgetVM {
  const cats = eventCategories(c, plan, ev, side);
  const peId = ev.pe?.id;
  const budget = plan?.budgets.find((b) => b.plan_event_id === peId && b.side === side);
  const expenses = plan?.expenses.filter((e) => e.plan_event_id === peId && e.side === side) ?? [];
  const lineFor = (vm: CategoryVM) => {
    const allocated = vm.pc ? Number(plan?.allocations.find((a) => a.plan_category_id === vm.pc!.id && a.side === side)?.amount ?? 0) : 0;
    const spent = vm.pc ? expenses.filter((e) => e.plan_category_id === vm.pc!.id).reduce((s, e) => s + Number(e.amount), 0) : 0;
    return { categoryKey: vm.ref, allocated, spent };
  };
  const raw = cats.map(lineFor);
  const known = new Set(cats.map((x) => x.pc?.id).filter(Boolean));
  const uncategorisedSpent = expenses.filter((e) => !e.plan_category_id || !known.has(e.plan_category_id)).reduce((s, e) => s + Number(e.amount), 0);
  const figures = computeEventBudget(Number(budget?.total_amount ?? 0), raw, uncategorisedSpent);
  return {
    ...figures, hasBudget: !!budget, uncategorisedSpent,
    lines: figures.categories.map((f, i) => ({ vm: cats[i], allocated: f.allocated, spent: f.spent, remaining: f.remaining, overspent: f.overspent })),
  };
}

export const spacePath = (side: Side, rest = "") => `/s/${side === "bride" ? "3rossa" : "3ris"}${rest}`;
export const sideFromSlug = (s: string): Side | null => (s === "3rossa" ? "bride" : s === "3ris" ? "groom" : null);
