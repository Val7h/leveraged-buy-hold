/**
 * Teste E2E — Fluxo completo da página /conta
 * - register
 * - GET/PATCH /profile
 * - PATCH /password
 * - GET/PATCH /email-preferences
 * - GET /export (LGPD)
 * - POST /delete (LGPD)
 */
const https = require("https");

const BASE = "lbh-system.onrender.com";

function http(method, path, opts) {
  opts = opts || {};
  return new Promise((resolve) => {
    const headers = {
      "Content-Type": "application/json",
      "User-Agent": "LBH-E2E-Conta/1.0",
      ...(opts.headers || {}),
    };
    if (opts.fake_ip) headers["X-Forwarded-For"] = opts.fake_ip;
    if (opts.cookie) headers["Cookie"] = opts.cookie;

    const options = { hostname: BASE, port: 443, path, method, headers };
    const start = Date.now();
    const req = https.request(options, (res) => {
      let d = "";
      res.on("data", (c) => (d += c));
      res.on("end", () => {
        const setCookie = res.headers["set-cookie"];
        let sessionCookie = null;
        if (setCookie) {
          const match = setCookie.find((c) => c.startsWith("lbh_session="));
          if (match) sessionCookie = match.split(";")[0];
        }
        resolve({
          status: res.statusCode,
          body: d,
          ms: Date.now() - start,
          cookie: sessionCookie,
          headers: res.headers,
          json: () => { try { return JSON.parse(d); } catch { return null; } },
        });
      });
    });
    req.on("error", (e) => resolve({ status: 0, body: e.message, ms: 0, cookie: null, json: () => null }));
    if (opts.body) req.write(JSON.stringify(opts.body));
    req.end();
  });
}

let passed = 0, failed = 0;
function check(label, cond, detail) {
  const icon = cond ? "✅" : "❌";
  console.log("  " + icon + " " + label.padEnd(45) + (detail || ""));
  if (cond) passed++; else failed++;
}

(async () => {
  console.log("");
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║   TESTE E2E — /conta (Perfil + Senha + LGPD + Email Prefs)  ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");

  const ts = Date.now();
  const email = "conta_test_" + ts + "@lbh.local";
  const senha1 = "Senha@Original123";
  const senha2 = "Nova@Senha456";
  const fakeIp = "201.10.30.99";

  // ════════════════════════════════════════════════
  console.log("\n━━━ 1. REGISTER ━━━");
  const reg = await http("POST", "/api/v1/auth/register", {
    fake_ip: fakeIp,
    body: { email, password: senha1, fullName: "Conta Test", riskProfile: "moderado" },
  });
  check("Register HTTP 201", reg.status === 201, "HTTP " + reg.status);
  check("Cookie httpOnly setado", reg.cookie !== null);
  let cookie = reg.cookie;
  if (!cookie) { console.log("Sem cookie — abortando"); process.exit(1); }

  // ════════════════════════════════════════════════
  console.log("\n━━━ 2. GET /profile ━━━");
  const prof1 = await http("GET", "/api/v1/account/profile", { cookie });
  const p1 = prof1.json();
  check("GET profile HTTP 200", prof1.status === 200, "HTTP " + prof1.status);
  check("Email retornado", p1 && p1.email === email);
  check("FullName retornado", p1 && p1.fullName === "Conta Test");
  check("RiskProfile retornado", p1 && p1.riskProfile);
  check("passwordHash NÃO exposto", !p1?.passwordHash);

  // ════════════════════════════════════════════════
  console.log("\n━━━ 3. PATCH /profile (mudar nome + perfil) ━━━");
  const patchP = await http("PATCH", "/api/v1/account/profile", {
    cookie,
    body: { fullName: "Conta Test (editado)", riskProfile: "conservador" },
  });
  check("PATCH profile HTTP 200", patchP.status === 200, "HTTP " + patchP.status);

  const prof2 = await http("GET", "/api/v1/account/profile", { cookie });
  const p2 = prof2.json();
  check("Nome foi atualizado", p2 && p2.fullName === "Conta Test (editado)", "nome: " + p2?.fullName);
  check("Perfil foi atualizado", p2 && p2.riskProfile === "conservador", "perfil: " + p2?.riskProfile);

  // ════════════════════════════════════════════════
  console.log("\n━━━ 4. PATCH /profile com email (deve dar 501) ━━━");
  const patchEmail = await http("PATCH", "/api/v1/account/profile", {
    cookie,
    body: { email: "outro@email.com" },
  });
  check("Mudar email → bloqueado", patchEmail.status === 501 || patchEmail.status === 400,
    "HTTP " + patchEmail.status + " (esperado: 501 ou 400)");

  // ════════════════════════════════════════════════
  console.log("\n━━━ 5. GET /email-preferences ━━━");
  const ep1 = await http("GET", "/api/v1/account/email-preferences", { cookie });
  const eData = ep1.json();
  check("GET prefs HTTP 200", ep1.status === 200, "HTTP " + ep1.status);
  check("transactional default true", eData && eData.transactional === true);
  check("marketing default false (opt-in)", eData && eData.marketing === false);
  check("alerts default true", eData && eData.alerts === true);

  // ════════════════════════════════════════════════
  console.log("\n━━━ 6. PATCH /email-preferences (ligar marketing) ━━━");
  const ep2 = await http("PATCH", "/api/v1/account/email-preferences", {
    cookie,
    body: { marketing: true, alerts: false },
  });
  check("PATCH prefs HTTP 200", ep2.status === 200, "HTTP " + ep2.status);

  const ep3 = await http("GET", "/api/v1/account/email-preferences", { cookie });
  const eData3 = ep3.json();
  check("marketing agora true", eData3 && eData3.marketing === true);
  check("alerts agora false", eData3 && eData3.alerts === false);

  // ════════════════════════════════════════════════
  console.log("\n━━━ 7. PATCH /email-preferences (tentar desligar transactional — deve bloquear) ━━━");
  const epBlock = await http("PATCH", "/api/v1/account/email-preferences", {
    cookie,
    body: { transactional: false },
  });
  const epAfter = await http("GET", "/api/v1/account/email-preferences", { cookie });
  const eAfter = epAfter.json();
  check("transactional permanece true (LGPD bloqueia)",
    eAfter && eAfter.transactional === true,
    "valor atual: " + eAfter?.transactional);

  // ════════════════════════════════════════════════
  console.log("\n━━━ 8. GET /export (LGPD art. 18-V) ━━━");
  const exp = await http("GET", "/api/v1/account/export", { cookie });
  check("Export HTTP 200", exp.status === 200, "HTTP " + exp.status);
  check("Content-Disposition: attachment",
    exp.headers["content-disposition"]?.includes("attachment"),
    exp.headers["content-disposition"] || "ausente");
  const expData = exp.json();
  check("Export contém user", expData && expData.user);
  check("Export contém portfolios", expData && Array.isArray(expData.portfolios));
  check("Export NÃO contém passwordHash", expData && !JSON.stringify(expData).includes("passwordHash"));

  // ════════════════════════════════════════════════
  console.log("\n━━━ 9. PATCH /password (trocar senha) ━━━");
  const pw1 = await http("PATCH", "/api/v1/account/password", {
    cookie, fake_ip: fakeIp,
    body: { currentPassword: senha1, newPassword: senha2 },
  });
  check("PATCH password HTTP 200", pw1.status === 200, "HTTP " + pw1.status + " body: " + pw1.body.slice(0, 80));

  // ════════════════════════════════════════════════
  console.log("\n━━━ 10. PATCH /password com senha errada (deve dar 401) ━━━");
  const pw2 = await http("PATCH", "/api/v1/account/password", {
    cookie, fake_ip: fakeIp,
    body: { currentPassword: "senha_errada", newPassword: "Outra@Senha789" },
  });
  check("Senha atual errada → 401", pw2.status === 401, "HTTP " + pw2.status);

  // ════════════════════════════════════════════════
  console.log("\n━━━ 11. Logout + Re-login com NOVA senha ━━━");
  await http("POST", "/api/v1/auth/logout", { cookie });
  const reLogin = await http("POST", "/api/v1/auth/login", {
    fake_ip: fakeIp,
    body: { email, password: senha2 },
  });
  check("Re-login com nova senha HTTP 200", reLogin.status === 200, "HTTP " + reLogin.status);
  cookie = reLogin.cookie || cookie;

  // ════════════════════════════════════════════════
  console.log("\n━━━ 12. POST /delete (LGPD art. 18-VI) ━━━");
  const del1 = await http("POST", "/api/v1/account/delete", {
    cookie,
    body: { confirmation: "errado", password: senha2 },
  });
  check("Sem confirmação 'DELETAR' → bloqueia", del1.status === 400 || del1.status === 422,
    "HTTP " + del1.status);

  const del2 = await http("POST", "/api/v1/account/delete", {
    cookie,
    body: { confirmation: "DELETAR", password: "senha_errada" },
  });
  check("Confirmação OK mas senha errada → 401", del2.status === 401,
    "HTTP " + del2.status);

  const del3 = await http("POST", "/api/v1/account/delete", {
    cookie,
    body: { confirmation: "DELETAR", password: senha2 },
  });
  check("Delete com tudo certo → 200", del3.status === 200, "HTTP " + del3.status);
  check("Cookie de sessão limpo", del3.headers["set-cookie"]?.some((c) => c.includes("lbh_session=") && c.includes("Max-Age=0")),
    "set-cookie: " + (del3.headers["set-cookie"]?.join(" | ") || "ausente"));

  // ════════════════════════════════════════════════
  console.log("\n━━━ 13. Verificar que user FOI mesmo deletado ━━━");
  const reLoginDeletado = await http("POST", "/api/v1/auth/login", {
    fake_ip: fakeIp,
    body: { email, password: senha2 },
  });
  check("Login do user deletado → 401", reLoginDeletado.status === 401,
    "HTTP " + reLoginDeletado.status);

  // ════════════════════════════════════════════════
  console.log("\n╔══════════════════════════════════════════════════════════════╗");
  console.log("║                    RESULTADO FINAL                          ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");
  console.log("");
  console.log("✅ " + passed + " checks passaram");
  if (failed > 0) console.log("❌ " + failed + " checks falharam");
  const score = Math.round(passed / (passed + failed) * 100);
  console.log("🎯 Score: " + score + "%");
})();
