// Read model over the public content snapshot (events, categories, guidance,
// providers, prices, regions, translations) for one interface language.
import type {
  Category, ContentItem, ContentSnapshot, EntityType, EventRow, Lang, PriceItem, Provider, Side, SideScope,
} from "../data/types";

const FALLBACK: Record<Lang, Lang[]> = { ar: ["ar", "fr", "en"], fr: ["fr", "en", "ar"], en: ["en", "fr", "ar"] };
export const visibleFor = (scope: SideScope, side: Side) => scope === "both" || scope === side;
const bySort = <T extends { sort_order: number }>(a: T, b: T) => a.sort_order - b.sort_order;

export class Content {
  private tr = new Map<string, string>();
  constructor(public snap: ContentSnapshot, public lang: Lang) {
    for (const r of snap.translations) this.tr.set(`${r.entity_type}:${r.entity_id}:${r.field}:${r.lang}`, r.value);
  }

  /** Translation with language fallback. `exact` disables the fallback. */
  text(type: EntityType, id: string | null | undefined, field = "name", exact = false): string {
    if (!id) return "";
    for (const l of exact ? [this.lang] : FALLBACK[this.lang]) {
      const v = this.tr.get(`${type}:${id}:${field}:${l}`);
      if (v) return v;
    }
    return "";
  }
  has(type: EntityType, id: string, field: string, lang: Lang) { return !!this.tr.get(`${type}:${id}:${field}:${lang}`); }
  raw(type: EntityType, id: string, field: string, lang: Lang) { return this.tr.get(`${type}:${id}:${field}:${lang}`) ?? ""; }

  event(id: string | null | undefined) { return this.snap.events.find((e) => e.id === id) ?? null; }
  category(id: string | null | undefined) { return this.snap.categories.find((c) => c.id === id) ?? null; }
  provider(idOrSlug: string) { return this.snap.providers.find((p) => p.id === idOrSlug || p.slug === idOrSlug) ?? null; }
  priceItem(id: string) { return this.snap.price_items.find((p) => p.id === id) ?? null; }

  eventName(e: EventRow | null) { return e ? this.text("event", e.id) || e.slug : ""; }
  categoryName(c: Category | null) { return c ? this.text("category", c.id) || c.slug : ""; }

  /** Enabled admin events visible on one side. */
  eventsFor(side: Side) { return this.snap.events.filter((e) => e.enabled && visibleFor(e.side, side)).sort(bySort); }

  categoriesOf(eventId: string, side: Side | null, parentId: string | null = null) {
    return this.snap.categories
      .filter((c) => c.event_id === eventId && c.enabled && (c.parent_id ?? null) === parentId && (!side || visibleFor(c.side, side)))
      .sort(bySort);
  }

  itemsOf(categoryId: string): ContentItem[] {
    return this.snap.content_items.filter((i) => i.category_id === categoryId && i.enabled).sort(bySort);
  }

  serviceTypesOfCategory(categoryId: string) {
    const ids = this.snap.category_service_types.filter((x) => x.category_id === categoryId).map((x) => x.service_type_id);
    return this.snap.service_types.filter((s) => ids.includes(s.id) && s.enabled).sort(bySort);
  }

  serviceTypes() { return this.snap.service_types.filter((s) => s.enabled).sort(bySort); }
  serviceName(id: string | null) { return this.text("service_type", id); }

  providerServiceIds(providerId: string) {
    return this.snap.provider_services.filter((x) => x.provider_id === providerId).map((x) => x.service_type_id);
  }

  providers(opts: { serviceTypeIds?: string[]; wilayaId?: string | null; q?: string } = {}): Provider[] {
    const q = opts.q?.trim().toLowerCase();
    return this.snap.providers
      .filter((p) => p.enabled)
      .filter((p) => !opts.serviceTypeIds?.length
        || this.providerServiceIds(p.id).some((s) => opts.serviceTypeIds!.includes(s))
        || (p.primary_service_type_id && opts.serviceTypeIds.includes(p.primary_service_type_id)))
      .filter((p) => !opts.wilayaId || p.wilaya_id === opts.wilayaId)
      .filter((p) => !q || p.name.toLowerCase().includes(q) || this.text("provider", p.id, "description").toLowerCase().includes(q))
      .sort((a, b) => Number(b.featured) - Number(a.featured) || a.name.localeCompare(b.name));
  }

  media(providerId: string) { return this.snap.provider_media.filter((m) => m.provider_id === providerId).sort(bySort); }
  offers(providerId: string, today = new Date().toISOString().slice(0, 10)) {
    return this.snap.offers.filter((o) => o.provider_id === providerId && o.enabled && (!o.valid_to || o.valid_to >= today));
  }
  priceRecordsOfProvider(providerId: string) {
    return this.snap.price_records.filter((r) => r.provider_id === providerId && r.enabled);
  }

  /** Price items relevant to a category through its service types. */
  priceItemsForCategory(categoryId: string | null): PriceItem[] {
    const svc = categoryId ? this.serviceTypesOfCategory(categoryId).map((s) => s.id) : [];
    return this.snap.price_items
      .filter((p) => p.enabled && (!categoryId || (p.service_type_id && svc.includes(p.service_type_id))))
      .sort(bySort);
  }
  allPriceItems() { return this.snap.price_items.filter((p) => p.enabled).sort(bySort); }

  wilayas() { return this.snap.wilayas.filter((w) => w.enabled).sort(bySort); }
  communes(wilayaId: string | null) { return this.snap.communes.filter((c) => c.wilaya_id === wilayaId && c.enabled).sort(bySort); }
  placeName(p: { wilaya_id: string | null; commune_id: string | null }) {
    return [this.text("commune", p.commune_id), this.text("wilaya", p.wilaya_id)].filter(Boolean).join(", ");
  }
}
