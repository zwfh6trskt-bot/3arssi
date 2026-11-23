// First launch (language) and the minimal landing page.
// Landing contains ONLY: identity, one welcome line, El 3rossa / El 3ris.
import { ArchesIllustration, Wordmark } from "../components/Illustration";
import { BUNDLED, useI18n } from "../i18n/i18n";
import { Link } from "../lib/router";
import { spacePath } from "../state/viewmodel";
import type { Lang } from "../data/types";

export function LanguageSelect() {
  const { setLang } = useI18n();
  const opts: { l: Lang; label: string; cls?: string }[] = [
    { l: "ar", label: "العربية", cls: "ar" },
    { l: "fr", label: "Français" },
    { l: "en", label: "English" },
  ];
  return (
    <main className="screen-center">
      <Wordmark />
      <div className="stack" style={{ alignItems: "center", width: "100%" }}>
        {/* The prompt is shown in all three languages since none is chosen yet */}
        <h1 className="sr-only">{BUNDLED.en["lang.choose"]}</h1>
        <p className="muted small" style={{ lineHeight: 1.9 }}>
          <span lang="ar" dir="rtl">{BUNDLED.ar["lang.choose"]}</span><br />
          <span lang="fr">{BUNDLED.fr["lang.choose"]}</span> · <span lang="en">{BUNDLED.en["lang.choose"]}</span>
        </p>
        <div className="lang-list" role="group" aria-label={BUNDLED.en["lang.choose"]}>
          {opts.map((o) => (
            <button key={o.l} className="lang-btn" lang={o.l} dir={o.l === "ar" ? "rtl" : "ltr"} onClick={() => setLang(o.l)}>
              <span className={o.cls}>{o.label}</span>
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}

export function Landing() {
  const { t } = useI18n();
  return (
    <main className="screen-center" style={{ gap: 36 }}>
      <div className="stack" style={{ alignItems: "center", gap: 28 }}>
        <ArchesIllustration size={168} />
        <Wordmark />
      </div>
      <p className="h2" style={{ fontSize: 22, maxWidth: 320 }}>{t("landing.welcome")}</p>
      <nav className="side-choices" aria-label={t("landing.choose")}>
        <Link to={spacePath("bride")} className="side-card">
          <span className="name">{t("side.bride")}</span>
          <span className="sub">{t("side.brideSub")}</span>
        </Link>
        <Link to={spacePath("groom")} className="side-card">
          <span className="name">{t("side.groom")}</span>
          <span className="sub">{t("side.groomSub")}</span>
        </Link>
      </nav>
    </main>
  );
}
