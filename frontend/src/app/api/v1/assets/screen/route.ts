import { NextResponse } from "next/server";

const MOCK_ASSETS = [
  {
    ticker: "NEE", company_name: "NextEra Energy", sector: "Utilities", currency: "USD",
    current_price: 75.50, quality_score: 88, opportunity_score: 75, composite_score: 82,
    entry_signal: "ENTRAR", recommended_leverage: 1.8, max_recommended_leverage: 2.2,
    risk_rating: "MODERADO", opportunity_rating: "Bom", is_brazilian: false, is_tokenized: false,
    technicals: { rsi_weekly: 35.2, realized_vol_30d: 18.5, ma200_distance_pct: -2.1 },
    kelly: { kelly_half: 1.50, kelly_quarter: 1.20, win_rate: 65.3 },
  },
  {
    ticker: "SO", company_name: "Southern Company", sector: "Utilities", currency: "USD",
    current_price: 82.20, quality_score: 81, opportunity_score: 82, composite_score: 82,
    entry_signal: "ENTRAR", recommended_leverage: 1.7, max_recommended_leverage: 2.1,
    risk_rating: "MODERADO", opportunity_rating: "Excelente", is_brazilian: false, is_tokenized: false,
    technicals: { rsi_weekly: 38.1, realized_vol_30d: 16.2, ma200_distance_pct: -3.5 },
    kelly: { kelly_half: 1.40, kelly_quarter: 1.10, win_rate: 67.8 },
  },
  {
    ticker: "D", company_name: "Dominion Energy", sector: "Utilities", currency: "USD",
    current_price: 59.80, quality_score: 83, opportunity_score: 69, composite_score: 78,
    entry_signal: "AGUARDAR", recommended_leverage: 1.6, max_recommended_leverage: 2.0,
    risk_rating: "BAIXO", opportunity_rating: "Neutro", is_brazilian: false, is_tokenized: false,
    technicals: { rsi_weekly: 45.3, realized_vol_30d: 17.1, ma200_distance_pct: 1.2 },
    kelly: { kelly_half: 1.30, kelly_quarter: 1.00, win_rate: 62.5 },
  },
  {
    ticker: "DUK", company_name: "Duke Energy", sector: "Utilities", currency: "USD",
    current_price: 98.50, quality_score: 79, opportunity_score: 71, composite_score: 76,
    entry_signal: "AGUARDAR", recommended_leverage: 1.5, max_recommended_leverage: 1.9,
    risk_rating: "BAIXO", opportunity_rating: "Bom", is_brazilian: false, is_tokenized: false,
    technicals: { rsi_weekly: 48.0, realized_vol_30d: 15.8, ma200_distance_pct: 0.8 },
    kelly: { kelly_half: 1.20, kelly_quarter: 0.95, win_rate: 61.2 },
  },
  {
    ticker: "JNJ", company_name: "Johnson & Johnson", sector: "Healthcare", currency: "USD",
    current_price: 156.30, quality_score: 79, opportunity_score: 62, composite_score: 71,
    entry_signal: "AGUARDAR", recommended_leverage: 1.9, max_recommended_leverage: 2.3,
    risk_rating: "BAIXO", opportunity_rating: "Neutro", is_brazilian: false, is_tokenized: false,
    technicals: { rsi_weekly: 52.1, realized_vol_30d: 14.5, ma200_distance_pct: 3.1 },
    kelly: { kelly_half: 1.60, kelly_quarter: 1.30, win_rate: 68.9 },
  },
  {
    ticker: "PG", company_name: "Procter & Gamble", sector: "Consumer Staples", currency: "USD",
    current_price: 167.80, quality_score: 82, opportunity_score: 68, composite_score: 76,
    entry_signal: "AGUARDAR", recommended_leverage: 1.8, max_recommended_leverage: 2.1,
    risk_rating: "BAIXO", opportunity_rating: "Bom", is_brazilian: false, is_tokenized: false,
    technicals: { rsi_weekly: 50.4, realized_vol_30d: 16.8, ma200_distance_pct: 2.3 },
    kelly: { kelly_half: 1.50, kelly_quarter: 1.20, win_rate: 64.6 },
  },
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tickersParam = searchParams.get("tickers") || "";
  const minScore = parseFloat(searchParams.get("min_score") || "0");

  const requestedTickers = tickersParam
    ? tickersParam.split(",").map((t) => t.trim().toUpperCase()).filter(Boolean)
    : MOCK_ASSETS.map((a) => a.ticker);

  const assets = MOCK_ASSETS
    .filter((a) => requestedTickers.includes(a.ticker))
    .filter((a) => a.composite_score >= minScore);

  return NextResponse.json({
    assets,
    market_state: { state: "NORMAL", multiplier: 1.5 },
    screening_date: new Date().toISOString(),
    total_analyzed: assets.length,
  });
}
