import { useEffect, useState, type ReactNode } from "react";
import { Icon } from "../components/Icon";
import { BottomNav, ConfirmSheet, Empty, Loading, Segmented, Sheet, SignInPrompt, TextField, TopBar, useAsync } from "../components/ui";
import { useI18n } from "../i18n/i18n";
import { Link } from "../lib/router";
import { useApp } from "../state/app";
import { allPlanEvents, eventCategories, spaceEvents, spacePath, type EventVM } from "../state/viewmodel";
import type { Side, SideScope } from "../data/types";

export const TINTS = ["blue", "sage", "sand", "blue", "sage", "blush"];

/** Page frame for every screen inside a planning space. */
export function SpaceLayout({ side, title, backTo, home, actions, wide, children }: {
  side: Side; title?: string; backTo?: string; home?: boolean; actions?: ReactNode; wide?: boolean; children: ReactNode;
}) {
  const { ready } = useApp();
  return (
    <>
      <TopBar side={side} title={title} backTo={backTo} home={home} actions={actions} />
      <main className={`page${wide ? " wide" : ""}`} id="main">{ready ? children : <Loading />}</main>
      <BottomNav side={side} />
    </>
  );
}

/** Wraps a personal action: runs it if signed in, otherwise opens the sign-in sheet. */
export function useAccountGate(side: Side) {
  const { user } = useApp();
  const [open, setOpen] = useState(false);
  const gate = (fn: () => void) => { if (user) fn(); else setOpen(true); };
  return { gate, prompt: <SignInPrompt side={side} open={open} onClose={() => setOpen(false)} />, signedIn: !!user };
}

/** Ensures a signed-in user's plan exists and includes all suggested events. */
export function usePlanReady() {
  const { user, plan, content, actions, planLoading } = useApp();
  useEffect(() => {
    if (user && content && !planLoading) actions.ensurePlan().catch(console.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, content?.snap, planLoading, plan?.plan.id]);
}

export function SpaceHome({ side }: { side: Side }) {
  const { t } = useI18n();
  const { content, plan, user } = useApp();
  usePlanReady();
  if (!content) return <SpaceLayout side={side} home><Loading /></SpaceLayout>;
  const events = spaceEvents(content, plan, side);
  return (
    <SpaceLayout side={side} home>
      <div className="stack-lg">
        <section className="hero">
          <span className="eyebrow">{t(`space.eyebrow.${side}`)}</span>
          <h1 className="h1">{t("space.title")}</h1>
          <p className="muted">{t("space.intro")}</p>
        </section>

        <section className="stack" aria-labelledby="events-h">
          <div className="section-title">
            <h2 className="h3" id="events-h">{t("events.title")}</h2>
            <Link to={spacePath(side, "/events")} className="link-btn">{t("events.personalise")}</Link>
          </div>
          {events.length === 0 ? (
            <Empty icon="calendar" title={t("events.emptyTitle")} text={t("events.emptyText")}
              action={<Link className="btn secondary" to={spacePath(side, "/events")}>{t("events.personalise")}</Link>} />
          ) : (
            <div className="grid two">
              {events.map((ev, i) => <EventCard key={ev.ref} ev={ev} side={side} tint={TINTS[i % TINTS.length]} />)}
            </div>
          )}
          {!user && <p className="tiny muted">{t("space.visitorHint")}</p>}
        </section>
      </div>
    </SpaceLayout>
  );
}

function EventCard({ ev, side, tint }: { ev: EventVM; side: Side; tint: string }) {
  const { t } = useI18n();
  const { content, plan } = useApp();
  const cats = eventCategories(content!, plan, ev, side);
  const pcIds = new Set(cats.map((c) => c.pc?.id).filter(Boolean));
  const done = plan?.tasks.filter((x) => pcIds.has(x.plan_category_id) && x.done).length ?? 0;
  const hasBudget = !!plan?.budgets.find((b) => b.plan_event_id === ev.pe?.id && b.side === side && Number(b.total_amount) > 0);
  return (
    <Link to={spacePath(side, `/e/${ev.ref}`)} className="card card-link event-card">
      <span className={`tile-ico lg ${tint}`}><Icon name={ev.icon} size={26} /></span>
      <div className="grow stack-sm" style={{ gap: 4 }}>
        <div className="title">{ev.name}</div>
        <div className="row wrap" style={{ gap: 6 }}>
          <span className="tiny muted">{t("events.categoriesCount", { n: cats.length })}</span>
          {done > 0 && <span className="tiny muted">· {t("events.doneCount", { n: done })}</span>}
          {hasBudget && <span className="badge sage" style={{ height: 20, fontSize: 11.5 }}>{t("budget.set")}</span>}
          {ev.side === "both" && <span className="badge outline" style={{ height: 20, fontSize: 11.5 }}>{t("sideScope.both")}</span>}
        </div>
      </div>
      <Icon name="chevron" className="chev flip-rtl" size={20} />
    </Link>
  );
}

// ---------------------------------------------------------------- personalise events
export function ManageEvents({ side }: { side: Side }) {
  const { t } = useI18n();
  const { content, plan, actions, user, showToast } = useApp();
  usePlanReady();
  const { gate, prompt } = useAccountGate(side);
  const [edit, setEdit] = useState<EventVM | null>(null);
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<EventVM | null>(null);

  if (!content) return <SpaceLayout side={side} backTo={spacePath(side)}><Loading /></SpaceLayout>;

  if (!user || !plan) {
    return (
      <SpaceLayout side={side} title={t("events.personalise")} backTo={spacePath(side)}>
        <Empty icon="edit" title={t("events.personaliseTitle")} text={t("events.personaliseSignIn")}
          action={<button className="btn" onClick={() => gate(() => undefined)}>{t("auth.signIn")}</button>} />
        {prompt}
      </SpaceLayout>
    );
  }

  const all = allPlanEvents(content, plan);
  const active = all.filter((e) => !e.removed);
  const removed = all.filter((e) => e.removed);
  const move = async (i: number, dir: -1 | 1) => {
    const list = active.map((e) => e.pe!);
    const j = i + dir;
    if (j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    await actions.reorderEvents(list);
  };

  return (
    <SpaceLayout side={side} title={t("events.personalise")} backTo={spacePath(side)}>
      <div className="stack-lg">
        <p className="muted">{t("events.personaliseIntro")}</p>
        <div className="list" role="list">
          {active.map((ev, i) => (
            <div key={ev.pe!.id} className={`admin-row${ev.enabled ? "" : " disabled"}`} role="listitem">
              <div className="stack-sm" style={{ gap: 0 }}>
                <button className="icon-btn sm" aria-label={t("common.moveUp")} disabled={i === 0} onClick={() => move(i, -1)}><Icon name="up" size={18} /></button>
                <button className="icon-btn sm" aria-label={t("common.moveDown")} disabled={i === active.length - 1} onClick={() => move(i, 1)}><Icon name="down" size={18} /></button>
              </div>
              <div className="body">
                <div className="title">{ev.name}</div>
                <div className="tiny muted">{t(`sideScope.${ev.side}`)}{!ev.enabled && ` · ${t("common.disabled")}`}{!ev.event && ` · ${t("events.custom")}`}</div>
              </div>
              <label className="check" style={{ minHeight: 36 }}>
                <input type="checkbox" checked={ev.enabled} aria-label={t("common.enabled")}
                  onChange={() => actions.updateEvent(ev.pe!.id, { enabled: !ev.enabled })} />
              </label>
              <button className="icon-btn sm" aria-label={t("common.edit")} onClick={() => setEdit(ev)}><Icon name="edit" size={18} /></button>
              <button className="icon-btn sm" aria-label={t("common.remove")} onClick={() => setRemoving(ev)}><Icon name="trash" size={18} /></button>
            </div>
          ))}
        </div>
        <button className="btn secondary" onClick={() => setAdding(true)}><Icon name="plus" size={18} />{t("events.add")}</button>

        {removed.length > 0 && (
          <section className="stack">
            <h2 className="h3">{t("events.removed")}</h2>
            <div className="list">
              {removed.map((ev) => (
                <div key={ev.pe!.id} className="admin-row">
                  <div className="body"><div className="title">{ev.name}</div></div>
                  <button className="btn small secondary" onClick={() => actions.restoreEvent(ev.pe!)}>{t("common.restore")}</button>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      <EventEditor key={edit?.pe?.id ?? "new"} open={!!edit || adding} ev={edit} defaultSide={side}
        onClose={() => { setEdit(null); setAdding(false); }}
        onSave={async (name, scope) => {
          if (edit) await actions.updateEvent(edit.pe!.id, { custom_name: name.trim() && name.trim() !== content.eventName(edit.event) ? name.trim() : null, side: scope });
          else await actions.addCustomEvent(name.trim(), scope);
          showToast(t("common.saved"));
        }} />
      <ConfirmSheet open={!!removing} onClose={() => setRemoving(null)} danger
        title={t("events.removeTitle", { name: removing?.name ?? "" })}
        message={removing?.event ? t("events.removeSuggested") : t("events.removeCustom")}
        confirmLabel={t("common.remove")}
        onConfirm={async () => { if (removing?.pe) await actions.removeEvent(removing.pe); }} />
    </SpaceLayout>
  );
}

function EventEditor({ open, ev, defaultSide, onClose, onSave }: {
  open: boolean; ev: EventVM | null; defaultSide: Side; onClose: () => void; onSave: (name: string, side: SideScope) => Promise<void>;
}) {
  const { t } = useI18n();
  const [name, setName] = useState(ev?.name ?? "");
  const [scope, setScope] = useState<SideScope>(ev?.side ?? defaultSide);
  const { busy, error, run } = useAsync();
  return (
    <Sheet open={open} onClose={onClose} title={ev ? t("events.edit") : t("events.add")}>
      <form className="stack" onSubmit={async (e) => { e.preventDefault(); if (!name.trim()) return; if (await run(() => onSave(name, scope))) onClose(); }}>
        <TextField label={t("events.name")} value={name} onChange={setName} required
          hint={ev?.event ? t("events.renameHint") : undefined} />
        <div className="field">
          <span className="label">{t("events.assign")}</span>
          <Segmented label={t("events.assign")} value={scope} onChange={setScope}
            options={[{ value: "bride", label: t("side.bride") }, { value: "groom", label: t("side.groom") }, { value: "both", label: t("sideScope.both") }]} />
        </div>
        {error && <p className="error-text">{t("error.generic")}</p>}
        <div className="form-actions">
          <button type="button" className="btn secondary" onClick={onClose}>{t("common.cancel")}</button>
          <button className="btn" disabled={busy || !name.trim()}>{t("common.save")}</button>
        </div>
      </form>
    </Sheet>
  );
}
