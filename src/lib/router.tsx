// Minimal history router (no dependency). Keeps scroll position per entry so
// "back" returns the user exactly where they were in a list.
import { useEffect, useState, type AnchorHTMLAttributes, type MouseEvent } from "react";

import { asset, stripBase } from "./base";

type Listener = () => void;
const listeners = new Set<Listener>();
const scrollKey = (k: string) => `3arssi.scroll.${k}`;

function currentKey() { return (history.state && history.state.k) || "root"; }

export function navigate(to: string, opts: { replace?: boolean } = {}) {
  try { sessionStorage.setItem(scrollKey(currentKey()), String(window.scrollY)); } catch { /* ignore */ }
  const state = { k: Math.random().toString(36).slice(2) };
  if (opts.replace) history.replaceState(state, "", asset(to));
  else history.pushState(state, "", asset(to));
  listeners.forEach((l) => l());
  window.scrollTo(0, 0);
}

export function back(fallback: string) {
  if (history.length > 1 && history.state?.k) history.back();
  else navigate(fallback, { replace: true });
}

if (typeof window !== "undefined") {
  if (!history.state?.k) history.replaceState({ k: "root" }, "");
  history.scrollRestoration = "manual";
  window.addEventListener("popstate", () => {
    listeners.forEach((l) => l());
    const y = Number(sessionStorage.getItem(scrollKey(currentKey())) ?? 0);
    requestAnimationFrame(() => requestAnimationFrame(() => window.scrollTo(0, y)));
  });
  window.addEventListener("pagehide", () => {
    try { sessionStorage.setItem(scrollKey(currentKey()), String(window.scrollY)); } catch { /* ignore */ }
  });
}

export function useLocation() {
  const [, force] = useState(0);
  useEffect(() => {
    const l = () => force((n) => n + 1);
    listeners.add(l);
    return () => { listeners.delete(l); };
  }, []);
  return { path: stripBase(location.pathname), query: new URLSearchParams(location.search) };
}

/** Matches "/s/:side/e/:event" against a path; returns params or null. */
export function match(pattern: string, path: string): Record<string, string> | null {
  const p = pattern.split("/").filter(Boolean);
  const s = path.split("/").filter(Boolean);
  if (p.length !== s.length) return null;
  const out: Record<string, string> = {};
  for (let i = 0; i < p.length; i++) {
    if (p[i].startsWith(":")) out[p[i].slice(1)] = decodeURIComponent(s[i]);
    else if (p[i] !== s[i]) return null;
  }
  return out;
}

export function Link({ to, replace, onClick, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement> & { to: string; replace?: boolean }) {
  const handle = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e);
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    navigate(to, { replace });
  };
  return <a href={asset(to)} onClick={handle} {...rest} />;
}

export function withQuery(path: string, q: Record<string, string | null | undefined>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(q)) if (v) sp.set(k, v);
  const s = sp.toString();
  return s ? `${path}?${s}` : path;
}
