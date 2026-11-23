// Small helper to declare seed rows together with their AR/FR/EN text.
import { seedId } from "../../lib/ids";
import type { EntityType, Lang } from "../types";

export type T3 = { en: string; fr: string; ar: string };
type RowObj = Record<string, any>;

export class SeedBuilder {
  tables: Record<string, RowObj[]> = {};
  private order: Record<string, number> = {};

  constructor(private origin: "reference" | "starter" | "demo") {}

  /** Adds a row; `text` maps translatable field → {en,fr,ar}. */
  add(table: string, entity: EntityType | null, key: string, row: RowObj, text: Record<string, T3 | undefined> = {}) {
    const id = row.id ?? seedId(`${table}:${key}`);
    const scope = `${table}:${row.event_id ?? row.category_id ?? row.provider_id ?? row.wilaya_id ?? row.parent_id ?? ""}`;
    const sort = row.sort_order ?? (this.order[scope] = (this.order[scope] ?? 0) + 10);
    const full: RowObj = { id, ...row };
    if (["wilayas", "communes", "events", "service_types", "categories", "content_items", "price_items"].includes(table)) {
      full.sort_order = sort;
      full.enabled ??= true;
      full.is_demo ??= this.origin === "demo";
    } else if ("is_demo" in row || ["providers", "provider_media", "offers", "price_records"].includes(table)) {
      full.is_demo ??= this.origin === "demo";
    }
    (this.tables[table] ??= []).push(full);
    if (entity) {
      for (const [field, t] of Object.entries(text)) {
        if (!t) continue;
        for (const lang of ["ar", "fr", "en"] as Lang[]) {
          const value = t[lang]?.trim();
          if (!value) continue;
          (this.tables.translations ??= []).push({
            id: seedId(`tr:${entity}:${id}:${field}:${lang}`),
            entity_type: entity, entity_id: id, field, lang, value,
          });
        }
      }
    }
    return id as string;
  }

  link(table: string, row: RowObj) { (this.tables[table] ??= []).push(row); }
}

export function merge(...builders: SeedBuilder[]): Record<string, RowObj[]> {
  const out: Record<string, RowObj[]> = {};
  for (const b of builders) for (const [t, rows] of Object.entries(b.tables)) (out[t] ??= []).push(...rows);
  return out;
}
