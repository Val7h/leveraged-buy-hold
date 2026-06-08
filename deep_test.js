const https = require('https');

const BASE = 'lbh-system.onrender.com';
const findings = { critical: [], high: [], medium: [], low: [], good: [] };

function req(path, opts) {
  opts = opts || {};
  return new Promise((resolve) => {
    const options = {
      hostname: BASE,
      path: path,
      method: opts.method || 'GET',
      headers: {
        'Authorization': opts.token ? 'Bearer ' + opts.token : 'Bearer demo_test',
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (LBH-DeepTest)'
      }
    };
    const start = Date.now();
    const r = https.request(options, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({
        status: res.statusCode,
        body: d,
        ms: Date.now() - start,
        headers: res.headers,
        json: () => { try { return JSON.parse(d); } catch(e) { return null; } }
      }));
    });
    r.on('error', e => resolve({ status: 0, body: e.message, ms: Date.now() - start, json: () => null }));
    if (opts.body) r.write(JSON.stringify(opts.body));
    r.end();
  });
}

async function runDeepTests() {
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║          AUDITORIA PROFUNDA — LBH SYSTEM PRODUÇÃO          ║');
  console.log('║          https://lbh-system.onrender.com                     ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  // ═══════════════════════════════════════════════════════════
  // TESTE 1: SEGURANÇA E HEADERS
  // ═══════════════════════════════════════════════════════════
  console.log('🔒 TESTE 1: SEGURANÇA & HEADERS HTTP');
  console.log('────────────────────────────────────────────');
  const homeR = await req('/');
  const h = homeR.headers;

  if (h['strict-transport-security']) findings.good.push('HSTS habilitado');
  else findings.high.push('SEM HSTS — vulnerável a downgrade attacks');

  if (h['x-frame-options']) findings.good.push('X-Frame-Options definido');
  else findings.medium.push('SEM X-Frame-Options — possível clickjacking');

  if (h['x-content-type-options']) findings.good.push('X-Content-Type-Options OK');
  else findings.low.push('SEM X-Content-Type-Options');

  if (h['content-security-policy']) findings.good.push('CSP definida');
  else findings.medium.push('SEM CSP — pode permitir XSS');

  console.log('Headers analisados:');
  console.log('  HSTS:           ' + (h['strict-transport-security'] || 'AUSENTE'));
  console.log('  X-Frame:        ' + (h['x-frame-options'] || 'AUSENTE'));
  console.log('  CSP:            ' + (h['content-security-policy'] || 'AUSENTE'));
  console.log('  Server:         ' + (h['server'] || h['x-powered-by'] || 'oculto'));

  // ═══════════════════════════════════════════════════════════
  // TESTE 2: STRESS TEST — 50 REQUESTS SIMULTÂNEOS
  // ═══════════════════════════════════════════════════════════
  console.log('\n⚡ TESTE 2: STRESS TEST (50 requests simultâneos)');
  console.log('────────────────────────────────────────────');
  const stressPromises = [];
  for (let i = 0; i < 50; i++) {
    stressPromises.push(req('/api/v1/assets/screen?tickers=NEE,SO,D&min_score=0'));
  }
  const stressStart = Date.now();
  const stressResults = await Promise.all(stressPromises);
  const stressTime = Date.now() - stressStart;
  const stressOk = stressResults.filter(r => r.status === 200).length;
  const stressTimes = stressResults.map(r => r.ms).sort((a,b) => a-b);
  const p50 = stressTimes[Math.floor(stressTimes.length * 0.5)];
  const p95 = stressTimes[Math.floor(stressTimes.length * 0.95)];
  const p99 = stressTimes[Math.floor(stressTimes.length * 0.99)];

  console.log('  Sucesso:        ' + stressOk + '/50');
  console.log('  Tempo total:    ' + stressTime + 'ms');
  console.log('  P50 (mediana):  ' + p50 + 'ms');
  console.log('  P95:            ' + p95 + 'ms');
  console.log('  P99:            ' + p99 + 'ms');

  if (stressOk === 50) findings.good.push('Suporta 50 requests simultâneos sem erro');
  else findings.critical.push(stressOk + '/50 requests falharam sob carga');

  if (p95 < 2000) findings.good.push('P95 < 2s (boa performance)');
  else if (p95 < 5000) findings.medium.push('P95 = ' + p95 + 'ms (aceitável)');
  else findings.high.push('P95 = ' + p95 + 'ms (LENTO)');

  // ═══════════════════════════════════════════════════════════
  // TESTE 3: DADOS - QUALIDADE E REALISMO
  // ═══════════════════════════════════════════════════════════
  console.log('\n📊 TESTE 3: QUALIDADE DOS DADOS');
  console.log('────────────────────────────────────────────');
  const screenR = await req('/api/v1/assets/screen?tickers=NEE,SO,D,DUK,JNJ,PG&min_score=0');
  const data = screenR.json();

  if (data && data.assets) {
    console.log('  Ativos retornados: ' + data.assets.length);
    let allFieldsOk = true;
    const requiredFields = ['ticker', 'company_name', 'sector', 'current_price',
                            'quality_score', 'opportunity_score', 'composite_score',
                            'entry_signal', 'recommended_leverage', 'max_recommended_leverage',
                            'risk_rating', 'technicals', 'kelly'];

    data.assets.forEach(asset => {
      requiredFields.forEach(f => {
        if (asset[f] === undefined || asset[f] === null) {
          allFieldsOk = false;
          findings.high.push('Asset ' + asset.ticker + ' sem campo: ' + f);
        }
      });
    });

    if (allFieldsOk) findings.good.push('Todos os 13 campos obrigatórios presentes');

    // Validar realismo de preços
    const NEE = data.assets.find(a => a.ticker === 'NEE');
    if (NEE) {
      console.log('  NEE preço: $' + NEE.current_price);
      if (NEE.current_price === 75.50) {
        findings.medium.push('Preço NEE é FIXO ($75.50) — não é tempo real');
      }
    }
  } else {
    findings.critical.push('API Screening retorna dados inválidos');
  }

  // ═══════════════════════════════════════════════════════════
  // TESTE 4: NAVEGAÇÃO COMPLETA
  // ═══════════════════════════════════════════════════════════
  console.log('\n🧭 TESTE 4: NAVEGAÇÃO E PÁGINAS');
  console.log('────────────────────────────────────────────');
  const pages = [
    '/', '/login', '/dashboard', '/assets', '/portfolio',
    '/alerts', '/watchlist', '/backtest', '/simulator',
    '/sharpe-compare', '/history', '/pricing'
  ];

  let nextErrors = 0;
  for (const p of pages) {
    const r = await req(p);
    const hasError = r.body.includes('__next_error__');
    const has404 = r.body.includes('This page could not be found');

    if (has404) {
      findings.critical.push(p + ' retorna 404');
      console.log('  ❌ ' + p + ' — 404');
    } else if (hasError) {
      nextErrors++;
      console.log('  ⚠️  ' + p + ' — erro JS (precisa login)');
    } else {
      console.log('  ✅ ' + p + ' — OK (' + r.ms + 'ms)');
    }
  }

  if (nextErrors > 0) {
    findings.high.push(nextErrors + ' páginas com erro JS sem auth — UX ruim');
  }

  // ═══════════════════════════════════════════════════════════
  // TESTE 5: API CONTRACT - VALIDAR RESPOSTAS
  // ═══════════════════════════════════════════════════════════
  console.log('\n📋 TESTE 5: CONTRATOS DE API');
  console.log('────────────────────────────────────────────');

  // Market State
  const ms = (await req('/api/v1/assets/market-state')).json();
  const msContract = ms && ms.state && ms.multiplier && ms.signals;
  console.log('  Market State:   ' + (msContract ? '✅' : '❌'));

  // Login
  const login = (await req('/api/v1/auth/login', { method: 'POST', body: { email: 'a@b.com', password: '123' } })).json();
  const loginContract = login && login.access_token && login.token_type;
  console.log('  Login:          ' + (loginContract ? '✅' : '❌'));

  // Portfolio
  const port = (await req('/api/v1/portfolio')).json();
  console.log('  Portfolio:      ' + (Array.isArray(port) ? '✅ (array)' : '❌'));

  // ═══════════════════════════════════════════════════════════
  // TESTE 6: EDGE CASES
  // ═══════════════════════════════════════════════════════════
  console.log('\n🔧 TESTE 6: EDGE CASES');
  console.log('────────────────────────────────────────────');

  // Ticker inexistente
  const notFound = await req('/api/v1/assets/screen?tickers=XXXNOTREAL&min_score=0');
  const nfData = notFound.json();
  if (nfData && nfData.assets && nfData.assets.length === 0) {
    console.log('  ✅ Ticker inexistente → array vazio (correto)');
    findings.good.push('Lida bem com ticker inexistente');
  } else {
    console.log('  ❌ Ticker inexistente → resposta inesperada');
    findings.medium.push('Edge case ticker inexistente mal tratado');
  }

  // Min score impossível
  const highScore = await req('/api/v1/assets/screen?tickers=NEE,SO&min_score=999');
  const hsData = highScore.json();
  if (hsData && hsData.assets && hsData.assets.length === 0) {
    console.log('  ✅ Min score impossível → array vazio (correto)');
  } else {
    findings.low.push('Min score muito alto não filtra corretamente');
  }

  // URL inexistente
  const notExist = await req('/api/v1/inexistente');
  console.log('  ' + (notExist.status === 404 ? '✅' : '⚠️') + ' Rota inexistente → HTTP ' + notExist.status);

  // ═══════════════════════════════════════════════════════════
  // TESTE 7: AUTENTICAÇÃO
  // ═══════════════════════════════════════════════════════════
  console.log('\n🔐 TESTE 7: AUTENTICAÇÃO');
  console.log('────────────────────────────────────────────');

  // Login com qualquer credencial deveria aceitar (demo mode)
  const anyLogin = (await req('/api/v1/auth/login', { method: 'POST', body: { email: 'qualquer@coisa.com', password: '12' } })).json();
  if (anyLogin && anyLogin.access_token) {
    console.log('  ⚠️  Login aceita QUALQUER credencial (modo demo)');
    findings.high.push('Auth aceita qualquer email/senha — não é seguro p/ produção');
  }

  // Acessar /me sem token
  const noToken = await req('/api/v1/auth/me', { token: '' });
  if (noToken.status === 200) {
    console.log('  ⚠️  /me responde sem token (modo demo)');
    findings.medium.push('/me não valida token');
  }

  // ═══════════════════════════════════════════════════════════
  // TESTE 8: MOBILE / RESPONSIVIDADE
  // ═══════════════════════════════════════════════════════════
  console.log('\n📱 TESTE 8: RESPONSIVE DESIGN');
  console.log('────────────────────────────────────────────');
  const homeBody = (await req('/')).body;

  if (homeBody.includes('viewport')) findings.good.push('Meta viewport presente');
  if (homeBody.includes('sm:') || homeBody.includes('md:') || homeBody.includes('lg:')) {
    console.log('  ✅ Classes responsive Tailwind detectadas');
    findings.good.push('Design responsive (Tailwind)');
  }
  if (homeBody.includes('flex')) console.log('  ✅ Layout flex detectado');

  // ═══════════════════════════════════════════════════════════
  // TESTE 9: SEO BÁSICO
  // ═══════════════════════════════════════════════════════════
  console.log('\n🌐 TESTE 9: SEO BÁSICO');
  console.log('────────────────────────────────────────────');
  const titleMatch = homeBody.match(/<title>(.*?)<\/title>/);
  const descMatch = homeBody.match(/<meta name="description" content="(.*?)"/);

  console.log('  Title:       ' + (titleMatch ? '✅ "' + titleMatch[1].slice(0,60) + '"' : '❌'));
  console.log('  Description: ' + (descMatch ? '✅' : '❌'));

  const robotsR = await req('/robots.txt');
  console.log('  robots.txt:  ' + (robotsR.status === 200 ? '✅' : '⚠️ AUSENTE'));
  if (robotsR.status !== 200) findings.low.push('robots.txt ausente');

  const sitemapR = await req('/sitemap.xml');
  console.log('  sitemap.xml: ' + (sitemapR.status === 200 ? '✅' : '⚠️ AUSENTE'));
  if (sitemapR.status !== 200) findings.low.push('sitemap.xml ausente');

  // ═══════════════════════════════════════════════════════════
  // RELATÓRIO FINAL
  // ═══════════════════════════════════════════════════════════
  console.log('\n\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║                    RELATÓRIO FINAL                          ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  console.log('🔴 PROBLEMAS CRÍTICOS: ' + findings.critical.length);
  findings.critical.forEach(f => console.log('   • ' + f));

  console.log('\n🟠 PROBLEMAS ALTOS: ' + findings.high.length);
  findings.high.forEach(f => console.log('   • ' + f));

  console.log('\n🟡 PROBLEMAS MÉDIOS: ' + findings.medium.length);
  findings.medium.forEach(f => console.log('   • ' + f));

  console.log('\n🔵 PROBLEMAS BAIXOS: ' + findings.low.length);
  findings.low.forEach(f => console.log('   • ' + f));

  console.log('\n✅ PONTOS POSITIVOS: ' + findings.good.length);
  findings.good.forEach(f => console.log('   • ' + f));

  // Score
  const totalProblems = findings.critical.length * 10 + findings.high.length * 5 +
                        findings.medium.length * 2 + findings.low.length;
  const score = Math.max(0, 100 - totalProblems);

  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║  🎯 SCORE FINAL: ' + score + '/100                                          ║');
  console.log('║                                                              ║');
  if (score >= 85) console.log('║  ✅ PRONTO PARA PRODUÇÃO                                    ║');
  else if (score >= 70) console.log('║  ⚠️  PRONTO PARA BETA (corrigir problemas altos)            ║');
  else if (score >= 50) console.log('║  ⚠️  PRECISA REVISÃO ANTES DO LANÇAMENTO                    ║');
  else console.log('║  ❌ NÃO ESTÁ PRONTO                                         ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
}

runDeepTests().catch(console.error);
