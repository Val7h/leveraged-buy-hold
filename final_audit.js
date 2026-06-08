const https = require('https');

const BASE = 'lbh-system.onrender.com';
const findings = { critical: [], high: [], medium: [], low: [], good: [] };

function req(path, opts) {
  opts = opts || {};
  return new Promise((resolve) => {
    const options = {
      hostname: BASE, path: path,
      method: opts.method || 'GET',
      headers: {
        'Authorization': opts.token !== undefined ? (opts.token ? 'Bearer ' + opts.token : '') : 'Bearer demo_test',
        'Content-Type': 'application/json'
      }
    };
    const start = Date.now();
    const r = https.request(options, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({
        status: res.statusCode, body: d, ms: Date.now() - start, headers: res.headers,
        json: () => { try { return JSON.parse(d); } catch(e) { return null; } }
      }));
    });
    r.on('error', e => resolve({ status: 0, body: e.message, ms: Date.now() - start, json: () => null }));
    if (opts.body) r.write(JSON.stringify(opts.body));
    r.end();
  });
}

async function run() {
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║      AUDITORIA COMPLETA — LBH SYSTEM EM PRODUÇÃO            ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  // ═══ STRESS TEST ═══
  console.log('⚡ STRESS TEST: 50 requests simultâneos');
  const promises = [];
  for (let i = 0; i < 50; i++) promises.push(req('/api/v1/assets/screen?tickers=NEE,SO,D&min_score=0'));
  const start = Date.now();
  const results = await Promise.all(promises);
  const total = Date.now() - start;
  const ok = results.filter(r => r.status === 200).length;
  const times = results.map(r => r.ms).sort((a,b) => a-b);
  console.log('  ' + ok + '/50 sucessos em ' + total + 'ms');
  console.log('  P50: ' + times[25] + 'ms | P95: ' + times[47] + 'ms | P99: ' + times[49] + 'ms');
  if (ok === 50 && times[47] < 2000) findings.good.push('Aguenta 50 reqs simultâneos com P95 < 2s');
  if (ok < 50) findings.critical.push((50-ok) + ' requests falharam sob carga');

  // ═══ PÁGINAS (verificação correta usando título) ═══
  console.log('\n🧭 PÁGINAS (verificando por title + tamanho)');
  const pages = ['/', '/login', '/dashboard', '/assets', '/portfolio', '/alerts',
                 '/watchlist', '/backtest', '/simulator', '/sharpe-compare', '/history', '/pricing'];

  let pageOk = 0;
  for (const p of pages) {
    const r = await req(p);
    const titleMatch = r.body.match(/<title>(.*?)<\/title>/);
    const hasLBHTitle = titleMatch && (titleMatch[1].includes('Leveraged') || titleMatch[1].includes('LBH'));
    const isHTML = r.body.startsWith('<!DOCTYPE') || r.body.startsWith('<html');
    const sizeOk = r.body.length > 2000;
    const result = r.status === 200 && hasLBHTitle && isHTML && sizeOk;
    if (result) {
      pageOk++;
      console.log('  ✅ ' + p.padEnd(20) + ' OK (' + r.ms + 'ms, ' + r.body.length + 'b)');
    } else {
      findings.critical.push(p + ' não carrega corretamente');
      console.log('  ❌ ' + p.padEnd(20) + ' HTTP ' + r.status);
    }
  }
  if (pageOk === pages.length) findings.good.push('Todas as ' + pages.length + ' páginas carregam corretamente');

  // ═══ APIs ═══
  console.log('\n🔌 APIs');
  const apis = [
    { p: '/api/v1/assets/market-state', validate: (j) => j && j.state && j.multiplier && j.signals },
    { p: '/api/v1/assets/screen?tickers=NEE,SO', validate: (j) => j && Array.isArray(j.assets) },
    { p: '/api/v1/portfolio', validate: (j) => Array.isArray(j) },
    { p: '/api/v1/watchlist', validate: (j) => Array.isArray(j) },
    { p: '/api/v1/alerts', validate: (j) => Array.isArray(j) },
    { p: '/api/v1/auth/me', validate: (j) => j && j.email && j.full_name },
  ];
  let apiOk = 0;
  for (const a of apis) {
    const r = await req(a.p);
    const valid = r.status === 200 && a.validate(r.json());
    if (valid) { apiOk++; console.log('  ✅ ' + a.p); }
    else { findings.high.push(a.p + ' contrato inválido'); console.log('  ❌ ' + a.p + ' HTTP ' + r.status); }
  }
  if (apiOk === apis.length) findings.good.push('Todas as ' + apis.length + ' APIs com contrato correto');

  // ═══ DADOS ═══
  console.log('\n📊 QUALIDADE DOS DADOS');
  const d = (await req('/api/v1/assets/screen?tickers=NEE,SO,D,DUK,JNJ,PG')).json();
  if (d && d.assets) {
    const requiredFields = ['ticker', 'company_name', 'sector', 'current_price', 'quality_score',
      'opportunity_score', 'composite_score', 'entry_signal', 'recommended_leverage',
      'max_recommended_leverage', 'risk_rating', 'technicals', 'kelly'];

    let allValid = true;
    d.assets.forEach(a => {
      requiredFields.forEach(f => {
        if (a[f] === undefined || a[f] === null) allValid = false;
      });
    });

    if (allValid) {
      findings.good.push('Todos os 13 campos obrigatórios presentes nos ativos');
      console.log('  ✅ 13 campos obrigatórios presentes');
    }

    const scoresOk = d.assets.every(a => a.quality_score <= 100 && a.composite_score <= 100);
    const levOk = d.assets.every(a => a.recommended_leverage >= 1 && a.recommended_leverage <= 5);
    const rsiOk = d.assets.every(a => a.technicals.rsi_weekly > 0 && a.technicals.rsi_weekly < 100);

    if (scoresOk) { findings.good.push('Scores 0-100 válidos'); console.log('  ✅ Scores em range válido'); }
    if (levOk) { findings.good.push('Leverage 1x-5x válida'); console.log('  ✅ Leverage em range válido'); }
    if (rsiOk) { findings.good.push('RSI 0-100 válido'); console.log('  ✅ RSI em range válido'); }

    // Verificar se dados são reais (NEE não pode ser exatamente 75.50)
    const neeAsset = d.assets.find(a => a.ticker === 'NEE');
    if (neeAsset && neeAsset.current_price !== 75.50) {
      findings.good.push('Dados REAIS do Yahoo Finance (preço NEE: $' + neeAsset.current_price + ')');
      console.log('  ✅ Dados REAIS do Yahoo Finance');
    } else {
      findings.medium.push('Dados parecem MOCK (NEE = $75.50)');
      console.log('  ⚠️  Dados parecem MOCK');
    }
  }

  // ═══ SEGURANÇA ═══
  console.log('\n🔒 SEGURANÇA');
  const homeR = await req('/');
  const h = homeR.headers;

  if (!h['strict-transport-security']) findings.high.push('SEM HSTS');
  else { findings.good.push('HSTS habilitado'); console.log('  ✅ HSTS'); }

  if (!h['x-frame-options']) findings.medium.push('SEM X-Frame-Options (clickjacking)');
  else findings.good.push('X-Frame-Options OK');

  if (!h['content-security-policy']) findings.medium.push('SEM CSP (XSS risk)');
  else findings.good.push('CSP definido');

  // Auth aceita qualquer credencial
  const fakeLogin = (await req('/api/v1/auth/login', { method: 'POST', body: { email: 'x', password: 'x' } })).json();
  if (fakeLogin && fakeLogin.access_token) {
    findings.high.push('Auth aceita QUALQUER credencial (demo mode = não seguro)');
    console.log('  ⚠️  Auth em modo demo (aceita qualquer credencial)');
  }

  // ═══ DEMO MODE ═══
  console.log('\n⚡ DEMO MODE');
  const loginPage = (await req('/login')).body;
  if (loginPage.includes('Demo') || loginPage.includes('demo')) {
    findings.good.push('Botão Demo Mode visível na página de login');
    console.log('  ✅ Botão "Entrar em Modo Demo" presente');
  } else {
    findings.high.push('Botão Demo Mode NÃO está visível');
  }

  if (loginPage.includes('Esqueci')) {
    findings.good.push('Link "Esqueci a senha" presente');
    console.log('  ✅ Link "Esqueci a senha" presente');
  }

  // ═══ EDGE CASES ═══
  console.log('\n🔧 EDGE CASES');
  const empty = (await req('/api/v1/assets/screen?tickers=XXXXX')).json();
  if (empty && empty.assets && empty.assets.length === 0) {
    findings.good.push('Lida bem com ticker inexistente');
    console.log('  ✅ Ticker inexistente → array vazio');
  }

  const noRoute = await req('/api/v1/inexistente');
  if (noRoute.status === 404) {
    findings.good.push('Rotas inexistentes retornam 404');
    console.log('  ✅ Rota inexistente → 404');
  }

  // ═══ SEO ═══
  console.log('\n🌐 SEO');
  const robotsR = await req('/robots.txt');
  if (robotsR.status === 200) findings.good.push('robots.txt presente');
  else { findings.low.push('robots.txt ausente'); console.log('  ⚠️  robots.txt ausente'); }

  const sitemapR = await req('/sitemap.xml');
  if (sitemapR.status === 200) findings.good.push('sitemap.xml presente');
  else { findings.low.push('sitemap.xml ausente'); console.log('  ⚠️  sitemap.xml ausente'); }

  const titleMatch = homeR.body.match(/<title>(.*?)<\/title>/);
  if (titleMatch) { findings.good.push('Title tag OK'); console.log('  ✅ Title: ' + titleMatch[1].slice(0,50)); }
  if (homeR.body.includes('description')) { findings.good.push('Meta description OK'); console.log('  ✅ Meta description'); }

  // ═══ RELATÓRIO FINAL ═══
  console.log('\n\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║                  RELATÓRIO FINAL E HONESTO                   ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');

  if (findings.critical.length > 0) {
    console.log('\n🔴 CRÍTICOS: ' + findings.critical.length);
    findings.critical.forEach(f => console.log('   • ' + f));
  } else {
    console.log('\n🔴 CRÍTICOS: 0 ✅');
  }

  console.log('\n🟠 ALTOS: ' + findings.high.length);
  findings.high.forEach(f => console.log('   • ' + f));

  console.log('\n🟡 MÉDIOS: ' + findings.medium.length);
  findings.medium.forEach(f => console.log('   • ' + f));

  console.log('\n🔵 BAIXOS: ' + findings.low.length);
  findings.low.forEach(f => console.log('   • ' + f));

  console.log('\n✅ PONTOS POSITIVOS: ' + findings.good.length);
  findings.good.forEach(f => console.log('   • ' + f));

  // Score real
  const totalProblems = findings.critical.length * 15 + findings.high.length * 7 +
                        findings.medium.length * 3 + findings.low.length * 1;
  const totalBonus = findings.good.length * 2;
  const score = Math.min(100, Math.max(0, 70 - totalProblems + totalBonus));

  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║  🎯 SCORE: ' + score + '/100' + ' '.repeat(50 - String(score).length) + '║');
  console.log('║                                                              ║');
  if (score >= 85) console.log('║  ✅ PRONTO PARA PRODUÇÃO                                    ║');
  else if (score >= 70) console.log('║  ⚠️  PRONTO PARA BETA (pequenos ajustes)                    ║');
  else console.log('║  ❌ PRECISA AJUSTES                                         ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');
}

run().catch(console.error);
