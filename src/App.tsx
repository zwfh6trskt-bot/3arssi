import { lazy, Suspense, useEffect } from "react";
import { DemoModeBanner, Loading, Toast } from "./components/ui";
import { useI18n } from "./i18n/i18n";
import { match, navigate, useLocation } from "./lib/router";
import { AppProvider, useApp } from "./state/app";
import { sideFromSlug } from "./state/viewmodel";
import { AuthPage, LanguageSettings, ProfilePage, ResetPasswordPage, SettingsPage } from "./pages/Account";
import { BudgetsPage, EventBudgetPage } from "./pages/Budget";
import { CategoryPage } from "./pages/CategoryPage";
import { EventPage } from "./pages/EventPage";
import { ProviderPage, ProvidersPage, SavedPage } from "./pages/Providers";
import { ManageEvents, SpaceHome } from "./pages/Space";
import { Landing, LanguageSelect } from "./pages/Start";

const AdminApp = lazy(() => import("./admin/AdminApp"));

function Routes() {
  const { hasChosen } = useI18n();
  const { path } = useLocation();

  useEffect(() => { document.title = "3ARSSI"; }, []);

  // First launch and landing stay intentionally bare (no banner, no nav).
  if (path === "/reset-password") return <ResetPasswordPage />;
  if (!hasChosen) return <LanguageSelect />;
  if (path === "/") return <Landing />;
  return <><DemoModeBanner /><SpaceRoutes path={path} /></>;
}

function SpaceRoutes({ path }: { path: string }) {
  const { t } = useI18n();
  const { error, ready } = useApp();
  if (error && !ready) {
    return <main className="screen-center"><p className="h2">{t("error.loadTitle")}</p><p className="muted">{t("error.loadText")}</p>
      <button className="btn" onClick={() => location.reload()}>{t("common.retry")}</button></main>;
  }
  if (path === "/admin" || path.startsWith("/admin/")) {
    return <Suspense fallback={<Loading />}><AdminApp /></Suspense>;
  }

  const m = path.match(/^\/s\/([^/]+)(\/.*)?$/);
  const side = m ? sideFromSlug(m[1]) : null;
  if (!side) { queueMicrotask(() => navigate("/", { replace: true })); return null; }
  const rest = m![2] ?? "/";
  let p: Record<string, string> | null;
  if (rest === "/" || rest === "") return <SpaceHome side={side} />;
  if (rest === "/events") return <ManageEvents side={side} />;
  if (rest === "/budgets") return <BudgetsPage side={side} />;
  if (rest === "/providers") return <ProvidersPage side={side} />;
  if (rest === "/saved") return <SavedPage side={side} />;
  if (rest === "/profile") return <ProfilePage side={side} />;
  if (rest === "/settings") return <SettingsPage side={side} />;
  if (rest === "/settings/language") return <LanguageSettings side={side} />;
  if (rest === "/account") return <AuthPage side={side} />;
  if ((p = match("/p/:slug", rest))) return <ProviderPage side={side} slug={p.slug} />;
  if ((p = match("/e/:ev/budget", rest))) return <EventBudgetPage key={p.ev} side={side} evRef={p.ev} />;
  if ((p = match("/e/:ev/c/:cat", rest))) return <CategoryPage key={p.cat} side={side} evRef={p.ev} catRef={p.cat} />;
  if ((p = match("/e/:ev", rest))) return <EventPage key={p.ev} side={side} evRef={p.ev} />;
  queueMicrotask(() => navigate(`/s/${m![1]}`, { replace: true }));
  return null;
}

export function App() {
  return (
    <AppProvider>
      <div className="app">
        <Routes />
        <Toast />
      </div>
    </AppProvider>
  );
}
