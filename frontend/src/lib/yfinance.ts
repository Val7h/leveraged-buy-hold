/**
 * Yahoo Finance API client - sem deps externas, fetch direto.
 * Usado pelas API routes para dados reais de mercado.
 */

interface QuoteResult {
  ticker: string;
  current_price: number;
  previous_close: number;
  change_pct: number;
  currency: string;
  company_name: string;
  market_cap: number;
  pe_ratio: number | null;
  dividend_yield: number;
  beta: number;
  rsi_weekly: number;
  ma200: number;
  ma200_distance_pct: number;
  high_52w: number;
  low_52w: number;
  realized_vol_30d: number;
}

const cache = new Map<string, { data: QuoteResult; expires: number }>();
const TTL_MS = 5 * 60 * 1000; // 5 min cache

/**
 * Calcula RSI 14 períodos a partir de array de preços.
 */
function calculateRSI(prices: number[], period = 14): number {
  if (prices.length < period + 1) return 50;
  let gains = 0, losses = 0;
  for (let i = prices.length - period; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    if (change > 0) gains += change;
    else losses -= change;
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

/**
 * Calcula volatilidade realizada (anualizada) últimos 30 dias.
 */
function calculateVol(prices: number[]): number {
  if (prices.length < 2) return 0;
  const returns = [];
  for (let i = 1; i < prices.length; i++) {
    returns.push(Math.log(prices[i] / prices[i - 1]));
  }
  const mean = returns.reduce((s, r) => s + r, 0) / returns.length;
  const variance = returns.reduce((s, r) => s + (r - mean) ** 2, 0) / returns.length;
  return Math.sqrt(variance) * Math.sqrt(252) * 100;
}

async function fetchYahoo(url: string): Promise<any> {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 LBH-System" },
    next: { revalidate: 300 }, // Cache 5min
  });
  if (!res.ok) throw new Error(`Yahoo HTTP ${res.status}`);
  return res.json();
}

export async function getQuote(ticker: string): Promise<QuoteResult | null> {
  // Cache hit?
  const cached = cache.get(ticker);
  if (cached && cached.expires > Date.now()) return cached.data;

  try {
    // Quote summary (preço, empresa, beta)
    const quoteUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?range=1y&interval=1d&includePrePost=false`;
    const data = await fetchYahoo(quoteUrl);

    const result = data?.chart?.result?.[0];
    if (!result) return null;

    const meta = result.meta;
    const closes: number[] = (result.indicators?.quote?.[0]?.close || []).filter((v: any) => v != null);

    if (closes.length < 50) return null;

    const current = meta.regularMarketPrice || closes[closes.length - 1];
    const prevClose = meta.previousClose || meta.chartPreviousClose;

    // MA200
    const ma200 = closes.length >= 200
      ? closes.slice(-200).reduce((s, v) => s + v, 0) / 200
      : closes.reduce((s, v) => s + v, 0) / closes.length;

    // RSI semanal (aprox: pega últimos 14 fechamentos semanais = últimos 70 dias agrupados)
    const weeklyCloses: number[] = [];
    for (let i = closes.length - 1; i >= 0; i -= 5) weeklyCloses.unshift(closes[i]);
    const rsiWeekly = calculateRSI(weeklyCloses, 14);

    // Volatilidade 30d
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
      pe_ratio: null,
      dividend_yield: 0,
      beta: 1,
      rsi_weekly: Number(rsiWeekly.toFixed(1)),
      ma200: Number(ma200.toFixed(2)),
      ma200_distance_pct: Number(((current - ma200) / ma200 * 100).toFixed(2)),
      high_52w: Number(high52w.toFixed(2)),
      low_52w: Number(low52w.toFixed(2)),
      realized_vol_30d: Number(vol.toFixed(1)),
    };

    cache.set(ticker, { data: quoteResult, expires: Date.now() + TTL_MS });
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
 */
export function calculateScores(q: QuoteResult): {
  quality_score: number;
  opportunity_score: number;
  composite_score: number;
  entry_signal: string;
  recommended_leverage: number;
  max_recommended_leverage: number;
  risk_rating: string;
  opportunity_rating: string;
  kelly: { kelly_half: number; kelly_quarter: number; win_rate: number };
} {
  // Quality: baixa vol + dividendos + sharpe alto
  const volScore = Math.max(0, 100 - q.realized_vol_30d * 2); // vol baixa = score alto
  const distMa200Score = Math.max(0, Math.min(100, 70 - Math.abs(q.ma200_distance_pct) * 2));
  const quality = Math.round((volScore * 0.6 + distMa200Score * 0.4));

  // Opportunity: RSI baixo + perto do low 52w
  const rsiScore = q.rsi_weekly < 30 ? 95 : q.rsi_weekly < 40 ? 80 : q.rsi_weekly < 50 ? 65 : q.rsi_weekly < 60 ? 50 : 30;
  const lowDist = (q.current_price - q.low_52w) / (q.high_52w - q.low_52w);
  const lowScore = Math.round((1 - lowDist) * 100);
  const opportunity = Math.round((rsiScore * 0.6 + lowScore * 0.4));

  const composite = Math.round(quality * 0.6 + opportunity * 0.4);

  // Entry signal
  let entry_signal = "AGUARDAR";
  if (composite >= 80 && q.rsi_weekly < 45) entry_signal = "ENTRAR";
  else if (composite >= 70 && q.rsi_weekly < 40) entry_signal = "ENTRAR";
  else if (composite < 50) entry_signal = "EVITAR";

  // Leverage (Kelly conservador)
  const recommended_leverage = Math.min(2.5, Math.max(1.2, 1 + (composite / 100) * 1.2));
  const max_recommended_leverage = Math.min(3.0, recommended_leverage + 0.3);

  // Risk rating
  const risk_rating = q.realized_vol_30d > 30 ? "ELEVADO" : q.realized_vol_30d > 20 ? "MODERADO" : "BAIXO";
  const opportunity_rating = opportunity >= 80 ? "Excelente" : opportunity >= 65 ? "Bom" : opportunity >= 50 ? "Neutro" : "Fraco";

  // Kelly
  const winRate = 50 + (composite - 50) * 0.3; // Heurística
  const kelly_full = (winRate / 100 - (1 - winRate / 100)) * 2;
  const kelly_half = Math.max(0.8, Math.min(2.0, kelly_full / 2 + 1));
  const kelly_quarter = Math.max(0.5, Math.min(1.5, kelly_full / 4 + 1));

  return {
    quality_score: Math.max(0, Math.min(100, quality)),
    opportunity_score: Math.max(0, Math.min(100, opportunity)),
    composite_score: Math.max(0, Math.min(100, composite)),
    entry_signal,
    recommended_leverage: Number(recommended_leverage.toFixed(2)),
    max_recommended_leverage: Number(max_recommended_leverage.toFixed(1)),
    risk_rating,
    opportunity_rating,
    kelly: {
      kelly_half: Number(kelly_half.toFixed(2)),
      kelly_quarter: Number(kelly_quarter.toFixed(2)),
      win_rate: Number(winRate.toFixed(1)),
    },
  };
}
