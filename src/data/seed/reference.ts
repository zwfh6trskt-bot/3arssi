// REFERENCE DATA (real, non-demo): wilayas, communes, provider service types.
// Launch focus is Algiers, but nothing in the code depends on it — add
// wilayas and communes from Admin → Regions.
import { SeedBuilder, type T3 } from "./builder";

export const reference = new SeedBuilder("reference");
const r = reference;

const wilayas: [string, string, T3][] = [
  ["16", "alger", { en: "Algiers", fr: "Alger", ar: "الجزائر" }],
  ["09", "blida", { en: "Blida", fr: "Blida", ar: "البليدة" }],
  ["35", "boumerdes", { en: "Boumerdès", fr: "Boumerdès", ar: "بومرداس" }],
  ["42", "tipaza", { en: "Tipaza", fr: "Tipaza", ar: "تيبازة" }],
  ["31", "oran", { en: "Oran", fr: "Oran", ar: "وهران" }],
  ["25", "constantine", { en: "Constantine", fr: "Constantine", ar: "قسنطينة" }],
];
export const W: Record<string, string> = {};
for (const [code, slug, name] of wilayas) {
  W[slug] = r.add("wilayas", "wilaya", slug, { code, slug }, { name });
}

const algiersCommunes: [string, T3][] = [
  ["alger-centre", { en: "Algiers Centre", fr: "Alger-Centre", ar: "الجزائر الوسطى" }],
  ["sidi-mhamed", { en: "Sidi M'Hamed", fr: "Sidi M'Hamed", ar: "سيدي امحمد" }],
  ["bab-el-oued", { en: "Bab El Oued", fr: "Bab El Oued", ar: "باب الوادي" }],
  ["hydra", { en: "Hydra", fr: "Hydra", ar: "حيدرة" }],
  ["el-biar", { en: "El Biar", fr: "El Biar", ar: "الأبيار" }],
  ["ben-aknoun", { en: "Ben Aknoun", fr: "Ben Aknoun", ar: "بن عكنون" }],
  ["kouba", { en: "Kouba", fr: "Kouba", ar: "القبة" }],
  ["bir-mourad-rais", { en: "Bir Mourad Raïs", fr: "Bir Mourad Raïs", ar: "بئر مراد رايس" }],
  ["birkhadem", { en: "Birkhadem", fr: "Birkhadem", ar: "بئر خادم" }],
  ["hussein-dey", { en: "Hussein Dey", fr: "Hussein Dey", ar: "حسين داي" }],
  ["cheraga", { en: "Chéraga", fr: "Chéraga", ar: "الشراقة" }],
  ["dely-ibrahim", { en: "Dely Ibrahim", fr: "Dely Ibrahim", ar: "دالي إبراهيم" }],
  ["draria", { en: "Draria", fr: "Draria", ar: "الدرارية" }],
  ["staoueli", { en: "Staouéli", fr: "Staouéli", ar: "سطاوالي" }],
  ["bab-ezzouar", { en: "Bab Ezzouar", fr: "Bab Ezzouar", ar: "باب الزوار" }],
  ["rouiba", { en: "Rouïba", fr: "Rouïba", ar: "الرويبة" }],
];
export const C: Record<string, string> = {};
for (const [slug, name] of algiersCommunes) {
  C[slug] = r.add("communes", "commune", `alger:${slug}`, { wilaya_id: W.alger, slug }, { name });
}

const services: [string, string, T3][] = [
  ["venues", "venue", { en: "Wedding halls", fr: "Salles des fêtes", ar: "قاعات الحفلات" }],
  ["photographers", "camera", { en: "Photographers", fr: "Photographes", ar: "المصورون" }],
  ["videographers", "video", { en: "Videographers", fr: "Vidéastes", ar: "مصورو الفيديو" }],
  ["caterers", "dish", { en: "Caterers", fr: "Traiteurs", ar: "الممونون" }],
  ["patissiers", "cake", { en: "Pastry chefs", fr: "Pâtissiers", ar: "صانعو الحلويات" }],
  ["traditional-cakes", "sweets", { en: "Traditional & oriental cakes", fr: "Gâteaux traditionnels et orientaux", ar: "الحلويات التقليدية والشرقية" }],
  ["savoury", "dish", { en: "Savoury food", fr: "Salés et traiteurs salés", ar: "المملحات" }],
  ["hairdressers", "comb", { en: "Hairdressers", fr: "Coiffeuses", ar: "الحلاقات" }],
  ["makeup", "brush", { en: "Makeup artists", fr: "Maquilleuses", ar: "خبيرات التجميل" }],
  ["couturiers", "needle", { en: "Couturiers & designers", fr: "Couturiers et stylistes", ar: "الخياطون والمصممون" }],
  ["outfit-rental", "hanger", { en: "Outfit rental", fr: "Location de tenues", ar: "كراء الملابس" }],
  ["henna-artists", "hand", { en: "Henna artists", fr: "Artistes henné", ar: "فنانات الحنة" }],
  ["decoration", "flower", { en: "Decoration & styling", fr: "Décoration et scénographie", ar: "الديكور والتنسيق" }],
  ["music", "music", { en: "DJs & entertainment", fr: "DJ et animation", ar: "الدي جي والتنشيط" }],
  ["transport", "car", { en: "Transport & car rental", fr: "Transport et location de voitures", ar: "النقل وكراء السيارات" }],
  ["hamam-spa", "drop", { en: "Hamam & spa", fr: "Hammam et spa", ar: "الحمام والسبا" }],
  ["gift-shops", "gift", { en: "Gift & trousseau shops", fr: "Boutiques cadeaux et trousseau", ar: "محلات الهدايا والجهاز" }],
];
export const S: Record<string, string> = {};
for (const [slug, icon, name] of services) {
  S[slug] = r.add("service_types", "service_type", slug, { slug, icon, parent_id: null }, { name });
}
