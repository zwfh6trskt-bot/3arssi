import { asset } from "../lib/base";
import { useState } from "react";
import { Icon } from "../components/Icon";
import { ConfirmSheet, DemoBadge, Empty, Money } from "../components/ui";
import { instagramLink, telLink, websiteLink, whatsappLink } from "../lib/contact";
import { useI18n } from "../i18n/i18n";
import { Link, navigate, useLocation, withQuery } from "../lib/router";
import { useApp } from "../state/app";
import { spacePath } from "../state/viewmodel";
import type { Provider, Side } from "../data/types";
import { SpaceLayout, useAccountGate, usePlanReady } from "./Space";

function PriceHint({ p }: { p: Provider }) {
  const { t } = useI18n();
  const { content } = useApp();
  const recs = content!.priceRecordsOfProvider(p.id).filter((r) => r.min_price !== null);
  if (!recs.length) return <span className="tiny muted">{t("providers.priceOnRequest")}</span>;
  const r = [...recs].sort((a, b) => Number(a.min_price) - Number(b.min_price))[0];
  const item = content!.priceItem(r.price_item_id);
  return <span className="tiny muted">{t("providers.from")} <Money value={Number(r.min_price)} /> / {item ? t(`unit.${item.unit}`) : ""}</span>;
}

export function ProviderCard({ p, side }: { p: Provider; side: Side }) {
  const { t } = useI18n();
  const { content } = useApp();
  const img = content!.media(p.id).find((m) => m.kind === "image");
  return (
    <Link to={spacePath(side, `/p/${p.slug}`)} className="card card-link row" style={{ padding: 12 }}>
      {img ? <img className="thumb" src={asset(img.url)} alt="" loading="lazy" /> : <span className="tile-ico lg sand"><Icon name="image" /></span>}
      <div className="grow stack-sm" style={{ gap: 2 }}>
        <div style={{ fontWeight: 600, overflowWrap: "anywhere" }}>{p.name}</div>
        <div className="tiny muted">{content!.serviceName(p.primary_service_type_id)}{content!.placeName(p) && ` · ${content!.placeName(p)}`}</div>
        <PriceHint p={p} />
        <div className="row wrap" style={{ gap: 4, marginTop: 2 }}>
          {p.is_demo && <DemoBadge />}
          {p.verified && <span className="badge sage"><Icon name="shield" size={13} />{t("providers.verified")}</span>}
          {p.featured && <span className="badge blue">{t("providers.featured")}</span>}
        </div>
      </div>
    </Link>
  );
}

export function ProvidersPage({ side }: { side: Side }) {
  const { t } = useI18n();
  const { content } = useApp();
  const { query } = useLocation();
  const svc = query.get("svc");
  const catId = query.get("cat");
  const evId = query.get("ev");
  const w = query.get("w") ?? "";
  const q = query.get("q") ?? "";
  const [text, setText] = useState(q);
  if (!content) return <SpaceLayout side={side}>{null}</SpaceLayout>;

  // Context: when coming from an event/category, show only relevant service types
  const cat = catId ? content.category(catId) : null;
  const ev = evId ? content.event(evId) : null;
  const contextTypes = cat
    ? content.serviceTypesOfCategory(cat.id)
    : ev ? content.serviceTypes().filter((s) => content.snap.category_service_types.some((x) => x.service_type_id === s.id
        && content.categoriesOf(ev.id, side).concat(content.snap.categories.filter((c) => c.event_id === ev.id && c.parent_id && c.enabled)).some((c) => c.id === x.category_id)))
      : [];
  const chipTypes = contextTypes.length ? contextTypes : content.serviceTypes();
  const typeIds = svc ? [svc] : contextTypes.map((s) => s.id);
  const list = content.providers({ serviceTypeIds: typeIds, wilayaId: w || null, q });
  const set = (patch: Record<string, string | null>) =>
    navigate(withQuery(spacePath(side, "/providers"), { svc, cat: catId, ev: evId, w: w || null, q: q || null, ...patch }), { replace: true });

  return (
    <SpaceLayout side={side} title={t("nav.providers")}>
      <div className="stack">
        <section className="hero">
          <h1 className="h1">{t("providers.title")}</h1>
          {(cat || ev) && (
            <div className="row wrap" style={{ gap: 6 }}>
              <span className="small muted">{t("providers.forContext")}</span>
              <span className="badge blue">{[ev && content.eventName(ev), cat && content.categoryName(cat)].filter(Boolean).join(" · ")}</span>
              <button className="link-btn small" onClick={() => set({ cat: null, ev: null, svc: null })}>{t("common.clear")}</button>
            </div>
          )}
        </section>
        <form role="search" onSubmit={(e) => { e.preventDefault(); set({ q: text.trim() || null }); }} className="row">
          <div className="input-affix grow">
            <input className="input" type="search" value={text} onChange={(e) => setText(e.target.value)} placeholder={t("providers.search")} aria-label={t("providers.search")} />
            <span className="affix"><Icon name="search" size={18} /></span>
          </div>
        </form>
        <div className="chips" role="group" aria-label={t("providers.serviceType")}>
          <button className="chip" aria-pressed={!svc} onClick={() => set({ svc: null })}>{t("common.all")}</button>
          {chipTypes.map((s) => (
            <button key={s.id} className="chip" aria-pressed={svc === s.id} onClick={() => set({ svc: svc === s.id ? null : s.id })}>{content.serviceName(s.id)}</button>
          ))}
        </div>
        <div className="row">
          <label className="small muted nowrap" htmlFor="wilaya-f"><Icon name="pin" size={16} style={{ display: "inline", verticalAlign: "-3px" }} /> {t("providers.wilaya")}</label>
          <select id="wilaya-f" className="select grow" value={w} onChange={(e) => set({ w: e.target.value || null })} style={{ minHeight: 42 }}>
            <option value="">{t("common.allWilayas")}</option>
            {content.wilayas().map((x) => <option key={x.id} value={x.id}>{content.text("wilaya", x.id)}</option>)}
          </select>
        </div>
        <p className="tiny muted" aria-live="polite">{t("providers.count", { n: list.length })}</p>
        {list.length === 0
          ? <Empty icon="search" title={t("providers.noneTitle")} text={t("providers.noneText")} />
          : <div className="grid two">{list.map((p) => <ProviderCard key={p.id} p={p} side={side} />)}</div>}
      </div>
    </SpaceLayout>
  );
}

export function ProviderPage({ side, slug }: { side: Side; slug: string }) {
  const { t, date, money } = useI18n();
  const { content, plan, actions, showToast } = useApp();
  usePlanReady();
  const { gate, prompt } = useAccountGate(side);
  const [pending, setPending] = useState<string | null>(null);
  const backTo = spacePath(side, "/providers");
  if (!content) return <SpaceLayout side={side} backTo={backTo}>{null}</SpaceLayout>;
  const p = content.provider(slug);
  if (!p || !p.enabled) return <SpaceLayout side={side} backTo={backTo}><Empty title={t("error.notFound")} /></SpaceLayout>;

  const media = content.media(p.id);
  const services = content.providerServiceIds(p.id);
  const records = content.priceRecordsOfProvider(p.id);
  const offers = content.offers(p.id);
  const saved = !!plan?.saved.some((s) => s.provider_id === p.id);
  const txt = (f: string) => content.text("provider", p.id, f);
  const greeting = t("providers.whatsappGreeting", { name: p.name });
  const contacts = [
    { k: "whatsapp", href: whatsappLink(p.whatsapp, greeting), icon: "whatsapp", label: t("contact.whatsapp") },
    { k: "phone", href: telLink(p.phone), icon: "phone", label: t("contact.call") },
    { k: "instagram", href: instagramLink(p.instagram), icon: "instagram", label: t("contact.instagram") },
    { k: "website", href: websiteLink(p.website), icon: "external", label: t("contact.website") },
  ].filter((c) => c.href);
  const open = (href: string) => { if (p.is_demo) setPending(href); else window.open(href, href.startsWith("tel:") ? "_self" : "_blank", "noopener"); };

  return (
    <SpaceLayout side={side} title={p.name} backTo={backTo}
      actions={<button className="icon-btn" aria-pressed={saved} aria-label={saved ? t("saved.remove") : t("saved.add")}
        onClick={() => gate(async () => { const now = await actions.toggleSaved(p.id); showToast(now ? t("saved.added") : t("saved.removed")); })}>
        <Icon name={saved ? "bookmark-fill" : "bookmark"} />
      </button>}>
      <div className="stack-lg">
        {media.length > 0 && (
          <div className="gallery" aria-label={t("providers.portfolio")}>
            {media.map((m) => (
              <figure key={m.id}>
                {m.kind === "video"
                  ? <video src={asset(m.url)} controls preload="metadata" playsInline />
                  : <img src={asset(m.url)} alt={content.text("provider_media", m.id, "caption") || p.name} loading="lazy" />}
                {content.text("provider_media", m.id, "caption") && <figcaption>{content.text("provider_media", m.id, "caption")}</figcaption>}
              </figure>
            ))}
          </div>
        )}

        <section className="stack-sm">
          <div className="row wrap" style={{ gap: 6 }}>
            {p.is_demo && <DemoBadge />}
            {p.verified && <span className="badge sage"><Icon name="shield" size={13} />{t("providers.verified")}</span>}
            {p.featured && <span className="badge blue">{t("providers.featured")}</span>}
          </div>
          <h1 className="h1 break">{p.name}</h1>
          <p className="small muted">{services.map((s) => content.serviceName(s)).join(" · ")}</p>
          {txt("description") && <p>{txt("description")}</p>}
        </section>

        {contacts.length > 0 && (
          <section className="grid two" aria-label={t("contact.title")}>
            {contacts.map((c, i) => (
              <button key={c.k} className={`btn ${i === 0 ? "" : "secondary"} block`} onClick={() => open(c.href!)}>
                <Icon name={c.icon} size={19} />{c.label}
              </button>
            ))}
          </section>
        )}

        {txt("services_text") && (
          <section className="stack-sm"><h2 className="h3">{t("providers.services")}</h2><p>{txt("services_text")}</p></section>
        )}

        <section className="stack-sm" aria-labelledby="pr-h">
          <h2 className="h3" id="pr-h">{t("providers.prices")}</h2>
          {records.length === 0 ? <p className="small muted">{t("providers.priceOnRequest")}</p> : (
            <div className="list">
              {records.map((r) => {
                const item = content.priceItem(r.price_item_id);
                const cond = content.text("price_record", r.id, "conditions");
                const extras = content.text("price_record", r.id, "extras");
                return (
                  <div key={r.id} className="list-item" style={{ alignItems: "flex-start", cursor: "default" }}>
                    <div className="body stack-sm" style={{ gap: 2 }}>
                      <span className="title">{item ? content.text("price_item", item.id) : "—"}</span>
                      {r.min_price !== null && r.max_price !== null
                        ? <span>{money(Number(r.min_price))} – {money(Number(r.max_price))} <span className="muted small">/ {item ? t(`unit.${item.unit}`) : ""}</span></span>
                        : <span className="muted">{t("estimate.requestQuote")}</span>}
                      {r.min_quantity && <span className="tiny muted">{t("providers.minOrder", { n: r.min_quantity, unit: item ? t(`unitPlural.${item.unit}`) : "" })}</span>}
                      {cond && <span className="tiny muted">{cond}</span>}
                      {extras && <span className="tiny muted">{t("providers.extras")}: {extras}</span>}
                      <span className="tiny muted">{t(`priceStatus.${r.price_status}`)} · {t("providers.updated", { date: date(r.updated_on) })}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <p className="tiny muted">{p.is_demo ? t("demo.prices") : t("estimate.disclaimer")}</p>
        </section>

        {offers.length > 0 && (
          <section className="stack-sm">
            <h2 className="h3">{t("providers.offers")}</h2>
            {offers.map((o) => (
              <div key={o.id} className="card blush stack-sm">
                <span style={{ fontWeight: 600 }}>{content.text("offer", o.id, "title")}</span>
                {content.text("offer", o.id, "description") && <span className="small">{content.text("offer", o.id, "description")}</span>}
                {(o.valid_from || o.valid_to) && <span className="tiny muted">{t("providers.validity", { from: date(o.valid_from), to: date(o.valid_to) })}</span>}
              </div>
            ))}
          </section>
        )}

        <section className="card soft stack-sm">
          <div className="row-top"><Icon name="pin" size={18} /><div className="grow">
            <div style={{ fontWeight: 600 }}>{content.placeName(p) || "—"}</div>
            {p.address && <div className="small muted">{p.address}</div>}
            {txt("service_area") && <div className="small muted">{t("providers.serviceArea")}: {txt("service_area")}</div>}
          </div></div>
          {txt("availability_notes") && <div className="row-top"><Icon name="calendar" size={18} /><div className="small grow">{txt("availability_notes")}<div className="tiny muted">{t("providers.availabilityManual")}</div></div></div>}
          <div className="tiny muted">{t("providers.lastUpdated", { date: date(p.last_updated_at) })}</div>
        </section>
      </div>
      {prompt}
      <ConfirmSheet open={!!pending} onClose={() => setPending(null)} title={t("demo.contactTitle")} message={t("demo.contactText")}
        confirmLabel={t("demo.contactContinue")} onConfirm={() => { if (pending) window.open(pending, pending.startsWith("tel:") ? "_self" : "_blank", "noopener"); }} />
    </SpaceLayout>
  );
}

export function SavedPage({ side }: { side: Side }) {
  const { t } = useI18n();
  const { content, plan, user } = useApp();
  usePlanReady();
  const { gate, prompt } = useAccountGate(side);
  if (!content) return <SpaceLayout side={side}>{null}</SpaceLayout>;
  const saved = (plan?.saved ?? []).map((s) => content.provider(s.provider_id)).filter((p): p is Provider => !!p && p.enabled);
  return (
    <SpaceLayout side={side} title={t("nav.saved")}>
      <div className="stack">
        <section className="hero"><h1 className="h1">{t("saved.title")}</h1><p className="muted">{t("saved.intro")}</p></section>
        {!user ? (
          <Empty icon="bookmark" title={t("saved.signInTitle")} text={t("saved.signInText")}
            action={<button className="btn" onClick={() => gate(() => undefined)}>{t("auth.signIn")}</button>} />
        ) : saved.length === 0 ? (
          <Empty icon="bookmark" title={t("saved.emptyTitle")} text={t("saved.emptyText")}
            action={<Link className="btn secondary" to={spacePath(side, "/providers")}>{t("providers.browse")}</Link>} />
        ) : <div className="grid two">{saved.map((p) => <ProviderCard key={p.id} p={p} side={side} />)}</div>}
      </div>
      {prompt}
    </SpaceLayout>
  );
}
