// Admin: events → categories / subcategories → guidance & checklist items.
import { asset } from "../lib/base";
import { useState } from "react";
import { Icon, ICON_NAMES } from "../components/Icon";
import { ConfirmSheet, SelectField, Sheet, TextField } from "../components/ui";
import { db } from "../data/client";
import { newId, slugify } from "../lib/ids";
import { useI18n } from "../i18n/i18n";
import { Link, navigate } from "../lib/router";
import { useApp } from "../state/app";
import { CONTENT_KINDS, type Category, type ContentItem, type EventRow, type SideScope } from "../data/types";
import {
  AdminHeader, duplicateCategory, duplicateEvent, emptyTr, ErrorNote, loadTr, MissingDots, moveRow, RowActions,
  saveTr, Toggle, TranslationFields, useAdminOp, type TrValues,
} from "./common";

const bySort = <T extends { sort_order: number }>(a: T, b: T) => a.sort_order - b.sort_order;

function SideSelect({ value, onChange }: { value: SideScope; onChange: (v: SideScope) => void }) {
  const { t } = useI18n();
  return <SelectField label={t("admin.f.side")} value={value} onChange={(v) => onChange(v as SideScope)}
    options={[{ value: "both", label: t("sideScope.both") }, { value: "bride", label: t("side.bride") }, { value: "groom", label: t("side.groom") }]} />;
}

function IconSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { t } = useI18n();
  return (
    <div className="field">
      <span className="label">{t("admin.f.icon")}</span>
      <div className="row wrap" style={{ gap: 6 }} role="radiogroup" aria-label={t("admin.f.icon")}>
        {ICON_NAMES.map((n) => (
          <button key={n} type="button" role="radio" aria-checked={value === n} aria-label={n} className="icon-btn sm bordered"
            style={value === n ? { background: "var(--ink)", color: "var(--ivory)" } : undefined} onClick={() => onChange(n)}>
            <Icon name={n} size={18} />
          </button>
        ))}
      </div>
    </div>
  );
}

// ======================================================================= events
export function EventsAdmin() {
  const { t } = useI18n();
  const { content } = useApp();
  const { run, busy, error } = useAdminOp();
  const [edit, setEdit] = useState<EventRow | "new" | null>(null);
  const [del, setDel] = useState<EventRow | null>(null);
  const c = content!;
  const events = [...c.snap.events].sort(bySort);
  return (
    <>
      <AdminHeader title={t("admin.nav.events")} sub={t("admin.eventsIntro")}
        actions={<button className="btn small" onClick={() => setEdit("new")}><Icon name="plus" size={16} />{t("admin.addEvent")}</button>} />
      <ErrorNote error={error} />
      <div className="list">
        {events.map((e, i) => (
          <div key={e.id} className={`admin-row${e.enabled ? "" : " disabled"}`}>
            <span className="tile-ico"><Icon name={e.icon ?? "arch"} /></span>
            <Link to={`/admin/events/${e.id}`} className="body" style={{ textDecoration: "none" }}>
              <div className="title">{c.eventName(e)}</div>
              <div className="row wrap" style={{ gap: 6 }}>
                <span className="tiny muted">{t(`sideScope.${e.side}`)} · {t("events.categoriesCount", { n: c.snap.categories.filter((x) => x.event_id === e.id && !x.parent_id).length })}</span>
                <MissingDots c={c} type="event" id={e.id} />
              </div>
            </Link>
            <RowActions index={i} count={events.length} enabled={e.enabled}
              onMove={(d) => !busy && run(() => moveRow("events", events, i, d), false)}
              onToggle={() => run(() => db.update("events", { id: e.id }, { enabled: !e.enabled }))}
              onEdit={() => setEdit(e)}
              onDuplicate={() => run(() => duplicateEvent(c, e.id, t("admin.copySuffix")))}
              onDelete={() => setDel(e)} />
          </div>
        ))}
      </div>
      {edit && <EventEditor key={edit === "new" ? "new" : edit.id} ev={edit === "new" ? null : edit} onClose={() => setEdit(null)} />}
      <ConfirmSheet open={!!del} onClose={() => setDel(null)} danger title={t("admin.deleteTitle", { name: del ? c.eventName(del) : "" })}
        message={t("admin.deleteEventWarn")} confirmLabel={t("common.delete")}
        onConfirm={() => { run(() => db.remove("events", { id: del!.id })); }} />
    </>
  );
}

function EventEditor({ ev, onClose }: { ev: EventRow | null; onClose: () => void }) {
  const { t } = useI18n();
  const { content } = useApp();
  const c = content!;
  const [tr, setTr] = useState<TrValues>(() => loadTr(c, "event", ev?.id ?? null));
  const [slug, setSlug] = useState(ev?.slug ?? "");
  const [side, setSide] = useState<SideScope>(ev?.side ?? "both");
  const [icon, setIcon] = useState(ev?.icon ?? "arch");
  const [enabled, setEnabled] = useState(ev?.enabled ?? true);
  const { run, busy, error, setError } = useAdminOp();
  const save = async () => {
    const name = tr.name.fr || tr.name.en || tr.name.ar;
    if (!name.trim()) { setError(t("admin.nameRequired")); return; }
    const s = slugify(slug || name);
    if (c.snap.events.some((x) => x.slug === s && x.id !== ev?.id)) { setError(t("admin.slugTaken")); return; }
    const ok = await run(async () => {
      const id = ev?.id ?? newId();
      if (ev) await db.update("events", { id }, { slug: s, side, icon, enabled });
      else await db.insert("events", { id, slug: s, side, icon, enabled, sort_order: (Math.max(0, ...c.snap.events.map((x) => x.sort_order)) + 10) });
      await saveTr(c, "event", id, tr);
    });
    if (ok) onClose();
  };
  return (
    <Sheet open onClose={onClose} title={ev ? t("admin.editEvent") : t("admin.addEvent")}>
      <form className="stack" onSubmit={(e) => { e.preventDefault(); save(); }}>
        <TranslationFields type="event" values={tr} onChange={setTr} />
        <SideSelect value={side} onChange={setSide} />
        <IconSelect value={icon} onChange={setIcon} />
        <TextField label={t("admin.f.slug")} value={slug} onChange={setSlug} hint={t("admin.slugHint")} dir="ltr" />
        <Toggle label={t("admin.f.enabled")} checked={enabled} onChange={setEnabled} hint={t("admin.enabledHint")} />
        <ErrorNote error={error} />
        <div className="form-actions">
          <button type="button" className="btn secondary" onClick={onClose}>{t("common.cancel")}</button>
          <button className="btn" disabled={busy}>{t("common.save")}</button>
        </div>
      </form>
    </Sheet>
  );
}

// ======================================================================= event structure
export function EventStructure({ id }: { id: string }) {
  const { t } = useI18n();
  const { content } = useApp();
  const { run, busy, error } = useAdminOp();
  const [edit, setEdit] = useState<{ cat: Category | null; parent: string | null } | null>(null);
  const [del, setDel] = useState<Category | null>(null);
  const c = content!;
  const ev = c.snap.events.find((e) => e.id === id);
  if (!ev) return <AdminHeader title={t("error.notFound")} back="/admin/events" />;
  const tops = c.snap.categories.filter((x) => x.event_id === id && !x.parent_id).sort(bySort);
  const subsOf = (pid: string) => c.snap.categories.filter((x) => x.parent_id === pid).sort(bySort);

  const row = (cat: Category, i: number, list: Category[], sub = false) => (
    <div key={cat.id} className={`admin-row${cat.enabled ? "" : " disabled"}${sub ? " indent" : ""}`}>
      <Link to={`/admin/categories/${cat.id}`} className="body" style={{ textDecoration: "none" }}>
        <div className="title">{c.categoryName(cat)}</div>
        <div className="row wrap" style={{ gap: 6 }}>
          <span className="tiny muted">{t(`sideScope.${cat.side}`)} · {t("admin.itemsCount", { n: c.snap.content_items.filter((x) => x.category_id === cat.id).length })}</span>
          <MissingDots c={c} type="category" id={cat.id} />
        </div>
      </Link>
      {!sub && <button className="icon-btn sm" aria-label={t("admin.addSub")} onClick={() => setEdit({ cat: null, parent: cat.id })}><Icon name="plus" size={17} /></button>}
      <RowActions index={i} count={list.length} enabled={cat.enabled}
        onMove={(d) => !busy && run(() => moveRow("categories", list, i, d), false)}
        onToggle={() => run(() => db.update("categories", { id: cat.id }, { enabled: !cat.enabled }))}
        editTo={`/admin/categories/${cat.id}`}
        onDuplicate={() => run(() => duplicateCategory(c, cat.id, id, cat.parent_id, t("admin.copySuffix")))}
        onDelete={() => setDel(cat)} />
    </div>
  );

  return (
    <>
      <AdminHeader title={c.eventName(ev)} back="/admin/events" sub={t("admin.structureIntro")}
        actions={<button className="btn small" onClick={() => setEdit({ cat: null, parent: null })}><Icon name="plus" size={16} />{t("admin.addCategory")}</button>} />
      <ErrorNote error={error} />
      {tops.length === 0 ? <p className="muted">{t("categories.emptyTitle")}</p> : (
        <div className="list">
          {tops.map((cat, i) => [row(cat, i, tops), ...subsOf(cat.id).map((s, j, l) => row(s, j, l, true))])}
        </div>
      )}
      {edit && <CategoryQuickAdd eventId={id} parentId={edit.parent} onClose={() => setEdit(null)} />}
      <ConfirmSheet open={!!del} onClose={() => setDel(null)} danger title={t("admin.deleteTitle", { name: del ? c.categoryName(del) : "" })}
        message={t("admin.deleteCategoryWarn")} confirmLabel={t("common.delete")}
        onConfirm={() => { run(() => db.remove("categories", { id: del!.id })); }} />
    </>
  );
}

function CategoryQuickAdd({ eventId, parentId, onClose }: { eventId: string; parentId: string | null; onClose: () => void }) {
  const { t } = useI18n();
  const { content } = useApp();
  const c = content!;
  const parent = parentId ? c.snap.categories.find((x) => x.id === parentId) : null;
  const ev = c.snap.events.find((x) => x.id === eventId)!;
  const [tr, setTr] = useState<TrValues>(emptyTr("category"));
  const [side, setSide] = useState<SideScope>(parent?.side ?? (ev.side === "both" ? "both" : ev.side));
  const { run, busy, error, setError } = useAdminOp();
  return (
    <Sheet open onClose={onClose} title={parent ? t("admin.addSubTo", { name: c.categoryName(parent) }) : t("admin.addCategory")}>
      <form className="stack" onSubmit={async (e) => {
        e.preventDefault();
        const name = tr.name.fr || tr.name.en || tr.name.ar;
        if (!name.trim()) { setError(t("admin.nameRequired")); return; }
        const id = newId();
        let slug = (parent ? parent.slug + "-" : "") + slugify(name); let n = 2;
        while (c.snap.categories.some((x) => x.event_id === eventId && x.slug === slug)) slug = `${slug}-${n++}`;
        const siblings = c.snap.categories.filter((x) => x.event_id === eventId && (x.parent_id ?? null) === parentId);
        const ok = await run(async () => {
          await db.insert("categories", { id, event_id: eventId, parent_id: parentId, slug, side, sort_order: Math.max(0, ...siblings.map((s) => s.sort_order)) + 10 });
          await saveTr(c, "category", id, tr);
        });
        if (ok) { onClose(); navigate(`/admin/categories/${id}`); }
      }}>
        <TranslationFields type="category" values={tr} onChange={setTr} />
        <SideSelect value={side} onChange={setSide} />
        <ErrorNote error={error} />
        <div className="form-actions">
          <button type="button" className="btn secondary" onClick={onClose}>{t("common.cancel")}</button>
          <button className="btn" disabled={busy}>{t("common.save")}</button>
        </div>
      </form>
    </Sheet>
  );
}

// ======================================================================= category editor
export function CategoryEditor({ id }: { id: string }) {
  const { t, lang } = useI18n();
  const { content } = useApp();
  const c = content!;
  const cat = c.snap.categories.find((x) => x.id === id);
  const [tr, setTr] = useState<TrValues>(() => loadTr(c, "category", id));
  const [side, setSide] = useState<SideScope>(cat?.side ?? "both");
  const [icon, setIcon] = useState(cat?.icon ?? "list");
  const [imageUrl, setImageUrl] = useState(cat?.image_url ?? "");
  const [enabled, setEnabled] = useState(cat?.enabled ?? true);
  const [svc, setSvc] = useState<string[]>(() => c.snap.category_service_types.filter((x) => x.category_id === id).map((x) => x.service_type_id));
  const [item, setItem] = useState<ContentItem | "new" | null>(null);
  const [delItem, setDelItem] = useState<ContentItem | null>(null);
  const { run, busy, error } = useAdminOp();
  if (!cat) return <AdminHeader title={t("error.notFound")} back="/admin/events" />;
  const items = c.snap.content_items.filter((x) => x.category_id === id).sort(bySort);
  const ev = c.snap.events.find((e) => e.id === cat.event_id)!;

  const save = () => run(async () => {
    await db.update("categories", { id }, { side, icon, image_url: imageUrl.trim() || null, enabled });
    await saveTr(c, "category", id, tr);
    const before = c.snap.category_service_types.filter((x) => x.category_id === id).map((x) => x.service_type_id);
    for (const s of svc.filter((x) => !before.includes(x))) await db.insert("category_service_types", { category_id: id, service_type_id: s });
    for (const s of before.filter((x) => !svc.includes(x))) await db.remove("category_service_types", { category_id: id, service_type_id: s });
  });

  return (
    <>
      <AdminHeader title={c.categoryName(cat)} back={`/admin/events/${ev.id}`} sub={`${c.eventName(ev)}${cat.parent_id ? ` · ${c.categoryName(c.category(cat.parent_id))}` : ""}`} />
      <div className="grid two" style={{ alignItems: "start", gap: 20 }}>
        <form className="stack" onSubmit={(e) => { e.preventDefault(); save(); }}>
          <TranslationFields type="category" values={tr} onChange={setTr} />
          <SideSelect value={side} onChange={setSide} />
          <IconSelect value={icon} onChange={setIcon} />
          <TextField label={t("admin.f.imageUrl")} value={imageUrl} onChange={setImageUrl} dir="ltr" hint={t("admin.imageUrlHint")} />
          <div className="field">
            <span className="label">{t("admin.f.serviceTypes")}</span>
            <span className="hint">{t("admin.serviceTypesHint")}</span>
            <div className="chips" style={{ flexWrap: "wrap", margin: 0, padding: 0 }}>
              {c.snap.service_types.slice().sort(bySort).map((s) => (
                <button key={s.id} type="button" className="chip" aria-pressed={svc.includes(s.id)}
                  onClick={() => setSvc(svc.includes(s.id) ? svc.filter((x) => x !== s.id) : [...svc, s.id])}>{c.serviceName(s.id) || s.slug}</button>
              ))}
            </div>
          </div>
          <Toggle label={t("admin.f.enabled")} checked={enabled} onChange={setEnabled} />
          <ErrorNote error={error} />
          <div className="form-actions"><button className="btn" disabled={busy}>{t("common.save")}</button></div>
        </form>

        <section className="stack">
          <div className="section-title">
            <h2 className="h3">{t("admin.items")}</h2>
            <button className="btn small" onClick={() => setItem("new")}><Icon name="plus" size={16} />{t("admin.addItem")}</button>
          </div>
          <p className="tiny muted">{t("admin.itemsIntro")}</p>
          {items.length === 0 ? <p className="small muted">{t("admin.noItems")}</p> : (
            <div className="list">
              {items.map((it, i) => (
                <div key={it.id} className={`admin-row${it.enabled ? "" : " disabled"}`}>
                  <div className="body">
                    <div className="title">{c.text("content_item", it.id, "title") || "—"}</div>
                    <div className="row wrap" style={{ gap: 6 }}>
                      <span className="badge outline" style={{ height: 20 }}>{t(`kind.${it.kind}`)}</span>
                      <span className="tiny muted">{t(`importance.${it.importance}`)}{it.wilaya_id && ` · ${c.text("wilaya", it.wilaya_id)}`}</span>
                      <MissingDots c={c} type="content_item" id={it.id} />
                    </div>
                  </div>
                  <RowActions index={i} count={items.length} enabled={it.enabled}
                    onMove={(d) => !busy && run(() => moveRow("content_items", items, i, d), false)}
                    onToggle={() => run(() => db.update("content_items", { id: it.id }, { enabled: !it.enabled }))}
                    onEdit={() => setItem(it)} onDelete={() => setDelItem(it)} />
                </div>
              ))}
            </div>
          )}
          <details className="card soft">
            <summary className="label" style={{ cursor: "pointer" }}>{t("admin.preview")} ({lang.toUpperCase()})</summary>
            <div className="stack-sm" style={{ marginTop: 12 }}>
              <div className="h3">{tr.name[lang] || c.categoryName(cat)}</div>
              <p className="small muted">{tr.description[lang]}</p>
              {items.filter((x) => x.enabled).map((x) => <p key={x.id} className="small">• {c.text("content_item", x.id, "title", true) || <em className="muted">{t("admin.missing")}</em>}</p>)}
            </div>
          </details>
        </section>
      </div>
      {item && <ItemEditor key={item === "new" ? "new" : item.id} categoryId={id} item={item === "new" ? null : item} onClose={() => setItem(null)} />}
      <ConfirmSheet open={!!delItem} onClose={() => setDelItem(null)} danger title={t("admin.deleteItem")} confirmLabel={t("common.delete")}
        message={delItem ? c.text("content_item", delItem.id, "title") : ""}
        onConfirm={() => { run(() => db.remove("content_items", { id: delItem!.id })); }} />
    </>
  );
}

function ItemEditor({ categoryId, item, onClose }: { categoryId: string; item: ContentItem | null; onClose: () => void }) {
  const { t } = useI18n();
  const { content } = useApp();
  const c = content!;
  const [tr, setTr] = useState<TrValues>(() => loadTr(c, "content_item", item?.id ?? null));
  const [kind, setKind] = useState(item?.kind ?? "checklist");
  const [importance, setImportance] = useState(item?.importance ?? "optional");
  const [wilaya, setWilaya] = useState(item?.wilaya_id ?? "");
  const [image, setImage] = useState(item?.image_url ?? "");
  const [enabled, setEnabled] = useState(item?.enabled ?? true);
  const { run, busy, error, setError } = useAdminOp();
  const upload = async (f: File) => {
    try { const r = await db.uploadFile(f, "content"); setImage(r.url); } catch (e) { setError(String(e)); }
  };
  return (
    <Sheet open onClose={onClose} title={item ? t("admin.editItem") : t("admin.addItem")}>
      <form className="stack" onSubmit={async (e) => {
        e.preventDefault();
        if (!(tr.title.fr || tr.title.en || tr.title.ar).trim()) { setError(t("admin.nameRequired")); return; }
        const ok = await run(async () => {
          const id = item?.id ?? newId();
          const row = { kind, importance, wilaya_id: wilaya || null, image_url: image.trim() || null, enabled };
          if (item) await db.update("content_items", { id }, row);
          else {
            const max = Math.max(0, ...c.snap.content_items.filter((x) => x.category_id === categoryId).map((x) => x.sort_order));
            await db.insert("content_items", { id, category_id: categoryId, sort_order: max + 10, ...row });
          }
          await saveTr(c, "content_item", id, tr);
        });
        if (ok) onClose();
      }}>
        <SelectField label={t("admin.f.kind")} value={kind} onChange={(v) => setKind(v as ContentItem["kind"])}
          options={CONTENT_KINDS.map((k) => ({ value: k, label: t(`kind.${k}`) }))} />
        <SelectField label={t("admin.f.importance")} value={importance} onChange={(v) => setImportance(v as ContentItem["importance"])}
          options={["essential", "optional", "regional"].map((k) => ({ value: k, label: t(`importance.${k}`) }))} />
        {importance === "regional" && (
          <SelectField label={t("admin.f.region")} value={wilaya} onChange={setWilaya}
            options={[{ value: "", label: t("admin.regionAny") }, ...c.snap.wilayas.map((w) => ({ value: w.id, label: c.text("wilaya", w.id) || w.slug }))]} />
        )}
        <TranslationFields type="content_item" values={tr} onChange={setTr} />
        {kind === "image" && (
          <div className="stack-sm">
            <TextField label={t("admin.f.imageUrl")} value={image} onChange={setImage} dir="ltr" />
            <label className="btn small secondary" style={{ alignSelf: "flex-start" }}>
              <Icon name="image" size={16} />{t("admin.upload")}
              <input type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
            </label>
            {image && <img src={asset(image)} alt="" style={{ maxHeight: 160, borderRadius: 12, objectFit: "cover" }} />}
          </div>
        )}
        <Toggle label={t("admin.f.enabled")} checked={enabled} onChange={setEnabled} />
        <ErrorNote error={error} />
        <div className="form-actions">
          <button type="button" className="btn secondary" onClick={onClose}>{t("common.cancel")}</button>
          <button className="btn" disabled={busy}>{t("common.save")}</button>
        </div>
      </form>
    </Sheet>
  );
}
