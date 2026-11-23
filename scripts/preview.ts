// Serves the production build in dist/ with SPA fallback: http://localhost:4173
const root = "dist";
const server = Bun.serve({
  port: Number(process.env.PORT ?? 4173),
  async fetch(req) {
    const path = decodeURIComponent(new URL(req.url).pathname);
    const file = Bun.file(root + (path === "/" ? "/index.html" : path));
    if (!path.includes("..") && (await file.exists())) return new Response(file);
    return new Response(Bun.file(root + "/index.html"));
  },
});
console.log(`Preview → ${server.url}`);
