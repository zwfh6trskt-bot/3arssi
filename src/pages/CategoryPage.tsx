import { asset } from "../lib/base";
import { useState } from "react";
import { Icon } from "../components/Icon";
import { AmountField, Empty, Money, SelectField, Sheet, StatusBadge, TextField, useAsync } from "../components/ui";
import { parseAmount } from "../domain/budget";
import { combine, estimate, QUANTITY_UNITS } from "../domain/estimate";
import { useI18n } from "../i18n/i18n";
import { Link, withQuery } from "../lib/router";
import { useApp } from "../state/app";
import type { Content } from "../state/content";
import { resolveCategory, resolveEvent, spacePath, type CategoryVM, type EventVM } from "../state/viewmodel";
import type { ContentItem, PlanCategory, Side } from "../data/types";
import { NotesCard } from "./EventPage";
import { ProviderCard } from "./Providers";
import { SpaceLayout, useAccountGate, usePlanReady } from "./Space";

const GUIDE_KINDS = ["suggestion", "tip", "tradition", "note", "image"] as const;

export function CategoryPage({ side, evRef, catRef }: { side: Side; evRef: string; catRef: string }) {
  const { t } = useI18n();
  const { content, plan, actions } = useApp();
  usePlanReady();
  const { gate, prompt, signedIn } = useAccountGate(side);
  const ev = content ? resolveEvent(content, plan, evRef) : null;
  const cat = content && ev ? resolveCategory(content, plan, ev, side, catRef) : null;
  const evPath = spacePath(side, `/e/${evRef}`);
  if (!content) return <SpaceLayout side={side} backTo={evPath}>{null}</SpaceLayout>;
  if (!ev || !cat) return <SpaceLayout side={side} backTo={evPath}><Empty title={t("error.notFound")} /></SpaceLayout>;

  const items = cat.category ? content.itemsOf(cat.category.id) : [];
  const checklist = items.filter((i) => i.kind === "checklist");
  const guide = items.filter((i) => (GUIDE_KINDS as readonly string[]).includes(i.kind));
  const services = cat.category ? content.serviceTypesOfCategory(cat.category.id) : [];
  const providers = services.length ? content.providers({ serviceTypeIds: services.map((s) => s.id) }).slice(0, 4) : [];
  const isTop = !cat.category?.parent_id;
  const ensurePc = async () => cat.pc ?? (await actions.ensureCategory(ev.pe!.id, cat.category!.id, side));

  return (
    <SpaceLayout side={side} title={cat.name} backTo={evPath}>
      <div className="stack-lg">
        <section className="hero">
          <span className="eyebrow">{ev.name}</span>
          <h1 className="h1">{cat.name}</h1>
          {cat.description && <p className="muted">{cat.description}</p>}
        </section>

        {cat.subs.filter((s) => s.enabled).length > 0 && (
          <section className="stack" aria-labelledby="subs-h">
            <h2 className="h3" id="subs-h">{t("categories.subcategories")}</h2>
            <div className="list">
              {cat.subs.filter((s) => s.enabled).map((s) => (
                <Link key={s.ref} className="list-item" to={spacePath(side, `/e/${evRef}/c/${s.ref}`)}>
                  <span className="tile-ico sand"><Icon name={s.icon} /></span>
                  <div className="body"><div className="title">{s.name}</div><div className="sub">{s.description}</div></div>
                  <Icon name="chevron" className="chev flip-rtl" size={20} />
                </Link>
              ))}
            </div>
          </section>
        )}

        <Checklist items={checklist} cat={cat} ensurePc={ensurePc} gate={gate} />

        {guide.length > 0 && (
          <section className="stack" aria-labelledby="guide-h">
            <h2 className="h3" id="guide-h">{t("guide.title")}</h2>
            <div className="stack-sm">{guide.map((i) => <GuideItem key={i.id} item={i} c={content} />)}</div>
          </section>
        )}

        {isTop && (
          <CategoryBudget ev={ev} cat={cat} side={side} gate={gate} signedIn={signedIn} ensurePc={ensurePc} />
        )}

        {services.length > 0 && (
          <section className="stack" aria-labelledby="prov-h">
            <div className="section-title">
              <h2 className="h3" id="prov-h">{t("providers.relevant")}</h2>
              <Link className="link-btn" to={withQuery(spacePath(side, "/providers"), { cat: cat.category!.id, ev: ev.event?.id })}>{t("common.seeAll")}</Link>
            </div>
            {providers.length
              ? <div className="grid two">{providers.map((p) => <ProviderCard key={p.id} p={p} side={side} />)}</div>
              : <p className="small muted">{t("providers.noneForCategory")}</p>}
          </section>
        )}

        {signedIn && ev.pe && (cat.pc || cat.category) && (
          <NotesCard initial={cat.pc?.notes ?? ""} onSave={async (notes) => { const pc = await ensurePc(); await actions.updateCategory(pc.id, { notes }); }} />
        )}
      </div>
      {prompt}
    </SpaceLayout>
  );
}

function GuideItem({ item, c }: { item: ContentItem; c: Content }) {
  const { t } = useI18n();
  const title = c.text("content_item", item.id, "title");
  const body = c.text("content_item", item.id, "body");
  const region = item.wilaya_id ? c.text("wilaya", item.wilaya_id) : "";
  if (item.kind === "image" && item.image_url) {
    return (
      <figure className="card flat" style={{ margin: 0, padding: 8 }}>
        <img src={asset(item.image_url)} alt={title || ""} style={{ width: "100%", borderRadius: 12, aspectRatio: "4/3", objectFit: "cover" }} loading="lazy" />
        {(title || body) && <figcaption className="small muted" style={{ padding: "8px 4px 2px" }}>{title}{body && ` — ${body}`}</figcaption>}
      </figure>
    );
  }
  const tint = item.kind === "tip" ? "blue" : item.kind === "tradition" ? "sand" : "sage";
  return (
    <div className={`card ${tint} row-top`} style={{ padding: "12px 14px" }}>
      <Icon name={item.kind === "tip" ? "info" : item.kind === "tradition" ? "pin" : "star"} size={18} style={{ marginTop: 3, flex: "none" }} />
      <div className="grow stack-sm" style={{ gap: 2 }}>
        <div className="row wrap" style={{ gap: 6 }}>
          <span className="tiny" style={{ fontWeight: 600 }}>{t(`kind.${item.kind}`)}</span>
          {item.importance === "regional" && <span className="badge outline" style={{ height: 20 }}>{region ? t("importance.regionalIn", { place: region }) : t("importance.regional")}</span>}
        </div>
        <p style={{ fontWeight: 500 }}>{title}</p>
        {body && <p className="small">{body}</p>}
      </div>
    </div>
  );
}

function Checklist({ items, cat, ensurePc, gate }: {
  items: ContentItem[]; cat: CategoryVM; ensurePc: () => Promise<PlanCategory>; gate: (fn: () => void) => void;
}) {
  const { t } = useI18n();
  const { content, plan, actions } = useApp();
  const [label, setLabel] = useState("");
  const { busy, run } = useAsync();
  const custom = cat.pc ? plan?.tasks.filter((x) => x.plan_category_id === cat.pc!.id && !x.content_item_id) ?? [] : [];
  const doneOf = (id: string) => !!(cat.pc && plan?.tasks.find((x) => x.plan_category_id === cat.pc!.id && x.content_item_id === id)?.done);
  const total = items.length + custom.length;
  const done = items.filter((i) => doneOf(i.id)).length + custom.filter((x) => x.done).length;

  return (
    <section className="stack" aria-labelledby="ck-h">
      <div className="section-title">
        <h2 className="h3" id="ck-h">{t("checklist.title")}</h2>
        {total > 0 && <span className="small muted">{t("checklist.progress", { done, total })}</span>}
      </div>
      {total > 0 && (
        <div className="list">
          {items.map((i) => {
            const d = doneOf(i.id);
            const title = content!.text("content_item", i.id, "title");
            const body = content!.text("content_item", i.id, "body");
            return (
              <div key={i.id} className={`task${d ? " done" : ""}`}>
                <button className="tick" role="checkbox" aria-checked={d} aria-label={title} disabled={busy}
                  onClick={() => gate(() => run(async () => { const pc = await ensurePc(); await actions.toggleItem(pc.id, i.id); }))}>
                  {d && <Icon name="check" size={16} />}
                </button>
                <div className="grow">
                  <div className="task-title">{title}</div>
                  {body && <div className="small muted">{body}</div>}
                  {i.importance !== "optional" && (
                    <span className={`badge ${i.importance === "essential" ? "blue" : "outline"}`} style={{ height: 20, marginTop: 6 }}>{t(`importance.${i.importance}`)}</span>
                  )}
                </div>
              </div>
            );
          })}
          {custom.map((x) => (
            <div key={x.id} className={`task${x.done ? " done" : ""}`}>
              <button className="tick" role="checkbox" aria-checked={x.done} aria-label={x.label ?? ""} onClick={() => run(() => actions.toggleTask(x))}>
                {x.done && <Icon name="check" size={16} />}
              </button>
              <div className="grow task-title">{x.label}</div>
              <button className="icon-btn sm" aria-label={t("common.delete")} onClick={() => run(() => actions.deleteTask(x.id))}><Icon name="close" size={16} /></button>
            </div>
          ))}
        </div>
      )}
      {cat.pc || cat.category ? (
        <form className="row" onSubmit={(e) => { e.preventDefault(); if (label.trim()) gate(() => run(async () => { const pc = await ensurePc(); await actions.addTask(pc.id, label.trim()); setLabel(""); })); }}>
          <input className="input grow" value={label} onChange={(e) => setLabel(e.target.value)} placeholder={t("checklist.addPlaceholder")} aria-label={t("checklist.add")} />
          <button className="btn secondary" disabled={busy || !label.trim()} aria-label={t("checklist.add")}><Icon name="plus" size={18} /></button>
        </form>
      ) : null}
    </section>
  );
}

// ------------------------------------------------------------ category budget + estimate
function CategoryBudget({ ev, cat, side, gate, signedIn, ensurePc }: {
  ev: EventVM; cat: CategoryVM; side: Side; gate: (fn: () => void) => void; signedIn: boolean; ensurePc: () => Promise<PlanCategory>;
}) {
  const { t, money } = useI18n();
  const { content, plan, actions } = useApp();
  const [editing, setEditing] = useState(false);
  const [estOpen, setEstOpen] = useState(false);
  const pcId = cat.pc?.id;
  const allocated = pcId ? Number(plan?.allocations.find((a) => a.plan_category_id === pcId && a.side === side)?.amount ?? 0) : 0;
  const spent = pcId ? plan?.expenses.filter((e) => e.plan_category_id === pcId && e.side === side).reduce((s, e) => s + Number(e.amount), 0) ?? 0 : 0;
  const lines = pcId ? plan?.estimates.filter((x) => x.plan_category_id === pcId && x.side === side) ?? [] : [];
  const results = lines.map((l) => {
    const item = content!.priceItem(l.price_item_id);
    return { l, item, e: item ? estimate(item, content!.snap.price_records, Number(l.quantity), allocated || null, l.wilaya_id) : null };
  });
  const total = combine(results.map((r) => r.e!).filter(Boolean), allocated || null);

  return (
    <section className="card stack" aria-labelledby="cb-h">
      <div className="row between">
        <h2 className="h3" id="cb-h">{t("budget.categoryBudget")}</h2>
        {signedIn && ev.pe && <button className="link-btn" onClick={() => setEditing(true)}>{allocated ? t("common.edit") : t("budget.allocate")}</button>}
      </div>
      <div className="kpis">
        <div className="kpi"><span className="v"><Money value={allocated} /></span><span className="l">{t("budget.allocated")}</span></div>
        <div className="kpi"><span className="v"><Money value={allocated - spent} /></span><span className="l">{t("budget.remaining")}</span></div>
      </div>
      {spent > allocated && allocated > 0 && <div className="notice warn"><Icon name="alert" size={18} />{t("budget.warnOverspent")}</div>}

      <hr className="divider" />
      <div className="row between">
        <h3 className="h3" style={{ fontSize: 15.5 }}>{t("estimate.title")}</h3>
        <button className="btn small secondary" onClick={() => gate(() => setEstOpen(true))}><Icon name="plus" size={16} />{t("estimate.add")}</button>
      </div>
      {results.length === 0 ? <p className="small muted">{t("estimate.intro")}</p> : (
        <div className="stack-sm">
          {results.map(({ l, item, e }) => (
            <div key={l.id} className="row-top" style={{ padding: "8px 0", borderBottom: "1px solid var(--line)" }}>
              <div className="grow stack-sm" style={{ gap: 2 }}>
                <span style={{ fontWeight: 600 }}>{item ? content!.text("price_item", item.id) : "—"}</span>
                <span className="small muted">
                  <span className="num">{l.quantity}</span> × {item ? t(`unit.${item.unit}`) : ""}
                  {e?.range && <> · <Money value={e.range.min} />–<Money value={e.range.max} /></>}
                </span>
                {e && e.minTotal !== null
                  ? <span className="small"><Money value={e.minTotal} /> – <Money value={e.maxTotal} /></span>
                  : <span className="small muted">{t("estimate.requestQuote")}</span>}
                {e?.belowMinQuantity && <span className="tiny muted">{t("estimate.minQty", { n: e.range!.minQuantity! })}</span>}
              </div>
              <div className="stack-sm" style={{ alignItems: "flex-end" }}>
                {e && <StatusBadge status={e.status} />}
                <button className="icon-btn sm" aria-label={t("common.delete")} onClick={() => actions.deleteEstimate(l.id)}><Icon name="trash" size={16} /></button>
              </div>
            </div>
          ))}
          {results.length > 1 && total.minTotal !== null && (
            <div className="row between wrap">
              <span className="small">{t("estimate.total")}: <Money value={total.minTotal} /> – <Money value={total.maxTotal} /></span>
              <StatusBadge status={total.status} />
            </div>
          )}
          {total.partial && <p className="tiny muted">{t("estimate.partial")}</p>}
        </div>
      )}
      <p className="tiny muted">{t("estimate.disclaimer")}</p>

      <AllocationSheet open={editing} onClose={() => setEditing(false)} current={allocated}
        title={cat.name}
        onSave={async (amount) => { const pc = await ensurePc(); await actions.setAllocation(pc.id, side, amount); }}
        context={(() => {
          const b = plan?.budgets.find((x) => x.plan_event_id === ev.pe?.id && x.side === side);
          return b ? t("budget.eventTotalIs", { amount: money(Number(b.total_amount)) }) : t("budget.noEventBudget");
        })()} />
      <EstimateSheet open={estOpen} onClose={() => setEstOpen(false)} categoryId={cat.category?.id ?? null} budget={allocated || null}
        onSave={async (priceItemId, quantity, wilayaId) => {
          const pc = await ensurePc();
          await actions.addEstimate({ plan_category_id: pc.id, side, price_item_id: priceItemId, quantity, wilaya_id: wilayaId });
        }} />
    </section>
  );
}

export function AllocationSheet({ open, onClose, current, onSave, title, context }: {
  open: boolean; onClose: () => void; current: number; onSave: (n: number) => Promise<void>; title: string; context?: string;
}) {
  const { t } = useI18n();
  const { showToast } = useApp();
  const [v, setV] = useState(current ? String(current) : "");
  const { busy, run } = useAsync();
  const n = parseAmount(v);
  return (
    <Sheet open={open} onClose={onClose} title={t("budget.allocateTo", { name: title })}>
      <form className="stack" onSubmit={async (e) => { e.preventDefault(); if (n === null) return; if (await run(() => onSave(n))) { showToast(t("common.saved")); onClose(); } }}>
        <AmountField label={t("budget.allocated")} value={v} onChange={setV} hint={context} />
        <p className="tiny muted">{t("budget.allocationNotSpending")}</p>
        <div className="form-actions">
          <button type="button" className="btn secondary" onClick={onClose}>{t("common.cancel")}</button>
          <button className="btn" disabled={busy || n === null}>{t("common.save")}</button>
        </div>
      </form>
    </Sheet>
  );
}

function EstimateSheet({ open, onClose, categoryId, budget, onSave }: {
  open: boolean; onClose: () => void; categoryId: string | null; budget: number | null;
  onSave: (priceItemId: string, quantity: number, wilayaId: string | null) => Promise<void>;
}) {
  const { t, money, date: dateFmt } = useI18n();
  const { content } = useApp();
  const relevant = content!.priceItemsForCategory(categoryId);
  const items = relevant.length ? relevant : content!.allPriceItems();
  const [itemId, setItemId] = useState(items[0]?.id ?? "");
  const [qty, setQty] = useState("");
  const [wilaya, setWilaya] = useState(content!.wilayas()[0]?.id ?? "");
  const { busy, run } = useAsync();
  const item = content!.priceItem(itemId);
  const q = Number(qty.replace(",", "."));
  const res = item ? estimate(item, content!.snap.price_records, q, budget, wilaya || null) : null;
  const canQty = item ? QUANTITY_UNITS.includes(item.unit) : false;

  return (
    <Sheet open={open} onClose={onClose} title={t("estimate.title")}>
      {items.length === 0 ? <Empty icon="tag" title={t("estimate.noItems")} text={t("estimate.requestQuote")} /> : (
        <form className="stack" onSubmit={async (e) => { e.preventDefault(); if (!item || !(q > 0)) return; if (await run(() => onSave(item.id, q, wilaya || null))) onClose(); }}>
          <SelectField label={t("estimate.item")} value={itemId} onChange={setItemId}
            options={items.map((i) => ({ value: i.id, label: `${content!.text("price_item", i.id)} · ${t(`unit.${i.unit}`)}` }))} />
          {canQty && (
            <div className="field">
              <label htmlFor="est-q">{t("estimate.quantity")} ({t(`unitPlural.${item!.unit}`)})</label>
              <input id="est-q" className="input num" inputMode="decimal" value={qty} onChange={(e) => setQty(e.target.value)} dir="ltr" style={{ textAlign: "start" }} />
            </div>
          )}
          <SelectField label={t("estimate.wilaya")} value={wilaya} onChange={setWilaya}
            options={[{ value: "", label: t("common.any") }, ...content!.wilayas().map((w) => ({ value: w.id, label: content!.text("wilaya", w.id) }))]} />

          <div className="card soft stack-sm" aria-live="polite">
            {!res?.range ? (
              <><StatusBadge status="unavailable" /><p className="small">{t("estimate.noData")}</p></>
            ) : (
              <>
                <p className="small">{t("estimate.rangeLine", { min: money(res.range.min), max: money(res.range.max), unit: t(`unit.${res.range.unit}`) })}</p>
                <p className="tiny muted">
                  {t("estimate.basedOn", { n: res.range.records.length })} · {t("estimate.updated", { date: dateFmt(res.range.lastUpdated) })}
                  {!res.range.regionMatched && wilaya && <> · {t("estimate.otherRegions")}</>}
                </p>
                {res.minTotal !== null && (
                  <>
                    <p style={{ fontWeight: 600 }}><span className="num">{q}</span> × {money(res.range.min)} = {money(res.minTotal)}<br />
                      <span className="num">{q}</span> × {money(res.range.max)} = {money(res.maxTotal)}</p>
                    <div><StatusBadge status={res.status} /></div>
                    {res.status === "no_budget" && <p className="tiny muted">{t("estimate.setBudgetHint")}</p>}
                  </>
                )}
                {res.belowMinQuantity && <p className="tiny muted">{t("estimate.minQty", { n: res.range.minQuantity! })}</p>}
                {res.range.records.map((r) => {
                  const cond = content!.text("price_record", r.id, "conditions");
                  return cond ? <p key={r.id} className="tiny muted">· {cond}</p> : null;
                })}
                {res.range.records.some((r) => r.is_demo) && <p className="tiny muted">{t("demo.prices")}</p>}
              </>
            )}
          </div>
          <p className="tiny muted">{t("estimate.disclaimer")}</p>
          <div className="form-actions">
            <button type="button" className="btn secondary" onClick={onClose}>{t("common.cancel")}</button>
            <button className="btn" disabled={busy || !item || (canQty && !(q > 0)) || !canQty}>{t("estimate.save")}</button>
          </div>
        </form>
      )}
    </Sheet>
  );
}
