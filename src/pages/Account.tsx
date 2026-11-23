import { asset } from "../lib/base";
import { useState } from "react";
import { Icon } from "../components/Icon";
import { Segmented, TextField, useAsync } from "../components/ui";
import { auth, db, isDemoMode } from "../data/client";
import { DbError } from "../data/db/types";
import { LANG_NAMES, useI18n } from "../i18n/i18n";
import { Link, navigate, useLocation } from "../lib/router";
import { useApp } from "../state/app";
import { spacePath } from "../state/viewmodel";
import { LANGS, type Side } from "../data/types";
import { SpaceLayout } from "./Space";

export function ProfilePage({ side }: { side: Side }) {
  const { t } = useI18n();
  const { user, profile, isStaff } = useApp();
  return (
    <SpaceLayout side={side} title={t("nav.profile")}>
      <div className="stack-lg">
        <section className="row" style={{ gap: 16 }}>
          <span className="tile-ico lg blue"><Icon name="user" size={26} /></span>
          <div className="grow">
            <h1 className="h2 break">{user ? profile?.display_name || user.email : t("profile.guest")}</h1>
            <p className="small muted break">{user ? user.email : t("profile.guestText")}</p>
          </div>
        </section>
        {!user && (
          <div className="grid two">
            <Link className="btn" to={spacePath(side, "/account")}>{t("auth.signIn")}</Link>
            <Link className="btn secondary" to={`${spacePath(side, "/account")}?mode=signup`}>{t("auth.createAccount")}</Link>
          </div>
        )}
        <nav className="list" aria-label={t("nav.profile")}>
          <Link className="list-item" to={spacePath(side, "/settings")}>
            <span className="tile-ico"><Icon name="settings" /></span>
            <div className="body"><div className="title">{t("settings.title")}</div><div className="sub">{t("settings.sub")}</div></div>
            <Icon name="chevron" className="chev flip-rtl" size={20} />
          </Link>
          <Link className="list-item" to={spacePath(side, "/events")}>
            <span className="tile-ico"><Icon name="edit" /></span>
            <div className="body"><div className="title">{t("events.personalise")}</div></div>
            <Icon name="chevron" className="chev flip-rtl" size={20} />
          </Link>
          <Link className="list-item" to="/">
            <span className="tile-ico"><Icon name="arch" /></span>
            <div className="body"><div className="title">{t("profile.changeSpace")}</div><div className="sub">{t(`side.${side}`)}</div></div>
            <Icon name="chevron" className="chev flip-rtl" size={20} />
          </Link>
          {isStaff && (
            <Link className="list-item" to="/admin">
              <span className="tile-ico sand"><Icon name="key" /></span>
              <div className="body"><div className="title">{t("admin.title")}</div></div>
              <Icon name="chevron" className="chev flip-rtl" size={20} />
            </Link>
          )}
        </nav>
        {user && <button className="btn secondary" onClick={() => auth.signOut()}><Icon name="logout" size={18} className="flip-rtl" />{t("auth.signOut")}</button>}
      </div>
    </SpaceLayout>
  );
}

export function SettingsPage({ side }: { side: Side }) {
  const { t, lang } = useI18n();
  const { user, profile, actions, showToast } = useApp();
  const [name, setName] = useState(profile?.display_name ?? "");
  const { busy, run } = useAsync();
  return (
    <SpaceLayout side={side} title={t("settings.title")} backTo={spacePath(side, "/profile")}>
      <div className="stack-lg">
        <h1 className="h1">{t("settings.title")}</h1>
        <div className="list">
          <Link className="list-item" to={spacePath(side, "/settings/language")}>
            <span className="tile-ico blue"><Icon name="globe" /></span>
            <div className="body"><div className="title">{t("settings.language")}</div><div className="sub">{LANG_NAMES[lang]}</div></div>
            <Icon name="chevron" className="chev flip-rtl" size={20} />
          </Link>
        </div>
        {user && (
          <form className="card stack" onSubmit={(e) => { e.preventDefault(); run(async () => {
            await db.update("profiles", { id: user.id }, { display_name: name.trim() || null });
            await actions.reload(); showToast(t("common.saved"));
          }); }}>
            <h2 className="h3">{t("settings.account")}</h2>
            <TextField label={t("auth.displayName")} value={name} onChange={setName} autoComplete="name" />
            <div className="form-actions"><button className="btn small" disabled={busy}>{t("common.save")}</button></div>
          </form>
        )}
        <section className="card soft stack-sm">
          <h2 className="h3">{t("settings.data")}</h2>
          <p className="small">{isDemoMode ? t("settings.dataDemo") : t("settings.dataCloud")}</p>
        </section>
      </div>
    </SpaceLayout>
  );
}

export function LanguageSettings({ side }: { side: Side }) {
  const { t, lang, setLang } = useI18n();
  const { user } = useApp();
  return (
    <SpaceLayout side={side} title={t("settings.language")} backTo={spacePath(side, "/settings")}>
      <div className="stack">
        <h1 className="h1">{t("settings.language")}</h1>
        <p className="muted">{t("settings.languageIntro")}</p>
        <div className="list" role="radiogroup" aria-label={t("settings.language")}>
          {LANGS.map((l) => (
            <button key={l} className="list-item" role="radio" aria-checked={lang === l} lang={l}
              onClick={() => { setLang(l); if (user) db.update("profiles", { id: user.id }, { preferred_lang: l }).catch(() => undefined); }}>
              <div className="body"><div className="title" dir={l === "ar" ? "rtl" : "ltr"}>{LANG_NAMES[l]}</div></div>
              {lang === l && <Icon name="check" />}
            </button>
          ))}
        </div>
      </div>
    </SpaceLayout>
  );
}

const DEMO_ADMIN = { email: "admin@3arssi.demo", password: "demo-admin-3arssi" };

export function AuthPage({ side }: { side: Side }) {
  const { t } = useI18n();
  const { query } = useLocation();
  const { showToast } = useApp();
  const [mode, setMode] = useState<"signin" | "signup">(query.get("mode") === "signup" ? "signup" : "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [info, setInfo] = useState<string | null>(null);
  const { busy, error, run, setError } = useAsync();
  const next = query.get("next");
  const done = () => navigate(next && next.startsWith("/") ? next : spacePath(side), { replace: true });

  const errorText = (e: string | null) => {
    if (!e) return null;
    if (/session_blocked/i.test(e)) return t("auth.errorBlocked");
    if (/invalid|credentials/i.test(e)) return t("auth.errorInvalid");
    if (/already|exists|registered/i.test(e)) return t("auth.errorExists");
    if (/weak|password/i.test(e)) return t("auth.errorWeak");
    if (/confirm/i.test(e)) return t("auth.errorConfirm");
    return t("error.generic");
  };

  const submit = async () => {
    setInfo(null);
    const ok = await run(async () => {
      if (mode === "signin") await auth.signIn(email, password);
      else {
        const r = await auth.signUp(email, password, name);
        if (r.needsConfirmation) { setInfo(t("auth.checkEmail")); throw new DbError("__info__"); }
      }
    });
    if (ok) { showToast(t("auth.welcome")); done(); }
    else setError((x) => (x === "__info__" ? null : x));
  };

  const demoAdmin = () => run(async () => {
    try { await auth.signIn(DEMO_ADMIN.email, DEMO_ADMIN.password); }
    catch { await auth.signUp(DEMO_ADMIN.email, DEMO_ADMIN.password, "Demo admin"); }
    const u = auth.currentUser()!;
    await db.update("profiles", { id: u.id }, { role: "admin" });
    location.href = asset("/admin");
  });

  return (
    <SpaceLayout side={side} title={mode === "signin" ? t("auth.signIn") : t("auth.createAccount")} backTo={spacePath(side, "/profile")}>
      <div className="stack-lg" style={{ maxWidth: 440, marginInline: "auto" }}>
        <section className="hero">
          <h1 className="h1">{mode === "signin" ? t("auth.signInTitle") : t("auth.signUpTitle")}</h1>
          <p className="muted">{t("auth.why")}</p>
        </section>
        <Segmented label={t("auth.mode")} value={mode} onChange={(m) => { setMode(m); setError(null); setInfo(null); }}
          options={[{ value: "signin", label: t("auth.signIn") }, { value: "signup", label: t("auth.createAccount") }]} />
        <form className="stack" onSubmit={(e) => { e.preventDefault(); submit(); }}>
          {mode === "signup" && <TextField label={t("auth.displayName")} value={name} onChange={setName} autoComplete="name" />}
          <TextField label={t("auth.email")} type="email" value={email} onChange={setEmail} required autoComplete="email" dir="ltr" />
          <TextField label={t("auth.password")} type="password" value={password} onChange={setPassword} required
            autoComplete={mode === "signin" ? "current-password" : "new-password"} hint={mode === "signup" ? t("auth.passwordHint") : undefined} dir="ltr" />
          {error && <p className="error-text" role="alert">{errorText(error)}</p>}
          {info && <div className="notice sage" role="status"><Icon name="info" size={18} />{info}</div>}
          <button className="btn block" disabled={busy || !email || !password}>{mode === "signin" ? t("auth.signIn") : t("auth.createAccount")}</button>
        </form>
        {mode === "signin" && !isDemoMode && (
          <button className="link-btn" onClick={() => run(async () => { await auth.resetPassword(email); setInfo(t("auth.resetSent")); })} disabled={!email}>{t("auth.forgot")}</button>
        )}
        {isDemoMode && (
          <section className="card soft stack-sm">
            <h2 className="h3">{t("demo.adminTitle")}</h2>
            <p className="small">{t("demo.adminText")}</p>
            <p className="tiny muted" dir="ltr">{DEMO_ADMIN.email} · {DEMO_ADMIN.password}</p>
            <button className="btn secondary" onClick={demoAdmin} disabled={busy}><Icon name="key" size={18} />{t("demo.adminButton")}</button>
          </section>
        )}
      </div>
    </SpaceLayout>
  );
}

/** Landing page of the "reset your password" email link (?token=…). */
export function ResetPasswordPage() {
  const { t } = useI18n();
  const { query } = useLocation();
  const token = query.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [doneMsg, setDoneMsg] = useState(false);
  const { busy, error, run } = useAsync();
  const supported = !!auth.completePasswordReset && !!token && !query.get("error");
  return (
    <main className="screen-center">
      <div className="stack-lg" style={{ width: "100%", maxWidth: 420 }}>
        <h1 className="h1">{t("auth.resetTitle")}</h1>
        {!supported ? <p className="muted">{t("auth.resetInvalid")}</p>
          : doneMsg ? <p>{t("auth.resetDone")}</p>
          : (
            <form className="stack" onSubmit={(e) => { e.preventDefault(); run(async () => { await auth.completePasswordReset!(token, password); setDoneMsg(true); }); }}>
              <TextField label={t("auth.newPassword")} value={password} onChange={setPassword} type="password"
                autoComplete="new-password" hint={t("auth.passwordHint")} dir="ltr" />
              {error && <p className="error-text" role="alert">{/weak|password|short/i.test(error) ? t("auth.errorWeak") : t("auth.resetInvalid")}</p>}
              <button className="btn block" disabled={busy || password.length < 8}>{t("common.save")}</button>
            </form>
          )}
        <Link className="btn secondary block" to="/">{t("auth.resetBack")}</Link>
      </div>
    </main>
  );
}
