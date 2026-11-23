import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { I18nProvider } from "./i18n/i18n";
import { asset } from "./lib/base";

// Static files served from /public (kept out of the bundler graph):
// web fonts (Instrument Sans/Serif, SIL OFL) and the PWA manifest.
for (const [rel, href] of [["stylesheet", "/fonts/fonts.css"], ["manifest", "/manifest.webmanifest"]]) {
  const l = document.createElement("link");
  l.rel = rel;
  l.href = asset(href);
  document.head.appendChild(l);
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <I18nProvider>
      <App />
    </I18nProvider>
  </StrictMode>,
);
