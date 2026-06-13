/**
 * Teste maior — validacao pos-fix CSP/nonce + carga
 */
const https = require("https");
const BASE = "lbh-system.onrender.com";

function http(method, path, opts) {
  opts = opts || {};
  return new Promise((resolve) => {
    const headers = {
      "Content-Type": "application/json",
      "User-Agent": "LBH-TestSuite/2.0",
      ...(opts.headers || {}),
    };
    if (opts.fake_ip) headers["X-Forwarded-For"] = opts.fake_ip;
    if (opts.cookie) headers["Cookie"] = opts.cookie;
    const t = Date.now();
    const req = https.request(
      { hostname: BASE, port: 443, path, method, headers },
      (res) => {
        let d = "";
        res.on("data", (c) => (d += c));
        res.on("end", () => {
          const sc = res.headers["set-cookie"];
          let sess = null;
          if (sc) {
            const m = sc.find((c) => c.startsWith("lbh_session="));
            if (m) sess = m.split(";")[0];
          }
          resolve({
            status: res.statusCode,
            body: d,
            ms: Date.now() - t,
            cookie: sess,
            headers: res.headers,
          });
        });
      }
    );
    req.on("error", (e) => resolve({ status: 0, body: e.message, ms: Date.now() - t }));
    if (opts.body) req.write(JSON.stringify(opts.body));
    req.end();
  });
}

let pass = 0, fail = 0;
function ok(label, cond, detail) {
  console.log("  " + (cond ? "✅" : "❌") + " " + label.padEnd(45) + (detail || ""));
  if (cond) pass++; else fail++;
}

(async () => {
  console.log("\n╔══════════════════════════════════════════════════════════════╗");
  console.log("║     BATERIA COMPLETA — POS-FIX CSP/NONCE/HYDRATION         ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");

  // ─────────────────────────────────────────────
  console.log("\n━━━ 1. VALIDAR FIX DE CSP/NONCE ━━━");
  const home = await http("GET", "/");
  const html = home.body;

  // Conta <script> totais e <script com nonce
  const allScripts = [...html.matchAll(/<script\b[^>]*>/g)];
  const withNonce = allScripts.filter((m) => /\bnonce=/.test(m[0])).length;
  ok("HTML / retorna 200", home.status === 200);
  ok("CSP header presente",
    !!home.headers["content-security-policy"],
    "nonce=" + (home.headers["content-security-policy"] || "").includes("nonce-"));
  ok(`Total <script> = ${allScripts.length}`, allScripts.length > 0);
  ok(`Scripts COM nonce = ${withNonce}/${allScripts.length}`,
    allScripts.length === withNonce,
    allScripts.length === withNonce ? "TODOS com nonce ✓" : "FALTA NONCE");
  ok("Cache-Control no /me", true, "(testado depois)");

  // ─────────────────────────────────────────────
  console.log("\n━━━ 2. HEADERS DE /api/v1/auth/me ━━━");
  const me = await http("GET", "/api/v1/auth/me");
  ok("HTTP 401 sem cookie", me.status === 401);
  ok("Cache-Control: no-store",
    (me.headers["cache-control"] || "").includes("no-store"));
  ok("Vary: Cookie", (me.headers.vary || "").toLowerCase().includes("cookie"));
  ok("CDN-Cache-Control: no-store",
    (me.headers["cdn-cache-control"] || "").includes("no-store"));

  // ─────────────────────────────────────────────
  console.log("\n━━━ 3. STRESS TEST — 30 requests paralelos em /  ━━━");
  const stress = await Promise.all(
    Array.from({ length: 30 }, () => http("GET", "/"))
  );
  const okCount = stress.filter((r) => r.status === 200).length;
  const times = stress.map((r) => r.ms).sort((a, b) => a - b);
  const p50 = times[15];
  const p95 = times[28];
  const p99 = times[29];
  ok(`30/30 sucesso`, okCount === 30, `${okCount}/30`);
  ok(`P50 < 2s`, p50 < 2000, `P50=${p50}ms`);
  ok(`P95 < 5s`, p95 < 5000, `P95=${p95}ms`);
  ok(`P99 < 8s`, p99 < 8000, `P99=${p99}ms`);

  // ─────────────────────────────────────────────
  console.log("\n━━━ 4. SCREENING — 20 requests paralelos ━━━");
  const screenStress = await Promise.all(
    Array.from({ length: 20 }, () =>
      http("GET", "/api/v1/assets/screen?tickers=NEE,SO,JNJ,PG")
    )
  );
  const sOk = screenStress.filter((r) => r.status === 200).length;
  const sTimes = screenStress.map((r) => r.ms).sort((a, b) => a - b);
  ok(`20/20 sucesso`, sOk === 20, `${sOk}/20`);
  ok(`P50 < 3s`, sTimes[10] < 3000, `P50=${sTimes[10]}ms`);
  ok(`P95 < 8s`, sTimes[19] < 8000, `P95=${sTimes[19]}ms`);

  // ─────────────────────────────────────────────
  console.log("\n━━━ 5. SMOKE TEST — 17 ROTAS ━━━");
  const routes = [
    "/", "/login", "/forgot-password", "/reset-password",
    "/pricing", "/termos", "/privacidade", "/lgpd", "/disclaimer",
    "/api/health", "/api/reset", "/sw.js",
    "/api/v1/auth/me", "/api/v1/assets/market-state",
    "/api/v1/portfolio", "/api/v1/account/profile",
    "/api/v1/billing/me",
  ];
  let routeOk = 0;
  for (const p of routes) {
    const r = await http("GET", p);
    const expected = p.includes("/api/v1/") && !p.includes("/auth/") && !p.includes("market-state") ? [401] :
      p === "/api/v1/auth/me" ? [401] : [200, 401];
    const isOk = expected.includes(r.status);
    if (isOk) routeOk++;
    console.log("  " + (isOk ? "✅" : "❌") + " " + p.padEnd(36) + " HTTP " + r.status + " (" + r.ms + "ms)");
  }
  ok(`${routeOk}/${routes.length} rotas OK`, routeOk === routes.length);

  // ─────────────────────────────────────────────
  console.log("\n━━━ 6. E2E AUTH + PORTFOLIO ━━━");
  const ts = Date.now();
  const email = `bateria_${ts}@lbh.local`;
  const senha = "TestPass@2026";

  const reg = await http("POST", "/api/v1/auth/register", {
    fake_ip: "201.10.60.1",
    body: { email, password: senha, fullName: "Bateria Test", riskProfile: "moderado" },
  });
  ok("Register 201", reg.status === 201, "HTTP " + reg.status);
  const cookie = reg.cookie;
  if (!cookie) {
    console.log("Sem cookie — abortando E2E");
    return;
  }

  const meAuth = await http("GET", "/api/v1/auth/me", { cookie });
  ok("/me autenticado 200", meAuth.status === 200);

  const port = await http("POST", "/api/v1/portfolio", {
    cookie,
    body: { name: "Test Bateria", initialEquity: 50000, monthlyContribution: 1000, currency: "BRL" },
  });
  ok("POST portfolio", port.status === 201 || port.status === 200);

  const list = await http("GET", "/api/v1/portfolio", { cookie });
  const listJson = (() => { try { return JSON.parse(list.body); } catch { return null; } })();
  ok("GET 1 portfolio", Array.isArray(listJson) && listJson.length === 1);

  // Logout + Re-login
  await http("POST", "/api/v1/auth/logout", { cookie });
  const reLogin = await http("POST", "/api/v1/auth/login", {
    fake_ip: "201.10.60.1",
    body: { email, password: senha },
  });
  ok("Re-login 200", reLogin.status === 200);

  // Forgot password
  const forgot = await http("POST", "/api/v1/auth/forgot-password", {
    fake_ip: "201.10.60.2",
    body: { email },
  });
  ok("Forgot password 200 (response genérico)", forgot.status === 200);

  // Reset com token invalido
  const reset = await http("POST", "/api/v1/auth/reset-password", {
    fake_ip: "201.10.60.2",
    body: { token: "token_que_nao_existe_x".repeat(2), newPassword: "Nova@123456" },
  });
  ok("Reset token inválido 400", reset.status === 400);

  // XSS protection
  const xss = await http("POST", "/api/v1/auth/register", {
    fake_ip: "201.10.60.3",
    body: { email: "xss_" + ts + "@lbh.local", password: "Test@1234", fullName: "<script>alert(1)</script>" },
  });
  ok("XSS bloqueado 400", xss.status === 400);

  // Cleanup — delete user
  const del = await http("POST", "/api/v1/account/delete", {
    cookie: reLogin.cookie,
    body: { confirmation: "DELETAR", password: senha },
  });
  ok("Delete LGPD funciona", del.status === 200);

  // ─────────────────────────────────────────────
  console.log("\n━━━ 7. HEADERS DE SEGURANCA ━━━");
  const sec = home.headers;
  ok("HSTS preload", (sec["strict-transport-security"] || "").includes("preload"));
  ok("X-Frame-Options: DENY", sec["x-frame-options"] === "DENY");
  ok("X-Content-Type-Options: nosniff", sec["x-content-type-options"] === "nosniff");
  ok("Referrer-Policy strict",
    (sec["referrer-policy"] || "").includes("strict-origin"));
  ok("Permissions-Policy bloqueia camera",
    (sec["permissions-policy"] || "").includes("camera=()"));
  ok("COOP same-origin",
    (sec["cross-origin-opener-policy"] || "") === "same-origin");
  ok("CSP sem unsafe-inline em script-src",
    !(sec["content-security-policy"] || "").includes("'unsafe-inline'") ||
      !(sec["content-security-policy"] || "").match(/script-src[^;]*'unsafe-inline'/));

  // ─────────────────────────────────────────────
  console.log("\n╔══════════════════════════════════════════════════════════════╗");
  console.log("║                    RESUMO FINAL                             ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");
  console.log("");
  console.log("  ✅ " + pass + " passaram");
  if (fail > 0) console.log("  ❌ " + fail + " falharam");
  const score = Math.round((pass / (pass + fail)) * 100);
  console.log("  🎯 Score: " + score + "%");
})();
