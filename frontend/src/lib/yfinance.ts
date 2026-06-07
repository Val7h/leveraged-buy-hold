/**
 * Yahoo Finance API client - sem deps externas, fetch direto.
 * Usado pelas API routes para dados reais de mercado.
 */
import { getCache } from "./cache";
import { withRetry } from "./retry";

interface QuoteResult {
  ticker: string;
  current_price: number;
  previous_close: number;
  change_pct: number;
  currency: string;
  company_name: string;
  market_cap: number;
  pe_ratio: number | null;
  dividend_yield: number | null;
  beta: number | null;
  sector: string | null;
  industry: string | null;
  rsi_weekly: number | null;
  ma200: number;
  ma200_distance_pct: number;
  high_52w: number;
  low_52w: number;
  realized_vol_30d: number | null;
}

// Cache key prefix — v3: compliance CVM (entry_signal usa OPORTUNIDADE/NEUTRO/DESFAVORÁVEL).
const CACHE_PREFIX = "quote:v3:";
const CACHE_TTL_SEC = 300; // 5 min
const YAHOO_FETCH_TIMEOUT_MS = 10_000;

/**
 * Calcula RSI usando Wilder smoothing recursivo (RMA / EMA com alpha = 1/period).
 *
 * Algoritmo Wilder (1978) "New Concepts in Technical Trading Systems":
 *   1. Seed = SMA dos primeiros `period` deltas (gains/losses).
 *   2. A partir do índice period+1: avg_t = (avg_{t-1} * (period-1) + current) / period.
 *   3. RS = avgGain/avgLoss; RSI = 100 - 100/(1+RS).
 *
 * Retorna null se houver dados insuficientes (não 50 — evita falsos sinais).
 */
export function calculateRSI(prices: number[], period = 14): number | null {
  if (prices.length < period + 1) return null;
  let gains = 0;
  let losses = 0;
  // Seed: SMA dos primeiros `period` deltas
  for (let i = 1; i <= period; i++) {
    const d = prices[i] - prices[i - 1];
    if (d > 0) gains += d;
    else losses -= d;
  }
  let avgGain = gains / period;
  let avgLoss = losses / period;
  // Wilder smoothing recursivo (RMA)
  for (let i = period + 1; i < prices.length; i++) {
    const d = prices[i] - prices[i - 1];
    const g = d > 0 ? d : 0;
    const l = d < 0 ? -d : 0;
    avgGain = (avgGain * (period - 1) + g) / period;
    avgLoss = (avgLoss * (period - 1) + l) / period;
  }
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

/**
 * Agrega séries diárias em fechamentos semanais (ISO week, Mon-Sun).
 * Pega o ÚLTIMO close de cada bucket semanal (close-of-week).
 * NÃO faz subsampling — agregação correta por week-of-year.
 */
export function aggregateWeeklyCloses(
  series: Array<{ ts: number; close: number }>
): number[] {
  if (!series.length) return [];
  const buckets = new Map<string, { ts: number; close: number }>();
  for (const point of series) {
    const date = new Date(point.ts * 1000);
    // ISO week: Thursday rule
    const dow = (date.getUTCDay() + 6) % 7; // Mon=0..Sun=6
    const thursday = new Date(date.getTime());
    thursday.setUTCDate(date.getUTCDate() - dow + 3);
    const isoYear = thursday.getUTCFullYear();
    const firstThursday = new Date(Date.UTC(isoYear, 0, 4));
    const firstThursdayDow = (firstThursday.getUTCDay() + 6) % 7;
    const week1Monday = new Date(firstThursday.getTime());
    week1Monday.setUTCDate(firstThursday.getUTCDate() - firstThursdayDow);
    const week =
      Math.floor((thursday.getTime() - week1Monday.getTime()) / (7 * 86400000)) + 1;
    const key = `${isoYear}-${week.toString().padStart(2, "0")}`;
    const existing = buckets.get(key);
    if (!existing || point.ts > existing.ts) {
      buckets.set(key, point);
    }
  }
  return Array.from(buckets.values())
    .sort((a, b) => a.ts - b.ts)
    .map((p) => p.close);
}

/**
 * Calcula volatilidade realizada anualizada com Bessel correction (n-1).
 * Mínimo 22 preços (21 retornos). Abaixo disso retorna null.
 */
export function calculateVol(prices: number[]): number | null {
  if (prices.length < 22) return null;
  const returns: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    returns.push(Math.log(prices[i] / prices[i - 1]));
  }
  const mean = returns.reduce((s, r) => s + r, 0) / returns.length;
  // Bessel correction: dividir por (n-1), não n
  const variance =
    returns.reduce((s, r) => s + (r - mean) ** 2, 0) / (returns.length - 1);
  return Math.sqrt(variance) * Math.sqrt(252) * 100;
}

/**
 * Busca beta, dividend yield, PE e setor reais via Yahoo quoteSummary (query2).
 * Cache 24h via Next.js revalidate. Em erro retorna nulls (gracioso).
 *
 * PEGADINHA: tickers .SA e *ONUSDT geralmente retornam 404 — silencia warning.
 */
export async function fetchQuoteSummary(ticker: string): Promise<{
  beta: number | null;
  dividend_yield: number | null;
  pe_ratio: number | null;
  sector: string | null;
  industry: string | null;
}> {
  const isLowProb =
    ticker.endsWith(".SA") || ticker.includes("ONUSDT") || ticker.endsWith("-USD");
  try {
    const url = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(
      ticker
    )}?modules=summaryDetail,defaultKeyStatistics,assetProfile,financialData`;
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "application/json,text/plain,*/*",
      },
      signal: AbortSignal.timeout(YAHOO_FETCH_TIMEOUT_MS),
      next: { revalidate: 86400 }, // 24h
    });
    if (!res.ok) {
      if (!isLowProb && res.status !== 404) {
        console.warn(`quoteSummary ${ticker} HTTP ${res.status}`);
      }
      return { beta: null, dividend_yield: null, pe_ratio: null, sector: null, industry: null };
    }
    const data = await res.json();
    const root = data?.quoteSummary?.result?.[0];
    if (!root) {
      return { beta: null, dividend_yield: null, pe_ratio: null, sector: null, industry: null };
    }
    const summary = root.summaryDetail ?? {};
    const profile = root.assetProfile ?? {};
    const beta = typeof summary.beta?.raw === "number" ? summary.beta.raw : null;
    // dividendYield é decimal — multiplicar por 100 para %
    const dy =
      typeof summary.dividendYield?.raw === "number"
        ? summary.dividendYield.raw * 100
        : null;
    const pe =
      typeof summary.trailingPE?.raw === "number" ? summary.trailingPE.raw : null;
    const sector = typeof profile.sector === "string" ? profile.sector : null;
    const industry = typeof profile.industry === "string" ? profile.industry : null;
    return { beta, dividend_yield: dy, pe_ratio: pe, sector, industry };
  } catch (err) {
    if (!isLowProb) {
      console.warn(`quoteSummary ${ticker} fetch error:`, err);
    }
    return { beta: null, dividend_yield: null, pe_ratio: null, sector: null, industry: null };
  }
}

async function fetchYahoo(url: string): Promise<any> {
  return withRetry(
    async () => {
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 LBH-System" },
        signal: AbortSignal.timeout(YAHOO_FETCH_TIMEOUT_MS),
        cache: "no-store", // external cache layer controls TTL now
      });
      if (!res.ok) {
        const err: Error & { status?: number } = new Error(`Yahoo HTTP ${res.status}`);
        err.status = res.status;
        throw err;
      }
      return res.json();
    },
    { maxAttempts: 3, baseMs: 200, maxMs: 5000 }
  );
}

export async function getQuote(ticker: string): Promise<QuoteResult | null> {
  const cache = getCache();
  const cacheKey = CACHE_PREFIX + ticker.toUpperCase();

  // Cache hit?
  const cached = await cache.get<QuoteResult>(cacheKey);
  if (cached) return cached;

  try {
    // Chart (preço + série histórica) e quoteSummary (beta/DY/PE/setor) em paralelo
    const quoteUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?range=1y&interval=1d&includePrePost=false`;
    const [data, summaryFields] = await Promise.all([
      fetchYahoo(quoteUrl),
      fetchQuoteSummary(ticker),
    ]);

    const result = data?.chart?.result?.[0];
    if (!result) return null;

    const meta = result.meta;
    const rawCloses: Array<number | null> = result.indicators?.quote?.[0]?.close || [];
    const rawTimestamps: number[] = result.timestamp || [];

    // Pares (ts, close) válidos preservando alinhamento — necessário para agregação semanal correta
    const series: Array<{ ts: number; close: number }> = [];
    for (let i = 0; i < rawCloses.length; i++) {
      const c = rawCloses[i];
      const t = rawTimestamps[i];
      if (c != null && t != null) series.push({ ts: t, close: c });
    }
    const closes = series.map((s) => s.close);

    if (closes.length < 50) return null;

    const current = meta.regularMarketPrice || closes[closes.length - 1];
    const prevClose = meta.previousClose || meta.chartPreviousClose;

    // MA200
    const ma200 = closes.length >= 200
      ? closes.slice(-200).reduce((s, v) => s + v, 0) / 200
      : closes.reduce((s, v) => s + v, 0) / closes.length;

    // RSI semanal real: agrega por ISO week (último close de cada semana), depois Wilder RSI(14)
    const weeklyCloses = aggregateWeeklyCloses(series);
    const rsiWeekly = weeklyCloses.length >= 15 ? calculateRSI(weeklyCloses, 14) : null;

    // Volatilidade 30d com Bessel (mínimo 22 preços; senão null)
    const vol = calculateVol(closes.slice(-30));

    // 52w high/low
    const high52w = Math.max(...closes);
    const low52w = Math.min(...closes);

    const quoteResult: QuoteResult = {
      ticker: ticker.toUpperCase(),
      current_price: Number(current.toFixed(2)),
      previous_close: Number((prevClose || current).toFixed(2)),
      change_pct: prevClose ? Number(((current - prevClose) / prevClose * 100).toFixed(2)) : 0,
      currency: meta.currency || "USD",
      company_name: meta.shortName || meta.longName || ticker,
      market_cap: meta.marketCap || 0,
      pe_ratio: summaryFields.pe_ratio,
      dividend_yield: summaryFields.dividend_yield,
      beta: summaryFields.beta,
      sector: summaryFields.sector,
      industry: summaryFields.industry,
      rsi_weekly: rsiWeekly != null ? Number(rsiWeekly.toFixed(1)) : null,
      ma200: Number(ma200.toFixed(2)),
      ma200_distance_pct: Number(((current - ma200) / ma200 * 100).toFixed(2)),
      high_52w: Number(high52w.toFixed(2)),
      low_52w: Number(low52w.toFixed(2)),
      realized_vol_30d: vol != null ? Number(vol.toFixed(1)) : null,
    };

    await cache.set(cacheKey, quoteResult, CACHE_TTL_SEC);
    return quoteResult;
  } catch (err) {
    console.error(`Yahoo fetch failed for ${ticker}:`, err);
    return null;
  }
}

/**
 * Detecta setor a partir do ticker (heurística simples).
 */
export function getSector(ticker: string): string {
  const t = ticker.toUpperCase();
  const sectors: Record<string, string[]> = {
    "Utilities": ["NEE", "SO", "D", "DUK", "AEP", "WEC", "ES", "EXC", "PCG", "ETR", "AWK", "EIX"],
    "Healthcare": ["JNJ", "ABT", "MDT", "BMY", "PFE", "MRK", "UNH", "CVS", "CI", "LLY", "TMO", "ABBV"],
    "Consumer Staples": ["PG", "KO", "PEP", "MO", "CL", "GIS", "K", "CPB", "HRL", "KMB", "EL"],
    "Technology": ["AAPL", "MSFT", "NVDA", "GOOGL", "GOOG", "META", "AMZN", "TSLA", "ORCL", "CRM"],
    "REITs": ["O", "MAIN", "STAG", "WPC", "REG", "AMT", "PLD", "EQIX"],
    "Telecom": ["T", "VZ", "TMUS", "CMCSA"],
    "Financial": ["JPM", "BAC", "WFC", "GS", "MS", "C", "AFL", "BEN", "USB"],
  };
  for (const [sector, tickers] of Object.entries(sectors)) {
    if (tickers.includes(t)) return sector;
  }
  if (t.endsWith(".SA")) return "B3 (Brasil)";
  if (t.includes("ONUSDT")) return "Crypto Tokenized";
  return "Other";
}

/**
 * Calcula scores quantitativos baseado em dados reais.
 *
 * Kelly Criterion CANÔNICO: f* = (b*p - q) / b
 *   - p = win_rate (probabilidade de ganho)
 *   - q = 1 - p
 *   - b = payoff_ratio (avg_win / avg_loss)
 *
 * NÃO HÁ histórico de trades real → p e b são HEURÍSTICAS derivadas do
 * composite_score e da volatilidade. is_heuristic=true sempre (até termos
 * pelo menos 30 trades fechados — Thorp, MacLean-Ziemba 2010).
 *
 * Ref: Kelly, J.L. (1956); Thorp, E. (2006).
 */
export function calculateScores(q: QuoteResult): {
  quality_score: number;
  opportunity_score: number;
  composite_score: number;
  entry_signal: string;
  recommended_leverage: number;
  max_recommended_leverage: number;
  risk_rating: string;
  risk_rating_is_heuristic: boolean;
  opportunity_rating: string;
  kelly: {
    kelly_full: number;
    kelly_half: number;
    kelly_quarter: number;
    win_rate: number;
    payoff_ratio: number;
    is_heuristic: boolean;
    confidence_score: number;
  };
} {
  // Defaults seguros quando RSI/vol estão indisponíveis (null-safe)
  const vol = q.realized_vol_30d ?? 25; // 25% é vol típica do SPY — fallback neutro
  const rsi = q.rsi_weekly ?? 50;

  // Quality: baixa vol + perto da MM200
  const volScore = Math.max(0, 100 - vol * 2);
  const distMa200Score = Math.max(0, Math.min(100, 70 - Math.abs(q.ma200_distance_pct) * 2));
  const quality = Math.round((volScore * 0.6 + distMa200Score * 0.4));

  // Opportunity: RSI baixo + perto do low 52w
  const rsiScore = rsi < 30 ? 95 : rsi < 40 ? 80 : rsi < 50 ? 65 : rsi < 60 ? 50 : 30;
  const range = q.high_52w - q.low_52w;
  const lowDist = range > 0 ? (q.current_price - q.low_52w) / range : 0.5;
  const lowScore = Math.round((1 - lowDist) * 100);
  const opportunity = Math.round((rsiScore * 0.6 + lowScore * 0.4));

  const composite = Math.round(quality * 0.6 + opportunity * 0.4);

  // Sinal técnico do modelo (NÃO É RECOMENDAÇÃO DE COMPRA/VENDA — CVM Of-Circ 04/2023).
  // Os labels descrevem o cenário quantitativo, sem verbo imperativo.
  // Valores: OPORTUNIDADE | NEUTRO | DESFAVORÁVEL
  let entry_signal = "NEUTRO";
  if (composite >= 80 && rsi < 45) entry_signal = "OPORTUNIDADE";
  else if (composite >= 70 && rsi < 40) entry_signal = "OPORTUNIDADE";
  else if (composite < 50) entry_signal = "DESFAVORÁVEL";

  // ── Kelly Criterion CORRETO ──────────────────────────────────────────
  // p heurístico: composite=50 → p=0.45 (sem edge); composite=100 → p=0.65; composite=0 → p=0.40
  const p = Math.max(0.4, Math.min(0.65, 0.45 + (composite - 50) * 0.004));
  const qProb = 1 - p;
  // b heurístico: vol alta → stops batem mais → payoff_ratio menor
  const b = Math.max(0.8, Math.min(2.0, 1.5 - vol / 100));
  const kelly_full = (b * p - qProb) / b; // PODE ser negativo (sinal: não operar)
  const kelly_half = Math.max(0, kelly_full * 0.5);
  const kelly_quarter = Math.max(0, kelly_full * 0.25);

  // Alavancagem recomendada a partir de ½ Kelly (clampada em [1.0, 3.0])
  const recommended_leverage = Math.max(1.0, Math.min(3.0, 1 + kelly_half));
  const max_recommended_leverage = Math.max(
    recommended_leverage,
    Math.min(3.0, 1 + Math.max(0, kelly_full) * 0.75)
  );

  // Risk rating: usa beta REAL se disponível (CAPM-flavored), senão fallback só por vol (heurístico)
  const beta = q.beta;
  let risk_rating: string;
  let risk_rating_is_heuristic: boolean;
  if (beta != null) {
    const score = vol * 0.6 + beta * 12;
    risk_rating = score > 36 ? "ELEVADO" : score > 24 ? "MODERADO" : "BAIXO";
    risk_rating_is_heuristic = false;
  } else {
    risk_rating = vol > 30 ? "ELEVADO" : vol > 20 ? "MODERADO" : "BAIXO";
    risk_rating_is_heuristic = true;
  }

  const opportunity_rating = opportunity >= 80 ? "Excelente" : opportunity >= 65 ? "Bom" : opportunity >= 50 ? "Neutro" : "Fraco";

  const winRatePct = Number((p * 100).toFixed(1));

  return {
    quality_score: Math.max(0, Math.min(100, quality)),
    opportunity_score: Math.max(0, Math.min(100, opportunity)),
    composite_score: Math.max(0, Math.min(100, composite)),
    entry_signal,
    recommended_leverage: Number(recommended_leverage.toFixed(2)),
    max_recommended_leverage: Number(max_recommended_leverage.toFixed(2)),
    risk_rating,
    risk_rating_is_heuristic,
    opportunity_rating,
    kelly: {
      kelly_full: Number(kelly_full.toFixed(4)),
      kelly_half: Number(kelly_half.toFixed(4)),
      kelly_quarter: Number(kelly_quarter.toFixed(4)),
      win_rate: winRatePct,
      payoff_ratio: Number(b.toFixed(2)),
      is_heuristic: true,
      // confidence_score: alias backward-compat (mesma semântica de win_rate por enquanto)
      confidence_score: winRatePct,
    },
  };
}
