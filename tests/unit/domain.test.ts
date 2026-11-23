import { describe, expect, test } from "bun:test";
import { computeEventBudget, parseAmount } from "../../src/domain/budget";
import { budgetStatus, combine, estimate, priceRange } from "../../src/domain/estimate";
import type { PriceItem, PriceRecord } from "../../src/data/types";

const item = (unit: PriceItem["unit"] = "piece"): PriceItem => ({
  id: "i1", slug: "cakes", unit, service_type_id: null, sort_order: 0, enabled: true, is_demo: true,
});
const rec = (min: number | null, max: number | null, extra: Partial<PriceRecord> = {}): PriceRecord => ({
  id: Math.random().toString(), price_item_id: "i1", provider_id: "p", source_label: null, wilaya_id: "alger",
  commune_id: null, min_price: min, max_price: max, min_quantity: null, price_status: "indicative",
  updated_on: "2026-11-01", enabled: true, is_demo: true, ...extra,
});

describe("event budget (brief §8 example)", () => {
  const r = computeEventBudget(80000, [
    { categoryKey: "outfits", allocated: 25000, spent: 0 },
    { categoryKey: "makeup", allocated: 15000, spent: 0 },
    { categoryKey: "cakes", allocated: 20000, spent: 0 },
    { categoryKey: "drinks", allocated: 10000, spent: 0 },
  ]);
  test("allocated = 70,000", () => expect(r.allocated).toBe(70000));
  test("unallocated = 10,000", () => expect(r.unallocated).toBe(10000));
  test("not over-allocated", () => expect(r.overAllocated).toBe(false));
});

describe("spending is separate from allocation", () => {
  test("expense changes spent/remaining, not allocation", () => {
    const r = computeEventBudget(80000, [{ categoryKey: "cakes", allocated: 20000, spent: 5000 }]);
    expect(r.categories[0].allocated).toBe(20000);
    expect(r.categories[0].remaining).toBe(15000);
    expect(r.unallocated).toBe(60000);
    expect(r.spent).toBe(5000);
  });
  test("warnings", () => {
    const r = computeEventBudget(10000, [{ categoryKey: "a", allocated: 12000, spent: 13000 }]);
    expect(r.overAllocated).toBe(true);
    expect(r.unallocated).toBe(-2000);
    expect(r.categories[0].overspent).toBe(true);
  });
});

describe("price estimate (brief §9 example)", () => {
  const records = [rec(80, 100), rec(90, 120)];
  test("range is 80–120 per piece", () => {
    const r = priceRange(item(), records)!;
    expect([r.min, r.max]).toEqual([80, 120]);
  });
  test("200 pieces → 16,000–24,000; budget 20,000 → may exceed", () => {
    const e = estimate(item(), records, 200, 20000);
    expect([e.minTotal, e.maxTotal]).toEqual([16000, 24000]);
    expect(e.status).toBe("may_exceed");
  });
  test("statuses", () => {
    expect(budgetStatus(16000, 24000, 24000)).toBe("within");
    expect(budgetStatus(16000, 24000, 15999)).toBe("over");
    expect(budgetStatus(null, null, 1000)).toBe("unavailable");
    expect(budgetStatus(1, 2, null)).toBe("no_budget");
  });
  test("quote unit and missing prices are unavailable", () => {
    expect(estimate(item("quote"), records, 1, 1000).status).toBe("unavailable");
    expect(estimate(item(), [rec(null, null)], 10, 1000).status).toBe("unavailable");
    expect(estimate(item(), [rec(80, 120, { enabled: false })], 10, 1000).status).toBe("unavailable");
  });
  test("records of other items are never mixed in", () => {
    const r = priceRange(item(), [rec(80, 100), rec(1, 99999, { price_item_id: "other" })])!;
    expect([r.min, r.max]).toEqual([80, 100]);
  });
  test("wilaya filter used when data exists", () => {
    const r = priceRange(item(), [rec(80, 100, { wilaya_id: "oran" }), rec(200, 300)], "oran")!;
    expect([r.min, r.max, r.regionMatched]).toEqual([80, 100, true]);
    const f = priceRange(item(), [rec(200, 300)], "oran")!;
    expect(f.regionMatched).toBe(false);
  });
  test("minimum quantity flag", () => {
    expect(estimate(item(), [rec(80, 100, { min_quantity: 100 })], 50, 10000).belowMinQuantity).toBe(true);
  });
  test("combine lines", () => {
    const a = estimate(item(), records, 200, null);
    const c = combine([a, a], 50000);
    expect([c.minTotal, c.maxTotal, c.status]).toEqual([32000, 48000, "within"]);
  });
});

describe("amount parsing", () => {
  test("accepts spaces, commas and Arabic-Indic digits", () => {
    expect(parseAmount("80 000")).toBe(80000);
    expect(parseAmount("80,000")).toBe(80000);
    expect(parseAmount("٨٠٠٠٠")).toBe(80000);
    expect(parseAmount("")).toBe(0);
  });
  test("rejects invalid input", () => {
    expect(parseAmount("-5")).toBeNull();
    expect(parseAmount("abc")).toBeNull();
  });
});
