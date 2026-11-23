// Data model — mirrors supabase/migrations exactly (one interface per table).

export type Lang = "ar" | "fr" | "en";
export const LANGS: Lang[] = ["ar", "fr", "en"];
export type Side = "bride" | "groom";
export type SideScope = Side | "both";
export type Unit = "piece" | "kg" | "person" | "hour" | "day" | "package" | "event" | "quote";
export const UNITS: Unit[] = ["piece", "kg", "person", "hour", "day", "package", "event", "quote"];
export type Importance = "essential" | "optional" | "regional";
export type ContentKind = "tip" | "suggestion" | "checklist" | "tradition" | "note" | "image";
export const CONTENT_KINDS: ContentKind[] = ["checklist", "suggestion", "tip", "tradition", "note", "image"];
export type Role = "user" | "editor" | "admin";

export type EntityType =
  | "event" | "category" | "content_item" | "service_type" | "provider"
  | "provider_media" | "offer" | "price_item" | "price_record" | "wilaya" | "commune";

/** Translatable fields per entity type (drives admin forms + missing-translation report). */
export const TRANSLATABLE: Record<EntityType, string[]> = {
  event: ["name", "description"],
  category: ["name", "description"],
  content_item: ["title", "body"],
  service_type: ["name"],
  provider: ["description", "services_text", "service_area", "availability_notes"],
  provider_media: ["caption"],
  offer: ["title", "description"],
  price_item: ["name", "description"],
  price_record: ["conditions", "extras"],
  wilaya: ["name"],
  commune: ["name"],
};
/** Fields that must exist in every language for the content to be "complete". */
export const REQUIRED_FIELDS: Partial<Record<EntityType, string[]>> = {
  event: ["name"], category: ["name"], content_item: ["title"], service_type: ["name"],
  price_item: ["name"], wilaya: ["name"], commune: ["name"], offer: ["title"],
};

interface Row { id: string; created_at?: string; updated_at?: string }
interface Managed extends Row { sort_order: number; enabled: boolean; is_demo: boolean }

export interface Wilaya extends Managed { code: string; slug: string }
export interface Commune extends Managed { wilaya_id: string; slug: string }
export interface EventRow extends Managed { slug: string; side: SideScope; icon: string | null }
export interface ServiceType extends Managed { slug: string; parent_id: string | null; icon: string | null }
export interface Category extends Managed {
  event_id: string; parent_id: string | null; slug: string; side: SideScope;
  icon: string | null; image_url: string | null;
}
export interface CategoryServiceType { category_id: string; service_type_id: string }
export interface ContentItem extends Managed {
  category_id: string; kind: ContentKind; importance: Importance;
  wilaya_id: string | null; commune_id: string | null; image_url: string | null;
}
export interface Provider extends Row {
  slug: string; name: string; primary_service_type_id: string | null;
  wilaya_id: string | null; commune_id: string | null; address: string | null;
  phone: string | null; whatsapp: string | null; instagram: string | null; website: string | null;
  featured: boolean; verified: boolean; enabled: boolean; is_demo: boolean; last_updated_at: string;
}
export interface ProviderService { provider_id: string; service_type_id: string }
export interface ProviderMedia extends Row {
  provider_id: string; kind: "image" | "video"; url: string; storage_path: string | null;
  sort_order: number; is_demo: boolean;
}
export interface Offer extends Row {
  provider_id: string; valid_from: string | null; valid_to: string | null; enabled: boolean; is_demo: boolean;
}
export interface PriceItem extends Managed { service_type_id: string | null; slug: string; unit: Unit }
export interface PriceRecord extends Row {
  price_item_id: string; provider_id: string | null; source_label: string | null;
  wilaya_id: string | null; commune_id: string | null;
  min_price: number | null; max_price: number | null; min_quantity: number | null;
  price_status: "indicative" | "confirmed"; updated_on: string; enabled: boolean; is_demo: boolean;
}
export interface Translation {
  id: string; entity_type: EntityType; entity_id: string; field: string; lang: Lang; value: string;
}
export interface UiTranslation { key: string; lang: Lang; value: string }

export interface Profile extends Row {
  display_name: string | null; role: Role; preferred_lang: Lang | null;
}
export interface Plan extends Row { owner_id: string; title: string | null }
export interface PlanMember { plan_id: string; user_id: string; role: "owner" | "editor" | "viewer" }
export interface PlanEvent extends Row {
  plan_id: string; event_id: string | null; custom_name: string | null; side: SideScope;
  sort_order: number; enabled: boolean; removed_at: string | null; notes: string | null;
}
export interface PlanCategory extends Row {
  plan_event_id: string; category_id: string | null; custom_name: string | null; side: SideScope;
  enabled: boolean; sort_order: number; notes: string | null;
}
export interface EventBudget extends Row { plan_event_id: string; side: Side; total_amount: number; currency: string }
export interface CategoryAllocation extends Row { plan_category_id: string; side: Side; amount: number }
export interface Expense extends Row {
  plan_event_id: string; plan_category_id: string | null; side: Side; label: string; amount: number;
  kind: "paid" | "committed"; provider_id: string | null; spent_on: string | null; note: string | null;
}
export interface PlanTask extends Row {
  plan_category_id: string; content_item_id: string | null; label: string | null;
  done: boolean; done_at: string | null; sort_order: number;
}
export interface PlanEstimate extends Row {
  plan_category_id: string; side: Side; price_item_id: string; quantity: number; wilaya_id: string | null;
}
export interface SavedProvider { plan_id: string; provider_id: string; note: string | null; created_at?: string }

/** Names of content tables loaded into the public content store. */
export const CONTENT_TABLES = [
  "wilayas", "communes", "events", "service_types", "categories", "category_service_types",
  "content_items", "providers", "provider_services", "provider_media", "offers",
  "price_items", "price_records", "translations", "ui_translations",
] as const;
export type ContentTable = (typeof CONTENT_TABLES)[number];

export interface ContentSnapshot {
  wilayas: Wilaya[]; communes: Commune[]; events: EventRow[]; service_types: ServiceType[];
  categories: Category[]; category_service_types: CategoryServiceType[]; content_items: ContentItem[];
  providers: Provider[]; provider_services: ProviderService[]; provider_media: ProviderMedia[];
  offers: Offer[]; price_items: PriceItem[]; price_records: PriceRecord[];
  translations: Translation[]; ui_translations: UiTranslation[];
}
