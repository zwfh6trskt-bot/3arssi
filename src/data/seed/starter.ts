// STARTER CONTENT (editable, non-demo): the 9 initial events with
// event- and side-specific categories, subcategories, checklists and tips.
// This is a starting structure for the owner to edit in Admin — it is not
// a description of how every Algerian family celebrates.
import { SeedBuilder, type T3 } from "./builder";
import { S } from "./reference";
import type { ContentKind, Importance, SideScope } from "../types";

export const starter = new SeedBuilder("starter");
const b = starter;

const t = (en: string, fr: string, ar: string): T3 => ({ en, fr, ar });
type Item = { kind: ContentKind; imp: Importance; title: T3; body?: T3 };
const ck = (imp: Importance, title: T3, body?: T3): Item => ({ kind: "checklist", imp, title, body });
const tip = (title: T3, body?: T3): Item => ({ kind: "tip", imp: "optional", title, body });
const sug = (title: T3, body?: T3): Item => ({ kind: "suggestion", imp: "optional", title, body });
const reg = (title: T3, body?: T3): Item => ({ kind: "tradition", imp: "regional", title, body });

interface Cat { k: string; side: SideScope; icon: string; n: T3; d: T3; svc?: string[]; items: Item[]; subs?: Cat[] }

function addCats(eventId: string, cats: Cat[], parentId: string | null = null, prefix = "") {
  for (const c of cats) {
    const slug = prefix + c.k;
    const id = b.add("categories", "category", `${eventId}:${slug}`, {
      event_id: eventId, parent_id: parentId, slug, side: c.side, icon: c.icon, image_url: null,
    }, { name: c.n, description: c.d });
    for (const s of c.svc ?? []) b.link("category_service_types", { category_id: id, service_type_id: S[s] });
    c.items.forEach((it, i) => b.add("content_items", "content_item", `${id}:${i}`, {
      category_id: id, kind: it.kind, importance: it.imp, wilaya_id: null, commune_id: null, image_url: null,
    }, { title: it.title, body: it.body }));
    if (c.subs) addCats(eventId, c.subs, id, slug + "-");
  }
}

function event(slug: string, side: SideScope, icon: string, name: T3, description: T3, cats: Cat[]) {
  const id = b.add("events", "event", slug, { slug, side, icon }, { name, description });
  addCats(id, cats);
  return id;
}

// ---------------------------------------------------------------- shared text
const BUDGET_TIP = tip(
  t("Set this category's budget before contacting providers.", "Fixez le budget de cette catégorie avant de contacter les prestataires.", "حدّد ميزانية هذه الفئة قبل التواصل مع مقدمي الخدمات."));
const COMPARE_TIP = tip(
  t("Ask at least two providers for a quote and compare what is included.", "Demandez un devis à au moins deux prestataires et comparez ce qui est inclus.", "اطلب عرض سعر من مقدّمَين على الأقل وقارن ما يشمله كل عرض."));
const PHOTO = (side: SideScope, k = "photography"): Cat => ({
  k, side, icon: "camera", svc: ["photographers"],
  n: t("Photography", "Photographie", "التصوير"),
  d: t("Decide whether you want a photographer and what should be captured.", "Décidez si vous souhaitez un photographe et ce qu'il doit couvrir.", "قرّر إن كنت تحتاج مصوراً وما الذي يجب تصويره."),
  items: [
    ck("optional", t("Agree on photo rules with the family", "Convenir des règles photo avec la famille", "الاتفاق مع العائلة على قواعد التصوير"),
      t("Some families prefer few or no photos at this stage.", "Certaines familles préfèrent peu ou pas de photos à ce stade.", "بعض العائلات تفضّل صوراً قليلة أو عدم التصوير في هذه المرحلة.")),
    ck("optional", t("Confirm delivery time and format", "Confirmer le délai et le format de livraison", "تأكيد موعد وصيغة التسليم")),
    COMPARE_TIP,
  ],
});

// ======================================================================
// 1. JEHAZ — bride
// ======================================================================
event("jehaz", "bride", "chest",
  t("Jehaz", "Jehaz", "الجهاز"),
  t("The bride's trousseau — what she brings to her new home. Its contents vary a lot between families.",
    "Le trousseau de la mariée — ce qu'elle emporte dans son nouveau foyer. Son contenu varie beaucoup d'une famille à l'autre.",
    "جهاز العروسة — ما تحمله معها إلى بيتها الجديد. يختلف محتواه كثيراً من عائلة إلى أخرى."),
  [
    { k: "clothing", side: "bride", icon: "hanger", svc: ["couturiers", "gift-shops"],
      n: t("Clothing", "Vêtements", "الملابس"),
      d: t("Everyday and occasion outfits for the first months.", "Tenues du quotidien et de visite pour les premiers mois.", "ملابس يومية وملابس للزيارات للأشهر الأولى."),
      items: [
        ck("essential", t("List outfits for daily wear and family visits", "Lister les tenues du quotidien et des visites", "إعداد قائمة بملابس الحياة اليومية والزيارات")),
        tip(t("Buy progressively to spread the cost over several months.", "Achetez progressivement pour étaler le coût sur plusieurs mois.", "اشترِ بالتدريج لتوزيع التكلفة على عدة أشهر.")),
      ],
      subs: [
        { k: "everyday", side: "bride", icon: "hanger", n: t("Everyday wear", "Tenues du quotidien", "الملابس اليومية"),
          d: t("Comfortable pieces for home and outings.", "Pièces confortables pour la maison et les sorties.", "قطع مريحة للبيت والخروج."),
          items: [ck("optional", t("Home outfits and robes", "Tenues d'intérieur et robes de chambre", "ملابس البيت والروب"))] },
        { k: "traditional", side: "bride", icon: "needle", svc: ["couturiers"],
          n: t("Traditional outfits", "Tenues traditionnelles", "الألبسة التقليدية"),
          d: t("Traditional pieces you may wear after the wedding.", "Pièces traditionnelles à porter après le mariage.", "قطع تقليدية قد ترتدينها بعد العرس."),
          items: [
            reg(t("Choose the outfits that match your family and region", "Choisissez les tenues propres à votre famille et à votre région", "اختاري الألبسة التي تناسب عائلتك ومنطقتك"),
              t("Karakou, kaftan, chedda, blouza, jebba… vary from one region to another.", "Karakou, caftan, chedda, blouza, jebba… varient d'une région à l'autre.", "الكاراكو، القفطان، الشدة، البلوزة، الجبة… تختلف من منطقة إلى أخرى.")),
            ck("optional", t("Book fittings well in advance", "Réserver les essayages bien à l'avance", "حجز مواعيد القياس مبكراً")),
          ] },
      ] },
    { k: "lingerie", side: "bride", icon: "heart-line",
      n: t("Lingerie", "Lingerie", "الملابس الداخلية"),
      d: t("Personal items, sized and listed in one place.", "Articles personnels, listés avec les tailles.", "مستلزمات شخصية مع المقاسات في مكان واحد."),
      items: [ck("optional", t("Make a list with sizes", "Faire une liste avec les tailles", "إعداد قائمة بالمقاسات")),
        tip(t("Keep receipts in case you need to exchange.", "Gardez les tickets en cas d'échange.", "احتفظي بالفواتير في حال احتجت للاستبدال."))] },
    { k: "shoes", side: "bride", icon: "shoe",
      n: t("Shoes", "Chaussures", "الأحذية"),
      d: t("Pairs for each planned outfit, plus comfortable ones.", "Des paires pour chaque tenue prévue, et des modèles confortables.", "أحذية لكل طقم مخطط له، وأخرى مريحة."),
      items: [ck("optional", t("Match shoes to each planned outfit", "Associer des chaussures à chaque tenue", "تنسيق الأحذية مع كل طقم")),
        ck("optional", t("Include comfortable everyday pairs", "Prévoir des paires confortables", "إضافة أحذية مريحة للاستعمال اليومي"))] },
    { k: "accessories", side: "bride", icon: "ring", svc: ["gift-shops"],
      n: t("Accessories", "Accessoires", "الإكسسوارات"),
      d: t("Bags, scarves, jewellery boxes and small items.", "Sacs, foulards, boîtes à bijoux et petits articles.", "الحقائب والأوشحة وعلب المجوهرات والقطع الصغيرة."),
      items: [ck("optional", t("Bags and scarves", "Sacs et foulards", "الحقائب والأوشحة")),
        ck("optional", t("Jewellery storage", "Rangement des bijoux", "علب حفظ المجوهرات"))] },
    { k: "beauty", side: "bride", icon: "drop",
      n: t("Beauty essentials", "Essentiels beauté", "مستلزمات التجميل"),
      d: t("Skincare, toiletries and perfumes.", "Soins, produits d'hygiène et parfums.", "العناية بالبشرة ومواد النظافة والعطور."),
      items: [ck("essential", t("Skincare and toiletries", "Soins et produits d'hygiène", "منتجات العناية والنظافة")),
        ck("optional", t("Perfumes and incense", "Parfums et encens", "العطور والبخور")),
        ck("optional", t("Hammam set (towels, bowl, glove…)", "Kit hammam (serviettes, tasse, gant…)", "طقم الحمام (مناشف، طاسة، كيس…)"))] },
    { k: "home", side: "bride", icon: "home", svc: ["gift-shops"],
      n: t("Home essentials", "Essentiels maison", "مستلزمات البيت"),
      d: t("Linen and household items agreed with both families.", "Linge et articles de maison convenus avec les deux familles.", "المفروشات والأدوات المنزلية المتفق عليها بين العائلتين."),
      items: [ck("essential", t("Bed linen and towels", "Linge de lit et serviettes", "أغطية السرير والمناشف")),
        ck("optional", t("Kitchen items", "Articles de cuisine", "أدوات المطبخ")),
        tip(t("Agree early on who provides furniture and appliances — practices differ.", "Convenez tôt de qui fournit meubles et électroménager — les pratiques diffèrent.", "اتفقوا مبكراً على من يوفّر الأثاث والأجهزة — العادات تختلف."))] },
  ]);

// ======================================================================
// 2. CHOUFA — both sides, different content
// ======================================================================
event("choufa", "both", "eye",
  t("Choufa", "Choufa", "الشوفة"),
  t("The first visit where the groom's family meets the bride. Not every family holds it or names it the same way.",
    "La première visite où la famille du marié rencontre la mariée. Toutes les familles ne l'organisent pas ni ne la nomment de la même façon.",
    "الزيارة الأولى التي تتعرّف فيها عائلة العريس على العروسة. لا تقيمها كل العائلات ولا تسمّيها بالطريقة نفسها."),
  [
    { k: "outfit", side: "bride", icon: "hanger", svc: ["couturiers", "outfit-rental"],
      n: t("Outfit", "Tenue", "الطقم"),
      d: t("A simple, elegant outfit for receiving the guests.", "Une tenue simple et élégante pour recevoir les invités.", "طقم بسيط وأنيق لاستقبال الضيوف."),
      items: [ck("essential", t("Choose and try the outfit", "Choisir et essayer la tenue", "اختيار الطقم وتجربته")), BUDGET_TIP] },
    { k: "makeup", side: "bride", icon: "brush", svc: ["makeup"],
      n: t("Makeup", "Maquillage", "الماكياج"),
      d: t("Light makeup at home or with a makeup artist.", "Maquillage léger à la maison ou chez une maquilleuse.", "ماكياج خفيف في البيت أو عند خبيرة تجميل."),
      items: [ck("optional", t("Book a makeup artist or plan to do it yourself", "Réserver une maquilleuse ou prévoir de le faire soi-même", "حجز خبيرة تجميل أو التحضير للقيام به بنفسك"))] },
    { k: "hair", side: "bride", icon: "comb", svc: ["hairdressers"],
      n: t("Hair", "Coiffure", "تسريحة الشعر"),
      d: t("Hairdresser appointment or home styling.", "Rendez-vous chez la coiffeuse ou coiffure à la maison.", "موعد عند الحلاقة أو تسريحة في البيت."),
      items: [ck("optional", t("Book the hairdresser", "Réserver la coiffeuse", "حجز موعد عند الحلاقة"))] },
    { k: "cakes", side: "bride", icon: "sweets", svc: ["traditional-cakes", "patissiers"],
      n: t("Cakes and sweets", "Gâteaux et douceurs", "الحلويات"),
      d: t("Sweets served to the visiting family.", "Les douceurs servies à la famille en visite.", "الحلويات التي تقدَّم للعائلة الزائرة."),
      items: [ck("essential", t("Estimate the number of guests", "Estimer le nombre d'invités", "تقدير عدد الضيوف")),
        ck("optional", t("Order or prepare traditional cakes", "Commander ou préparer des gâteaux traditionnels", "طلب أو تحضير الحلويات التقليدية")), COMPARE_TIP] },
    { k: "drinks", side: "bride", icon: "cup",
      n: t("Drinks", "Boissons", "المشروبات"),
      d: t("Tea, coffee, juices and serving sets.", "Thé, café, jus et services.", "الشاي والقهوة والعصائر وأطقم التقديم."),
      items: [ck("optional", t("Prepare tea, coffee and juices", "Prévoir thé, café et jus", "تحضير الشاي والقهوة والعصائر")),
        ck("optional", t("Check serving sets and trays", "Vérifier les services et plateaux", "تفقّد أطقم التقديم والصواني"))] },
    { k: "family", side: "bride", icon: "people",
      n: t("Family preparations", "Préparatifs familiaux", "تحضيرات العائلة"),
      d: t("Hosting the visit at home.", "Accueillir la visite à la maison.", "استقبال الزيارة في البيت."),
      items: [ck("essential", t("Agree on the date and time with the other family", "Fixer la date et l'heure avec l'autre famille", "الاتفاق على التاريخ والساعة مع العائلة الأخرى")),
        ck("optional", t("Prepare the reception room and seating", "Préparer le salon et les places", "تحضير صالة الاستقبال والجلسة"))] },
    // groom side
    { k: "gifts", side: "groom", icon: "gift", svc: ["gift-shops"],
      n: t("Gifts to bring", "Cadeaux à apporter", "الهدايا المحمولة"),
      d: t("What the groom's family brings on the visit.", "Ce que la famille du marié apporte lors de la visite.", "ما تحمله عائلة العريس في الزيارة."),
      items: [ck("optional", t("Agree on the gifts within the family", "Se mettre d'accord sur les cadeaux en famille", "الاتفاق على الهدايا داخل العائلة")),
        reg(t("What is brought varies by family and region", "Ce qui est apporté varie selon la famille et la région", "ما يُحمل يختلف حسب العائلة والمنطقة"))] },
    { k: "sweets-bring", side: "groom", icon: "sweets", svc: ["patissiers", "traditional-cakes"],
      n: t("Sweets to bring", "Douceurs à apporter", "الحلويات المحمولة"),
      d: t("A box or tray of sweets for the bride's family.", "Une boîte ou un plateau de douceurs pour la famille de la mariée.", "علبة أو صينية حلويات لعائلة العروسة."),
      items: [ck("optional", t("Order sweets a few days ahead", "Commander les douceurs quelques jours avant", "طلب الحلويات قبل أيام"))] },
    { k: "groom-outfit", side: "groom", icon: "hanger", svc: ["couturiers"],
      n: t("Outfit", "Tenue", "اللباس"),
      d: t("A neat outfit for the visit, if the groom attends.", "Une tenue soignée pour la visite, si le marié y assiste.", "لباس أنيق للزيارة إن حضرها العريس."),
      items: [ck("optional", t("Prepare the outfit", "Préparer la tenue", "تحضير اللباس"))] },
    { k: "visit", side: "groom", icon: "people",
      n: t("Visit arrangements", "Organisation de la visite", "تنظيم الزيارة"),
      d: t("Who goes, when and how.", "Qui y va, quand et comment.", "من يذهب ومتى وكيف."),
      items: [ck("essential", t("Decide who attends the visit", "Décider qui participe à la visite", "تحديد من يحضر الزيارة")),
        ck("optional", t("Plan transport for the family", "Prévoir le transport de la famille", "التخطيط لتنقّل العائلة"))] },
  ]);

// ======================================================================
// 3. KHOTBA
// ======================================================================
event("khotba", "both", "hands",
  t("Khotba", "Khotba", "الخطبة"),
  t("The formal request for the bride's hand. How and when it happens differs between families.",
    "La demande officielle de la main de la mariée. Sa forme et son moment diffèrent selon les familles.",
    "الطلب الرسمي ليد العروسة. تختلف طريقته وتوقيته من عائلة إلى أخرى."),
  [
    { k: "hosting", side: "bride", icon: "home",
      n: t("Venue and family arrangements", "Lieu et organisation familiale", "المكان وتنظيم العائلة"),
      d: t("Receiving the groom's family at home or elsewhere.", "Recevoir la famille du marié à la maison ou ailleurs.", "استقبال عائلة العريس في البيت أو في مكان آخر."),
      items: [ck("essential", t("Confirm the date with both families", "Confirmer la date avec les deux familles", "تأكيد التاريخ مع العائلتين")),
        ck("optional", t("Decide which relatives attend", "Décider quels proches seront présents", "تحديد الأقارب الحاضرين"))] },
    { k: "sweets", side: "bride", icon: "sweets", svc: ["traditional-cakes", "patissiers"],
      n: t("Sweets", "Douceurs", "الحلويات"),
      d: t("Sweets and drinks for the guests.", "Douceurs et boissons pour les invités.", "الحلويات والمشروبات للضيوف."),
      items: [ck("optional", t("Order or prepare sweets", "Commander ou préparer les douceurs", "طلب أو تحضير الحلويات")), BUDGET_TIP] },
    { k: "outfit", side: "bride", icon: "hanger", svc: ["couturiers", "outfit-rental"],
      n: t("Clothing", "Tenue", "الطقم"),
      d: t("An outfit for the occasion.", "Une tenue pour l'occasion.", "طقم للمناسبة."),
      items: [ck("optional", t("Choose the outfit", "Choisir la tenue", "اختيار الطقم"))] },
    PHOTO("bride"),
    { k: "gifts", side: "groom", icon: "gift", svc: ["gift-shops"],
      n: t("Gifts", "Cadeaux", "الهدايا"),
      d: t("Gifts brought with the request.", "Les cadeaux apportés avec la demande.", "الهدايا المقدّمة مع الطلب."),
      items: [ck("optional", t("Agree on the gifts with the family", "Convenir des cadeaux en famille", "الاتفاق على الهدايا مع العائلة")),
        reg(t("Customs around gifts differ by region", "Les usages autour des cadeaux diffèrent selon les régions", "عادات الهدايا تختلف حسب المنطقة"))] },
    { k: "sweets-bring", side: "groom", icon: "sweets", svc: ["patissiers", "traditional-cakes"],
      n: t("Sweets", "Douceurs", "الحلويات"),
      d: t("Sweets brought to the bride's family.", "Douceurs apportées à la famille de la mariée.", "حلويات تُحمل لعائلة العروسة."),
      items: [ck("optional", t("Order sweets", "Commander les douceurs", "طلب الحلويات"))] },
    { k: "groom-outfit", side: "groom", icon: "hanger", svc: ["couturiers"],
      n: t("Clothing", "Tenue", "اللباس"),
      d: t("Outfit for the groom and close family.", "Tenue du marié et des proches.", "لباس العريس والمقرّبين."),
      items: [ck("optional", t("Prepare the outfit", "Préparer la tenue", "تحضير اللباس"))] },
    { k: "delegation", side: "groom", icon: "people",
      n: t("Family delegation", "Délégation familiale", "وفد العائلة"),
      d: t("The relatives who make the request.", "Les proches qui font la demande.", "الأقارب الذين يتقدّمون بالطلب."),
      items: [ck("essential", t("Decide who speaks for the family", "Décider qui parle au nom de la famille", "تحديد من يتكلم باسم العائلة")),
        ck("optional", t("Plan transport", "Prévoir le transport", "التخطيط للتنقل"))] },
  ]);

// ======================================================================
// 4. FIANÇAILLES
// ======================================================================
event("fiancailles", "both", "ring",
  t("Fiançailles", "Fiançailles", "الخطوبة (الفيانسي)"),
  t("The engagement celebration, often with a ring. Its size ranges from a family gathering to a full party.",
    "La fête des fiançailles, souvent avec une bague. Elle va de la réunion familiale à la grande fête.",
    "حفل الخطوبة، غالباً مع خاتم. يتراوح حجمه من لقاء عائلي إلى حفل كامل."),
  [
    { k: "outfit", side: "bride", icon: "hanger", svc: ["couturiers", "outfit-rental"],
      n: t("Clothing", "Tenue", "الفستان"),
      d: t("The engagement outfit.", "La tenue des fiançailles.", "فستان الخطوبة."),
      items: [ck("essential", t("Choose: buy, sew or rent", "Choisir : acheter, coudre ou louer", "الاختيار: شراء أو خياطة أو كراء")),
        ck("optional", t("Book fittings", "Réserver les essayages", "حجز مواعيد القياس")), BUDGET_TIP] },
    { k: "beauty", side: "bride", icon: "brush", svc: ["makeup", "hairdressers"],
      n: t("Makeup and hair", "Maquillage et coiffure", "الماكياج والتسريحة"),
      d: t("Beauty appointments on the day.", "Rendez-vous beauté le jour J.", "مواعيد التجميل في يوم الحفل."),
      items: [ck("optional", t("Book makeup and hair together", "Réserver maquillage et coiffure ensemble", "حجز الماكياج والتسريحة معاً")),
        ck("optional", t("Do a trial if possible", "Faire un essai si possible", "إجراء تجربة إن أمكن"))] },
    { k: "venue", side: "bride", icon: "venue", svc: ["venues", "decoration"],
      n: t("Venue and family arrangements", "Lieu et organisation familiale", "المكان وتنظيم العائلة"),
      d: t("At home or in a hall — decide the format first.", "À la maison ou en salle — décidez d'abord du format.", "في البيت أو في قاعة — حدّدوا الصيغة أولاً."),
      items: [ck("essential", t("Decide the format and guest count", "Choisir le format et le nombre d'invités", "تحديد الصيغة وعدد المدعوين")),
        ck("optional", t("Book the hall if needed", "Réserver la salle si nécessaire", "حجز القاعة إن لزم"))] },
    { k: "sweets", side: "bride", icon: "sweets", svc: ["traditional-cakes", "patissiers"],
      n: t("Sweets", "Douceurs", "الحلويات"),
      d: t("Cakes and sweets for guests.", "Gâteaux et douceurs pour les invités.", "الحلويات للضيوف."),
      items: [ck("essential", t("Estimate quantities from the guest count", "Estimer les quantités selon le nombre d'invités", "تقدير الكميات حسب عدد الضيوف")), COMPARE_TIP] },
    PHOTO("bride"),
    { k: "ring", side: "groom", icon: "ring", svc: ["gift-shops"],
      n: t("Ring and jewellery", "Bague et bijoux", "الخاتم والمجوهرات"),
      d: t("The engagement ring and any jewellery offered.", "La bague et les bijoux offerts.", "خاتم الخطوبة وأي مجوهرات مقدّمة."),
      items: [ck("essential", t("Confirm the ring size discreetly", "Vérifier discrètement la taille de bague", "معرفة مقاس الخاتم بتكتّم")),
        tip(t("Ask for a receipt that states the gold weight and purity.", "Demandez une facture indiquant le poids et le titre de l'or.", "اطلب فاتورة تبيّن وزن الذهب وعياره."))] },
    { k: "groom-outfit", side: "groom", icon: "hanger", svc: ["couturiers", "outfit-rental"],
      n: t("Clothing", "Tenue", "اللباس"),
      d: t("The groom's outfit for the celebration.", "La tenue du marié pour la fête.", "لباس العريس للحفل."),
      items: [ck("optional", t("Buy or rent a suit", "Acheter ou louer un costume", "شراء أو كراء بدلة"))] },
    { k: "gifts", side: "groom", icon: "gift", svc: ["gift-shops"],
      n: t("Gifts", "Cadeaux", "الهدايا"),
      d: t("Gifts brought for the bride.", "Les cadeaux apportés pour la mariée.", "الهدايا المقدّمة للعروسة."),
      items: [ck("optional", t("List the gifts and who buys them", "Lister les cadeaux et qui les achète", "إعداد قائمة الهدايا ومن يشتريها"))] },
    PHOTO("groom", "groom-photography"),
  ]);

// ======================================================================
// 5. MHIBA
// ======================================================================
event("mhiba", "both", "gift",
  t("Mhiba", "Mhiba", "المهيبة"),
  t("Gifts offered by the groom's family to the bride, often around a religious holiday. Traditions vary by region.",
    "Cadeaux offerts par la famille du marié à la mariée, souvent à l'occasion d'une fête religieuse. Les traditions varient selon les régions.",
    "هدايا تقدّمها عائلة العريس للعروسة، غالباً بمناسبة عيد ديني. تختلف التقاليد حسب المنطقة."),
  [
    { k: "gifts", side: "groom", icon: "gift", svc: ["gift-shops"],
      n: t("Gifts", "Cadeaux", "الهدايا"),
      d: t("The items offered to the bride.", "Les articles offerts à la mariée.", "ما يُقدَّم للعروسة."),
      items: [ck("essential", t("Agree on the list of gifts", "Arrêter la liste des cadeaux", "تحديد قائمة الهدايا")),
        reg(t("Contents differ between families and regions", "Le contenu diffère selon les familles et les régions", "المحتوى يختلف بين العائلات والمناطق"))] },
    { k: "presentation", side: "groom", icon: "tray", svc: ["decoration", "gift-shops"],
      n: t("Gift presentation", "Présentation des cadeaux", "تقديم الهدايا"),
      d: t("Trays, baskets and wrapping.", "Plateaux, corbeilles et emballages.", "الصواني والسلال والتغليف."),
      items: [ck("optional", t("Order trays or decorated baskets", "Commander plateaux ou corbeilles décorées", "طلب صوانٍ أو سلال مزيّنة"))] },
    { k: "clothing", side: "groom", icon: "hanger",
      n: t("Clothing", "Tenue", "اللباس"),
      d: t("Outfits for the family visit.", "Tenues pour la visite familiale.", "ملابس الزيارة العائلية."),
      items: [ck("optional", t("Prepare outfits for the visit", "Préparer les tenues de la visite", "تحضير ملابس الزيارة"))] },
    { k: "sweets", side: "groom", icon: "sweets", svc: ["traditional-cakes", "patissiers"],
      n: t("Sweets", "Douceurs", "الحلويات"),
      d: t("Sweets that accompany the gifts.", "Douceurs qui accompagnent les cadeaux.", "حلويات ترافق الهدايا."),
      items: [ck("optional", t("Order sweets", "Commander les douceurs", "طلب الحلويات"))] },
    { k: "logistics", side: "groom", icon: "car", svc: ["transport"],
      n: t("Preparation and logistics", "Préparation et logistique", "التحضير واللوجستيك"),
      d: t("Date, transport and who carries what.", "Date, transport et qui porte quoi.", "التاريخ والنقل ومن يحمل ماذا."),
      items: [ck("essential", t("Fix the date with the bride's family", "Fixer la date avec la famille de la mariée", "تحديد التاريخ مع عائلة العروسة")),
        ck("optional", t("Plan cars for the family", "Prévoir les voitures de la famille", "تحضير سيارات العائلة"))] },
    { k: "hosting", side: "bride", icon: "home",
      n: t("Receiving the family", "Accueil de la famille", "استقبال العائلة"),
      d: t("Preparing to receive the groom's family.", "Se préparer à recevoir la famille du marié.", "التحضير لاستقبال عائلة العريس."),
      items: [ck("essential", t("Prepare the house and seating", "Préparer la maison et les places", "تحضير البيت والجلسة"))] },
    { k: "outfit", side: "bride", icon: "hanger", svc: ["couturiers"],
      n: t("Clothing", "Tenue", "الطقم"),
      d: t("An outfit for receiving the gifts.", "Une tenue pour recevoir les cadeaux.", "طقم لاستقبال الهدايا."),
      items: [ck("optional", t("Choose the outfit", "Choisir la tenue", "اختيار الطقم"))] },
    { k: "sweets-host", side: "bride", icon: "sweets", svc: ["traditional-cakes"],
      n: t("Sweets", "Douceurs", "الحلويات"),
      d: t("Sweets and drinks for guests.", "Douceurs et boissons pour les invités.", "الحلويات والمشروبات للضيوف."),
      items: [ck("optional", t("Prepare sweets and drinks", "Préparer douceurs et boissons", "تحضير الحلويات والمشروبات"))] },
  ]);

// ======================================================================
// 6. 3A9D — civil / religious contract
// ======================================================================
event("aqd", "both", "document",
  t("3a9d", "3a9d", "العقد"),
  t("The marriage contract — civil and/or religious. Procedures are set by your commune (APC) or notary.",
    "Le contrat de mariage — civil et/ou religieux. Les démarches dépendent de votre commune (APC) ou du notaire.",
    "عقد الزواج — المدني و/أو الديني. تحدّد الإجراءات البلدية أو الموثّق."),
  [
    { k: "documents", side: "both", icon: "document",
      n: t("Documents", "Documents", "الوثائق"),
      d: t("Paperwork for both spouses. Always confirm the current list locally.", "Dossier des deux époux. Vérifiez toujours la liste à jour localement.", "ملف الزوجين. تأكّدوا دائماً من القائمة المحدّثة محلياً."),
      items: [
        ck("essential", t("Ask your APC or notary for the current list of documents", "Demander à l'APC ou au notaire la liste à jour des pièces", "طلب القائمة المحدّثة للوثائق من البلدية أو الموثق"),
          t("Requirements can change and may differ between communes.", "Les exigences peuvent changer et différer d'une commune à l'autre.", "قد تتغيّر الشروط وتختلف من بلدية إلى أخرى.")),
        ck("essential", t("Identity documents and birth certificates for both", "Pièces d'identité et actes de naissance des deux", "بطاقات الهوية وشهادات الميلاد للطرفين")),
        ck("optional", t("Pre-marital medical certificate, if requested", "Certificat médical prénuptial, si demandé", "الشهادة الطبية قبل الزواج إن طُلبت")),
        ck("optional", t("Witnesses' identity documents", "Pièces d'identité des témoins", "بطاقات هوية الشهود")),
      ] },
    { k: "appointments", side: "both", icon: "calendar",
      n: t("Appointments", "Rendez-vous", "المواعيد"),
      d: t("Booking the contract and any religious ceremony.", "Réserver le contrat et l'éventuelle cérémonie religieuse.", "حجز موعد العقد وأي مراسم دينية."),
      items: [ck("essential", t("Book the APC or notary appointment", "Prendre rendez-vous à l'APC ou chez le notaire", "حجز موعد البلدية أو الموثق")),
        ck("optional", t("Agree on the Fatiha date with both families", "Convenir de la date de la Fatiha avec les deux familles", "الاتفاق على موعد الفاتحة مع العائلتين"))] },
    { k: "outfits", side: "both", icon: "hanger", svc: ["couturiers", "outfit-rental"],
      n: t("Outfits", "Tenues", "الألبسة"),
      d: t("Outfits for the signing.", "Tenues pour la signature.", "ألبسة يوم التوقيع."),
      items: [ck("optional", t("Prepare outfits for the day", "Préparer les tenues du jour", "تحضير ألبسة اليوم"))] },
    { k: "family", side: "both", icon: "people",
      n: t("Family arrangements", "Organisation familiale", "تنظيم العائلة"),
      d: t("Who attends and any small gathering after.", "Qui assiste et l'éventuelle réunion après.", "من يحضر وأي لقاء صغير بعد ذلك."),
      items: [ck("optional", t("Plan a small reception after the signing", "Prévoir une petite réception après la signature", "التخطيط لاستقبال صغير بعد التوقيع"))] },
    PHOTO("both"),
  ]);

// ======================================================================
// 7. HENNA
// ======================================================================
event("henna", "both", "hand",
  t("Henna", "Henné", "الحنة"),
  t("The henna evening. Mostly on the bride's side; some families also hold one for the groom.",
    "La soirée du henné. Surtout côté mariée ; certaines familles en organisent aussi une pour le marié.",
    "سهرة الحنة. غالباً عند العروسة، وبعض العائلات تقيمها للعريس أيضاً."),
  [
    { k: "outfit", side: "bride", icon: "hanger", svc: ["couturiers", "outfit-rental"],
      n: t("Outfits", "Tenues", "الأطقم"),
      d: t("Henna-night outfit(s).", "Tenue(s) de la soirée henné.", "طقم أو أطقم سهرة الحنة."),
      items: [reg(t("Choose the outfit customary in your family", "Choisir la tenue d'usage dans votre famille", "اختيار الطقم المعتاد في عائلتك")), BUDGET_TIP] },
    { k: "artist", side: "bride", icon: "hand", svc: ["henna-artists"],
      n: t("Henna artist", "Artiste henné", "فنانة الحنة"),
      d: t("Someone to apply the henna, or a family member.", "Une artiste pour appliquer le henné, ou une proche.", "من تضع الحنة، فنانة أو من العائلة."),
      items: [ck("optional", t("Book the henna artist", "Réserver l'artiste henné", "حجز فنانة الحنة")),
        ck("optional", t("Buy quality henna and accessories", "Acheter un henné de qualité et les accessoires", "شراء حنة جيدة ومستلزماتها"))] },
    { k: "sweets", side: "bride", icon: "sweets", svc: ["traditional-cakes", "patissiers"],
      n: t("Sweets", "Douceurs", "الحلويات"),
      d: t("Cakes, sweets and drinks.", "Gâteaux, douceurs et boissons.", "الحلويات والمشروبات."),
      items: [ck("essential", t("Estimate quantities", "Estimer les quantités", "تقدير الكميات")), COMPARE_TIP] },
    { k: "decoration", side: "bride", icon: "flower", svc: ["decoration"],
      n: t("Decoration", "Décoration", "الديكور"),
      d: t("Setting for the henna ceremony.", "Décor de la cérémonie du henné.", "ديكور مراسم الحنة."),
      items: [ck("optional", t("Prepare the henna tray and seating", "Préparer le plateau du henné et l'assise", "تحضير صينية الحنة والجلسة"))] },
    PHOTO("bride"),
    { k: "music", side: "bride", icon: "music", svc: ["music"],
      n: t("Music", "Musique", "الموسيقى"),
      d: t("Traditional band, DJ or family singing.", "Troupe traditionnelle, DJ ou chants en famille.", "فرقة تقليدية أو دي جي أو غناء عائلي."),
      items: [ck("optional", t("Book the musicians or DJ", "Réserver les musiciens ou le DJ", "حجز الفرقة أو الدي جي"))] },
    { k: "groom-henna", side: "groom", icon: "hand",
      n: t("Groom's henna evening", "Soirée henné du marié", "حنة العريس"),
      d: t("Celebrated in some families and regions.", "Célébrée dans certaines familles et régions.", "تُقام في بعض العائلات والمناطق."),
      items: [reg(t("Decide whether your family holds it", "Décider si votre famille l'organise", "قرّر إن كانت عائلتك تقيمها")),
        ck("optional", t("Prepare henna and a small gathering", "Préparer le henné et une petite réunion", "تحضير الحنة ولقاء صغير"))] },
    { k: "groom-outfit", side: "groom", icon: "hanger", svc: ["couturiers", "outfit-rental"],
      n: t("Outfit", "Tenue", "اللباس"),
      d: t("Traditional or modern outfit.", "Tenue traditionnelle ou moderne.", "لباس تقليدي أو عصري."),
      items: [reg(t("Burnous, gandoura or other — depends on region", "Burnous, gandoura ou autre — selon la région", "البرنوس أو القندورة أو غيرها — حسب المنطقة"))] },
    { k: "groom-music", side: "groom", icon: "music", svc: ["music"],
      n: t("Music", "Musique", "الموسيقى"),
      d: t("Music for the evening.", "Musique de la soirée.", "موسيقى السهرة."),
      items: [ck("optional", t("Book music", "Réserver la musique", "حجز الموسيقى"))] },
  ]);

// ======================================================================
// 8. HAMAM
// ======================================================================
event("hamam", "both", "drop",
  t("Hamam", "Hammam", "الحمام"),
  t("The pre-wedding hammam. Optional and tradition-dependent.", "Le hammam avant le mariage. Facultatif et selon les traditions.", "الحمام قبل العرس. اختياري وحسب التقاليد."),
  [
    { k: "spa", side: "bride", icon: "drop", svc: ["hamam-spa"],
      n: t("Hamam / spa", "Hammam / spa", "الحمام / السبا"),
      d: t("Booking a hammam or spa, privately or with family.", "Réserver un hammam ou un spa, en privé ou en famille.", "حجز حمام أو سبا، بشكل خاص أو مع العائلة."),
      items: [ck("essential", t("Book the hammam and the time slot", "Réserver le hammam et le créneau", "حجز الحمام والموعد")),
        ck("optional", t("Decide who comes with you", "Décider qui vous accompagne", "تحديد من يرافقك"))] },
    { k: "outfit", side: "bride", icon: "hanger",
      n: t("Outfit", "Tenue", "الطقم"),
      d: t("Outfit for after the hammam.", "Tenue pour la sortie du hammam.", "طقم ما بعد الحمام."),
      items: [reg(t("Some families have a specific outfit for this day", "Certaines familles ont une tenue propre à ce jour", "لبعض العائلات طقم خاص بهذا اليوم"))] },
    { k: "accessories", side: "bride", icon: "ring",
      n: t("Accessories", "Accessoires", "الإكسسوارات"),
      d: t("Traditional hammam accessories.", "Accessoires traditionnels du hammam.", "مستلزمات الحمام التقليدية."),
      items: [ck("optional", t("Hammam bowl, clogs and towels", "Tasse, sabots et serviettes", "الطاسة والقبقاب والمناشف"))] },
    { k: "items", side: "bride", icon: "basket",
      n: t("Preparation items", "Articles de préparation", "مستلزمات التحضير"),
      d: t("Products and items to bring.", "Produits et articles à emporter.", "المنتجات والأغراض التي تُحمل."),
      items: [ck("optional", t("Prepare soaps, oils and scrub glove", "Préparer savons, huiles et gant", "تحضير الصابون والزيوت والكيس")),
        ck("optional", t("Sweets or drinks to share, if customary", "Douceurs ou boissons à partager, selon l'usage", "حلويات أو مشروبات للمشاركة حسب العادة"))] },
    { k: "transport", side: "bride", icon: "car", svc: ["transport"],
      n: t("Transport", "Transport", "النقل"),
      d: t("Getting there and back.", "L'aller et le retour.", "الذهاب والإياب."),
      items: [ck("optional", t("Arrange cars", "Organiser les voitures", "تنظيم السيارات"))] },
    { k: "groom-spa", side: "groom", icon: "drop", svc: ["hamam-spa"],
      n: t("Hamam / barber", "Hammam / barbier", "الحمام / الحلاق"),
      d: t("Hammam and barber visit, if you wish.", "Hammam et barbier, si vous le souhaitez.", "الحمام والحلاق إن رغبت."),
      items: [ck("optional", t("Book the hammam or barber", "Réserver le hammam ou le barbier", "حجز الحمام أو الحلاق"))] },
  ]);

// ======================================================================
// 9. 3ARSS — the wedding celebration
// ======================================================================
event("arss", "both", "venue",
  t("3arss", "3arss", "العرس"),
  t("The wedding celebration. Each side often organises its own party — plan yours here.",
    "La fête du mariage. Chaque côté organise souvent sa propre fête — préparez la vôtre ici.",
    "حفل الزفاف. غالباً ما ينظّم كل طرف حفله الخاص — خطّط لحفلك هنا."),
  [
    { k: "venue", side: "bride", icon: "venue", svc: ["venues"],
      n: t("Wedding venue", "Salle des fêtes", "قاعة الحفلات"),
      d: t("The hall and what its package includes.", "La salle et ce que comprend sa formule.", "القاعة وما تشمله باقتها."),
      items: [ck("essential", t("Fix the guest count", "Fixer le nombre d'invités", "تحديد عدد المدعوين")),
        ck("essential", t("Visit at least two halls", "Visiter au moins deux salles", "زيارة قاعتين على الأقل")),
        ck("optional", t("Check parking, women-only areas and timing", "Vérifier parking, espaces femmes et horaires", "التحقق من الموقف والفضاءات الخاصة بالنساء والتوقيت")), COMPARE_TIP] },
    { k: "catering", side: "bride", icon: "dish", svc: ["caterers", "savoury"],
      n: t("Catering", "Traiteur", "التموين"),
      d: t("Dinner, savoury dishes and service staff.", "Dîner, salés et personnel de service.", "العشاء والمملحات وطاقم الخدمة."),
      items: [ck("essential", t("Choose the menu and price per person", "Choisir le menu et le prix par personne", "اختيار القائمة والسعر للشخص")),
        ck("optional", t("Ask whether service staff and dishes are included", "Demander si le service et la vaisselle sont inclus", "السؤال إن كان الطاقم والأواني مشمولين"))] },
    { k: "photographer", side: "bride", icon: "camera", svc: ["photographers"],
      n: t("Photographer", "Photographe", "المصورة"),
      d: t("Photos of the day, often by a female photographer for women's areas.", "Photos du jour, souvent par une photographe pour les espaces femmes.", "صور اليوم، غالباً من طرف مصورة للفضاءات النسائية."),
      items: [ck("essential", t("Review full galleries, not only highlights", "Regarder des galeries complètes, pas seulement les meilleures photos", "مشاهدة معارض كاملة وليس أفضل الصور فقط")),
        ck("optional", t("Confirm delivery time and album options", "Confirmer le délai et les options d'album", "تأكيد موعد التسليم وخيارات الألبوم"))] },
    { k: "videographer", side: "bride", icon: "video", svc: ["videographers"],
      n: t("Videographer", "Vidéaste", "مصور الفيديو"),
      d: t("Film of the celebration.", "Film de la fête.", "فيديو الحفل."),
      items: [ck("optional", t("Ask for a sample film", "Demander un film d'exemple", "طلب فيديو نموذجي"))] },
    { k: "outfits", side: "bride", icon: "hanger", svc: ["couturiers", "outfit-rental"],
      n: t("Outfits", "Tenues", "الأطقم"),
      d: t("The bride's outfits for the evening.", "Les tenues de la mariée pour la soirée.", "أطقم العروسة للسهرة."),
      items: [ck("essential", t("List the outfits and fitting dates", "Lister les tenues et les dates d'essayage", "قائمة الأطقم ومواعيد القياس")), BUDGET_TIP],
      subs: [
        { k: "tesdira", side: "bride", icon: "needle",
          n: t("Outfit sequence (tesdira)", "Défilé des tenues (tesdira)", "التصديرة"),
          d: t("The sequence of traditional outfits worn during the evening.", "La succession de tenues traditionnelles portées pendant la soirée.", "تتابع الألبسة التقليدية خلال السهرة."),
          items: [reg(t("Number and type of outfits depend on region and family", "Le nombre et le type de tenues dépendent de la région et de la famille", "عدد الأطقم ونوعها حسب المنطقة والعائلة")),
            ck("optional", t("Plan the order and changing time", "Prévoir l'ordre et le temps de changement", "تحديد الترتيب ووقت التبديل"))] },
        { k: "dress", side: "bride", icon: "hanger", svc: ["outfit-rental", "couturiers"],
          n: t("Wedding dress", "Robe de mariée", "فستان العرس"),
          d: t("Buy, sew or rent.", "Acheter, coudre ou louer.", "شراء أو خياطة أو كراء."),
          items: [ck("optional", t("Compare renting and buying", "Comparer location et achat", "المقارنة بين الكراء والشراء"))] },
      ] },
    { k: "beauty", side: "bride", icon: "brush", svc: ["makeup", "hairdressers"],
      n: t("Makeup and hair", "Maquillage et coiffure", "الماكياج والتسريحة"),
      d: t("Beauty appointments for the day.", "Rendez-vous beauté du jour.", "مواعيد التجميل في اليوم."),
      items: [ck("essential", t("Book early — popular dates fill up", "Réserver tôt — les dates prisées partent vite", "احجزي مبكراً — المواعيد المطلوبة تمتلئ بسرعة")),
        ck("optional", t("Ask whether they can follow outfit changes", "Demander un suivi pendant les changements de tenue", "السؤال عن المرافقة أثناء تبديل الأطقم"))] },
    { k: "decoration", side: "bride", icon: "flower", svc: ["decoration"],
      n: t("Decoration", "Décoration", "الديكور"),
      d: t("Stage, tables and flowers.", "Scène, tables et fleurs.", "المنصة والطاولات والورود."),
      items: [ck("optional", t("Check what the hall already includes", "Vérifier ce que la salle inclut déjà", "التحقق مما تشمله القاعة مسبقاً"))] },
    { k: "music", side: "bride", icon: "music", svc: ["music"],
      n: t("Music", "Musique", "الموسيقى"),
      d: t("DJ, band or both.", "DJ, orchestre ou les deux.", "دي جي أو فرقة أو كلاهما."),
      items: [ck("optional", t("Agree on playlist and timing", "Convenir de la playlist et des horaires", "الاتفاق على قائمة الأغاني والتوقيت"))] },
    { k: "cakes", side: "bride", icon: "sweets", svc: ["traditional-cakes", "patissiers"],
      n: t("Cakes", "Gâteaux", "الحلويات"),
      d: t("Traditional cakes and wedding cake.", "Gâteaux traditionnels et pièce montée.", "الحلويات التقليدية وكعكة العرس."),
      items: [ck("essential", t("Estimate pieces per guest", "Estimer le nombre de pièces par invité", "تقدير عدد القطع لكل ضيف")),
        ck("optional", t("Taste before ordering", "Goûter avant de commander", "التذوق قبل الطلب")), COMPARE_TIP] },
    { k: "transport", side: "bride", icon: "car", svc: ["transport"],
      n: t("Transport", "Transport", "النقل"),
      d: t("Cars for the bride and family.", "Voitures pour la mariée et la famille.", "سيارات العروسة والعائلة."),
      items: [ck("optional", t("Arrange cars and drivers", "Organiser voitures et chauffeurs", "تنظيم السيارات والسائقين"))] },
    // groom side
    { k: "groom-venue", side: "groom", icon: "venue", svc: ["venues"],
      n: t("Venue", "Lieu de la fête", "مكان الحفل"),
      d: t("Hall, home or tent for the groom's celebration.", "Salle, maison ou chapiteau pour la fête du marié.", "قاعة أو بيت أو خيمة لحفل العريس."),
      items: [ck("essential", t("Decide the format and guest count", "Choisir le format et le nombre d'invités", "تحديد الصيغة وعدد المدعوين")), COMPARE_TIP] },
    { k: "groom-catering", side: "groom", icon: "dish", svc: ["caterers", "savoury"],
      n: t("Catering", "Traiteur", "التموين"),
      d: t("Dinner for the guests.", "Dîner des invités.", "عشاء المدعوين."),
      items: [ck("essential", t("Choose the menu and price per person", "Choisir le menu et le prix par personne", "اختيار القائمة والسعر للشخص"))] },
    { k: "groom-outfit", side: "groom", icon: "hanger", svc: ["couturiers", "outfit-rental"],
      n: t("Outfit", "Tenue", "اللباس"),
      d: t("Suit and/or traditional outfit.", "Costume et/ou tenue traditionnelle.", "بدلة و/أو لباس تقليدي."),
      items: [reg(t("Burnous, costume or both — depends on family", "Burnous, costume ou les deux — selon la famille", "برنوس أو بدلة أو كلاهما — حسب العائلة")),
        ck("optional", t("Book fittings", "Réserver les essayages", "حجز مواعيد القياس"))] },
    { k: "cortege", side: "groom", icon: "car", svc: ["transport", "decoration"],
      n: t("Car and cortège", "Voiture et cortège", "السيارة والموكب"),
      d: t("The car that brings the bride, and the convoy.", "La voiture qui amène la mariée, et le cortège.", "السيارة التي تُحضر العروسة، والموكب."),
      items: [ck("essential", t("Book the wedding car", "Réserver la voiture des mariés", "حجز سيارة العرس")),
        ck("optional", t("Arrange car decoration", "Prévoir la décoration de la voiture", "تحضير تزيين السيارة"))] },
    { k: "groom-music", side: "groom", icon: "music", svc: ["music"],
      n: t("Music", "Musique", "الموسيقى"),
      d: t("DJ, band or traditional troupe.", "DJ, orchestre ou troupe traditionnelle.", "دي جي أو فرقة أو فرقة تقليدية."),
      items: [reg(t("Traditional troupes (zorna, karkabou…) vary by region", "Les troupes traditionnelles (zorna, karkabou…) varient selon la région", "الفرق التقليدية (الزرنة، القرقابو…) تختلف حسب المنطقة"))] },
    PHOTO("groom", "groom-photography"),
    { k: "groom-cakes", side: "groom", icon: "sweets", svc: ["traditional-cakes", "patissiers"],
      n: t("Cakes", "Gâteaux", "الحلويات"),
      d: t("Sweets for the groom's guests.", "Douceurs pour les invités du marié.", "حلويات مدعوي العريس."),
      items: [ck("optional", t("Estimate quantities", "Estimer les quantités", "تقدير الكميات"))] },
  ]);
