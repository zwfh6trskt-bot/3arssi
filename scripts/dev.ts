// Development server with hot reload: http://localhost:3000
import index from "../index.html";

const server = Bun.serve({
  port: Number(process.env.PORT ?? 3000),
  development: true,
  routes: {
    "/fonts/*": (req) => new Response(Bun.file("public" + new URL(req.url).pathname)),
    "/img/*": (req) => new Response(Bun.file("public" + new URL(req.url).pathname)),
    "/favicon.svg": () => new Response(Bun.file("public/favicon.svg")),
    "/manifest.webmanifest": () => new Response(Bun.file("public/manifest.webmanifest")),
    "/*": index,
  },
});
console.log(`3ARSSI dev server → ${server.url}`);
