// End-to-end acceptance tests (brief §18 + Word spec §15) against the
// production build in demo mode. Usage:  bun run build && node tests/e2e/run.mjs
// Optional env: BASE_URL (default: starts `bun scripts/preview.ts` on :4173),
//               CHROME_PATH (use a specific Chromium), SCREENSHOTS=1
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:4173";
let server;
if (!process.env.BASE_URL) {
  server = spawn("bun", ["scripts/preview.ts"], { env: { ...process.env, PORT: "4173" }, stdio: "ignore" });
  await new Promise((r) => setTimeout(r, 800));
}
const SHOTS = process.env.SCREENSHOTS === "1";
if (SHOTS) mkdirSync("tests/screenshots", { recursive: true });

const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
let failures = 0, passes = 0;
const ok = (cond, label) => { if (cond) { passes++; console.log("  ✓", label); } else { failures++; console.log("  ✗", label); } };
const errorsOf = (page) => { const e = []; page.on("pageerror", (x) => e.push(x.message)); return e; };

async function fresh(viewport = { width: 375, height: 812 }) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  return { ctx, page, errors: errorsOf(page) };
}
const text = async (page, sel = "body") => (await page.textContent(sel)).replace(/\s+/g, " ");
const wait = (page, ms = 250) => page.waitForTimeout(ms);
const amount = (s) => s.replace(/[  ]/g, " ");

// --------------------------------------------------------------- 1. opening experience
console.log("1 · Opening experience");
{
  const { ctx, page, errors } = await fresh();
  await page.goto(BASE + "/"); await wait(page, 500);
  ok(await page.isVisible("button:has-text('Français')") && await page.isVisible("button:has-text('العربية')"), "first visit shows language selection");
  await page.click("button:has-text('English')"); await wait(page);
  const main = await text(page, "main");
  ok(main.includes("El 3rossa") && main.includes("El 3ris") && main.includes("3ARSSI"), "landing shows identity and both choices");
  ok(!(await page.isVisible("nav.bottom-nav")) && !(await page.isVisible(".demo-banner")) && (await page.locator("main a").count()) === 2,
    "landing contains nothing else (no nav, banner or extra links)");
  await page.reload(); await wait(page, 400);
  ok(!(await page.isVisible("button:has-text('Français')")) && await page.isVisible("text=El 3ris"), "language not asked again after reload");
  await page.click("text=El 3rossa"); await wait(page, 400);
  await page.click("nav.bottom-nav >> text=Profile"); await wait(page);
  await page.click("text=Settings"); await wait(page);
  await page.click("text=Language"); await wait(page);
  await page.click("button[role=radio]:has-text('العربية')"); await wait(page);
  ok(await page.getAttribute("html", "dir") === "rtl" && await page.getAttribute("html", "lang") === "ar", "Profile → Settings → Language switches to Arabic RTL");
  const navBox = await page.locator("nav.bottom-nav li").first().boundingBox();
  ok(navBox.x > 200, "RTL: first navigation tab is on the right");
  ok((await text(page, "nav.bottom-nav")).includes("المناسبات"), "navigation translated to Arabic");
  await page.reload(); await wait(page, 400);
  ok(await page.getAttribute("html", "dir") === "rtl", "Arabic preference persists");
  await page.click("button[role=radio]:has-text('Français')"); await wait(page);
  ok((await text(page, "nav.bottom-nav")).includes("Événements") && await page.getAttribute("html", "dir") === "ltr", "French works and is LTR");
  ok(errors.length === 0, `no runtime errors (${errors.join("; ")})`);
  await ctx.close();
}

// --------------------------------------------------------------- 2. spaces & event-specific content (visitor)
console.log("2 · Planning spaces and event-specific categories");
{
  const { ctx, page } = await fresh();
  await page.goto(BASE + "/"); await page.click("button:has-text('English')"); await wait(page);
  await page.click("text=El 3rossa"); await wait(page, 400);
  ok(page.url().endsWith("/s/3rossa") && (await text(page)).includes("El 3rossa's space"), "El 3rossa opens her space");
  ok(await page.isVisible("text=Jehaz"), "bride sees Jehaz");
  await page.click("a.event-card:has-text('Choufa')"); await wait(page);
  const brideChoufa = await text(page, "main");
  ok(brideChoufa.includes("Makeup") && !brideChoufa.includes("Gifts to bring"), "bride's Choufa has bride categories");
  await page.goto(BASE + "/s/3ris"); await wait(page, 400);
  ok((await text(page)).includes("El 3ris's space") && !(await page.isVisible("a.event-card:has-text('Jehaz')")), "El 3ris opens his space (no Jehaz)");
  await page.click("a.event-card:has-text('Choufa')"); await wait(page);
  const groomChoufa = await text(page, "main");
  ok(groomChoufa.includes("Gifts to bring") && !groomChoufa.includes("Makeup"), "groom's Choufa has different categories");
  await page.goto(BASE + "/s/3rossa"); await wait(page, 300);
  await page.click("a.event-card:has-text('Henna')"); await wait(page);
  const henna = await text(page, "main");
  ok(henna.includes("Henna artist") && !henna.includes("Wedding venue"), "categories change with the event");
  await page.click("a.list-item:has-text('Henna artist')"); await wait(page);
  ok((await text(page, "main")).includes("Checklist"), "category page shows checklist");
  await page.click("button.tick >> nth=0"); await wait(page);
  ok(await page.isVisible("text=Save your planning"), "personal action asks a visitor to sign in");
  await ctx.close();
}

// --------------------------------------------------------------- 3. account, budget, estimate
console.log("3 · Account, independent event budgets, allocations, expenses, estimates");
{
  const { ctx, page, errors } = await fresh();
  await page.goto(BASE + "/"); await page.click("button:has-text('English')"); await wait(page);
  await page.goto(BASE + "/s/3rossa/account?mode=signup"); await wait(page);
  await page.fill("input[autocomplete=name]", "Amina");
  await page.fill("input[type=email]", "amina@example.com");
  await page.fill("input[type=password]", "secret-pass-1");
  await page.click("form button.btn.block"); await wait(page, 600);
  ok(page.url().endsWith("/s/3rossa"), "account created and signed in");

  await page.click("a.event-card:has-text('Choufa')"); await wait(page, 500);
  await page.click("text=Set this event's budget"); await wait(page);
  await page.click("button:has-text('Set the event budget')"); await wait(page);
  await page.fill(".sheet input.input", "80000"); await page.click(".sheet button.btn:not(.secondary)"); await wait(page, 400);
  const alloc = async (name, v) => {
    await page.click(`button.list-item:has-text('${name}')`); await wait(page);
    await page.fill(".sheet input.input", v); await page.click(".sheet button.btn:not(.secondary)"); await wait(page, 400);
  };
  await alloc("Outfit", "25000"); await alloc("Makeup", "15000"); await alloc("Cakes and sweets", "20000"); await alloc("Drinks", "10000");
  const kpis = amount(await text(page, ".card.blue"));
  ok(kpis.includes("80,000 DA") && kpis.includes("70,000 DA") && kpis.includes("10,000 DA"), "80,000 budget · 70,000 allocated · 10,000 unallocated");

  await page.click("button:has-text('Add expense')"); await wait(page);
  await page.getByLabel("What for").fill("Cake deposit");
  await page.fill(".sheet input[inputmode=decimal]", "5000");
  await page.selectOption(".sheet select >> nth=0", { label: "Cakes and sweets" });
  await page.click(".sheet button.btn:not(.secondary)"); await wait(page, 500);
  const cakes = amount(await text(page, "button.list-item:has-text('Cakes and sweets')"));
  ok(cakes.includes("20,000 DA") && cakes.includes("Remaining: 15,000 DA") && cakes.includes("Spent: 5,000 DA"), "expense changes spent/remaining, not the allocation");
  ok(amount(await text(page, ".card.blue")).includes("10,000 DA"), "unallocated unchanged by spending");

  await page.goto(BASE + "/s/3rossa/budgets"); await wait(page, 400);
  const budgets = amount(await text(page, "main"));
  ok(budgets.includes("independent budget") && (await page.locator("main a.card").count()) >= 9 && !/total wedding|overall/i.test(budgets),
    "budgets page lists events separately, no wedding-wide total");

  // estimate on Choufa → Cakes
  await page.goto(BASE + "/s/3rossa"); await wait(page, 300);
  await page.click("a.event-card:has-text('Choufa')"); await wait(page);
  await page.click("a.list-item:has-text('Cakes and sweets')"); await wait(page);
  await page.click("button:has-text('Estimate')"); await wait(page);
  await page.selectOption(".sheet select >> nth=0", { index: 0 });
  await page.fill("#est-q", "200"); await wait(page);
  const est = amount(await text(page, ".sheet"));
  ok(est.includes("200 × 80 DA = 16,000 DA") && est.includes("200 × 120 DA = 24,000 DA"), "200 pieces × 80–120 DA → 16,000–24,000 DA");
  ok(est.includes("May exceed budget"), "with a 20,000 DA budget the status is “May exceed budget”");
  await page.click(".sheet button.btn:not(.secondary)"); await wait(page, 400);
  ok((await text(page, "main")).includes("May exceed budget"), "saved estimate shows its status");

  // tick a checklist item, reload, still ticked
  await page.click("button.tick >> nth=0"); await wait(page, 300);
  await page.reload(); await wait(page, 600);
  ok(await page.getAttribute("button.tick >> nth=0", "aria-checked") === "true", "checklist progress persists after refresh");
  ok(errors.length === 0, `no runtime errors (${errors.join("; ")})`);

  // personalise events
  await page.goto(BASE + "/s/3rossa/events"); await wait(page, 400);
  await page.click("button:has-text('Add an event')"); await wait(page);
  await page.fill(".sheet input.input", "Tasdira family dinner"); await page.click(".sheet button.btn:not(.secondary)"); await wait(page, 400);
  ok(await page.isVisible("text=Tasdira family dinner"), "user can add an event");
  await page.click(".admin-row:has-text('Hamam') button[aria-label='Remove']"); await wait(page);
  await page.click(".sheet button.btn.danger"); await wait(page, 400);
  ok(await page.isVisible("text=Removed events"), "user can remove (and later restore) a suggested event");
  await page.goto(BASE + "/s/3rossa"); await wait(page, 800);
  const titles = await page.locator("a.event-card .title").allTextContents();
  ok(new Set(titles).size === titles.length, "no duplicated events in the plan");
  ok(!(await page.isVisible("a.event-card:has-text('Hamam')")) && await page.isVisible("a.event-card:has-text('Tasdira family dinner')"), "space reflects the personalised list");

  // providers, contact, favourites
  await page.goto(BASE + "/s/3rossa/providers"); await wait(page, 300);
  await page.click("a.card:has-text('Atelier Lumière')"); await wait(page, 300);
  ok(await page.isVisible("text=Fictional sample"), "sample providers are clearly labelled");
  ok((await text(page, "main")).includes("Indicative prices"), "profile shows prices with units");
  await page.click("button[aria-label='Save provider']"); await wait(page, 300);
  await page.goto(BASE + "/s/3rossa/saved"); await wait(page, 300);
  ok(await page.isVisible("text=Atelier Lumière"), "favourite saved");
  await ctx.close();
}

// --------------------------------------------------------------- 4. admin
console.log("4 · Admin dashboard (demo mode)");
{
  const { ctx, page, errors } = await fresh({ width: 1280, height: 900 });
  await page.goto(BASE + "/"); await page.click("button:has-text('English')"); await wait(page);
  await page.goto(BASE + "/admin"); await wait(page, 500);
  await page.click("button:has-text('Open admin with the demo account')"); await wait(page, 1200);
  ok(await page.isVisible("text=Needs attention"), "admin overview opens for an administrator");

  await page.goto(BASE + "/admin/events"); await wait(page, 400);
  await page.click("button:has-text('Add event')"); await wait(page);
  const tr = async (vals) => { for (const [l, v] of Object.entries(vals)) { await page.click(`.sheet .lang-tabs button:has-text('${l}')`); await page.fill(".sheet .card.soft input.input >> nth=0", v); } };
  await tr({ FR: "Soirée test", EN: "Test evening", AR: "سهرة تجريبية" });
  await page.click(".sheet button.btn:not(.secondary)"); await wait(page, 600);
  ok(await page.isVisible("text=Test evening"), "admin creates an event in three languages");
  await page.click("a:has-text('Test evening')"); await wait(page, 300);
  await page.click("button:has-text('Add category')"); await wait(page);
  await tr({ FR: "Lieu", EN: "Place", AR: "المكان" });
  await page.click(".sheet button.btn:not(.secondary)"); await wait(page, 700);
  ok(page.url().includes("/admin/categories/"), "category created → editor opened");
  await page.click("a.link-btn:has-text('Back')"); await wait(page, 300);
  for (const [i, n] of [["Sub A", "Sous A"], ["Sub B", "Sous B"]].entries()) {
    await page.click(".admin-row:has-text('Place') button[aria-label='Add subcategory']"); await wait(page);
    await tr({ EN: n[0], FR: n[1] }); await page.click(".sheet button.btn:not(.secondary)"); await wait(page, 600);
    await page.goBack(); await wait(page, 400);
  }
  ok(await page.isVisible("text=Sub A") && await page.isVisible("text=Sub B"), "two subcategories added");
  const order = async () => (await page.locator(".admin-row.indent .title").allTextContents());
  await page.click(".admin-row.indent:has-text('Sub B') button[aria-label='Move up']"); await wait(page, 500);
  ok((await order())[0] === "Sub B", "subcategories reordered");

  await page.goto(BASE + "/admin/providers/new"); await wait(page, 300);
  await page.fill("input[required]", "Test Photo Studio");
  await page.selectOption("select >> nth=0", { label: "Photographers" });
  await page.fill("input[type=tel] >> nth=1", "0555 12 34 56");
  await page.click("form button.btn:has-text('Save')"); await wait(page, 700);
  ok(page.url().match(/\/admin\/providers\/[0-9a-f-]{36}$/), "admin adds a provider with contact method");

  await page.goto(BASE + "/admin/demo"); await wait(page, 300);
  ok(await page.isVisible("text=Remove all demo content"), "demo content can be identified and removed");
  ok(errors.length === 0, `no runtime errors (${errors.join("; ")})`);

  // client sees the admin changes after refresh (same device in demo mode)
  await page.goto(BASE + "/s/3rossa"); await wait(page, 500);
  ok(await page.isVisible("a.event-card:has-text('Test evening')"), "new event visible to the client and persists after reload");
  await page.click("a.event-card:has-text('Test evening')"); await wait(page, 300);
  await page.click("a.list-item:has-text('Place')"); await wait(page, 300);
  ok(await page.isVisible("text=Sub B"), "category and subcategories visible to the client");
  await page.goto(BASE + "/s/3rossa/providers?q=Test%20Photo"); await wait(page, 300);
  await page.click("a.card:has-text('Test Photo Studio')"); await wait(page, 300);
  const href = await page.evaluate(() => [...document.querySelectorAll("button")].map((b) => b.textContent).join("|"));
  ok(href.includes("WhatsApp"), "new provider's WhatsApp contact is shown");
  await ctx.close();
}

// --------------------------------------------------------------- 5. responsive & RTL layout checks
console.log("5 · Responsive layout (no horizontal overflow) in EN and AR");
{
  const sizes = [[320, 640], [360, 780], [390, 844], [414, 896], [768, 1024], [1024, 768], [1440, 900]];
  const pages = ["/", "/s/3rossa", "/s/3ris", "/s/3rossa/events", "/s/3rossa/budgets", "/s/3rossa/providers", "/s/3rossa/saved", "/s/3rossa/profile",
    "/s/3rossa/settings", "/s/3rossa/settings/language", "/s/3rossa/account"];
  const { ctx, page } = await fresh();
  await page.goto(BASE + "/"); await page.click("button:has-text('English')"); await wait(page, 300);
  // pick dynamic pages from the UI
  await page.goto(BASE + "/s/3rossa"); await wait(page, 300);
  await page.click("a.event-card:has-text('3arss')"); await wait(page, 300);
  pages.push(new URL(page.url()).pathname);
  await page.click("a.list-item:has-text('Outfits')"); await wait(page, 300);
  pages.push(new URL(page.url()).pathname);
  pages.push("/s/3rossa/p/sample-photo", "/s/3rossa/p/sample-venue", "/admin");
  let overflow = [];
  for (const lang of ["en", "ar"]) {
    await page.evaluate((l) => localStorage.setItem("3arssi.lang", l), lang);
    for (const [w, h] of sizes) {
      await page.setViewportSize({ width: w, height: h });
      for (const p of pages) {
        await page.goto(BASE + p); await wait(page, 150);
        const o = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        if (o > 1) overflow.push(`${lang} ${w}px ${p} (+${o}px)`);
        if (SHOTS && [320, 390, 768, 1440].includes(w)) await page.screenshot({ path: `tests/screenshots/${lang}-${w}-${p.replace(/\//g, "_") || "root"}.png`, fullPage: true });
      }
    }
  }
  ok(overflow.length === 0, `no horizontal overflow on ${pages.length} pages × ${sizes.length} sizes × 2 languages${overflow.length ? " → " + overflow.slice(0, 8).join(", ") : ""}`);
  await ctx.close();
}

await browser.close();
server?.kill();
console.log(`\n${passes} passed · ${failures} failed`);
process.exit(failures ? 1 : 0);
