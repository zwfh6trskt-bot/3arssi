// Administrator dashboard. Access is decided by the user's role in the
// database (profiles.role); in hosted mode Row Level Security enforces it
// server-side, so hiding these screens is not the security boundary.
import { useState } from "react";
import { Icon } from "../components/Icon";
import { Loading, TextField, useAsync } from "../components/ui";
import { auth, db, isDemoMode } from "../data/client";
import { useI18n } from "../i18n/i18n";
import { Link, match, useLocation } from "../lib/router";
import { useApp } from "../state/app";
import { CategoryEditor, EventsAdmin, EventStructure } from "./ContentAdmin";
import { PricesAdmin, ProviderEditor, ProvidersAdmin, ServicesAdmin } from "./ProvidersAdmin";
import { DemoAdmin, Overview, RegionsAdmin, TranslationsAdmin, UsersAdmin } from "./SystemAdmin";

const SECTIONS = [
  ["overview", ""], ["events", "/events"], ["providers", "/providers"], ["services", "/services"], ["prices", "/prices"],
  ["translations", "/translations"], ["regions", "/regions"], ["demo", "/demo"], ["users", "/users"],
] as const;

export default function AdminApp() {
  const { t } = useI18n();
  const { user, profile, isStaff, ready, planLoading } = useApp();
  const { path } = useLocation();
  if (!ready || (user && !profile && planLoading)) return <Loading />;
  if (!user) return <AdminSignIn />;
  if (!isStaff) {
    return (
      <main className="screen-center">
        <span className="tile-ico lg blush"><Icon name="key" size={26} /></span>
        <h1 className="h2">{t("admin.noAccess")}</h1>
        <p className="muted" style={{ maxWidth: 360 }}>{t("admin.noAccessText")}</p>
        <div className="row"><Link className="btn secondary" to="/">{t("common.home")}</Link><button className="btn" onClick={() => auth.signOut()}>{t("auth.signOut")}</button></div>
      </main>
    );
  }
  const rest = path.replace(/^\/admin/, "") || "";
  const active = SECTIONS.find(([, p]) => p && rest.startsWith(p))?.[0]
    ?? (rest.startsWith("/categories") ? "events" : "overview");
  let page;
  let m: Record<string, string> | null;
  if ((m = match("/events/:id", rest))) page = <EventStructure id={m.id} />;
  else if ((m = match("/categories/:id", rest))) page = <CategoryEditor key={m.id} id={m.id} />;
  else if ((m = match("/providers/:id", rest))) page = <ProviderEditor key={m.id} id={m.id} />;
  else if (rest === "/events") page = <EventsAdmin />;
  else if (rest === "/providers") page = <ProvidersAdmin />;
  else if (rest === "/services") page = <ServicesAdmin />;
  else if (rest === "/prices") page = <PricesAdmin />;
  else if (rest === "/translations") page = <TranslationsAdmin />;
  else if (rest === "/regions") page = <RegionsAdmin />;
  else if (rest === "/demo") page = <DemoAdmin />;
  else if (rest === "/users") page = <UsersAdmin />;
  else page = <Overview />;

  return (
    <div className="admin-shell">
      <nav className="admin-nav" aria-label={t("admin.title")}>
        <Link to="/" className="brand-mini" style={{ fontFamily: "Instrument Serif, Georgia, serif", fontSize: 22, letterSpacing: ".06em", textDecoration: "none", padding: "6px 14px", flex: "none" }}>3ARSSI</Link>
        {SECTIONS.map(([k, p]) => (
          <Link key={k} to={`/admin${p}`} aria-current={active === k ? "page" : undefined}>{t(`admin.nav.${k}`)}</Link>
        ))}
        <button className="link-btn small" style={{ padding: "8px 14px", textAlign: "start", flex: "none" }} onClick={() => auth.signOut()}>{t("auth.signOut")}</button>
      </nav>
      <main className="admin-main" id="main">
        <p className="tiny muted" style={{ marginBottom: 8 }}>{t("admin.signedInAs", { email: user.email, role: t(`role.${profile?.role ?? "user"}`) })}</p>
        {page}
      </main>
    </div>
  );
}

function AdminSignIn() {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { busy, error, run } = useAsync();
  return (
    <main className="screen-center" style={{ gap: 24 }}>
      <div className="wordmark" style={{ fontSize: 40 }}>3ARSSI</div>
      <form className="card stack" style={{ width: "100%", maxWidth: 400, textAlign: "start" }} onSubmit={(e) => { e.preventDefault(); run(() => auth.signIn(email, password)); }}>
        <h1 className="h2">{t("admin.signInTitle")}</h1>
        <TextField label={t("auth.email")} type="email" value={email} onChange={setEmail} required autoComplete="email" dir="ltr" />
        <TextField label={t("auth.password")} type="password" value={password} onChange={setPassword} required autoComplete="current-password" dir="ltr" />
        {error && <p className="error-text" role="alert">{t("auth.errorInvalid")}</p>}
        <button className="btn block" disabled={busy}>{t("auth.signIn")}</button>
        {isDemoMode && (
          <button type="button" className="btn secondary block" disabled={busy} onClick={() => run(async () => {
            try { await auth.signIn("admin@3arssi.demo", "demo-admin-3arssi"); }
            catch { await auth.signUp("admin@3arssi.demo", "demo-admin-3arssi", "Demo admin"); }
            await db.update("profiles", { id: auth.currentUser()!.id }, { role: "admin" });
            location.reload();
          })}><Icon name="key" size={18} />{t("demo.adminButton")}</button>
        )}
        {!isDemoMode && <p className="tiny muted">{t("admin.firstAdminHint")}</p>}
      </form>
    </main>
  );
}
