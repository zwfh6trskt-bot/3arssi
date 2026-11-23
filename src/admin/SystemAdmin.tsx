// Admin: overview, translations, regions, demo content, users & roles.
import { asset } from "../lib/base";
import { useEffect, useMemo, useState } from "react";
import { Icon } from "../components/Icon";
import { ConfirmSheet, SelectField, Sheet, TextField } from "../components/ui";
import { db, isDemoMode, local } from "../data/client";
import { newId, slugify } from "../lib/ids";
import { BUNDLED, LANG_NAMES, useI18n } from "../i18n/i18n";
import { Link } from "../lib/router";
import { useApp } from "../state/app";
import { LANGS, REQUIRED_FIELDS, type Commune, type EntityType, type Lang, type Role, type Wilaya } from "../data/types";
import { AdminHeader, ErrorNote, loadTr, moveRow, RowActions, saveTr, TranslationFields, useAdminOp, type TrValues } from "./common";

const bySort = <T extends { sort_order: number }>(a: T, b: T) => a.sort_order - b.sort_order;

/** Every content entity with a required field missing in some language. */
function missingReport(c: NonNullable<ReturnType<typeof useApp>["content"]>) {
  const out: { type: EntityType; id: string; label: string; langs: Lang[]; link: string }[] = [];
  const add = (type: EntityType, id: string, label: string, link: string) => {
    const req = REQUIRED_FIELDS[type] ?? [];
    const langs = LANGS.filter((l) => req.some((f) => !c.has(type, id, f, l)));
    if (langs.length) out.push({ type, id, label, langs, link });
  };
  c.snap.events.forEach((e) => add("event", e.id, c.eventName(e), `/admin/events`));
  c.snap.categories.forEach((x) => add("category", x.id, c.categoryName(x), `/admin/categories/${x.id}`));
  c.snap.content_items.forEach((x) => add("content_item", x.id, c.text("content_item", x.id, "title") || "—", `/admin/categories/${x.category_id}`));
  c.snap.service_types.forEach((x) => add("service_type", x.id, c.serviceName(x.id) || x.slug, `/admin/services`));
  c.snap.price_items.forEach((x) => add("price_item", x.id, c.text("price_item", x.id) || x.slug, `/admin/prices`));
  c.snap.wilayas.forEach((x) => add("wilaya", x.id, c.text("wilaya", x.id) || x.slug, `/admin/regions`));
  c.snap.communes.forEach((x) => add("commune", x.id, c.text("commune", x.id) || x.slug, `/admin/regions`));
  c.snap.offers.forEach((x) => add("offer", x.id, c.text("offer", x.id, "title") || "—", `/admin/providers/${x.provider_id}`));
  return out;
}

export function Overview() {
  const { t } = useI18n();
  const { content } = useApp();
  const c = content!;
  const missing = useMemo(() => missingReport(c), [c]);
  const uiMissing = LANGS.reduce((n, l) => n + Object.keys(BUNDLED.en).filter((k) => !BUNDLED[l][k] && !c.snap.ui_translations.some((u) => u.key === k && u.lang === l)).length, 0);
  const year = new Date(Date.now() - 365 * 864e5).toISOString().slice(0, 10);
  const stale = c.snap.price_records.filter((r) => r.enabled && r.updated_on < year).length;
  const noContact = c.snap.providers.filter((p) => !p.phone && !p.whatsapp && !p.instagram && !p.website).length;
  const demo = c.snap.providers.filter((p) => p.is_demo).length + c.snap.price_records.filter((p) => p.is_demo).length;
  const tiles: [string, number, string, string][] = [
    ["admin.nav.events", c.snap.events.length, "/admin/events", "calendar"],
    ["admin.categoriesTotal", c.snap.categories.length, "/admin/events", "list"],
    ["admin.nav.providers", c.snap.providers.length, "/admin/providers", "people"],
    ["admin.priceRecords", c.snap.price_records.length, "/admin/prices", "tag"],
  ];
  const attention: [string, number, string][] = [
    ["admin.attn.missing", missing.length, "/admin/translations"],
    ["admin.attn.uiMissing", uiMissing, "/admin/translations"],
    ["admin.attn.stale", stale, "/admin/prices"],
    ["admin.attn.noContact", noContact, "/admin/providers"],
    ["admin.attn.demo", demo, "/admin/demo"],
  ];
  return (
    <>
      <AdminHeader title={t("admin.nav.overview")} sub={t("admin.overviewIntro")} />
      <div className="stack-lg">
        <div className="grid two">
          {tiles.map(([k, n, to, icon]) => (
            <Link key={k} to={to} className="card card-link row">
              <span className="tile-ico blue"><Icon name={icon} /></span>
              <div className="kpi grow"><span className="v">{n}</span><span className="l">{t(k)}</span></div>
            </Link>
          ))}
        </div>
        <section className="stack">
          <h2 className="h3">{t("admin.attention")}</h2>
          <div className="list">
            {attention.map(([k, n, to]) => (
              <Link key={k} to={to} className="list-item">
                <span className={`tile-ico ${n ? "blush" : "sage"}`}><Icon name={n ? "alert" : "check"} /></span>
                <div className="body"><div className="title">{t(k)}</div></div>
                <span className="badge outline">{n}</span>
              </Link>
            ))}
          </div>
        </section>
        <section className="card soft stack-sm">
          <h2 className="h3">{t("admin.storage")}</h2>
          <p className="small">{isDemoMode ? t("admin.storageDemo") : t("admin.storageCloud")}</p>
        </section>
      </div>
    </>
  );
}

// ======================================================================= translations
export function TranslationsAdmin() {
  const { t } = useI18n();
  const { content } = useApp();
  const c = content!;
  const [tab, setTab] = useState<"ui" | "content">("ui");
  const [filter, setFilter] = useState<"all" | "missing">("missing");
  const [q, setQ] = useState("");
  const [edit, setEdit] = useState<string | null>(null);
  const missing = useMemo(() => missingReport(c), [c]);
  const keys = Object.keys(BUNDLED.en).sort();
  const val = (k: string, l: Lang) => c.snap.ui_translations.find((u) => u.key === k && u.lang === l)?.value ?? BUNDLED[l][k] ?? "";
  const isMissing = (k: string) => LANGS.some((l) => !val(k, l));
  const shown = keys.filter((k) => (filter === "all" || isMissing(k)) && (!q || k.includes(q) || LANGS.some((l) => val(k, l).toLowerCase().includes(q.toLowerCase()))));
  return (
    <>
      <AdminHeader title={t("admin.nav.translations")} sub={t("admin.translationsIntro")} />
      <div className="seg" style={{ marginBottom: 16, maxWidth: 420 }}>
        <button aria-pressed={tab === "ui"} onClick={() => setTab("ui")}>{t("admin.uiStrings")}</button>
        <button aria-pressed={tab === "content"} onClick={() => setTab("content")}>{t("admin.contentMissing")} ({missing.length})</button>
      </div>
      {tab === "ui" ? (
        <div className="stack">
          <div className="row wrap">
            <input className="input grow" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("admin.searchKeys")} aria-label={t("admin.searchKeys")} style={{ minWidth: 180 }} />
            <select className="select" style={{ width: 200 }} value={filter} onChange={(e) => setFilter(e.target.value as "all" | "missing")} aria-label={t("admin.filter")}>
              <option value="missing">{t("admin.onlyMissing")}</option><option value="all">{t("common.all")}</option>
            </select>
          </div>
          <p className="tiny muted">{t("admin.keysCount", { n: shown.length })}</p>
          <div className="list">
            {shown.slice(0, 200).map((k) => (
              <button key={k} className="list-item" onClick={() => setEdit(k)} style={{ alignItems: "flex-start" }}>
                <div className="body">
                  <div className="tiny muted" dir="ltr" style={{ fontFamily: "monospace" }}>{k}</div>
                  {LANGS.map((l) => (
                    <div key={l} className="small break" lang={l} dir={l === "ar" ? "rtl" : "ltr"}>
                      <span className="tiny muted">{l.toUpperCase()} </span>{val(k, l) || <span className="badge blush" style={{ height: 18 }}>{t("admin.missing")}</span>}
                    </div>
                  ))}
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : (
        missing.length === 0 ? <p className="muted">{t("admin.allTranslated")}</p> : (
          <div className="list">
            {missing.map((m) => (
              <Link key={`${m.type}:${m.id}`} to={m.link} className="list-item">
                <div className="body"><div className="title">{m.label}</div><div className="sub">{t(`admin.entity.${m.type}`)}</div></div>
                <span className="badge blush">{m.langs.map((l) => l.toUpperCase()).join(" ")}</span>
              </Link>
            ))}
          </div>
        )
      )}
      {edit && <UiStringSheet k={edit} onClose={() => setEdit(null)} />}
    </>
  );
}

function UiStringSheet({ k, onClose }: { k: string; onClose: () => void }) {
  const { t } = useI18n();
  const { content } = useApp();
  const c = content!;
  const ov = (l: Lang) => c.snap.ui_translations.find((u) => u.key === k && u.lang === l)?.value ?? "";
  const [vals, setVals] = useState<Record<Lang, string>>({ ar: ov("ar"), fr: ov("fr"), en: ov("en") });
  const { run, busy, error } = useAdminOp();
  return (
    <Sheet open onClose={onClose} title={t("admin.editString")}>
      <form className="stack" onSubmit={async (e) => {
        e.preventDefault();
        const ok = await run(async () => {
          for (const l of LANGS) {
            const v = vals[l].trim();
            if (v === ov(l)) continue;
            if (v) await db.upsert("ui_translations", { key: k, lang: l, value: v }, "key,lang");
            else await db.remove("ui_translations", { key: k, lang: l });
          }
        });
        if (ok) onClose();
      }}>
        <p className="tiny muted" dir="ltr" style={{ fontFamily: "monospace" }}>{k}</p>
        {LANGS.map((l) => (
          <div key={l} className="field" lang={l} dir={l === "ar" ? "rtl" : "ltr"}>
            <label htmlFor={`ui-${l}`}>{LANG_NAMES[l]}</label>
            <textarea id={`ui-${l}`} className="textarea" style={{ minHeight: 64 }} value={vals[l]} placeholder={BUNDLED[l][k] ?? ""}
              onChange={(e) => setVals({ ...vals, [l]: e.target.value })} />
            <span className="hint">{t("admin.defaultValue")}: {BUNDLED[l][k] || "—"}</span>
          </div>
        ))}
        <p className="tiny muted">{t("admin.uiOverrideHint")}</p>
        <ErrorNote error={error} />
        <div className="form-actions"><button type="button" className="btn secondary" onClick={onClose}>{t("common.cancel")}</button><button className="btn" disabled={busy}>{t("common.save")}</button></div>
      </form>
    </Sheet>
  );
}

// ======================================================================= regions
export function RegionsAdmin() {
  const { t } = useI18n();
  const { content } = useApp();
  const c = content!;
  const { run, busy, error } = useAdminOp();
  const [open, setOpen] = useState<string | null>(c.snap.wilayas[0]?.id ?? null);
  const [edit, setEdit] = useState<{ kind: "wilaya" | "commune"; row: Wilaya | Commune | null; wilayaId?: string } | null>(null);
  const [del, setDel] = useState<{ kind: "wilayas" | "communes"; id: string; name: string } | null>(null);
  const wilayas = c.snap.wilayas.slice().sort(bySort);
  return (
    <>
      <AdminHeader title={t("admin.nav.regions")} sub={t("admin.regionsIntro")}
        actions={<button className="btn small" onClick={() => setEdit({ kind: "wilaya", row: null })}><Icon name="plus" size={16} />{t("admin.addWilaya")}</button>} />
      <ErrorNote error={error} />
      <div className="list">
        {wilayas.map((w, i) => {
          const communes = c.snap.communes.filter((x) => x.wilaya_id === w.id).sort(bySort);
          return [
            <div key={w.id} className={`admin-row${w.enabled ? "" : " disabled"}`}>
              <button className="icon-btn sm" aria-expanded={open === w.id} aria-label={t("admin.communes")} onClick={() => setOpen(open === w.id ? null : w.id)}>
                <Icon name={open === w.id ? "down" : "chevron"} size={17} className={open === w.id ? "" : "flip-rtl"} />
              </button>
              <div className="body"><div className="title">{w.code} · {c.text("wilaya", w.id) || w.slug}</div>
                <div className="tiny muted">{t("admin.communesCount", { n: communes.length })}</div></div>
              <RowActions index={i} count={wilayas.length} enabled={w.enabled}
                onMove={(d) => !busy && run(() => moveRow("wilayas", wilayas, i, d), false)}
                onToggle={() => run(() => db.update("wilayas", { id: w.id }, { enabled: !w.enabled }))}
                onEdit={() => setEdit({ kind: "wilaya", row: w })} onDelete={() => setDel({ kind: "wilayas", id: w.id, name: c.text("wilaya", w.id) })} />
            </div>,
            ...(open === w.id ? [
              ...communes.map((x, j) => (
                <div key={x.id} className={`admin-row indent${x.enabled ? "" : " disabled"}`}>
                  <div className="body"><div className="title">{c.text("commune", x.id) || x.slug}</div></div>
                  <RowActions index={j} count={communes.length} enabled={x.enabled}
                    onMove={(d) => !busy && run(() => moveRow("communes", communes, j, d), false)}
                    onToggle={() => run(() => db.update("communes", { id: x.id }, { enabled: !x.enabled }))}
                    onEdit={() => setEdit({ kind: "commune", row: x, wilayaId: w.id })} onDelete={() => setDel({ kind: "communes", id: x.id, name: c.text("commune", x.id) })} />
                </div>
              )),
              <div key={`${w.id}-add`} className="admin-row indent">
                <button className="link-btn small" onClick={() => setEdit({ kind: "commune", row: null, wilayaId: w.id })}>+ {t("admin.addCommune")}</button>
              </div>,
            ] : []),
          ];
        })}
      </div>
      {edit && <RegionSheet {...edit} onClose={() => setEdit(null)} />}
      <ConfirmSheet open={!!del} onClose={() => setDel(null)} danger title={t("admin.deleteTitle", { name: del?.name ?? "" })}
        message={t("admin.deleteRegionWarn")} confirmLabel={t("common.delete")} onConfirm={() => { run(() => db.remove(del!.kind, { id: del!.id })); }} />
    </>
  );
}

function RegionSheet({ kind, row, wilayaId, onClose }: { kind: "wilaya" | "commune"; row: Wilaya | Commune | null; wilayaId?: string; onClose: () => void }) {
  const { t } = useI18n();
  const { content } = useApp();
  const c = content!;
  const [tr, setTr] = useState<TrValues>(() => loadTr(c, kind, row?.id ?? null));
  const [code, setCode] = useState((row as Wilaya | null)?.code ?? "");
  const { run, busy, error, setError } = useAdminOp();
  return (
    <Sheet open onClose={onClose} title={kind === "wilaya" ? t("admin.wilaya") : t("admin.commune")}>
      <form className="stack" onSubmit={async (e) => {
        e.preventDefault();
        const name = tr.name.fr || tr.name.en || tr.name.ar;
        if (!name.trim()) { setError(t("admin.nameRequired")); return; }
        if (kind === "wilaya" && !code.trim()) { setError(t("admin.codeRequired")); return; }
        const ok = await run(async () => {
          const id = row?.id ?? newId();
          const table = kind === "wilaya" ? "wilayas" : "communes";
          if (row) { if (kind === "wilaya") await db.update(table, { id }, { code: code.trim() }); }
          else {
            const siblings = kind === "wilaya" ? c.snap.wilayas : c.snap.communes.filter((x) => x.wilaya_id === wilayaId);
            const base = { id, slug: slugify(name), sort_order: Math.max(0, ...siblings.map((s) => s.sort_order)) + 10 };
            await db.insert(table, kind === "wilaya" ? { ...base, code: code.trim() } : { ...base, wilaya_id: wilayaId });
          }
          await saveTr(c, kind, id, tr);
        });
        if (ok) onClose();
      }}>
        {kind === "wilaya" && <TextField label={t("admin.f.code")} value={code} onChange={setCode} dir="ltr" required />}
        <TranslationFields type={kind} values={tr} onChange={setTr} />
        <ErrorNote error={error} />
        <div className="form-actions"><button type="button" className="btn secondary" onClick={onClose}>{t("common.cancel")}</button><button className="btn" disabled={busy}>{t("common.save")}</button></div>
      </form>
    </Sheet>
  );
}

// ======================================================================= demo content
export function DemoAdmin() {
  const { t } = useI18n();
  const { content, isAdmin, reloadContent } = useApp();
  const c = content!;
  const { run, error } = useAdminOp();
  const [confirm, setConfirm] = useState<"remove" | "reset" | null>(null);
  const counts: [string, number][] = [
    ["admin.nav.providers", c.snap.providers.filter((x) => x.is_demo).length],
    ["admin.priceItems", c.snap.price_items.filter((x) => x.is_demo).length],
    ["admin.priceRecords", c.snap.price_records.filter((x) => x.is_demo).length],
    ["providers.offers", c.snap.offers.filter((x) => x.is_demo).length],
    ["admin.media", c.snap.provider_media.filter((x) => x.is_demo).length],
    ["admin.categoriesTotal", c.snap.categories.filter((x) => x.is_demo).length],
  ];
  return (
    <>
      <AdminHeader title={t("admin.nav.demo")} sub={t("admin.demoIntro")} />
      <ErrorNote error={error} />
      <div className="stack-lg">
        <div className="list">
          {counts.map(([k, n]) => <div key={k} className="admin-row"><div className="body"><div className="title">{t(k)}</div></div><span className="badge outline">{n}</span></div>)}
        </div>
        <div className="notice sand"><Icon name="info" size={18} />{t("admin.demoSafe")}</div>
        {isAdmin && <button className="btn danger" onClick={() => setConfirm("remove")}><Icon name="trash" size={18} />{t("admin.removeDemo")}</button>}
        {isDemoMode && local ? (
          <div className="stack-sm">
            <button className="btn secondary" onClick={() => run(async () => { local.restoreDemo(); })}><Icon name="refresh" size={18} />{t("admin.restoreDemo")}</button>
            <button className="btn secondary" onClick={() => setConfirm("reset")}>{t("admin.resetDevice")}</button>
          </div>
        ) : <p className="small muted">{t("admin.restoreDemoCloud")}</p>}
      </div>
      <ConfirmSheet open={confirm === "remove"} onClose={() => setConfirm(null)} danger title={t("admin.removeDemo")} message={t("admin.removeDemoWarn")}
        confirmLabel={t("common.remove")} onConfirm={() => { run(() => db.rpc("delete_demo_content")); }} />
      <ConfirmSheet open={confirm === "reset"} onClose={() => setConfirm(null)} danger title={t("admin.resetDevice")} message={t("admin.resetDeviceWarn")}
        confirmLabel={t("admin.resetDevice")} onConfirm={async () => { local!.resetAll(); localStorage.removeItem("3arssi.localsession.v1"); await reloadContent(); location.href = asset("/"); }} />
    </>
  );
}

// ======================================================================= users & roles
export function UsersAdmin() {
  const { t, date } = useI18n();
  const { isAdmin, user } = useApp();
  const [users, setUsers] = useState<{ id: string; email: string; display_name: string | null; role: Role; created_at: string }[] | null>(null);
  const { run, busy, error } = useAdminOp();
  const load = () => db.rpc<typeof users>("admin_list_users").then(setUsers).catch((e) => console.error(e));
  useEffect(() => { if (isAdmin) load(); }, [isAdmin]);
  if (!isAdmin) return <><AdminHeader title={t("admin.nav.users")} /><p className="muted">{t("admin.adminOnly")}</p></>;
  return (
    <>
      <AdminHeader title={t("admin.nav.users")} sub={t("admin.usersIntro")} />
      <ErrorNote error={error} />
      <div className="list">
        {(users ?? []).map((u) => (
          <div key={u.id} className="admin-row">
            <div className="body"><div className="title break">{u.display_name || u.email}</div><div className="tiny muted break">{u.email} · {date(u.created_at)}</div></div>
            <select className="select" style={{ width: 140, minHeight: 40 }} value={u.role} disabled={busy || u.id === user?.id} aria-label={t("admin.role")}
              onChange={(e) => run(async () => { await db.rpc("set_user_role", { p_user: u.id, p_role: e.target.value }); await load(); })}>
              {(["user", "editor", "admin"] as Role[]).map((r) => <option key={r} value={r}>{t(`role.${r}`)}</option>)}
            </select>
          </div>
        ))}
      </div>
      <p className="tiny muted" style={{ marginTop: 12 }}>{t("admin.rolesHelp")}</p>
    </>
  );
}
