/**
 * GET /api/v1/assets/quote-summary/[ticker]
 *
 * Retorna dados fundamentais (beta, dividend yield, PE, setor, indústria) do Yahoo Finance
 * via endpoint quoteSummary (query2). Cache 24h.
 *
 * Em erro retorna 200 com payload null (NÃO 500) — UI deve renderizar "—".
 */
import { NextResponse } from "next/server";

const YAHOO_FETCH_TIMEOUT_MS = 10_000;

interface QuoteSummaryPayload {
  ticker: string;
  beta: number | null;
  dividend_yield: number | null; // em % (já multiplicado por 100)
  pe_ratio: number | null;
  sector: string | null;
  industry: string | null;
  long_business_summary: string | null;
  source: "yahoo" | "unavailable";
  fetched_at: string;
}

export async function GET(
  _request: Request,
  { params }: { params: { ticker: string } }
) {
  const ticker = (params.ticker || "").toUpperCase().trim();
  if (!ticker || !/^[A-Z0-9._\-]+$/.test(ticker)) {
    return NextResponse.json(
      { error: "Invalid ticker" },
      { status: 400 }
    );
  }

  const isLowProb =
    ticker.endsWith(".SA") || ticker.includes("ONUSDT") || ticker.endsWith("-USD");

  const unavailable = (): QuoteSummaryPayload => ({
    ticker,
    beta: null,
    dividend_yield: null,
    pe_ratio: null,
    sector: null,
    industry: null,
    long_business_summary: null,
    source: "unavailable",
    fetched_at: new Date().toISOString(),
  });

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
      // Cache 24h: dados fundamentais mudam pouco
      // PEGADINHA: next.revalidate só funciona se a request for cacheável (sem headers dinâmicos).
      next: { revalidate: 86400 },
    });

    if (!res.ok) {
      if (!isLowProb && res.status !== 404) {
        console.warn(`quote-summary route: ${ticker} HTTP ${res.status}`);
      }
      // TODO(gerente): se 401/429 frequente em prod (Render), adicionar cookie de consent A1/A3.
      return NextResponse.json(unavailable());
    }

    const data = await res.json();
    const root = data?.quoteSummary?.result?.[0];
    if (!root) {
      return NextResponse.json(unavailable());
    }

    const summary = root.summaryDetail ?? {};
    const profile = root.assetProfile ?? {};

    const beta =
      typeof summary.beta?.raw === "number" ? summary.beta.raw : null;
    // dividendYield já é decimal — converter para %
    const dy =
      typeof summary.dividendYield?.raw === "number"
        ? summary.dividendYield.raw * 100
        : null;
    const pe =
      typeof summary.trailingPE?.raw === "number"
        ? summary.trailingPE.raw
        : null;
    const sector = typeof profile.sector === "string" ? profile.sector : null;
    const industry =
      typeof profile.industry === "string" ? profile.industry : null;
    const longBusinessSummary =
      typeof profile.longBusinessSummary === "string"
        ? profile.longBusinessSummary
        : null;

    const payload: QuoteSummaryPayload = {
      ticker,
      beta,
      dividend_yield: dy,
      pe_ratio: pe,
      sector,
      industry,
      long_business_summary: longBusinessSummary,
      source: "yahoo",
      fetched_at: new Date().toISOString(),
    };

    return NextResponse.json(payload);
  } catch (err) {
    if (!isLowProb) {
      console.warn(`quote-summary route ${ticker} error:`, err);
    }
    return NextResponse.json(unavailable());
  }
}
