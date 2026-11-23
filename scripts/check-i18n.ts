// Verifies that every interface key used in src/ exists in all three
// locale files, and that the files contain no empty values.
// Usage: bun scripts/check-i18n.ts
import { Glob } from "bun";
import ar from "../src/i18n/locales/ar.json";
import en from "../src/i18n/locales/en.json";
import fr from "../src/i18n/locales/fr.json";

const locales: Record<string, Record<string, string>> = { ar, fr, en };
const used = new Set<string>();
for await (const f of new Glob("src/**/*.tsx").scan(".")) {
  const s = await Bun.file(f).text();
  for (const m of s.matchAll(/\bt\(\s*"([a-z][a-zA-Z0-9_.]*\.[a-zA-Z0-9_.]+)"/g)) used.add(m[1]);
}
// keys built dynamically (t(`unit.${u}`) etc.) are listed in en.json and checked across languages
let problems = 0;
for (const k of used) for (const [l, d] of Object.entries(locales)) if (!d[k]) { console.log(`missing ${l}: ${k}`); problems++; }
for (const k of Object.keys(en)) for (const [l, d] of Object.entries(locales)) if (!d[k]?.trim()) { console.log(`missing ${l}: ${k}`); problems++; }
for (const [l, d] of Object.entries(locales)) for (const k of Object.keys(d)) if (!(k in en)) { console.log(`extra ${l}: ${k}`); }
// placeholders must match across languages
for (const k of Object.keys(en)) {
  const ph = (s?: string) => (s?.match(/\{\w+\}/g) ?? []).sort().join();
  for (const l of ["ar", "fr"]) if (locales[l][k] && ph(locales[l][k]) !== ph(en[k as keyof typeof en])) { console.log(`placeholder mismatch ${l}: ${k}`); problems++; }
}
console.log(`${used.size} keys used in code · ${Object.keys(en).length} keys in en.json · ${problems} problem(s)`);
process.exit(problems ? 1 : 0);
