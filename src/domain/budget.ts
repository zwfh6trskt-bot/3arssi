// Pure budget logic for ONE event and ONE side. There is intentionally no
// function that combines several events: 3ARSSI has no wedding-wide budget.

export interface CategoryLine {
  categoryKey: string;
  allocated: number;      // planned amount (not spending)
  spent: number;          // paid + committed for this category
}

export interface CategoryFigures extends CategoryLine {
  remaining: number;      // allocated − spent (may be negative)
  overspent: boolean;
}

export interface EventBudgetFigures {
  total: number;
  allocated: number;
  unallocated: number;    // total − Σ allocations (may be negative)
  spent: number;          // Σ expenses for the event (incl. uncategorised)
  overAllocated: boolean;
  categories: CategoryFigures[];
}

export const toAmount = (v: unknown): number => {
  const n = typeof v === "number" ? v : Number(String(v ?? "").replace(/[\s,]/g, ""));
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
};

/** Parses user input; returns null if it is not a valid non-negative amount. */
export function parseAmount(input: string): number | null {
  const s = input.replace(/[\s  ,]/g, "").replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
  if (s === "") return 0;
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 && n < 1e12 ? n : null;
}

export function computeEventBudget(
  total: number,
  lines: CategoryLine[],
  uncategorisedSpent = 0,
): EventBudgetFigures {
  const categories = lines.map((l) => {
    const remaining = toAmount(l.allocated - l.spent);
    return { ...l, remaining, overspent: l.spent > l.allocated };
  });
  const allocated = toAmount(categories.reduce((s, c) => s + c.allocated, 0));
  const spent = toAmount(categories.reduce((s, c) => s + c.spent, 0) + uncategorisedSpent);
  const unallocated = toAmount(total - allocated);
  return { total, allocated, unallocated, spent, overAllocated: allocated > total, categories };
}
