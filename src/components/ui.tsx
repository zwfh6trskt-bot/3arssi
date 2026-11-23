import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { isDemoMode } from "../data/client";
import type { BudgetStatus } from "../domain/estimate";
import { parseAmount } from "../domain/budget";
import { useI18n } from "../i18n/i18n";
import { back as goBack, Link, useLocation } from "../lib/router";
import { useApp } from "../state/app";
import { spacePath } from "../state/viewmodel";
import type { Side } from "../data/types";
import { Icon } from "./Icon";

// ---------------------------------------------------------------- top bar
export function TopBar({ title, backTo, side, actions, home }: {
  title?: string; backTo?: string; side?: Side; actions?: ReactNode; home?: boolean;
}) {
  const { t } = useI18n();
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 4);
    on(); window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  return (
    <header className={`topbar${scrolled ? " scrolled" : ""}`}>
      <div className="topbar-inner">
        {backTo ? (
          <button className="icon-btn" onClick={() => goBack(backTo)} aria-label={t("common.back")}>
            <Icon name="back" className="flip-rtl" />
          </button>
        ) : (
          <Link to="/" className="brand-mini" aria-label={t("brand.home")} style={{ paddingInline: 8 }}>3ARSSI</Link>
        )}
        {side && <DesktopNav side={side} />}
        <div className={`topbar-title${home ? " hide-desktop" : ""}`}>{home ? "" : title}</div>
        {actions}
        {home && side && <SideSwitch side={side} />}
      </div>
    </header>
  );
}

function SideSwitch({ side }: { side: Side }) {
  const { t } = useI18n();
  const other: Side = side === "bride" ? "groom" : "bride";
  return (
    <Link to={spacePath(other)} className="side-switch" aria-label={t("space.switchTo", { side: t(`side.${other}`) })}>
      <span>{t(`side.${side}`)}</span>
      <Icon name="refresh" size={16} />
    </Link>
  );
}

const NAV = [
  { key: "events", path: "", icon: "arch" },
  { key: "providers", path: "/providers", icon: "search" },
  { key: "budgets", path: "/budgets", icon: "wallet" },
  { key: "saved", path: "/saved", icon: "bookmark" },
  { key: "profile", path: "/profile", icon: "user" },
];

function activeTab(path: string, side: Side) {
  const base = spacePath(side);
  const rest = path.slice(base.length);
  if (rest.startsWith("/providers") || rest.startsWith("/p/")) return "providers";
  if (rest.startsWith("/budgets")) return "budgets";
  if (rest.startsWith("/saved")) return "saved";
  if (rest.startsWith("/profile") || rest.startsWith("/settings") || rest.startsWith("/account")) return "profile";
  return "events";
}

function DesktopNav({ side }: { side: Side }) {
  const { t } = useI18n();
  const { path } = useLocation();
  const active = activeTab(path, side);
  return (
    <nav className="desktop-nav" aria-label={t("nav.main")}>
      {NAV.map((n) => (
        <Link key={n.key} to={spacePath(side, n.path)} aria-current={active === n.key ? "page" : undefined}>{t(`nav.${n.key}`)}</Link>
      ))}
    </nav>
  );
}

export function BottomNav({ side }: { side: Side }) {
  const { t } = useI18n();
  const { path } = useLocation();
  const active = activeTab(path, side);
  return (
    <nav className="bottom-nav" aria-label={t("nav.main")}>
      <ul>
        {NAV.map((n) => (
          <li key={n.key}>
            <Link to={spacePath(side, n.path)} aria-current={active === n.key ? "page" : undefined}>
              <span className="nav-ico"><Icon name={n.icon} size={21} /></span>
              <span>{t(`nav.${n.key}`)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

// ---------------------------------------------------------------- sheet
export function Sheet({ open, onClose, title, children, labelledBy }: {
  open: boolean; onClose: () => void; title?: string; children: ReactNode; labelledBy?: string;
}) {
  const id = useId();
  const ref = useRef<HTMLDivElement>(null);
  const { t } = useI18n();
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    setTimeout(() => ref.current?.querySelector<HTMLElement>("input,select,textarea,button:not(.sheet-close)")?.focus(), 30);
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; prev?.focus?.(); };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="scrim" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby={labelledBy ?? id} ref={ref}>
        <div className="sheet-handle" />
        <div className="row between" style={{ marginBottom: 16 }}>
          <h2 className="h2" id={id} style={{ fontSize: 23 }}>{title}</h2>
          <button className="icon-btn sm sheet-close" onClick={onClose} aria-label={t("common.close")}><Icon name="close" size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function ConfirmSheet({ open, title, message, confirmLabel, danger, onConfirm, onClose }: {
  open: boolean; title: string; message?: string; confirmLabel: string; danger?: boolean; onConfirm: () => void | Promise<void>; onClose: () => void;
}) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <div className="stack">
        {message && <p className="muted">{message}</p>}
        <div className="form-actions">
          <button className="btn secondary" onClick={onClose}>{t("common.cancel")}</button>
          <button className={`btn${danger ? " danger" : ""}`} disabled={busy}
            onClick={async () => { setBusy(true); try { await onConfirm(); onClose(); } finally { setBusy(false); } }}>{confirmLabel}</button>
        </div>
      </div>
    </Sheet>
  );
}

// ---------------------------------------------------------------- inputs
export function AmountField({ label, value, onChange, hint, error, id }: {
  label: string; value: string; onChange: (v: string) => void; hint?: string; error?: string | null; id?: string;
}) {
  const { t } = useI18n();
  const gen = useId();
  const fid = id ?? gen;
  const invalid = value !== "" && parseAmount(value) === null;
  return (
    <div className="field">
      <label htmlFor={fid}>{label}</label>
      <div className="input-affix">
        <input id={fid} className="input num" inputMode="decimal" autoComplete="off" value={value}
          aria-invalid={invalid || !!error} onChange={(e) => onChange(e.target.value)} dir="ltr" style={{ textAlign: "start" }} />
        <span className="affix">{t("currency.da")}</span>
      </div>
      {(invalid || error) ? <span className="error-text">{error ?? t("error.amount")}</span> : hint ? <span className="hint">{hint}</span> : null}
    </div>
  );
}

export function TextField({ label, value, onChange, hint, type = "text", required, autoComplete, multiline, dir, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; hint?: string; type?: string; required?: boolean;
  autoComplete?: string; multiline?: boolean; dir?: "ltr" | "rtl" | "auto"; placeholder?: string;
}) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label}{required && <span aria-hidden> *</span>}</label>
      {multiline
        ? <textarea id={id} className="textarea" value={value} onChange={(e) => onChange(e.target.value)} dir={dir} placeholder={placeholder} />
        : <input id={id} className="input" type={type} value={value} required={required} autoComplete={autoComplete}
            onChange={(e) => onChange(e.target.value)} dir={dir} placeholder={placeholder} />}
      {hint && <span className="hint">{hint}</span>}
    </div>
  );
}

export function SelectField({ label, value, onChange, options, hint }: {
  label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; hint?: string;
}) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <select id={id} className="select" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {hint && <span className="hint">{hint}</span>}
    </div>
  );
}

export function Segmented<T extends string>({ value, options, onChange, label }: {
  value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; label: string;
}) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={value === o.value} onClick={() => onChange(o.value)}>{o.label}</button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- display
export function Money({ value, className }: { value: number | null | undefined; className?: string }) {
  const { money } = useI18n();
  return <span className={`money ${className ?? ""}`}>{money(value)}</span>;
}

const STATUS_ICON: Record<string, string> = { within: "check", may_exceed: "alert", over: "alert", unavailable: "info", no_budget: "info" };
export function StatusBadge({ status }: { status: BudgetStatus | "no_budget" }) {
  const { t } = useI18n();
  return <span className={`status ${status}`}><Icon name={STATUS_ICON[status]} size={15} />{t(`status.${status}`)}</span>;
}

export function DemoBadge() {
  const { t } = useI18n();
  return <span className="badge demo">{t("demo.sample")}</span>;
}

export function Empty({ icon = "arch", title, text, action }: { icon?: string; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="empty">
      <span className="tile-ico lg"><Icon name={icon} size={26} /></span>
      <div className="h3" style={{ color: "var(--ink)" }}>{title}</div>
      {text && <p className="small" style={{ maxWidth: 340 }}>{text}</p>}
      {action}
    </div>
  );
}

export function Loading() {
  const { t } = useI18n();
  return <div className="empty" aria-busy="true"><span className="muted">{t("common.loading")}</span></div>;
}

export function Toast() {
  const { toast } = useApp();
  if (!toast) return null;
  return <div className="toast" role="status"><Icon name="check" size={18} />{toast}</div>;
}

export function DemoModeBanner() {
  const { t } = useI18n();
  if (!isDemoMode) return null;
  return <div className="demo-banner" role="note">{t("demo.banner")}</div>;
}

/** Shown when a personal feature needs an account. */
export function SignInPrompt({ side, open, onClose }: { side: Side; open: boolean; onClose: () => void }) {
  const { t } = useI18n();
  const { path } = useLocation();
  return (
    <Sheet open={open} onClose={onClose} title={t("auth.needAccountTitle")}>
      <div className="stack">
        <p className="muted">{t("auth.needAccountText")}</p>
        <Link className="btn block" to={`${spacePath(side, "/account")}?next=${encodeURIComponent(path + location.search)}`}>{t("auth.signIn")}</Link>
        <Link className="btn secondary block" to={`${spacePath(side, "/account")}?mode=signup&next=${encodeURIComponent(path + location.search)}`}>{t("auth.createAccount")}</Link>
      </div>
    </Sheet>
  );
}

export function useAsync() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true); setError(null);
    try { await fn(); return true; }
    catch (e) { setError(e instanceof Error ? e.message : String(e)); return false; }
    finally { setBusy(false); }
  };
  return { busy, error, run, setError };
}
