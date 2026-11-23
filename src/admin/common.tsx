// Shared admin building blocks: multilingual fields, ordering, duplication.
import { useState, type ReactNode } from "react";
import { Icon } from "../components/Icon";
import { db } from "../data/client";
import { newId } from "../lib/ids";
import { LANG_NAMES, useI18n } from "../i18n/i18n";
import { Link } from "../lib/router";
import { useApp } from "../state/app";
import type { Content } from "../state/content";
import { LANGS, REQUIRED_FIELDS, TRANSLATABLE, type EntityType, type Lang, type Translation } from "../data/types";

export type TrValues = Record<string, Record<Lang, string>>;

export function emptyTr(type: EntityType): TrValues {
  return Object.fromEntries(TRANSLATABLE[type].map((f) => [f, { ar: "", fr: "", en: "" }]));
}

export function loadTr(c: Content, type: EntityType, id: string | null): TrValues {
  const v = emptyTr(type);
  if (!id) return v;
  for (const f of TRANSLATABLE[type]) for (const l of LANGS) v[f][l] = c.raw(type, id, f, l);
  return v;
}

/** Writes only what changed; each language row is independent. */
export async function saveTr(c: Content, type: EntityType, id: string, values: TrValues) {
  for (const [field, langs] of Object.entries(values)) {
    for (const lang of LANGS) {
      const next = langs[lang].trim();
      const prev = c.raw(type, id, field, lang);
      if (next === prev) continue;
      if (next) await db.upsert<Translation>("translations", { entity_type: type, entity_id: id, field, lang, value: next }, "entity_type,entity_id,field,lang");
      else await db.remove("translations", { entity_type: type, entity_id: id, field, lang });
    }
  }
}

export function missingLangs(c: Content, type: EntityType, id: string): Lang[] {
  const req = REQUIRED_FIELDS[type] ?? [];
  return LANGS.filter((l) => req.some((f) => !c.has(type, id, f, l)));
}

const FIELD_LABEL: Record<string, string> = {
  name: "admin.f.name", description: "admin.f.description", title: "admin.f.title", body: "admin.f.body",
  caption: "admin.f.caption", services_text: "admin.f.servicesText", service_area: "admin.f.serviceArea",
  availability_notes: "admin.f.availability", conditions: "admin.f.conditions", extras: "admin.f.extras",
};
const LONG = new Set(["description", "body", "services_text", "availability_notes", "conditions", "extras"]);

/** Edit every translatable field in AR / FR / EN, one language at a time, with RTL preview for Arabic. */
export function TranslationFields({ type, values, onChange, fields }: {
  type: EntityType; values: TrValues; onChange: (v: TrValues) => void; fields?: string[];
}) {
  const { t, lang: uiLang } = useI18n();
  const [lang, setLang] = useState<Lang>(uiLang);
  const list = fields ?? TRANSLATABLE[type];
  const req = REQUIRED_FIELDS[type] ?? [];
  const missing = (l: Lang) => req.some((f) => !values[f]?.[l]?.trim());
  return (
    <div className="card soft stack" style={{ padding: 14 }}>
      <div className="row between wrap">
        <span className="label">{t("admin.translations")}</span>
        <div className="lang-tabs" role="group" aria-label={t("admin.translations")}>
          {LANGS.map((l) => (
            <button key={l} type="button" aria-pressed={lang === l} onClick={() => setLang(l)}>
              {l.toUpperCase()}{missing(l) && <span className="dot-missing" title={t("admin.missing")} />}
            </button>
          ))}
        </div>
      </div>
      <div className="stack" lang={lang} dir={lang === "ar" ? "rtl" : "ltr"}>
        {list.map((f) => {
          const id = `${type}-${f}-${lang}`;
          const v = values[f]?.[lang] ?? "";
          const set = (val: string) => onChange({ ...values, [f]: { ...values[f], [lang]: val } });
          return (
            <div className="field" key={id}>
              <label htmlFor={id}>{t(FIELD_LABEL[f] ?? f)} · {LANG_NAMES[lang]}{req.includes(f) && " *"}</label>
              {LONG.has(f)
                ? <textarea id={id} className="textarea" value={v} onChange={(e) => set(e.target.value)} />
                : <input id={id} className="input" value={v} onChange={(e) => set(e.target.value)} />}
            </div>
          );
        })}
      </div>
      <p className="tiny muted">{t("admin.translationsHint")}</p>
    </div>
  );
}

/** Swap sort_order with the neighbour; normalises to 10, 20, 30… */
export async function moveRow(table: string, rows: { id: string; sort_order: number }[], index: number, dir: -1 | 1) {
  const j = index + dir;
  if (j < 0 || j >= rows.length) return;
  const list = [...rows];
  [list[index], list[j]] = [list[j], list[index]];
  for (let i = 0; i < list.length; i++) {
    if (list[i].sort_order !== (i + 1) * 10) await db.update(table, { id: list[i].id }, { sort_order: (i + 1) * 10 });
  }
}

async function copyTr(c: Content, type: EntityType, from: string, to: string, suffix = "") {
  const rows = c.snap.translations.filter((r) => r.entity_type === type && r.entity_id === from);
  if (!rows.length) return;
  await db.insert("translations", rows.map((r) => ({
    entity_type: type, entity_id: to, field: r.field, lang: r.lang,
    value: suffix && r.field === "name" ? `${r.value} ${suffix}` : r.value,
  })));
}

const strip = (r: Record<string, any>) => { const { id, created_at, updated_at, ...rest } = r; return rest; };

/** Deep copy of a category: subcategories, guidance items and service links. */
export async function duplicateCategory(c: Content, catId: string, eventId: string, parentId: string | null, suffix: string) {
  const cat = c.snap.categories.find((x) => x.id === catId)!;
  const id = newId();
  const slugBase = `${cat.slug}-copy`;
  let slug = slugBase; let n = 2;
  while (c.snap.categories.some((x) => x.event_id === eventId && x.slug === slug)) slug = `${slugBase}-${n++}`;
  await db.insert("categories", { ...strip(cat), id, event_id: eventId, parent_id: parentId, slug, sort_order: cat.sort_order + 1, is_demo: false });
  await copyTr(c, "category", cat.id, id, suffix);
  const links = c.snap.category_service_types.filter((x) => x.category_id === cat.id);
  if (links.length) await db.insert("category_service_types", links.map((l) => ({ category_id: id, service_type_id: l.service_type_id })));
  for (const it of c.snap.content_items.filter((x) => x.category_id === cat.id)) {
    const nid = newId();
    await db.insert("content_items", { ...strip(it), id: nid, category_id: id, is_demo: false });
    await copyTr(c, "content_item", it.id, nid);
  }
  for (const sub of c.snap.categories.filter((x) => x.parent_id === cat.id)) {
    // keep the same slug suffix scheme for subcategories
    await duplicateCategory(c, sub.id, eventId, id, "");
  }
  return id;
}

export async function duplicateEvent(c: Content, eventId: string, suffix: string) {
  const ev = c.snap.events.find((x) => x.id === eventId)!;
  const id = newId();
  let slug = `${ev.slug}-copy`; let n = 2;
  while (c.snap.events.some((x) => x.slug === slug)) slug = `${ev.slug}-copy-${n++}`;
  await db.insert("events", { ...strip(ev), id, slug, sort_order: ev.sort_order + 1, is_demo: false });
  await copyTr(c, "event", ev.id, id, suffix);
  for (const cat of c.snap.categories.filter((x) => x.event_id === ev.id && !x.parent_id)) await duplicateCategory(c, cat.id, id, null, "");
  return id;
}

// ------------------------------------------------------------ small UI pieces
export function AdminHeader({ title, back, actions, sub }: { title: string; back?: string; actions?: ReactNode; sub?: string }) {
  const { t } = useI18n();
  return (
    <div className="stack-sm" style={{ marginBottom: 20 }}>
      {back && <Link to={back} className="link-btn small row" style={{ gap: 4, textDecoration: "none" }}><Icon name="back" size={16} className="flip-rtl" />{t("common.back")}</Link>}
      <div className="row between wrap">
        <h1 className="h2 break">{title}</h1>
        {actions && <div className="row wrap">{actions}</div>}
      </div>
      {sub && <p className="small muted">{sub}</p>}
    </div>
  );
}

export function RowActions({ index, count, onMove, onToggle, enabled, onEdit, onDuplicate, onDelete, editTo }: {
  index: number; count: number; onMove: (dir: -1 | 1) => void; onToggle?: () => void; enabled?: boolean;
  onEdit?: () => void; editTo?: string; onDuplicate?: () => void; onDelete?: () => void;
}) {
  const { t } = useI18n();
  return (
    <div className="row" style={{ gap: 0, flex: "none" }}>
      <button className="icon-btn sm" aria-label={t("common.moveUp")} disabled={index === 0} onClick={() => onMove(-1)}><Icon name="up" size={17} /></button>
      <button className="icon-btn sm" aria-label={t("common.moveDown")} disabled={index === count - 1} onClick={() => onMove(1)}><Icon name="down" size={17} /></button>
      {onToggle && <button className="icon-btn sm" aria-label={enabled ? t("admin.disable") : t("admin.enable")} aria-pressed={enabled} onClick={onToggle}><Icon name={enabled ? "eye" : "eye-off"} size={17} /></button>}
      {onDuplicate && <button className="icon-btn sm" aria-label={t("admin.duplicate")} onClick={onDuplicate}><Icon name="copy" size={17} /></button>}
      {editTo ? <Link className="icon-btn sm" to={editTo} aria-label={t("common.edit")}><Icon name="edit" size={17} /></Link>
        : onEdit && <button className="icon-btn sm" aria-label={t("common.edit")} onClick={onEdit}><Icon name="edit" size={17} /></button>}
      {onDelete && <button className="icon-btn sm" aria-label={t("common.delete")} onClick={onDelete}><Icon name="trash" size={17} /></button>}
    </div>
  );
}

export function MissingDots({ c, type, id }: { c: Content; type: EntityType; id: string }) {
  const { t } = useI18n();
  const m = missingLangs(c, type, id);
  if (!m.length) return null;
  return <span className="badge blush" style={{ height: 20 }} title={t("admin.missing")}>{t("admin.missingIn", { langs: m.map((x) => x.toUpperCase()).join(" ") })}</span>;
}

/** Runs an admin mutation, reloads content, shows feedback. */
export function useAdminOp() {
  const { reloadContent, showToast } = useApp();
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = async (fn: () => Promise<unknown>, toast = true) => {
    setBusy(true); setError(null);
    try {
      await fn();
      await reloadContent();
      if (toast) showToast(t("common.saved"));
      return true;
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : String(e));
      return false;
    } finally { setBusy(false); }
  };
  return { busy, error, run, setError };
}

export function ErrorNote({ error }: { error: string | null }) {
  const { t } = useI18n();
  if (!error) return null;
  const perm = /permission|policy|42501|row-level/i.test(error);
  return <div className="notice warn" role="alert"><Icon name="alert" size={18} />{perm ? t("admin.errorPermission") : `${t("error.generic")} (${error})`}</div>;
}

export function Toggle({ label, checked, onChange, hint }: { label: string; checked: boolean; onChange: (v: boolean) => void; hint?: string }) {
  return (
    <label className="check">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span><span style={{ fontWeight: 600 }}>{label}</span>{hint && <span className="hint" style={{ display: "block" }}>{hint}</span>}</span>
    </label>
  );
}
