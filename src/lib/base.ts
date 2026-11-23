// Base path the app is served under ("" at a domain root, "/3arssi" on
// GitHub Pages project sites). Set at build time with PUBLIC_BASE_PATH.
function readBase(): string { try { return process.env.PUBLIC_BASE_PATH ?? ""; } catch { return ""; } }
export const BASE = readBase().replace(/\/+$/, "");

/** Prefixes app-absolute paths ("/img/x.svg") with the base path; leaves full URLs alone. */
export function asset(url: string): string;
export function asset(url: string | null | undefined): string | undefined;
export function asset(url: string | null | undefined) {
  if (!url) return url ?? undefined;
  return url.startsWith("/") && !url.startsWith("//") ? BASE + url : url;
}

/** Strips the base path from a browser pathname. */
export function stripBase(path: string): string {
  if (BASE && (path === BASE || path.startsWith(BASE + "/"))) return path.slice(BASE.length) || "/";
  return path;
}
