import { useState } from "react";
import { Icon } from "../components/Icon";
import { AmountField, ConfirmSheet, Empty, Money, Segmented, SelectField, Sheet, TextField, useAsync } from "../components/ui";
import { parseAmount } from "../domain/budget";
import { useI18n } from "../i18n/i18n";
import { Link } from "../lib/router";
import { useApp } from "../state/app";
import { eventBudget, resolveEvent, spaceEvents, spacePath, type CategoryVM, type EventVM } from "../state/viewmodel";
import type { Expense, Side } from "../data/types";
import { AllocationSheet } from "./CategoryPage";
import { SpaceLayout, TINTS, useAccountGate, usePlanReady } from "./Space";

/** List of events, each with its OWN budget. Deliberately no combined total. */
export function BudgetsPage({ side }: { side: Side }) {
  const { t } = useI18n();
  const { content, plan, user } = useApp();
  usePlanReady();
  const { gate, prompt } = useAccountGate(side);
  if (!content) return <SpaceLayout side={side}>{null}</SpaceLayout>;
  const events = spaceEvents(content, plan, side);
  return (
    <SpaceLayout side={side} title={t("nav.budgets")}>
      <div className="stack-lg">
        <section className="hero">
          <h1 className="h1">{t("budget.pageTitle")}</h1>
          <p className="muted">{t("budget.independentNote")}</p>
        </section>
        {!user ? (
          <Empty icon="wallet" title={t("budget.signInTitle")} text={t("budget.signInText")}
            action={<button className="btn" onClick={() => gate(() => undefined)}>{t("auth.signIn")}</button>} />
        ) : (
          <div className="grid two">
            {events.map((ev, i) => {
              const b = eventBudget(content, plan, ev, side);
              return (
                <Link key={ev.ref} to={spacePath(side, `/e/${ev.ref}/budget`)} className="card card-link stack-sm">
                  <div className="row">
                    <span className={`tile-ico ${TINTS[i % TINTS.length]}`}><Icon name={ev.icon} /></span>
                    <div className="grow h3">{ev.name}</div>
                    <Icon name="chevron" className="chev flip-rtl" size={20} />
                  </div>
                  {b.hasBudget && b.total > 0 ? (
                    <>
                      <div className="budget-line small"><span className="muted">{t("budget.total")}</span><Money value={b.total} /></div>
                      <div className="budget-line small"><span className="muted">{t("budget.unallocated")}</span><Money value={b.unallocated} /></div>
                      <div className="budget-line small"><span className="muted">{t("budget.spent")}</span><Money value={b.spent} /></div>
                      <div className={`bar${b.spent > b.total ? " over" : ""}`} aria-hidden><span style={{ width: `${Math.min(100, (b.spent / b.total) * 100)}%` }} /></div>
                    </>
                  ) : <span className="small muted">{t("budget.noneYet")}</span>}
                </Link>
              );
            })}
          </div>
        )}
      </div>
      {prompt}
    </SpaceLayout>
  );
}

export function EventBudgetPage({ side, evRef }: { side: Side; evRef: string }) {
  const { t, money } = useI18n();
  const { content, plan, actions, user, showToast } = useApp();
  usePlanReady();
  const { gate, prompt } = useAccountGate(side);
  const [editTotal, setEditTotal] = useState(false);
  const [alloc, setAlloc] = useState<CategoryVM | null>(null);
  const [expense, setExpense] = useState<Partial<Expense> | null>(null);
  const [del, setDel] = useState<Expense | null>(null);
  const ev = content ? resolveEvent(content, plan, evRef) : null;
  const backTo = spacePath(side, `/e/${evRef}`);
  if (!content) return <SpaceLayout side={side} backTo={backTo}>{null}</SpaceLayout>;
  if (!ev) return <SpaceLayout side={side} backTo={backTo}><Empty title={t("error.notFound")} /></SpaceLayout>;
  if (!user || !ev.pe) {
    return (
      <SpaceLayout side={side} backTo={backTo} title={ev.name}>
        <Empty icon="wallet" title={t("budget.signInTitle")} text={t("budget.signInText")}
          action={<button className="btn" onClick={() => gate(() => undefined)}>{t("auth.signIn")}</button>} />
        {prompt}
      </SpaceLayout>
    );
  }
  const b = eventBudget(content, plan, ev, side);
  const expenses = plan!.expenses.filter((e) => e.plan_event_id === ev.pe!.id && e.side === side).sort((a, b2) => (b2.spent_on ?? b2.created_at ?? "").localeCompare(a.spent_on ?? a.created_at ?? ""));
  const catName = (pcId: string | null) => b.lines.find((l) => l.vm.pc?.id === pcId)?.vm.name ?? t("expense.uncategorised");

  return (
    <SpaceLayout side={side} title={t("budget.eventBudget")} backTo={backTo}>
      <div className="stack-lg">
        <section className="hero">
          <span className="eyebrow">{t(`side.${side}`)}</span>
          <h1 className="h1">{ev.name}</h1>
          <p className="small muted">{t("budget.independentShort")}</p>
        </section>

        <section className="card blue stack">
          <div className="row between">
            <div className="kpi"><span className="v"><Money value={b.total} /></span><span className="l">{t("budget.total")}</span></div>
            <button className="btn small secondary" onClick={() => setEditTotal(true)}>{b.hasBudget ? t("common.edit") : t("budget.setTotal")}</button>
          </div>
          <div className="kpis">
            <div className="kpi"><span className="v"><Money value={b.allocated} /></span><span className="l">{t("budget.allocated")}</span></div>
            <div className="kpi"><span className="v"><Money value={b.unallocated} /></span><span className="l">{t("budget.unallocated")}</span></div>
            <div className="kpi"><span className="v"><Money value={b.spent} /></span><span className="l">{t("budget.spentCommitted")}</span></div>
            <div className="kpi"><span className="v"><Money value={b.total - b.spent} /></span><span className="l">{t("budget.leftToSpend")}</span></div>
          </div>
          <p className="tiny muted">{t("budget.formula")}</p>
          {b.overAllocated && <div className="notice warn"><Icon name="alert" size={18} />{t("budget.warnOverAllocatedBy", { amount: money(-b.unallocated) })}</div>}
          {b.spent > b.total && b.total > 0 && <div className="notice warn"><Icon name="alert" size={18} />{t("budget.warnEventOverspent")}</div>}
        </section>

        <section className="stack" aria-labelledby="al-h">
          <h2 className="h3" id="al-h">{t("budget.allocations")}</h2>
          {b.lines.length === 0 ? <p className="small muted">{t("categories.emptyText")}</p> : (
            <div className="list">
              {b.lines.map((l) => (
                <button key={l.vm.ref} className="list-item" onClick={() => setAlloc(l.vm)}>
                  <div className="body">
                    <div className="title">{l.vm.name}</div>
                    <div className="sub">
                      {t("budget.spent")}: <Money value={l.spent} /> · {t("budget.remaining")}: <Money value={l.remaining} />
                    </div>
                    {l.overspent && <span className="badge blush" style={{ marginTop: 4 }}><Icon name="alert" size={13} />{t("budget.overspentBadge")}</span>}
                  </div>
                  <span className="money" style={{ fontWeight: 600 }}><Money value={l.allocated} /></span>
                  <Icon name="edit" size={18} className="chev" />
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="stack" aria-labelledby="ex-h">
          <div className="section-title">
            <h2 className="h3" id="ex-h">{t("expense.title")}</h2>
            <button className="btn small" onClick={() => setExpense({ kind: "paid", plan_category_id: null })}><Icon name="plus" size={16} />{t("expense.add")}</button>
          </div>
          <p className="tiny muted">{t("expense.separateNote")}</p>
          {expenses.length === 0 ? <p className="small muted">{t("expense.none")}</p> : (
            <div className="list">
              {expenses.map((x) => (
                <div key={x.id} className="admin-row">
                  <div className="body">
                    <div className="title">{x.label}</div>
                    <div className="tiny muted">{catName(x.plan_category_id)} · {t(`expense.kind.${x.kind}`)}{x.spent_on ? ` · ${x.spent_on}` : ""}</div>
                  </div>
                  <Money value={Number(x.amount)} />
                  <button className="icon-btn sm" aria-label={t("common.edit")} onClick={() => setExpense(x)}><Icon name="edit" size={17} /></button>
                  <button className="icon-btn sm" aria-label={t("common.delete")} onClick={() => setDel(x)}><Icon name="trash" size={17} /></button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <TotalSheet open={editTotal} onClose={() => setEditTotal(false)} current={b.total} allocated={b.allocated}
        onSave={async (n) => { await actions.setEventBudget(ev.pe!.id, side, n); showToast(t("common.saved")); }} />
      {alloc && (
        <AllocationSheet key={alloc.ref} open onClose={() => setAlloc(null)} title={alloc.name}
          current={b.lines.find((l) => l.vm.ref === alloc.ref)?.allocated ?? 0}
          context={t("budget.unallocatedIs", { amount: money(b.unallocated) })}
          onSave={async (n) => {
            const pc = alloc.pc ?? (await actions.ensureCategory(ev.pe!.id, alloc.category!.id, side));
            await actions.setAllocation(pc.id, side, n);
          }} />
      )}
      {expense && <ExpenseSheet key={expense.id ?? "new"} ev={ev} side={side} lines={b.lines.map((l) => l.vm)} initial={expense} onClose={() => setExpense(null)} />}
      <ConfirmSheet open={!!del} onClose={() => setDel(null)} danger title={t("expense.deleteTitle")} message={del?.label}
        confirmLabel={t("common.delete")} onConfirm={async () => { if (del) await actions.deleteExpense(del.id); }} />
    </SpaceLayout>
  );
}

function TotalSheet({ open, onClose, current, allocated, onSave }: {
  open: boolean; onClose: () => void; current: number; allocated: number; onSave: (n: number) => Promise<void>;
}) {
  const { t, money } = useI18n();
  const [v, setV] = useState(current ? String(current) : "");
  const { busy, run } = useAsync();
  const n = parseAmount(v);
  return (
    <Sheet open={open} onClose={onClose} title={t("budget.setTotal")}>
      <form className="stack" onSubmit={async (e) => { e.preventDefault(); if (n !== null && (await run(() => onSave(n)))) onClose(); }}>
        <AmountField label={t("budget.total")} value={v} onChange={setV} hint={t("budget.totalHint")} />
        {n !== null && n < allocated && <div className="notice warn"><Icon name="alert" size={18} />{t("budget.warnBelowAllocated", { amount: money(allocated) })}</div>}
        <div className="form-actions">
          <button type="button" className="btn secondary" onClick={onClose}>{t("common.cancel")}</button>
          <button className="btn" disabled={busy || n === null}>{t("common.save")}</button>
        </div>
      </form>
    </Sheet>
  );
}

function ExpenseSheet({ ev, side, lines, initial, onClose }: {
  ev: EventVM; side: Side; lines: CategoryVM[]; initial: Partial<Expense>; onClose: () => void;
}) {
  const { t } = useI18n();
  const { content, plan, actions, showToast } = useApp();
  const [label, setLabel] = useState(initial.label ?? "");
  const [amount, setAmount] = useState(initial.amount ? String(initial.amount) : "");
  const [kind, setKind] = useState<Expense["kind"]>(initial.kind ?? "paid");
  const [catRef, setCatRef] = useState(() => lines.find((l) => l.pc?.id === initial.plan_category_id)?.ref ?? "");
  const [date, setDate] = useState(initial.spent_on ?? new Date().toISOString().slice(0, 10));
  const [providerId, setProviderId] = useState(initial.provider_id ?? "");
  const [note, setNote] = useState(initial.note ?? "");
  const { busy, error, run } = useAsync();
  const n = parseAmount(amount);
  const saved = plan?.saved.map((s) => content!.provider(s.provider_id)).filter(Boolean) ?? [];
  const valid = label.trim() && n !== null && n > 0;

  return (
    <Sheet open onClose={onClose} title={initial.id ? t("expense.edit") : t("expense.add")}>
      <form className="stack" onSubmit={async (e) => {
        e.preventDefault();
        if (!valid) return;
        const ok = await run(async () => {
          const vm = lines.find((l) => l.ref === catRef);
          const pc = vm ? vm.pc ?? (await actions.ensureCategory(ev.pe!.id, vm.category!.id, side)) : null;
          const row = { plan_event_id: ev.pe!.id, plan_category_id: pc?.id ?? null, side, label: label.trim(), amount: n!, kind,
            provider_id: providerId || null, spent_on: date || null, note: note.trim() || null };
          if (initial.id) await actions.updateExpense(initial.id, row); else await actions.addExpense(row);
        });
        if (ok) { showToast(t("common.saved")); onClose(); }
      }}>
        <TextField label={t("expense.label")} value={label} onChange={setLabel} required placeholder={t("expense.labelPlaceholder")} />
        <AmountField label={t("expense.amount")} value={amount} onChange={setAmount} />
        <div className="field">
          <span className="label">{t("expense.type")}</span>
          <Segmented label={t("expense.type")} value={kind} onChange={setKind}
            options={[{ value: "paid", label: t("expense.kind.paid") }, { value: "committed", label: t("expense.kind.committed") }]} />
        </div>
        <SelectField label={t("expense.category")} value={catRef} onChange={setCatRef}
          options={[{ value: "", label: t("expense.uncategorised") }, ...lines.map((l) => ({ value: l.ref, label: l.name }))]} />
        {saved.length > 0 && (
          <SelectField label={t("expense.provider")} value={providerId} onChange={setProviderId}
            options={[{ value: "", label: "—" }, ...saved.map((p) => ({ value: p!.id, label: p!.name }))]} />
        )}
        <div className="field">
          <label htmlFor="exp-date">{t("expense.date")}</label>
          <input id="exp-date" type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <TextField label={t("expense.note")} value={note} onChange={setNote} />
        {error && <p className="error-text">{t("error.generic")}</p>}
        <div className="form-actions">
          <button type="button" className="btn secondary" onClick={onClose}>{t("common.cancel")}</button>
          <button className="btn" disabled={busy || !valid}>{t("common.save")}</button>
        </div>
      </form>
    </Sheet>
  );
}
