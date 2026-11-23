// Interface language system.
// - Default strings: one JSON file per language (src/i18n/locales/*.json),
//   so each language is edited independently.
// - Admin overrides: ui_translations table, per key and per language.
// - First visit: no saved language → LanguageSelect screen.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import ar from "./locales/ar.json";
import en from "./locales/en.json";
import fr from "./locales/fr.json";
import type { Lang, UiTranslation } from "../data/types";

export const BUNDLED: Record<Lang, Record<string, string>> = { ar, fr, en };
const LANG_KEY = "3arssi.lang";
export const LANG_NAMES: Record<Lang, string> = { ar: "العربية", fr: "Français", en: "English" };
const LOCALE: Record<Lang, string> = { ar: "ar-DZ-u-nu-latn", fr: "fr-DZ", en: "en-GB" };

export function savedLang(): Lang | null {
  try {
    const v = localStorage.getItem(LANG_KEY);
    return v === "ar" || v === "fr" || v === "en" ? v : null;
  } catch { return null; }
}

type Vars = Record<string, string | number>;
interface I18n {
  lang: Lang;
  hasChosen: boolean;
  dir: "rtl" | "ltr";
  t: (key: string, vars?: Vars) => string;
  setLang: (l: Lang) => void;
  setOverrides: (rows: UiTranslation[]) => void;
  money: (n: number | null | undefined) => string;
  number: (n: number) => string;
  date: (iso: string | null | undefined) => string;
}

const Ctx = createContext<I18n | null>(null);

function interpolate(s: string, vars?: Vars) {
  if (!vars) return s;
  return s.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? String(vars[k]) : `{${k}}`));
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const initial = savedLang();
  const [lang, setLangState] = useState<Lang>(initial ?? guessLang());
  const [hasChosen, setHasChosen] = useState(initial !== null);
  const [overrides, setOverridesState] = useState<Record<string, string>>({});
  const [allOverrides, setAllOverrides] = useState<UiTranslation[]>([]);

  useEffect(() => {
    const map: Record<string, string> = {};
    for (const o of allOverrides) if (o.lang === lang && o.value.trim()) map[o.key] = o.value;
    setOverridesState(map);
  }, [allOverrides, lang]);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    try { localStorage.setItem(LANG_KEY, l); } catch { /* private mode: keeps for session */ }
    setLangState(l);
    setHasChosen(true);
  }, []);

  const value = useMemo<I18n>(() => {
    const nf = new Intl.NumberFormat(LOCALE[lang], { maximumFractionDigits: 2 });
    const df = new Intl.DateTimeFormat(LOCALE[lang], { day: "numeric", month: "long", year: "numeric" });
    const t = (key: string, vars?: Vars) =>
      interpolate(overrides[key] ?? BUNDLED[lang][key] ?? BUNDLED.fr[key] ?? BUNDLED.en[key] ?? key, vars);
    return {
      lang, hasChosen, dir: lang === "ar" ? "rtl" : "ltr", t, setLang,
      setOverrides: setAllOverrides,
      number: (n) => nf.format(n),
      money: (n) => (n === null || n === undefined ? "—" : `${nf.format(n)} ${t("currency.da")}`),
      date: (iso) => {
        if (!iso) return "—";
        const d = new Date(iso.length === 10 ? iso + "T12:00:00" : iso);
        return Number.isNaN(d.getTime()) ? "—" : df.format(d);
      },
    };
  }, [lang, hasChosen, overrides, setLang]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

function guessLang(): Lang {
  const n = (typeof navigator !== "undefined" ? navigator.language : "fr").slice(0, 2);
  return n === "ar" || n === "en" ? n : "fr";
}

export function useI18n() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useI18n outside provider");
  return v;
}
