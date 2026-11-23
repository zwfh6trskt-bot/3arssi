// DEMO DATA — FICTIONAL. Every row here has is_demo = true and is shown
// with a "Fictional sample" label. Names, phone numbers and prices are
// invented for demonstration only. Remove it from Admin → Demo content.
import { SeedBuilder, type T3 } from "./builder";
import { C, S, W } from "./reference";
import type { Unit } from "../types";

export const demo = new SeedBuilder("demo");
const d = demo;
const t = (en: string, fr: string, ar: string): T3 => ({ en, fr, ar });
const IMG = (n: number) => `/img/samples/sample-${n}.svg`;
const UPDATED = "2026-11-01";

interface P {
  k: string; name: string; svc: string[]; commune: string; desc: T3; services: T3; area: T3; avail?: T3;
  featured?: boolean; instagram?: boolean; imgs: number[];
}
const providers: P[] = [
  { k: "photo", name: "Atelier Lumière (sample)", svc: ["photographers", "videographers"], commune: "hydra", featured: true, instagram: true, imgs: [1, 2, 3, 4],
    desc: t("Fictional sample studio for wedding photography and film.", "Studio fictif d'exemple pour la photo et le film de mariage.", "استوديو وهمي كمثال لتصوير الأعراس والفيديو."),
    services: t("Photo coverage, short film, printed album.", "Reportage photo, court film, album imprimé.", "تغطية بالصور، فيديو قصير، ألبوم مطبوع."),
    area: t("Algiers and neighbouring wilayas", "Alger et wilayas voisines", "الجزائر والولايات المجاورة"),
    avail: t("Weekends book quickly in summer.", "Les week-ends d'été partent vite.", "عطل نهاية الأسبوع في الصيف تُحجز بسرعة.") },
  { k: "venue", name: "Salle Yasmine (sample)", svc: ["venues"], commune: "cheraga", featured: true, imgs: [5, 6, 1],
    desc: t("Fictional sample wedding hall, about 300 guests.", "Salle des fêtes fictive d'exemple, environ 300 invités.", "قاعة حفلات وهمية كمثال، حوالي 300 مدعو."),
    services: t("Hall, tables and chairs, basic lighting.", "Salle, tables et chaises, éclairage de base.", "القاعة، الطاولات والكراسي، إضاءة أساسية."),
    area: t("Chéraga, Algiers", "Chéraga, Alger", "الشراقة، الجزائر") },
  { k: "cakes-nour", name: "Maison Nour Gâteaux (sample)", svc: ["traditional-cakes"], commune: "el-biar", imgs: [3, 2],
    desc: t("Fictional sample maker of traditional cakes.", "Fabricant fictif d'exemple de gâteaux traditionnels.", "صانع وهمي كمثال للحلويات التقليدية."),
    services: t("Traditional and oriental cakes by the piece.", "Gâteaux traditionnels et orientaux à la pièce.", "حلويات تقليدية وشرقية بالقطعة."),
    area: t("Delivery in Algiers", "Livraison sur Alger", "توصيل داخل الجزائر العاصمة") },
  { k: "cakes-warda", name: "Pâtisserie El Warda (sample)", svc: ["traditional-cakes", "patissiers"], commune: "kouba", instagram: true, imgs: [2, 4],
    desc: t("Fictional sample pastry shop.", "Pâtisserie fictive d'exemple.", "محل حلويات وهمي كمثال."),
    services: t("Traditional cakes, wedding cakes.", "Gâteaux traditionnels, pièces montées.", "حلويات تقليدية، كعكات الأعراس."),
    area: t("Kouba and surroundings", "Kouba et environs", "القبة وضواحيها") },
  { k: "beauty", name: "Studio Safia Beauty (sample)", svc: ["makeup", "hairdressers"], commune: "ben-aknoun", imgs: [4, 6],
    desc: t("Fictional sample makeup and hair studio.", "Studio fictif d'exemple de maquillage et coiffure.", "استوديو وهمي كمثال للماكياج والتسريحات."),
    services: t("Bridal makeup, hairstyling, trials.", "Maquillage mariée, coiffure, essais.", "ماكياج العروسة، تسريحات، تجارب."),
    area: t("Studio or at home", "Au studio ou à domicile", "في الاستوديو أو في البيت") },
  { k: "henna", name: "Henné Lina (sample)", svc: ["henna-artists"], commune: "bab-ezzouar", imgs: [6, 5],
    desc: t("Fictional sample henna artist.", "Artiste henné fictive d'exemple.", "فنانة حنة وهمية كمثال."),
    services: t("Bridal henna, guests' henna.", "Henné de la mariée et des invitées.", "حنة العروسة والمدعوات."),
    area: t("Travels across Algiers", "Se déplace sur Alger", "تتنقل داخل العاصمة") },
  { k: "caterer", name: "Traiteur Diar (sample)", svc: ["caterers", "savoury"], commune: "draria", imgs: [1, 3],
    desc: t("Fictional sample caterer.", "Traiteur fictif d'exemple.", "ممون وهمي كمثال."),
    services: t("Wedding dinners, savoury platters, service staff.", "Dîners de mariage, plateaux salés, personnel.", "عشاء الأعراس، صواني المملحات، طاقم الخدمة."),
    area: t("Algiers", "Alger", "الجزائر") },
  { k: "car", name: "Cortège Auto (sample)", svc: ["transport"], commune: "bir-mourad-rais", imgs: [5],
    desc: t("Fictional sample wedding-car rental.", "Location fictive d'exemple de voitures de mariage.", "كراء سيارات أعراس وهمي كمثال."),
    services: t("Decorated car with driver.", "Voiture décorée avec chauffeur.", "سيارة مزيّنة مع سائق."),
    area: t("Algiers", "Alger", "الجزائر") },
  { k: "dj", name: "DJ Amine Events (sample)", svc: ["music"], commune: "alger-centre", imgs: [2],
    desc: t("Fictional sample DJ and sound.", "DJ et sonorisation fictifs d'exemple.", "دي جي وتجهيز صوتي وهمي كمثال."),
    services: t("DJ set, sound system, lighting.", "Set DJ, sonorisation, éclairage.", "دي جي، نظام صوت، إضاءة."),
    area: t("Algiers", "Alger", "الجزائر") },
  { k: "rental", name: "Dar Lbas Location (sample)", svc: ["outfit-rental", "couturiers"], commune: "sidi-mhamed", imgs: [4, 3, 6],
    desc: t("Fictional sample outfit rental and tailoring.", "Location de tenues et couture fictives d'exemple.", "كراء ألبسة وخياطة وهمي كمثال."),
    services: t("Traditional outfit rental, adjustments.", "Location de tenues traditionnelles, retouches.", "كراء الألبسة التقليدية، التعديلات."),
    area: t("Algiers", "Alger", "الجزائر") },
];

export const P: Record<string, string> = {};
providers.forEach((p, i) => {
  const n = String(i + 1).padStart(2, "0");
  P[p.k] = d.add("providers", "provider", p.k, {
    slug: `sample-${p.k}`, name: p.name, primary_service_type_id: S[p.svc[0]],
    wilaya_id: W.alger, commune_id: C[p.commune], address: null,
    phone: `+213 00 00 00 ${n}`, whatsapp: `+21300000000${n}`,
    instagram: p.instagram ? `https://www.instagram.com/example.invalid.${p.k}` : null, website: null,
    featured: !!p.featured, verified: false, enabled: true, is_demo: true, last_updated_at: `${UPDATED}T10:00:00Z`,
  }, { description: p.desc, services_text: p.services, service_area: p.area, availability_notes: p.avail });
  for (const s of p.svc) d.link("provider_services", { provider_id: P[p.k], service_type_id: S[s] });
  p.imgs.forEach((img, j) => d.add("provider_media", "provider_media", `${p.k}:${j}`, {
    provider_id: P[p.k], kind: "image", url: IMG(img), storage_path: null, sort_order: j * 10, is_demo: true,
  }, { caption: t("Fictional sample image", "Image d'exemple fictive", "صورة توضيحية وهمية") }));
});

d.add("offers", "offer", "photo-winter", {
  provider_id: P.photo, valid_from: "2026-11-01", valid_to: "2027-02-28", enabled: true, is_demo: true,
}, {
  title: t("Winter dates: album included (sample)", "Dates d'hiver : album inclus (exemple)", "مواعيد الشتاء: الألبوم مشمول (مثال)"),
  description: t("Fictional sample offer.", "Offre fictive d'exemple.", "عرض وهمي كمثال."),
});

// ---- Price items and records (fictional) ------------------------------
function item(k: string, svc: string, unit: Unit, name: T3, records: [string | null, number | null, number | null, number | null, T3?][]) {
  const id = d.add("price_items", "price_item", k, { slug: k, service_type_id: S[svc], unit }, { name });
  records.forEach(([prov, min, max, minQty, cond], i) => d.add("price_records", "price_record", `${k}:${i}`, {
    price_item_id: id, provider_id: prov ? P[prov] : null, source_label: prov ? null : "Sample survey (fictional)",
    wilaya_id: W.alger, commune_id: null, min_price: min, max_price: max, min_quantity: minQty,
    price_status: "indicative", updated_on: UPDATED, enabled: true, is_demo: true,
  }, { conditions: cond }));
  return id;
}
const DELIVERY = t("Delivery may be charged separately.", "La livraison peut être facturée en plus.", "قد يُحتسب التوصيل بشكل منفصل.");

item("traditional-cakes-piece", "traditional-cakes", "piece",
  t("Traditional oriental cakes", "Gâteaux traditionnels orientaux", "حلويات تقليدية شرقية"),
  [["cakes-nour", 80, 100, 100, DELIVERY], ["cakes-warda", 90, 120, 50]]);
item("wedding-cake-kg", "patissiers", "kg", t("Wedding cake", "Pièce montée", "كعكة العرس"),
  [["cakes-warda", 3500, 6000, 3]]);
item("hall-evening", "venues", "event", t("Hall rental — one evening", "Location de salle — une soirée", "كراء قاعة — سهرة واحدة"),
  [["venue", 250000, 400000, null, t("Tables, chairs and basic lighting included.", "Tables, chaises et éclairage de base inclus.", "تشمل الطاولات والكراسي والإضاءة الأساسية.")]]);
item("catering-person", "caterers", "person", t("Wedding dinner", "Dîner de mariage", "عشاء العرس"),
  [["caterer", 1800, 2800, 100, t("Service staff extra.", "Personnel de service en supplément.", "طاقم الخدمة بتكلفة إضافية.")]]);
item("photo-day", "photographers", "event", t("Photo coverage — full day", "Reportage photo — journée", "تغطية بالصور — يوم كامل"),
  [["photo", 40000, 70000, null]]);
item("video-day", "videographers", "event", t("Video coverage — full day", "Film — journée", "تصوير فيديو — يوم كامل"),
  [["photo", 50000, 90000, null]]);
item("bridal-makeup", "makeup", "event", t("Bridal makeup", "Maquillage de mariée", "ماكياج العروسة"),
  [["beauty", 15000, 30000, null]]);
item("henna-session", "henna-artists", "event", t("Bridal henna session", "Séance henné mariée", "جلسة حنة العروسة"),
  [["henna", 8000, 15000, null]]);
item("wedding-car-day", "transport", "day", t("Wedding car with driver", "Voiture de mariage avec chauffeur", "سيارة عرس مع سائق"),
  [["car", 15000, 25000, null]]);
item("dj-hour", "music", "hour", t("DJ and sound", "DJ et sonorisation", "دي جي وتجهيز صوتي"),
  [["dj", 6000, 10000, 3]]);
item("outfit-rental-day", "outfit-rental", "day", t("Traditional outfit rental", "Location de tenue traditionnelle", "كراء لباس تقليدي"),
  [["rental", 5000, 12000, null]]);
item("decoration-custom", "decoration", "quote", t("Custom decoration", "Décoration sur mesure", "ديكور حسب الطلب"), []);
