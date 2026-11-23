// Production build: bundles index.html → dist/ with Bun's bundler.
// PUBLIC_* environment variables are inlined; nothing else is exposed.
import { copyFile, cp, rm, writeFile } from "node:fs/promises";

// Optional sub-path (e.g. "/3arssi" for GitHub Pages project sites).
const base = (process.env.PUBLIC_BASE_PATH ?? "").replace(/\/+$/, "");

await rm("dist", { recursive: true, force: true });
const result = await Bun.build({
  entrypoints: ["./index.html"],
  outdir: "./dist",
  minify: true,
  splitting: true,
  publicPath: base + "/",
  sourcemap: "linked",
  env: "PUBLIC_*",
  define: {
    "process.env.NODE_ENV": '"production"',
    // Always defined (possibly empty) so the browser bundle never touches `process`
    "process.env.PUBLIC_SUPABASE_URL": JSON.stringify(process.env.PUBLIC_SUPABASE_URL ?? ""),
    "process.env.PUBLIC_SUPABASE_ANON_KEY": JSON.stringify(process.env.PUBLIC_SUPABASE_ANON_KEY ?? ""),
    "process.env.PUBLIC_BASE_PATH": JSON.stringify(base),
  },
});
if (!result.success) {
  for (const log of result.logs) console.error(log);
  process.exit(1);
}
await cp("public", "dist", { recursive: true });
// SPA fallback for Netlify (vercel.json handles Vercel)
await writeFile("dist/_redirects", "/*  /index.html  200\n");
// SPA fallback for GitHub Pages: unknown paths serve 404.html = the app
await copyFile("dist/index.html", "dist/404.html");
await writeFile("dist/.nojekyll", "");
const mode = process.env.PUBLIC_SUPABASE_URL ? "Supabase (hosted database)" : "device-only demo mode";
console.log(`Built ${result.outputs.length} files → dist/  ·  data mode: ${mode}`);
