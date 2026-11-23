// Admin: providers (profile, services, portfolio, offers), service types, prices.
import { asset } from "../lib/base";
import { useState } from "react";
import { Icon } from "../components/Icon";
import { ConfirmSheet, DemoBadge, SelectField, Sheet, TextField } from "../components/ui";
import { db } from "../data/client";
import { parseAmount } from "../domain/budget";
import { newId, slugify } from "../lib/ids";
import { useI18n } from "../i18n/i18n";
import { Link, navigate } from "../lib/router";
import { useApp } from "../state/app";
import { UNITS, type Offer, type PriceItem, type PriceRecord, type Provider, type ServiceType, type Unit } from "../data/types";
import {
  AdminHeader, emptyTr, ErrorNote, loadTr, MissingDots, moveRow, RowActions, saveTr, Toggle, TranslationFields, useAdminOp, type TrValues,
} from "./common";

const bySort = <T extends { sort_order: number }>(a: T, b: T) => a.sort_order - b.sort_order;

// ======================================================================= providers list
export function ProvidersAdmin() {
  const { t } = useI18n();
  const { content } = useApp();
  const { run, error } = useAdminOp();
  const [q, setQ] = useState("");
  const [del, setDel] = useState<Provider | null>(null);
  const c = content!;
  const list = c.snap.providers.filter((p) => !q || p.name.toLowerCase().includes(q.toLowerCase())).sort((a, b) => a.name.localeCompare(b.name));
  return (
    <>
      <AdminHeader title={t("admin.nav.providers")} sub={t("admin.providersIntro")}
        actions={<Link className="btn small" to="/admin/providers/new"><Icon name="plus" size={16} />{t("admin.addProvider")}</Link>} />
      <ErrorNote error={error} />
      <input className="input" type="search" placeholder={t("providers.search")} value={q} onChange={(e) => setQ(e.target.value)} aria-label={t("providers.search")} style={{ marginBottom: 12 }} />
      <div className="list">
        {list.map((p) => (
          <div key={p.id} className={`admin-row${p.enabled ? "" : " disabled"}`}>
            <Link to={`/admin/providers/${p.id}`} className="body" style={{ textDecoration: "none" }}>
              <div className="title">{p.name}</div>
              <div className="row wrap" style={{ gap: 6 }}>
                <span className="tiny muted">{c.serviceName(p.primary_service_type_id)} · {c.placeName(p)}</span>
                {p.is_demo && <DemoBadge />}
                {p.featured && <span className="badge blue" style={{ height: 20 }}>{t("providers.featured")}</span>}
                {p.verified && <span className="badge sage" style={{ height: 20 }}>{t("providers.verified")}</span>}
              </div>
            </Link>
            <button className="icon-btn sm" aria-label={p.enabled ? t("admin.disable") : t("admin.enable")} aria-pressed={p.enabled}
              onClick={() => run(() => db.update("providers", { id: p.id }, { enabled: !p.enabled }))}><Icon name={p.enabled ? "eye" : "eye-off"} size={17} /></button>
            <Link className="icon-btn sm" to={`/admin/providers/${p.id}`} aria-label={t("common.edit")}><Icon name="edit" size={17} /></Link>
            <button className="icon-btn sm" aria-label={t("common.delete")} onClick={() => setDel(p)}><Icon name="trash" size={17} /></button>
          </div>
        ))}
      </div>
      <ConfirmSheet open={!!del} onClose={() => setDel(null)} danger title={t("admin.deleteTitle", { name: del?.name ?? "" })}
        message={t("admin.deleteProviderWarn")} confirmLabel={t("common.delete")} onConfirm={() => { run(() => db.remove("providers", { id: del!.id })); }} />
    </>
  );
}

// ======================================================================= provider editor
export function ProviderEditor({ id }: { id: string }) {
  const { t } = useI18n();
  const { content } = useApp();
  const c = content!;
  const isNew = id === "new";
  const p = isNew ? null : c.snap.providers.find((x) => x.id === id);
  const [f, setF] = useState({
    name: p?.name ?? "", slug: p?.slug ?? "", primary: p?.primary_service_type_id ?? "", wilaya: p?.wilaya_id ?? (c.snap.wilayas[0]?.id ?? ""),
    commune: p?.commune_id ?? "", address: p?.address ?? "", phone: p?.phone ?? "", whatsapp: p?.whatsapp ?? "",
    instagram: p?.instagram ?? "", website: p?.website ?? "", featured: p?.featured ?? false, verified: p?.verified ?? false, enabled: p?.enabled ?? true,
  });
  const [svc, setSvc] = useState<string[]>(() => (p ? c.providerServiceIds(p.id) : []));
  const [tr, setTr] = useState<TrValues>(() => loadTr(c, "provider", p?.id ?? null));
  const { run, busy, error, setError } = useAdminOp();
  const set = (k: keyof typeof f) => (v: any) => setF({ ...f, [k]: v });
  if (!isNew && !p) return <AdminHeader title={t("error.notFound")} back="/admin/providers" />;

  const save = async () => {
    if (!f.name.trim()) { setError(t("admin.providerNameRequired")); return; }
    if (!f.primary) { setError(t("admin.providerTypeRequired")); return; }
    if (!f.phone.trim() && !f.whatsapp.trim() && !f.instagram.trim() && !f.website.trim()) { setError(t("admin.providerContactRequired")); return; }
    const slug = slugify(f.slug || f.name);
    if (c.snap.providers.some((x) => x.slug === slug && x.id !== p?.id)) { setError(t("admin.slugTaken")); return; }
    const pid = p?.id ?? newId();
    const row = {
      name: f.name.trim(), slug, primary_service_type_id: f.primary || null, wilaya_id: f.wilaya || null, commune_id: f.commune || null,
      address: f.address.trim() || null, phone: f.phone.trim() || null, whatsapp: f.whatsapp.trim() || null, instagram: f.instagram.trim() || null,
      website: f.website.trim() || null, featured: f.featured, verified: f.verified, enabled: f.enabled, last_updated_at: new Date().toISOString(),
    };
    const ok = await run(async () => {
      if (p) await db.update("providers", { id: pid }, row); else await db.insert("providers", { id: pid, ...row });
      await saveTr(c, "provider", pid, tr);
      const all = Array.from(new Set([f.primary, ...svc].filter(Boolean)));
      const before = p ? c.providerServiceIds(p.id) : [];
      for (const s of all.filter((x) => !before.includes(x))) await db.insert("provider_services", { provider_id: pid, service_type_id: s });
      for (const s of before.filter((x) => !all.includes(x))) await db.remove("provider_services", { provider_id: pid, service_type_id: s });
    });
    if (ok && isNew) navigate(`/admin/providers/${pid}`, { replace: true });
  };

  const types = c.snap.service_types.slice().sort(bySort);
  return (
    <>
      <AdminHeader title={isNew ? t("admin.addProvider") : p!.name} back="/admin/providers"
        actions={p?.is_demo ? <DemoBadge /> : undefined} />
      <div className="grid two" style={{ alignItems: "start", gap: 20 }}>
        <form className="stack" onSubmit={(e) => { e.preventDefault(); save(); }}>
          <TextField label={t("admin.f.businessName")} value={f.name} onChange={set("name")} required />
          <SelectField label={t("admin.f.primaryType")} value={f.primary} onChange={set("primary")}
            options={[{ value: "", label: "—" }, ...types.map((s) => ({ value: s.id, label: c.serviceName(s.id) || s.slug }))]} />
          <div className="field">
            <span className="label">{t("admin.f.otherServices")}</span>
            <div className="chips" style={{ flexWrap: "wrap", margin: 0, padding: 0 }}>
              {types.filter((s) => s.id !== f.primary).map((s) => (
                <button key={s.id} type="button" className="chip" aria-pressed={svc.includes(s.id)}
                  onClick={() => setSvc(svc.includes(s.id) ? svc.filter((x) => x !== s.id) : [...svc, s.id])}>{c.serviceName(s.id) || s.slug}</button>
              ))}
            </div>
          </div>
          <TranslationFields type="provider" values={tr} onChange={setTr} />
          <div className="grid two">
            <SelectField label={t("admin.f.wilaya")} value={f.wilaya} onChange={(v) => setF({ ...f, wilaya: v, commune: "" })}
              options={[{ value: "", label: "—" }, ...c.snap.wilayas.slice().sort(bySort).map((w) => ({ value: w.id, label: c.text("wilaya", w.id) || w.slug }))]} />
            <SelectField label={t("admin.f.commune")} value={f.commune} onChange={set("commune")}
              options={[{ value: "", label: "—" }, ...c.snap.communes.filter((x) => x.wilaya_id === f.wilaya).sort(bySort).map((x) => ({ value: x.id, label: c.text("commune", x.id) || x.slug }))]} />
          </div>
          <TextField label={t("admin.f.address")} value={f.address} onChange={set("address")} />
          <div className="grid two">
            <TextField label={t("admin.f.phone")} value={f.phone} onChange={set("phone")} type="tel" dir="ltr" />
            <TextField label={t("admin.f.whatsapp")} value={f.whatsapp} onChange={set("whatsapp")} type="tel" dir="ltr" />
          </div>
          <TextField label={t("admin.f.instagram")} value={f.instagram} onChange={set("instagram")} dir="ltr" hint={t("admin.instagramHint")} />
          <TextField label={t("admin.f.website")} value={f.website} onChange={set("website")} dir="ltr" />
          <TextField label={t("admin.f.slug")} value={f.slug} onChange={set("slug")} dir="ltr" hint={t("admin.slugHint")} />
          <Toggle label={t("providers.featured")} checked={f.featured} onChange={set("featured")} />
          <Toggle label={t("providers.verified")} checked={f.verified} onChange={set("verified")} hint={t("admin.verifiedHint")} />
          <Toggle label={t("admin.f.enabled")} checked={f.enabled} onChange={set("enabled")} />
          <ErrorNote error={error} />
          <div className="form-actions"><button className="btn" disabled={busy}>{t("common.save")}</button></div>
        </form>
        {p ? (
          <div className="stack-lg">
            <MediaEditor provider={p} />
            <OffersEditor provider={p} />
            <ProviderPrices provider={p} />
          </div>
        ) : <p className="small muted">{t("admin.saveFirst")}</p>}
      </div>
    </>
  );
}

function MediaEditor({ provider }: { provider: Provider }) {
  const { t } = useI18n();
  const { content } = useApp();
  const c = content!;
  const media = c.media(provider.id);
  const [url, setUrl] = useState("");
  const [kind, setKind] = useState<"image" | "video">("image");
  const [caption, setCaption] = useState<{ id: string; tr: TrValues } | null>(null);
  const { run, busy, error } = useAdminOp();
  const add = (u: string, storagePath: string | null = null, k = kind) => run(() => db.insert("provider_media", {
    provider_id: provider.id, kind: k, url: u, storage_path: storagePath, sort_order: Math.max(0, ...media.map((m) => m.sort_order)) + 10,
  }));
  return (
    <section className="card stack">
      <h2 className="h3">{t("providers.portfolio")}</h2>
      <ErrorNote error={error} />
      {media.length > 0 && (
        <div className="list">
          {media.map((m, i) => (
            <div key={m.id} className="admin-row">
              {m.kind === "image" ? <img className="thumb" src={asset(m.url)} alt="" style={{ width: 52, height: 52 }} /> : <span className="tile-ico"><Icon name="video" /></span>}
              <div className="body"><div className="tiny muted break">{c.text("provider_media", m.id, "caption") || m.url.slice(0, 60)}</div></div>
              <RowActions index={i} count={media.length} onMove={(d) => !busy && run(() => moveRow("provider_media", media, i, d), false)}
                onEdit={() => setCaption({ id: m.id, tr: loadTr(c, "provider_media", m.id) })}
                onDelete={() => run(async () => { await db.remove("provider_media", { id: m.id }); if (m.storage_path) await db.removeFile(m.storage_path).catch(() => undefined); })} />
            </div>
          ))}
        </div>
      )}
      <label className="btn secondary">
        <Icon name="image" size={18} />{t("admin.uploadImage")}
        <input type="file" accept="image/*,video/mp4,video/webm" hidden disabled={busy} onChange={async (e) => {
          const file = e.target.files?.[0]; if (!file) return;
          await run(async () => { const r = await db.uploadFile(file, `providers/${provider.id}`); await db.insert("provider_media", {
            provider_id: provider.id, kind: file.type.startsWith("video") ? "video" : "image", url: r.url, storage_path: r.path,
            sort_order: Math.max(0, ...media.map((m) => m.sort_order)) + 10 }); });
          e.target.value = "";
        }} />
      </label>
      <form className="row wrap" onSubmit={(e) => { e.preventDefault(); if (url.trim()) { add(url.trim()); setUrl(""); } }}>
        <select className="select" style={{ width: 120 }} value={kind} onChange={(e) => setKind(e.target.value as "image" | "video")} aria-label={t("admin.f.kind")}>
          <option value="image">{t("admin.image")}</option><option value="video">{t("admin.video")}</option>
        </select>
        <input className="input grow" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" dir="ltr" aria-label={t("admin.f.imageUrl")} style={{ minWidth: 160 }} />
        <button className="btn secondary" disabled={!url.trim() || busy}>{t("common.add")}</button>
      </form>
      {caption && (
        <Sheet open onClose={() => setCaption(null)} title={t("admin.f.caption")}>
          <form className="stack" onSubmit={async (e) => { e.preventDefault(); if (await run(() => saveTr(c, "provider_media", caption.id, caption.tr))) setCaption(null); }}>
            <TranslationFields type="provider_media" values={caption.tr} onChange={(v) => setCaption({ ...caption, tr: v })} />
            <div className="form-actions"><button className="btn" disabled={busy}>{t("common.save")}</button></div>
          </form>
        </Sheet>
      )}
    </section>
  );
}

function OffersEditor({ provider }: { provider: Provider }) {
  const { t, date } = useI18n();
  const { content } = useApp();
  const c = content!;
  const offers = c.snap.offers.filter((o) => o.provider_id === provider.id);
  const [edit, setEdit] = useState<Offer | "new" | null>(null);
  const { run } = useAdminOp();
  return (
    <section className="card stack">
      <div className="row between"><h2 className="h3">{t("providers.offers")}</h2>
        <button className="btn small secondary" onClick={() => setEdit("new")}><Icon name="plus" size={16} />{t("common.add")}</button></div>
      {offers.length === 0 ? <p className="small muted">{t("admin.noOffers")}</p> : (
        <div className="list">
          {offers.map((o) => (
            <div key={o.id} className={`admin-row${o.enabled ? "" : " disabled"}`}>
              <div className="body"><div className="title">{c.text("offer", o.id, "title") || "—"}</div>
                <div className="tiny muted">{date(o.valid_from)} → {date(o.valid_to)}</div></div>
              <button className="icon-btn sm" aria-label={t("common.edit")} onClick={() => setEdit(o)}><Icon name="edit" size={17} /></button>
              <button className="icon-btn sm" aria-label={t("common.delete")} onClick={() => run(() => db.remove("offers", { id: o.id }))}><Icon name="trash" size={17} /></button>
            </div>
          ))}
        </div>
      )}
      {edit && <OfferSheet provider={provider} offer={edit === "new" ? null : edit} onClose={() => setEdit(null)} />}
    </section>
  );
}

function OfferSheet({ provider, offer, onClose }: { provider: Provider; offer: Offer | null; onClose: () => void }) {
  const { t } = useI18n();
  const { content } = useApp();
  const c = content!;
  const [tr, setTr] = useState<TrValues>(() => loadTr(c, "offer", offer?.id ?? null));
  const [from, setFrom] = useState(offer?.valid_from ?? "");
  const [to, setTo] = useState(offer?.valid_to ?? "");
  const [enabled, setEnabled] = useState(offer?.enabled ?? true);
  const { run, busy, error, setError } = useAdminOp();
  return (
    <Sheet open onClose={onClose} title={t("providers.offers")}>
      <form className="stack" onSubmit={async (e) => {
        e.preventDefault();
        if (from && to && to < from) { setError(t("admin.dateOrder")); return; }
        const ok = await run(async () => {
          const id = offer?.id ?? newId();
          const row = { valid_from: from || null, valid_to: to || null, enabled };
          if (offer) await db.update("offers", { id }, row); else await db.insert("offers", { id, provider_id: provider.id, ...row });
          await saveTr(c, "offer", id, tr);
        });
        if (ok) onClose();
      }}>
        <TranslationFields type="offer" values={tr} onChange={setTr} />
        <div className="grid two">
          <div className="field"><label htmlFor="of-from">{t("admin.f.validFrom")}</label><input id="of-from" type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
          <div className="field"><label htmlFor="of-to">{t("admin.f.validTo")}</label><input id="of-to" type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} /></div>
        </div>
        <Toggle label={t("admin.f.enabled")} checked={enabled} onChange={setEnabled} />
        <ErrorNote error={error} />
        <div className="form-actions"><button type="button" className="btn secondary" onClick={onClose}>{t("common.cancel")}</button><button className="btn" disabled={busy}>{t("common.save")}</button></div>
      </form>
    </Sheet>
  );
}

function ProviderPrices({ provider }: { provider: Provider }) {
  const { t, money } = useI18n();
  const { content } = useApp();
  const c = content!;
  const recs = c.snap.price_records.filter((r) => r.provider_id === provider.id);
  const [edit, setEdit] = useState<PriceRecord | "new" | null>(null);
  return (
    <section className="card stack">
      <div className="row between"><h2 className="h3">{t("providers.prices")}</h2>
        <button className="btn small secondary" onClick={() => setEdit("new")}><Icon name="plus" size={16} />{t("common.add")}</button></div>
      {recs.length === 0 ? <p className="small muted">{t("admin.noPrices")}</p> : (
        <div className="list">
          {recs.map((r) => {
            const item = c.priceItem(r.price_item_id);
            return (
              <button key={r.id} className="list-item" onClick={() => setEdit(r)}>
                <div className="body"><div className="title">{item ? c.text("price_item", item.id) : "—"}</div>
                  <div className="sub">{r.min_price !== null ? `${money(Number(r.min_price))} – ${money(Number(r.max_price))}` : t("estimate.requestQuote")} / {item ? t(`unit.${item.unit}`) : ""} · {r.updated_on}</div></div>
                <Icon name="edit" size={17} className="chev" />
              </button>
            );
          })}
        </div>
      )}
      {edit && <PriceRecordSheet record={edit === "new" ? null : edit} providerId={provider.id} onClose={() => setEdit(null)} />}
    </section>
  );
}

// ======================================================================= price records
export function PriceRecordSheet({ record, providerId, itemId, onClose }: { record: PriceRecord | null; providerId?: string; itemId?: string; onClose: () => void }) {
  const { t } = useI18n();
  const { content } = useApp();
  const c = content!;
  const [item, setItem] = useState(record?.price_item_id ?? itemId ?? c.snap.price_items[0]?.id ?? "");
  const [provider, setProvider] = useState(record?.provider_id ?? providerId ?? "");
  const [source, setSource] = useState(record?.source_label ?? "");
  const [wilaya, setWilaya] = useState(record?.wilaya_id ?? c.snap.wilayas[0]?.id ?? "");
  const [min, setMin] = useState(record?.min_price != null ? String(record.min_price) : "");
  const [max, setMax] = useState(record?.max_price != null ? String(record.max_price) : "");
  const [minQty, setMinQty] = useState(record?.min_quantity != null ? String(record.min_quantity) : "");
  const [status, setStatus] = useState(record?.price_status ?? "indicative");
  const [updated, setUpdated] = useState(record?.updated_on ?? new Date().toISOString().slice(0, 10));
  const [enabled, setEnabled] = useState(record?.enabled ?? true);
  const [tr, setTr] = useState<TrValues>(() => loadTr(c, "price_record", record?.id ?? null));
  const [confirmDel, setConfirmDel] = useState(false);
  const { run, busy, error, setError } = useAdminOp();
  const unit = c.priceItem(item)?.unit;

  const save = async () => {
    const lo = min.trim() ? parseAmount(min) : null;
    const hi = max.trim() ? parseAmount(max) : null;
    const q = minQty.trim() ? parseAmount(minQty) : null;
    if (!item) { setError(t("admin.priceItemRequired")); return; }
    if ((min.trim() && lo === null) || (max.trim() && hi === null) || (minQty.trim() && !(q && q > 0))) { setError(t("error.amount")); return; }
    if ((lo === null) !== (hi === null)) { setError(t("admin.priceBoth")); return; }
    if (lo !== null && hi !== null && hi < lo) { setError(t("admin.priceOrder")); return; }
    if (!provider && !source.trim()) { setError(t("admin.priceSourceRequired")); return; }
    const ok = await run(async () => {
      const id = record?.id ?? newId();
      const row = { price_item_id: item, provider_id: provider || null, source_label: source.trim() || null, wilaya_id: wilaya || null,
        min_price: lo, max_price: hi, min_quantity: q, price_status: status, updated_on: updated, enabled };
      if (record) await db.update("price_records", { id }, row); else await db.insert("price_records", { id, ...row });
      await saveTr(c, "price_record", id, tr);
    });
    if (ok) onClose();
  };

  return (
    <Sheet open onClose={onClose} title={record ? t("admin.editPrice") : t("admin.addPrice")}>
      <form className="stack" onSubmit={(e) => { e.preventDefault(); save(); }}>
        <SelectField label={t("admin.f.priceItem")} value={item} onChange={setItem}
          options={c.snap.price_items.slice().sort(bySort).map((i) => ({ value: i.id, label: `${c.text("price_item", i.id) || i.slug} · ${t(`unit.${i.unit}`)}` }))}
          hint={t("admin.priceItemHint")} />
        <SelectField label={t("admin.f.provider")} value={provider} onChange={setProvider}
          options={[{ value: "", label: t("admin.noProvider") }, ...c.snap.providers.map((p) => ({ value: p.id, label: p.name }))]} />
        {!provider && <TextField label={t("admin.f.source")} value={source} onChange={setSource} hint={t("admin.sourceHint")} />}
        <SelectField label={t("admin.f.wilaya")} value={wilaya} onChange={setWilaya}
          options={[{ value: "", label: "—" }, ...c.snap.wilayas.map((w) => ({ value: w.id, label: c.text("wilaya", w.id) || w.slug }))]} />
        {unit === "quote" ? <p className="notice sand small">{t("admin.quoteUnit")}</p> : (
          <div className="grid two">
            <div className="field"><label htmlFor="pr-min">{t("admin.f.minPrice")} / {unit ? t(`unit.${unit}`) : ""}</label>
              <input id="pr-min" className="input num" inputMode="decimal" value={min} onChange={(e) => setMin(e.target.value)} dir="ltr" /></div>
            <div className="field"><label htmlFor="pr-max">{t("admin.f.maxPrice")} / {unit ? t(`unit.${unit}`) : ""}</label>
              <input id="pr-max" className="input num" inputMode="decimal" value={max} onChange={(e) => setMax(e.target.value)} dir="ltr" /></div>
          </div>
        )}
        <div className="field"><label htmlFor="pr-mq">{t("admin.f.minQty")}</label>
          <input id="pr-mq" className="input num" inputMode="decimal" value={minQty} onChange={(e) => setMinQty(e.target.value)} dir="ltr" /></div>
        <SelectField label={t("admin.f.priceStatus")} value={status} onChange={(v) => setStatus(v as PriceRecord["price_status"])}
          options={[{ value: "indicative", label: t("priceStatus.indicative") }, { value: "confirmed", label: t("priceStatus.confirmed") }]} />
        <div className="field"><label htmlFor="pr-up">{t("admin.f.updatedOn")}</label>
          <input id="pr-up" type="date" className="input" value={updated} onChange={(e) => setUpdated(e.target.value)} required /></div>
        <TranslationFields type="price_record" values={tr} onChange={setTr} />
        <Toggle label={t("admin.f.enabled")} checked={enabled} onChange={setEnabled} hint={t("admin.priceEnabledHint")} />
        <ErrorNote error={error} />
        <div className="form-actions">
          {record && <button type="button" className="btn danger" onClick={() => setConfirmDel(true)}>{t("common.delete")}</button>}
          <button type="button" className="btn secondary" onClick={onClose}>{t("common.cancel")}</button>
          <button className="btn" disabled={busy}>{t("common.save")}</button>
        </div>
      </form>
      <ConfirmSheet open={confirmDel} onClose={() => setConfirmDel(false)} danger title={t("admin.deletePrice")} confirmLabel={t("common.delete")}
        onConfirm={async () => { if (await run(() => db.remove("price_records", { id: record!.id }))) onClose(); }} />
    </Sheet>
  );
}

export function PricesAdmin() {
  const { t, money } = useI18n();
  const { content } = useApp();
  const c = content!;
  const { run, busy, error } = useAdminOp();
  const [editItem, setEditItem] = useState<PriceItem | "new" | null>(null);
  const [editRec, setEditRec] = useState<{ rec: PriceRecord | null; item: string } | null>(null);
  const [del, setDel] = useState<PriceItem | null>(null);
  const items = c.snap.price_items.slice().sort(bySort);
  const year = new Date(Date.now() - 365 * 864e5).toISOString().slice(0, 10);
  return (
    <>
      <AdminHeader title={t("admin.nav.prices")} sub={t("admin.pricesIntro")}
        actions={<button className="btn small" onClick={() => setEditItem("new")}><Icon name="plus" size={16} />{t("admin.addPriceItem")}</button>} />
      <ErrorNote error={error} />
      <div className="stack">
        {items.map((it, i) => {
          const recs = c.snap.price_records.filter((r) => r.price_item_id === it.id);
          return (
            <section key={it.id} className="card stack-sm" style={{ opacity: it.enabled ? 1 : 0.6 }}>
              <div className="row">
                <div className="grow">
                  <div className="h3">{c.text("price_item", it.id) || it.slug}</div>
                  <div className="row wrap" style={{ gap: 6 }}>
                    <span className="badge outline" style={{ height: 20 }}>{t(`unit.${it.unit}`)}</span>
                    <span className="tiny muted">{c.serviceName(it.service_type_id)}</span>
                    {it.is_demo && <DemoBadge />}<MissingDots c={c} type="price_item" id={it.id} />
                  </div>
                </div>
                <RowActions index={i} count={items.length} enabled={it.enabled}
                  onMove={(d) => !busy && run(() => moveRow("price_items", items, i, d), false)}
                  onToggle={() => run(() => db.update("price_items", { id: it.id }, { enabled: !it.enabled }))}
                  onEdit={() => setEditItem(it)} onDelete={() => setDel(it)} />
              </div>
              {recs.map((r) => (
                <button key={r.id} className="list-item" style={{ padding: "8px 0", minHeight: 0, borderTop: "1px solid var(--line)" }} onClick={() => setEditRec({ rec: r, item: it.id })}>
                  <div className="body">
                    <div className="small" style={{ fontWeight: 600 }}>{r.provider_id ? c.provider(r.provider_id)?.name : r.source_label}</div>
                    <div className="tiny muted">
                      {r.min_price !== null ? `${money(Number(r.min_price))} – ${money(Number(r.max_price))}` : t("estimate.requestQuote")}
                      {" · "}{c.text("wilaya", r.wilaya_id) || "—"} · {r.updated_on}{!r.enabled && ` · ${t("common.disabled")}`}
                    </div>
                  </div>
                  {r.updated_on < year && <span className="badge sand">{t("admin.stale")}</span>}
                  <Icon name="edit" size={16} className="chev" />
                </button>
              ))}
              <button className="link-btn small" style={{ alignSelf: "flex-start" }} onClick={() => setEditRec({ rec: null, item: it.id })}>+ {t("admin.addPrice")}</button>
            </section>
          );
        })}
      </div>
      {editItem && <PriceItemSheet item={editItem === "new" ? null : editItem} onClose={() => setEditItem(null)} />}
      {editRec && <PriceRecordSheet record={editRec.rec} itemId={editRec.item} onClose={() => setEditRec(null)} />}
      <ConfirmSheet open={!!del} onClose={() => setDel(null)} danger title={t("admin.deleteTitle", { name: del ? c.text("price_item", del.id) : "" })}
        message={t("admin.deletePriceItemWarn")} confirmLabel={t("common.delete")} onConfirm={() => { run(() => db.remove("price_items", { id: del!.id })); }} />
    </>
  );
}

function PriceItemSheet({ item, onClose }: { item: PriceItem | null; onClose: () => void }) {
  const { t } = useI18n();
  const { content } = useApp();
  const c = content!;
  const [tr, setTr] = useState<TrValues>(() => loadTr(c, "price_item", item?.id ?? null));
  const [unit, setUnit] = useState<Unit>(item?.unit ?? "piece");
  const [svc, setSvc] = useState(item?.service_type_id ?? "");
  const [enabled, setEnabled] = useState(item?.enabled ?? true);
  const { run, busy, error, setError } = useAdminOp();
  const hasRecords = !!item && c.snap.price_records.some((r) => r.price_item_id === item.id);
  return (
    <Sheet open onClose={onClose} title={item ? t("admin.editPriceItem") : t("admin.addPriceItem")}>
      <form className="stack" onSubmit={async (e) => {
        e.preventDefault();
        const name = tr.name.fr || tr.name.en || tr.name.ar;
        if (!name.trim()) { setError(t("admin.nameRequired")); return; }
        const ok = await run(async () => {
          const id = item?.id ?? newId();
          const row = { unit, service_type_id: svc || null, enabled };
          if (item) await db.update("price_items", { id }, row);
          else {
            let slug = slugify(name); let n = 2;
            while (c.snap.price_items.some((x) => x.slug === slug)) slug = `${slugify(name)}-${n++}`;
            await db.insert("price_items", { id, slug, sort_order: Math.max(0, ...c.snap.price_items.map((x) => x.sort_order)) + 10, ...row });
          }
          await saveTr(c, "price_item", id, tr);
        });
        if (ok) onClose();
      }}>
        <TranslationFields type="price_item" values={tr} onChange={setTr} />
        <SelectField label={t("admin.f.unit")} value={unit} onChange={(v) => setUnit(v as Unit)}
          options={UNITS.map((u) => ({ value: u, label: t(`unit.${u}`) }))} hint={hasRecords ? t("admin.unitChangeWarn") : t("admin.unitHint")} />
        <SelectField label={t("admin.f.primaryType")} value={svc} onChange={setSvc}
          options={[{ value: "", label: "—" }, ...c.snap.service_types.map((s) => ({ value: s.id, label: c.serviceName(s.id) || s.slug }))]} hint={t("admin.priceItemServiceHint")} />
        <Toggle label={t("admin.f.enabled")} checked={enabled} onChange={setEnabled} />
        <ErrorNote error={error} />
        <div className="form-actions"><button type="button" className="btn secondary" onClick={onClose}>{t("common.cancel")}</button><button className="btn" disabled={busy}>{t("common.save")}</button></div>
      </form>
    </Sheet>
  );
}

// ======================================================================= service types
export function ServicesAdmin() {
  const { t } = useI18n();
  const { content } = useApp();
  const c = content!;
  const { run, busy, error } = useAdminOp();
  const [edit, setEdit] = useState<ServiceType | "new" | null>(null);
  const [del, setDel] = useState<ServiceType | null>(null);
  const list = c.snap.service_types.slice().sort(bySort);
  return (
    <>
      <AdminHeader title={t("admin.nav.services")} sub={t("admin.servicesIntro")}
        actions={<button className="btn small" onClick={() => setEdit("new")}><Icon name="plus" size={16} />{t("admin.addService")}</button>} />
      <ErrorNote error={error} />
      <div className="list">
        {list.map((s, i) => (
          <div key={s.id} className={`admin-row${s.enabled ? "" : " disabled"}`}>
            <span className="tile-ico"><Icon name={s.icon ?? "tag"} /></span>
            <div className="body">
              <div className="title">{c.serviceName(s.id) || s.slug}</div>
              <div className="row wrap" style={{ gap: 6 }}>
                <span className="tiny muted">{s.parent_id ? `↳ ${c.serviceName(s.parent_id)} · ` : ""}{t("admin.providersCount", { n: c.snap.provider_services.filter((x) => x.service_type_id === s.id).length })}</span>
                <MissingDots c={c} type="service_type" id={s.id} />
              </div>
            </div>
            <RowActions index={i} count={list.length} enabled={s.enabled}
              onMove={(d) => !busy && run(() => moveRow("service_types", list, i, d), false)}
              onToggle={() => run(() => db.update("service_types", { id: s.id }, { enabled: !s.enabled }))}
              onEdit={() => setEdit(s)} onDelete={() => setDel(s)} />
          </div>
        ))}
      </div>
      {edit && <ServiceSheet svc={edit === "new" ? null : edit} onClose={() => setEdit(null)} />}
      <ConfirmSheet open={!!del} onClose={() => setDel(null)} danger title={t("admin.deleteTitle", { name: del ? c.serviceName(del.id) : "" })}
        message={t("admin.deleteServiceWarn")} confirmLabel={t("common.delete")} onConfirm={() => { run(() => db.remove("service_types", { id: del!.id })); }} />
    </>
  );
}

function ServiceSheet({ svc, onClose }: { svc: ServiceType | null; onClose: () => void }) {
  const { t } = useI18n();
  const { content } = useApp();
  const c = content!;
  const [tr, setTr] = useState<TrValues>(() => (svc ? loadTr(c, "service_type", svc.id) : emptyTr("service_type")));
  const [parent, setParent] = useState(svc?.parent_id ?? "");
  const [enabled, setEnabled] = useState(svc?.enabled ?? true);
  const { run, busy, error, setError } = useAdminOp();
  return (
    <Sheet open onClose={onClose} title={svc ? t("admin.editService") : t("admin.addService")}>
      <form className="stack" onSubmit={async (e) => {
        e.preventDefault();
        const name = tr.name.fr || tr.name.en || tr.name.ar;
        if (!name.trim()) { setError(t("admin.nameRequired")); return; }
        const ok = await run(async () => {
          const id = svc?.id ?? newId();
          if (svc) await db.update("service_types", { id }, { parent_id: parent || null, enabled });
          else {
            let slug = slugify(name); let n = 2;
            while (c.snap.service_types.some((x) => x.slug === slug)) slug = `${slugify(name)}-${n++}`;
            await db.insert("service_types", { id, slug, parent_id: parent || null, enabled, icon: "tag", sort_order: Math.max(0, ...c.snap.service_types.map((x) => x.sort_order)) + 10 });
          }
          await saveTr(c, "service_type", id, tr);
        });
        if (ok) onClose();
      }}>
        <TranslationFields type="service_type" values={tr} onChange={setTr} />
        <SelectField label={t("admin.f.group")} value={parent} onChange={setParent} hint={t("admin.groupHint")}
          options={[{ value: "", label: "—" }, ...c.snap.service_types.filter((s) => s.id !== svc?.id && !s.parent_id).map((s) => ({ value: s.id, label: c.serviceName(s.id) || s.slug }))]} />
        <Toggle label={t("admin.f.enabled")} checked={enabled} onChange={setEnabled} />
        <ErrorNote error={error} />
        <div className="form-actions"><button type="button" className="btn secondary" onClick={onClose}>{t("common.cancel")}</button><button className="btn" disabled={busy}>{t("common.save")}</button></div>
      </form>
    </Sheet>
  );
}
