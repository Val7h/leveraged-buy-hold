import { NextResponse } from "next/server";
import { getQuote, getSector, calculateScores } from "@/lib/yfinance";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tickersParam = searchParams.get("tickers") || "NEE,SO,D,DUK,JNJ,PG";
  const minScore = parseFloat(searchParams.get("min_score") || "0");

  const tickers = tickersParam
    .split(",")
    .map((t) => t.trim().toUpperCase())
    .filter(Boolean)
    .slice(0, 30); // Limit 30 tickers per request

  // Fetch em paralelo
  const quotes = await Promise.all(tickers.map(getQuote));

  const assets = quotes
    .filter((q) => q !== null)
    .map((q) => {
      if (!q) return null;
      const sector = getSector(q.ticker);
      const scores = calculateScores(q);
      return {
        ticker: q.ticker,
        company_name: q.company_name,
        sector,
        currency: q.currency,
        current_price: q.current_price,
        previous_close: q.previous_close,
        change_pct: q.change_pct,
        market_cap: q.market_cap,
        dividend_yield: q.dividend_yield,
        is_brazilian: q.ticker.endsWith(".SA"),
        is_tokenized: q.ticker.includes("ONUSDT"),
        underlying_ticker: q.ticker.includes("ONUSDT") ? q.ticker.replace("ONUSDT", "") : null,
        technicals: {
          rsi_weekly: q.rsi_weekly,
          realized_vol_30d: q.realized_vol_30d,
          ma200_distance_pct: q.ma200_distance_pct,
          ma200: q.ma200,
          high_52w: q.high_52w,
          low_52w: q.low_52w,
        },
        ...scores,
      };
    })
    .filter((a): a is NonNullable<typeof a> => a !== null && a.composite_score >= minScore);

  return NextResponse.json({
    assets,
    market_state: { state: "NORMAL", multiplier: 1.5 },
    screening_date: new Date().toISOString(),
    total_analyzed: assets.length,
  });
}
