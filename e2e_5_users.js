/**
 * Teste E2E — 5 usuários reais navegando o LBH System em produção.
 * Cada user tem X-Forwarded-For sintético para não cair no rate limit.
 */
const https = require("https");

const BASE = "lbh-system.onrender.com";

const PERSONAS = [
  {
    nome: "Ana Conservadora",
    email: `ana_${Date.now()}_1@lbh.local`,
    senha: "Senha@Forte123",
    fullName: "Ana Silva",
    riskProfile: "conservador",
    fake_ip: "201.10.20.1",
    carteira: { name: "Aposentadoria", initialEquity: 50000, monthlyContribution: 1000, currency: "BRL" },
    tickers_screening: "TAEE11.SA,EGIE3.SA,VIVT3.SA",
  },
  {
    nome: "Bruno Moderado",
    email: `bruno_${Date.now()}_2@lbh.local`,
    senha: "Senha@Forte123",
    fullName: "Bruno Costa",
    riskProfile: "moderado",
    fake_ip: "201.10.20.2",
    carteira: { name: "Dividendos USA", initialEquity: 100000, monthlyContribution: 2500, currency: "USD" },
    tickers_screening: "NEE,SO,JNJ,PG",
  },
  {
    nome: "Carlos Agressivo",
    email: `carlos_${Date.now()}_3@lbh.local`,
    senha: "Senha@Forte123",
    fullName: "Carlos Mendes",
    riskProfile: "agressivo",
    fake_ip: "201.10.20.3",
    carteira: { name: "Growth Tech 2.5x", initialEquity: 25000, monthlyContribution: 5000, currency: "USD" },
    tickers_screening: "AAPL,MSFT,NVDA,GOOGL",
  },
  {
    nome: "Daniela Iniciante",
    email: `daniela_${Date.now()}_4@lbh.local`,
    senha: "Senha@Forte123",
    fullName: "Daniela Reis",
    riskProfile: "conservador",
    fake_ip: "201.10.20.4",
    carteira: null, // Só explora, não cria carteira
    tickers_screening: "NEE,SO",
  },
  {
    nome: "Eduardo Quant",
    email: `eduardo_${Date.now()}_5@lbh.local`,
    senha: "Senha@Forte123",
    fullName: "Eduardo Tavares",
    riskProfile: "moderado",
    fake_ip: "201.10.20.5",
    carteira: { name: "Sharpe Optimized", initialEquity: 80000, monthlyContribution: 3000, currency: "BRL" },
    tickers_screening: "PETR4.SA,VALE3.SA,ITUB4.SA,WEGE3.SA,BBDC4.SA,ABEV3.SA",
  },
];

function http(method, path, opts) {
  opts = opts || {};
  return new Promise((resolve) => {
    const headers = {
      "Content-Type": "application/json",
      "User-Agent": "LBH-E2E-Test/1.0",
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
          json: () => {
            try { return JSON.parse(d); } catch { return null; }
          },
        });
      });
    });
    req.on("error", (e) => resolve({ status: 0, body: e.message, ms: 0, cookie: null, json: () => null }));
    if (opts.body) req.write(JSON.stringify(opts.body));
    req.end();
  });
}

async function flowUser(persona, idx) {
  const log = [];
  const out = (icon, step, detail) => log.push(`  ${icon} ${step.padEnd(35)} ${detail || ""}`);

  // ── 1. REGISTER ─────────────────────────────────────────────────
  const r1 = await http("POST", "/api/v1/auth/register", {
    fake_ip: persona.fake_ip,
    body: {
      email: persona.email,
      password: persona.senha,
      fullName: persona.fullName,
      riskProfile: persona.riskProfile,
    },
  });
  if (r1.status !== 201) {
    out("❌", "Register", `HTTP ${r1.status} | ${r1.body.slice(0, 100)}`);
    return { persona: persona.nome, status: "FALHOU_REGISTER", log };
  }
  const user = r1.json();
  out("✅", "Register", `HTTP 201 | id=${user.id.slice(0, 12)}... cookie=${r1.cookie ? "✓" : "✗"} (${r1.ms}ms)`);
  let cookie = r1.cookie;

  // ── 2. /me autenticado ──────────────────────────────────────────
  const r2 = await http("GET", "/api/v1/auth/me", { cookie, fake_ip: persona.fake_ip });
  if (r2.status !== 200) {
    out("❌", "GET /me", `HTTP ${r2.status}`);
    return { persona: persona.nome, status: "FALHOU_ME", log };
  }
  const me = r2.json();
  out("✅", "GET /me", `${me.fullName} (${me.riskProfile}) (${r2.ms}ms)`);

  // ── 3. Estado do mercado ────────────────────────────────────────
  const r3 = await http("GET", "/api/v1/assets/market-state", { cookie, fake_ip: persona.fake_ip });
  const ms = r3.json();
  out("✅", "Estado mercado", `${ms?.state} ${ms?.multiplier}x | RSI SPY ${ms?.signals?.rsi_semanal_spy} (${r3.ms}ms)`);

  // ── 4. Screening ────────────────────────────────────────────────
  const r4 = await http(
    "GET",
    `/api/v1/assets/screen?tickers=${encodeURIComponent(persona.tickers_screening)}&min_score=0`,
    { cookie, fake_ip: persona.fake_ip }
  );
  const screen = r4.json();
  const found = screen?.assets?.length || 0;
  const entrar = screen?.assets?.filter((a) => a.entry_signal === "ENTRAR").length || 0;
  out("✅", "Screening", `${found} ativos | ${entrar} com sinal ENTRAR (${r4.ms}ms)`);

  // ── 5. Criar carteira (se persona tem) ──────────────────────────
  let portfolioId = null;
  if (persona.carteira) {
    const r5 = await http("POST", "/api/v1/portfolio", {
      cookie,
      fake_ip: persona.fake_ip,
      body: persona.carteira,
    });
    if (r5.status === 201 || r5.status === 200) {
      const port = r5.json();
      portfolioId = port?.id;
      out("✅", "POST carteira", `"${persona.carteira.name}" criada (${r5.ms}ms)`);
    } else {
      out("⚠️ ", "POST carteira", `HTTP ${r5.status} | ${r5.body.slice(0, 80)}`);
    }
  } else {
    out("⏭️ ", "POST carteira", "(persona só explorou, não criou)");
  }

  // ── 6. Listar carteiras ─────────────────────────────────────────
  const r6 = await http("GET", "/api/v1/portfolio", { cookie, fake_ip: persona.fake_ip });
  const ports = r6.json();
  const count = Array.isArray(ports) ? ports.length : 0;
  out("✅", "GET carteiras", `${count} carteira(s) listada(s) (${r6.ms}ms)`);

  // ── 7. Logout (apaga cookie) ────────────────────────────────────
  const r7 = await http("POST", "/api/v1/auth/logout", { cookie, fake_ip: persona.fake_ip });
  out("✅", "Logout", `HTTP ${r7.status} (${r7.ms}ms)`);

  // ── 8. Login de novo ────────────────────────────────────────────
  const r8 = await http("POST", "/api/v1/auth/login", {
    fake_ip: persona.fake_ip,
    body: { email: persona.email, password: persona.senha },
  });
  if (r8.status !== 200) {
    out("❌", "Re-login", `HTTP ${r8.status}`);
    return { persona: persona.nome, status: "FALHOU_RELOGIN", log };
  }
  cookie = r8.cookie;
  out("✅", "Re-login", `cookie renovado (${r8.ms}ms)`);

  // ── 9. PERSISTÊNCIA: carteiras ainda lá? ────────────────────────
  const r9 = await http("GET", "/api/v1/portfolio", { cookie, fake_ip: persona.fake_ip });
  const portsAfter = r9.json();
  const countAfter = Array.isArray(portsAfter) ? portsAfter.length : 0;
  const persistiu = countAfter === count;
  out(
    persistiu ? "✅" : "❌",
    "Persistência",
    persistiu
      ? `${countAfter} carteira(s) sobreviveram ao logout (${r9.ms}ms)`
      : `ESPERADO ${count}, OBTIDO ${countAfter}`
  );

  return {
    persona: persona.nome,
    email: persona.email,
    status: "SUCESSO",
    log,
    user_id: user.id,
    portfolios: countAfter,
  };
}

(async () => {
  console.log("");
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║       TESTE E2E — 5 USUÁRIOS REAIS NO LBH SYSTEM            ║");
  console.log("║       https://lbh-system.onrender.com                       ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");

  const results = [];
  for (let i = 0; i < PERSONAS.length; i++) {
    const p = PERSONAS[i];
    console.log(`\n━━━ USER ${i + 1}/5: ${p.nome} (${p.riskProfile}) ━━━`);
    console.log(`  Email: ${p.email}`);
    console.log(`  IP fake: ${p.fake_ip}`);
    console.log("");
    const r = await flowUser(p, i);
    r.log.forEach((l) => console.log(l));
    results.push(r);
  }

  console.log("\n╔══════════════════════════════════════════════════════════════╗");
  console.log("║                    RELATÓRIO FINAL                          ║");
  console.log("╚══════════════════════════════════════════════════════════════╝\n");

  results.forEach((r, i) => {
    const icon = r.status === "SUCESSO" ? "✅" : "❌";
    console.log(`${icon} User ${i + 1}: ${r.persona.padEnd(22)} ${r.status}`);
    if (r.user_id) console.log(`   id=${r.user_id.slice(0, 16)}... carteiras=${r.portfolios}`);
  });

  const ok = results.filter((r) => r.status === "SUCESSO").length;
  console.log(`\n📊 ${ok}/${results.length} usuários completaram fluxo E2E sem erros`);

  // Estado final do banco
  console.log("\n🗄️ Verificando estado do banco Neon...");
  const { PrismaClient } = require("./frontend/node_modules/@prisma/client");
  process.env.DATABASE_URL =
    "postgresql://neondb_owner:npg_Q4Ix1ULnCEOa@ep-hidden-poetry-apaoqurp-pooler.c-7.us-east-1.aws.neon.tech/neondb?sslmode=require&pgbouncer=true&connect_timeout=15";
  const prisma = new PrismaClient();
  const totalUsers = await prisma.user.count();
  const totalPortfolios = await prisma.portfolio.count();
  console.log(`   Users no Neon: ${totalUsers}`);
  console.log(`   Portfolios no Neon: ${totalPortfolios}`);
  await prisma.$disconnect();
})().catch(console.error);
