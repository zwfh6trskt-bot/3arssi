// One-off setup function (Neon Functions, Node 24, no dependencies).
// Downloads the migrations and seed files of a pinned commit from the public
// GitHub repository and applies each file in one transaction through Neon's
// HTTP SQL endpoint. Results go to ops.setup_log. Runs at most once.
const REPO = process.env.SETUP_REPO;        // e.g. zwfh6trskt-bot/3arssi
const REF = process.env.SETUP_REF;          // commit SHA
const FILES = (process.env.SETUP_FILES || "").split(",").filter(Boolean);

function splitSql(sql) {
  const out = []; let cur = ""; let i = 0; const n = sql.length;
  while (i < n) {
    const c = sql[i], c2 = sql.slice(i, i + 2);
    if (c2 === "--") { const j = sql.indexOf("\n", i); const e = j < 0 ? n : j + 1; i = e; cur += "\n"; continue; }
    if (c2 === "/*") { const j = sql.indexOf("*/", i + 2); i = j < 0 ? n : j + 2; continue; }
    if (c === "'") { let j = i + 1; while (j < n) { if (sql[j] === "'") { if (sql[j + 1] === "'") { j += 2; continue; } break; } j++; } cur += sql.slice(i, j + 1); i = j + 1; continue; }
    if (c === '"') { const j = sql.indexOf('"', i + 1); cur += sql.slice(i, j + 1); i = j + 1; continue; }
    if (c === "$") { const m = /^\$[A-Za-z_]*\$/.exec(sql.slice(i)); if (m) { const tag = m[0]; const j = sql.indexOf(tag, i + tag.length); const e = j < 0 ? n : j + tag.length; cur += sql.slice(i, e); i = e; continue; } }
    if (c === ";") { if (cur.trim()) out.push(cur.trim()); cur = ""; i++; continue; }
    cur += c; i++;
  }
  if (cur.trim()) out.push(cur.trim());
  return out.filter((s) => !/^(begin|commit)$/i.test(s));
}

async function sql(body) {
  const url = new URL(process.env.DATABASE_URL);
  const res = await fetch(`https://${url.hostname}/sql`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Neon-Connection-String": process.env.DATABASE_URL, "Neon-Raw-Text-Output": "true", "Neon-Array-Mode": "true" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 800)}`);
  return JSON.parse(text);
}
const log = (step, ok, msg) => sql({ query: "insert into ops.setup_log(step, ok, msg) values ($1, $2, $3)", params: [step, ok, String(msg).slice(0, 4000)] });

let running = false;
export default async function handler() {
  if (running) return new Response("busy");
  running = true;
  try {
    const done = await sql({ query: "select count(*) from ops.setup_log where step = 'done'", params: [] });
    if (Number(done.rows[0][0]) > 0) return new Response("already done");
    for (const f of FILES) {
      const already = await sql({ query: "select count(*) from ops.setup_log where step = $1 and ok", params: [f] });
      if (Number(already.rows[0][0]) > 0) continue;
      try {
        const res = await fetch(`https://raw.githubusercontent.com/${REPO}/${REF}/${f}`);
        if (!res.ok) throw new Error(`download ${res.status}`);
        const stmts = splitSql(await res.text());
        await sql({ queries: stmts.map((q) => ({ query: q, params: [] })) });
        await log(f, true, `${stmts.length} statements`);
      } catch (e) {
        await log(f, false, e && e.message ? e.message : e);
        return new Response("failed at " + f, { status: 500 });
      }
    }
    await log("done", true, "all files applied");
    return new Response("ok");
  } finally { running = false; }
}
