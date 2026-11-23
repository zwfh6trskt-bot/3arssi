// Pure price-estimation logic.
// Only records of the SAME price item (and therefore the same unit) are
// ever combined. Records without both prices, disabled records and
// 'quote'-unit items yield "unavailable".
import type { PriceItem, PriceRecord, Unit } from "../data/types";

export type BudgetStatus = "within" | "may_exceed" | "over" | "unavailable";

export interface PriceRange {
  min: number; max: number; unit: Unit;
  records: PriceRecord[];
  regionMatched: boolean;   // true when filtered to the requested wilaya
  minQuantity: number | null;
  lastUpdated: string | null;
}

export interface Estimate {
  status: BudgetStatus | "no_budget";
  range: PriceRange | null;
  minTotal: number | null;
  maxTotal: number | null;
  belowMinQuantity: boolean;
}

/** Units that can be multiplied by a quantity the user types. */
export const QUANTITY_UNITS: Unit[] = ["piece", "kg", "person", "hour", "day", "package", "event"];

export function priceRange(item: PriceItem, all: PriceRecord[], wilayaId?: string | null): PriceRange | null {
  if (item.unit === "quote" || !item.enabled) return null;
  const usable = all.filter((r) => r.price_item_id === item.id && r.enabled
    && r.min_price !== null && r.max_price !== null && r.max_price >= r.min_price);
  if (!usable.length) return null;
  const local = wilayaId ? usable.filter((r) => r.wilaya_id === wilayaId) : [];
  const set = local.length ? local : usable;
  const mins = set.map((r) => r.min_quantity).filter((q): q is number => q !== null);
  return {
    min: Math.min(...set.map((r) => Number(r.min_price))),
    max: Math.max(...set.map((r) => Number(r.max_price))),
    unit: item.unit,
    records: set,
    regionMatched: local.length > 0,
    minQuantity: mins.length ? Math.min(...mins) : null,
    lastUpdated: set.map((r) => r.updated_on).sort().at(-1) ?? null,
  };
}

/** Status of an estimated interval against a budget (brief §9). */
export function budgetStatus(minTotal: number | null, maxTotal: number | null, budget: number | null): BudgetStatus | "no_budget" {
  if (minTotal === null || maxTotal === null) return "unavailable";
  if (budget === null || budget <= 0) return "no_budget";
  if (maxTotal <= budget) return "within";
  if (minTotal <= budget) return "may_exceed";
  return "over";
}

export function estimate(item: PriceItem, records: PriceRecord[], quantity: number, budget: number | null, wilayaId?: string | null): Estimate {
  const range = priceRange(item, records, wilayaId);
  if (!range || !(quantity > 0) || !QUANTITY_UNITS.includes(item.unit)) {
    return { status: "unavailable", range, minTotal: null, maxTotal: null, belowMinQuantity: false };
  }
  const minTotal = Math.round(quantity * range.min * 100) / 100;
  const maxTotal = Math.round(quantity * range.max * 100) / 100;
  return {
    status: budgetStatus(minTotal, maxTotal, budget),
    range, minTotal, maxTotal,
    belowMinQuantity: range.minQuantity !== null && quantity < range.minQuantity,
  };
}

/** Combines several estimate lines of ONE category (all in DA, so additive). */
export function combine(lines: Estimate[], budget: number | null) {
  const ok = lines.filter((l) => l.minTotal !== null && l.maxTotal !== null);
  const minTotal = ok.reduce((s, l) => s + (l.minTotal ?? 0), 0);
  const maxTotal = ok.reduce((s, l) => s + (l.maxTotal ?? 0), 0);
  return {
    minTotal: ok.length ? minTotal : null,
    maxTotal: ok.length ? maxTotal : null,
    partial: ok.length < lines.length,
    status: ok.length ? budgetStatus(minTotal, maxTotal, budget) : ("unavailable" as const),
  };
}
