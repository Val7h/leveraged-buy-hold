#!/usr/bin/env node
/**
 * Verificação de produção do fix de CSP / tela-branca.
 *
 * Confirma, contra o ambiente real, que os 6 commits do "firefight" funcionam:
 *   1. /api/health responde 200 (serviço LIVE)
 *   2. GET / envia Content-Security-Policy em ENFORCE (não Report-Only) com 'nonce-...'
 *   3. Os scripts de hydration (self.__next_f.push) carregam nonce == nonce do header
 *   4. 2ª request a / gera nonce DIFERENTE (render per-request real / force-dynamic)
 *   5. /api/reset devolve Clear-Site-Data (kill-switch de SW/cache)
 *
 * Uso:
 *   BASE_URL=https://lbh-system.onrender.com node verify_prod_csp.js
 *   (BASE_URL default = https://lbh-system.onrender.com)
 *
 * Requer Node 18+ (fetch global). Sai com código 1 se qualquer checagem crítica falhar.
 */

const BASE = (process.env.BASE_URL || "https://lbh-system.onrender.com").replace(/\/$/, "");
const TIMEOUT_MS = 30000;

let failures = 0;
const ok   = (m) => console.log(`  \x1b[32m✓\x1b[0m ${m}`);
const bad  = (m) => { console.log(`  \x1b[31m✗ ${m}\x1b[0m`); failures++; };
const info = (m) => console.log(`  \x1b[2m· ${m}\x1b[0m`);

function get(path) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  return fetch(BASE + path, { signal: ctrl.signal, redirect: "manual" })
    .finally(() => clearTimeout(t));
}

/** Extrai o valor de 'nonce-XXX' do header CSP. */
function nonceFromCsp(csp) {
  const m = csp && csp.match(/'nonce-([^']+)'/);
  return m ? m[1] : null;
}

async function main() {
  console.log(`\n🔎 Verificando ${BASE}\n`);

  // 1. Health
  console.log("1) Health");
  try {
    const r = await get("/api/health");
    r.status === 200 ? ok(`/api/health → ${r.status}`) : bad(`/api/health → ${r.status} (esperado 200)`);
  } catch (e) { bad(`/api/health inacessível: ${e.message}`); }

  // 2 + 3. CSP enforce + nonce nos scripts de hydration
  console.log("2) CSP + nonce na home");
  let nonce1 = null;
  try {
    const r = await get("/");
    const csp = r.headers.get("content-security-policy");
    const cspRO = r.headers.get("content-security-policy-report-only");
    if (!csp && cspRO) bad("CSP está em Report-Only (deveria ser enforce)");
    else if (!csp)      bad("sem header Content-Security-Policy");
    else {
      ok("header Content-Security-Policy presente (enforce)");
      nonce1 = nonceFromCsp(csp);
      nonce1 ? ok(`nonce no header CSP: ${nonce1.slice(0, 12)}…`) : bad("CSP sem diretiva 'nonce-...'");

      const html = await r.text();
      const scriptTags = html.match(/<script[^>]*>/gi) || [];
      const hydration = scriptTags.filter((s) => /__next_f|nonce=/.test(s));
      const withNonce = scriptTags.filter((s) => s.includes(`nonce="${nonce1}"`));
      info(`${scriptTags.length} <script> no HTML, ${withNonce.length} com nonce do header`);
      if (nonce1 && withNonce.length > 0) ok(`scripts carregam nonce == header (${withNonce.length})`);
      else bad("nenhum <script> com nonce idêntico ao do header → hydration bloqueada (causa da tela branca)");
    }
  } catch (e) { bad(`GET / falhou: ${e.message}`); }

  // 4. Render per-request: 2ª request → nonce diferente
  console.log("3) Render per-request (force-dynamic)");
  try {
    const r2 = await get("/");
    const nonce2 = nonceFromCsp(r2.headers.get("content-security-policy"));
    if (!nonce1 || !nonce2) info("pulado (faltou nonce em alguma request)");
    else if (nonce1 !== nonce2) ok(`2º nonce difere (${nonce2.slice(0, 12)}…) → dynamic real`);
    else bad("nonce idêntico entre requests → página pode estar estática (CSP não per-request)");
  } catch (e) { bad(`2ª GET / falhou: ${e.message}`); }

  // 5. /api/reset → Clear-Site-Data
  console.log("4) Kill-switch /api/reset");
  try {
    const r = await get("/api/reset");
    const csd = r.headers.get("clear-site-data");
    csd ? ok(`Clear-Site-Data: ${csd}`) : bad("/api/reset sem header Clear-Site-Data");
  } catch (e) { bad(`/api/reset falhou: ${e.message}`); }

  console.log(`\n${failures === 0 ? "\x1b[32m✅ Todas as checagens passaram\x1b[0m" : `\x1b[31m❌ ${failures} checagem(ns) falharam\x1b[0m`}\n`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => { console.error("Erro fatal:", e); process.exit(1); });
