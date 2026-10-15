// Placar de qualidade do app em produção (sem dependências; Node >= 18).
// Uso: node scripts/scorecard.mjs [https://lbh-system.onrender.com]
// Cada verificação vale 1 ponto; a nota é a % de pontos. Meta: >= 90%.
const BASE = (process.argv[2] || "https://lbh-system.onrender.com").replace(/\/$/, "");
const PAGES = ["/", "/pricing", "/login", "/termos", "/privacidade", "/lgpd", "/disclaimer", "/ranking"];
const checks = [];
const add = (area, name, ok, detail = "") => checks.push({ area, name, ok: !!ok, detail });

async function get(path, opts = {}) {
  const t0 = Date.now();
  const res = await fetch(BASE + path, { redirect: "follow", ...opts });
  const body = opts.method === "HEAD" ? "" : await res.text();
  return { res, body, ms: Date.now() - t0 };
}
const meta = (html, re) => (html.match(re) || [])[1];

const pages = {};
for (const p of PAGES) {
  try { pages[p] = await get(p); } catch (e) { pages[p] = { err: String(e) }; }
}

// --- Disponibilidade e desempenho
for (const p of PAGES) add("Disponibilidade", `GET ${p} = 200`, pages[p].res?.status === 200, pages[p].res?.status);
for (const p of PAGES) add("Desempenho", `TTFB+corpo ${p} < 2500 ms`, (pages[p].ms ?? 1e9) < 2500, `${pages[p].ms} ms`);
add("Desempenho", "HTML de /pricing <= 100 KB", (pages["/pricing"].body || "").length <= 100_000, `${((pages["/pricing"].body || "").length / 1024).toFixed(0)} KB`);
const nf = await get("/rota-que-nao-existe-xyz");
add("Disponibilidade", "404 real para rota inexistente", nf.res.status === 404, nf.res.status);

// --- Segurança (cabeçalhos da home)
const h = pages["/"].res.headers;
add("Segurança", "CSP presente", h.get("content-security-policy"));
add("Segurança", "HSTS presente", h.get("strict-transport-security"));
add("Segurança", "X-Frame-Options/frame-ancestors", h.get("x-frame-options") || /frame-ancestors/.test(h.get("content-security-policy") || ""));
add("Segurança", "X-Content-Type-Options nosniff", h.get("x-content-type-options") === "nosniff");
add("Segurança", "Referrer-Policy", h.get("referrer-policy"));
add("Segurança", "Permissions-Policy", h.get("permissions-policy"));
const me = await get("/api/v1/auth/me");
add("Segurança", "API privada sem sessão devolve 401", me.res.status === 401, me.res.status);

// --- SEO / compartilhamento
for (const p of PAGES) {
  const b = pages[p].body || "";
  add("SEO", `${p}: <title> próprio`, /<title>[^<]{5,}<\/title>/.test(b));
  add("SEO", `${p}: meta description`, /<meta name="description"/.test(b));
}
const titles = PAGES.map((p) => meta(pages[p].body || "", /<title>([^<]*)<\/title>/));
add("SEO", "títulos únicos entre as páginas", new Set(titles).size === PAGES.length, `${new Set(titles).size}/${PAGES.length} únicos`);
add("SEO", "sem título duplicado ('| LBH System | LBH System')", !titles.some((t) => /LBH System \| LBH System/.test(t || "")));
for (const p of ["/pricing", "/login", "/ranking"]) add("SEO", `${p}: canonical`, /<link rel="canonical"/.test(pages[p].body || ""));
for (const f of ["/robots.txt", "/sitemap.xml", "/favicon.ico", "/og-image.png", "/apple-touch-icon.png"]) {
  const r = await get(f, { method: "HEAD" });
  add("SEO", `${f} = 200`, r.res.status === 200, r.res.status);
}

// --- Acessibilidade (HTML servido)
for (const p of PAGES) {
  const b = pages[p].body || "";
  add("Acessibilidade", `${p}: lang no <html>`, /<html[^>]*lang="[a-z-]+"/i.test(b));
}
for (const p of PAGES.filter((x) => x !== "/")) {
  add("Acessibilidade", `${p}: exatamente um <h1>`, ((pages[p].body || "").match(/<h1[ >]/g) || []).length === 1);
}
{
  const b = pages["/login"].body || "";
  const inputs = [...b.matchAll(/<input\b[^>]*>/g)].map((m) => m[0]).filter((t) => !/type="hidden"/.test(t));
  const bad = inputs.filter((t) => { const id = (t.match(/\bid="([^"]+)"/) || [])[1]; return !(id && b.includes(`for="${id}"`)) && !/aria-label=/.test(t); });
  add("Acessibilidade", "/login: todo campo com label associado", inputs.length > 0 && bad.length === 0, `${inputs.length - bad.length}/${inputs.length}`);
}

// --- Resumo
const areas = {};
for (const c of checks) { (areas[c.area] ||= { ok: 0, n: 0 }); areas[c.area].n++; if (c.ok) areas[c.area].ok++; }
const ok = checks.filter((c) => c.ok).length;
for (const c of checks.filter((c) => !c.ok)) console.log(`FALHA [${c.area}] ${c.name} ${c.detail !== "" ? "(" + c.detail + ")" : ""}`);
console.log("\nPor área:");
for (const [a, v] of Object.entries(areas)) console.log(`  ${a.padEnd(16)} ${v.ok}/${v.n}  ${((100 * v.ok) / v.n).toFixed(0)}%`);
const pct = (100 * ok) / checks.length;
console.log(`\nNOTA DE PRODUÇÃO: ${ok}/${checks.length} = ${pct.toFixed(1)}%  (meta 90%)`);
process.exit(pct >= 90 ? 0 : 1);
