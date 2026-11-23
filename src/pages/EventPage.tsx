import { useState } from "react";
import { Icon } from "../components/Icon";
import { Empty, Money, Sheet, TextField, useAsync } from "../components/ui";
import { useI18n } from "../i18n/i18n";
import { Link, withQuery } from "../lib/router";
import { useApp } from "../state/app";
import { eventBudget, eventCategories, resolveEvent, spacePath, type CategoryVM, type EventVM } from "../state/viewmodel";
import type { Side } from "../data/types";
import { SpaceLayout, TINTS, useAccountGate, usePlanReady } from "./Space";

export function EventPage({ side, evRef }: { side: Side; evRef: string }) {
  const { t } = useI18n();
  const { content, plan, actions } = useApp();
  usePlanReady();
  const { gate, prompt, signedIn } = useAccountGate(side);
  const [customise, setCustomise] = useState(false);
  const ev = content ? resolveEvent(content, plan, evRef) : null;
  const back = spacePath(side);
  if (!content) return <SpaceLayout side={side} backTo={back}>{null}</SpaceLayout>;
  if (!ev) return <SpaceLayout side={side} backTo={back}><Empty title={t("error.notFound")} /></SpaceLayout>;

  const cats = eventCategories(content, plan, ev, side);
  const b = eventBudget(content, plan, ev, side);
  const base = spacePath(side, `/e/${ev.ref}`);

  return (
    <SpaceLayout side={side} title={ev.name} backTo={back}>
      <div className="stack-lg">
        <section className="hero">
          <span className="eyebrow">{t("events.event")}</span>
          <h1 className="h1">{ev.name}</h1>
          {ev.description && <p className="muted">{ev.description}</p>}
        </section>

        {/* This event's own budget */}
        <section className="card blue stack" aria-labelledby="eb-h">
          <div className="row between">
            <h2 className="h3" id="eb-h">{t("budget.eventBudget")}</h2>
            <span className="tiny muted">{t(`side.${side}`)}</span>
          </div>
          {b.hasBudget && b.total > 0 ? (
            <div className="kpis">
              <div className="kpi"><span className="v"><Money value={b.total} /></span><span className="l">{t("budget.total")}</span></div>
              <div className="kpi"><span className="v"><Money value={b.unallocated} /></span><span className="l">{t("budget.unallocated")}</span></div>
              <div className="kpi"><span className="v"><Money value={b.allocated} /></span><span className="l">{t("budget.allocated")}</span></div>
              <div className="kpi"><span className="v"><Money value={b.spent} /></span><span className="l">{t("budget.spent")}</span></div>
            </div>
          ) : <p className="small">{t("budget.noneYet")}</p>}
          {b.overAllocated && <div className="notice warn"><Icon name="alert" size={18} />{t("budget.warnOverAllocated")}</div>}
          {signedIn
            ? <Link className="btn secondary" to={`${base}/budget`}>{b.hasBudget ? t("budget.manage") : t("budget.setForEvent")}</Link>
            : <button className="btn secondary" onClick={() => gate(() => undefined)}>{t("budget.setForEvent")}</button>}
        </section>

        <section className="stack" aria-labelledby="cats-h">
          <div className="section-title">
            <h2 className="h3" id="cats-h">{t("categories.title")}</h2>
            <button className="link-btn" onClick={() => gate(() => setCustomise(true))}>{t("categories.customise")}</button>
          </div>
          {cats.length === 0
            ? <Empty icon="list" title={t("categories.emptyTitle")} text={t("categories.emptyText")}
                action={<button className="btn secondary" onClick={() => gate(() => setCustomise(true))}>{t("categories.add")}</button>} />
            : (
              <div className="list">
                {cats.map((c, i) => <CategoryRow key={c.ref} c={c} to={`${base}/c/${c.ref}`} tint={TINTS[(i + 1) % TINTS.length]} />)}
              </div>
            )}
        </section>

        <section className="stack">
          <Link className="card card-link row" to={withQuery(spacePath(side, "/providers"), { ev: ev.event?.id })}>
            <span className="tile-ico sage"><Icon name="search" /></span>
            <div className="grow"><div className="h3">{t("providers.forEvent")}</div><div className="small muted">{t("providers.forEventSub")}</div></div>
            <Icon name="chevron" className="chev flip-rtl" size={20} />
          </Link>
        </section>

        {signedIn && ev.pe && <NotesCard initial={ev.pe.notes ?? ""} onSave={(notes) => actions.updateEvent(ev.pe!.id, { notes })} />}
      </div>
      {prompt}
      {plan && <CustomiseCategories open={customise} onClose={() => setCustomise(false)} ev={ev} side={side} />}
    </SpaceLayout>
  );
}

function CategoryRow({ c, to, tint }: { c: CategoryVM; to: string; tint: string }) {
  const { t } = useI18n();
  const { content, plan } = useApp();
  const items = c.category ? content!.itemsOf(c.category.id).filter((i) => i.kind === "checklist") : [];
  const done = c.pc ? plan?.tasks.filter((x) => x.plan_category_id === c.pc!.id && x.done).length ?? 0 : 0;
  const custom = c.pc ? plan?.tasks.filter((x) => x.plan_category_id === c.pc!.id && !x.content_item_id).length ?? 0 : 0;
  const total = items.length + custom;
  return (
    <Link to={to} className="list-item">
      <span className={`tile-ico ${tint}`}><Icon name={c.icon} /></span>
      <div className="body">
        <div className="title">{c.name}</div>
        <div className="sub">
          {total > 0 ? t("checklist.progress", { done, total }) : c.custom ? t("categories.yours") : c.description}
        </div>
      </div>
      <Icon name="chevron" className="chev flip-rtl" size={20} />
    </Link>
  );
}

export function NotesCard({ initial, onSave }: { initial: string; onSave: (v: string) => Promise<void> }) {
  const { t } = useI18n();
  const { showToast } = useApp();
  const [v, setV] = useState(initial);
  const { busy, run } = useAsync();
  return (
    <section className="card soft stack">
      <TextField label={t("notes.title")} value={v} onChange={setV} multiline placeholder={t("notes.placeholder")} />
      <div className="form-actions">
        <button className="btn small secondary" disabled={busy || v === initial}
          onClick={() => run(async () => { await onSave(v); showToast(t("common.saved")); })}>{t("common.save")}</button>
      </div>
    </section>
  );
}

function CustomiseCategories({ open, onClose, ev, side }: { open: boolean; onClose: () => void; ev: EventVM; side: Side }) {
  const { t } = useI18n();
  const { content, plan, actions, showToast } = useApp();
  const [name, setName] = useState("");
  const [renaming, setRenaming] = useState<{ vm: CategoryVM; value: string } | null>(null);
  const { busy, run } = useAsync();
  if (!plan || !ev.pe) return null;
  const all = eventCategories(content!, plan, ev, side, { all: true });
  const ensure = (vm: CategoryVM) => vm.pc ?? actions.ensureCategory(ev.pe!.id, vm.category!.id, side);

  const move = (i: number, dir: -1 | 1) => run(async () => {
    const j = i + dir;
    if (j < 0 || j >= all.length) return;
    const order = [...all];
    [order[i], order[j]] = [order[j], order[i]];
    for (let k = 0; k < order.length; k++) {
      const pc = await ensure(order[k]);
      if (pc.sort_order !== (k + 1) * 10) await actions.updateCategory(pc.id, { sort_order: (k + 1) * 10 });
    }
  });

  return (
    <Sheet open={open} onClose={onClose} title={t("categories.customise")}>
      <div className="stack">
        <p className="small muted">{t("categories.customiseIntro")}</p>
        <div className="list">
          {all.map((c, i) => (
            <div key={c.ref} className={`admin-row${c.enabled ? "" : " disabled"}`}>
              <div className="stack-sm" style={{ gap: 0 }}>
                <button className="icon-btn sm" disabled={busy || i === 0} aria-label={t("common.moveUp")} onClick={() => move(i, -1)}><Icon name="up" size={18} /></button>
                <button className="icon-btn sm" disabled={busy || i === all.length - 1} aria-label={t("common.moveDown")} onClick={() => move(i, 1)}><Icon name="down" size={18} /></button>
              </div>
              <div className="body"><div className="title">{c.name}</div>{c.custom && <div className="tiny muted">{t("categories.yours")}</div>}</div>
              <label className="check" style={{ minHeight: 36 }}>
                <input type="checkbox" checked={c.enabled} aria-label={t("common.visible")}
                  onChange={() => run(async () => { const pc = await ensure(c); await actions.updateCategory(pc.id, { enabled: !c.enabled }); })} />
              </label>
              <button className="icon-btn sm" aria-label={t("common.rename")} onClick={() => setRenaming({ vm: c, value: c.name })}><Icon name="edit" size={18} /></button>
              {c.custom && <button className="icon-btn sm" aria-label={t("common.delete")} onClick={() => run(() => actions.deleteCustomCategory(c.pc!.id))}><Icon name="trash" size={18} /></button>}
            </div>
          ))}
        </div>
        {renaming && (
          <form className="card stack" onSubmit={(e) => { e.preventDefault(); run(async () => {
            const pc = await ensure(renaming.vm);
            const orig = renaming.vm.category ? content!.categoryName(renaming.vm.category) : "";
            const v = renaming.value.trim();
            await actions.updateCategory(pc.id, { custom_name: v && v !== orig ? v : null });
            setRenaming(null); showToast(t("common.saved"));
          }); }}>
            <TextField label={t("common.rename")} value={renaming.value} onChange={(value) => setRenaming({ ...renaming, value })} hint={renaming.vm.category ? t("events.renameHint") : undefined} />
            <div className="form-actions">
              <button type="button" className="btn small secondary" onClick={() => setRenaming(null)}>{t("common.cancel")}</button>
              <button className="btn small" disabled={busy}>{t("common.save")}</button>
            </div>
          </form>
        )}
        <form className="row" onSubmit={(e) => { e.preventDefault(); if (name.trim()) run(async () => { await actions.addCustomCategory(ev.pe!.id, name.trim(), side); setName(""); }); }}>
          <input className="input grow" value={name} onChange={(e) => setName(e.target.value)} placeholder={t("categories.newPlaceholder")} aria-label={t("categories.add")} />
          <button className="btn" disabled={busy || !name.trim()} aria-label={t("categories.add")}><Icon name="plus" size={18} /></button>
        </form>
      </div>
    </Sheet>
  );
}
