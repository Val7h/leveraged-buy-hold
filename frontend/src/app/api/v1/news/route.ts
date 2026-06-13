import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FINNHUB_TOKEN = process.env.FINNHUB_API_KEY ?? "";

const CATEGORY_MAP: Record<string, string> = {
  Mercado:        "general",
  Empresas:       "merger",
  Internacional:  "forex",
  Commodities:    "commodity",
  Criptoativos:   "crypto",
};

interface FinnhubArticle {
  id: number;
  headline: string;
  summary: string;
  url: string;
  datetime: number;
  source: string;
  image: string;
  category: string;
  related: string;
}

async function fetchFinnhub(category: string): Promise<FinnhubArticle[]> {
  const finnhubCat = CATEGORY_MAP[category] ?? "general";
  const url = `https://finnhub.io/api/v1/news?category=${finnhubCat}&token=${FINNHUB_TOKEN}`;
  const res = await fetch(url, { next: { revalidate: 300 } });
  if (!res.ok) return [];
  return res.json();
}

function finnhubToArticle(a: FinnhubArticle, category: string) {
  return {
    id: String(a.id),
    title: a.headline,
    summary: a.summary,
    url: a.url,
    published_at: new Date(a.datetime * 1000).toISOString(),
    source: a.source,
    thumbnail: a.image,
    category,
    ticker: a.related ?? "",
  };
}

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const category = req.nextUrl.searchParams.get("category") ?? "Mercado";

  if (!FINNHUB_TOKEN) {
    return NextResponse.json({
      articles: [],
      total: 0,
      tickers: [],
      categories: Object.keys(CATEGORY_MAP),
    });
  }

  try {
    const raw = await fetchFinnhub(category);
    const articles = raw.slice(0, 30).map((a) => finnhubToArticle(a, category));
    const tickers = [...new Set(articles.map((a) => a.ticker).filter(Boolean))];

    return NextResponse.json({
      articles,
      total: articles.length,
      tickers,
      categories: Object.keys(CATEGORY_MAP),
    });
  } catch {
    return NextResponse.json({
      articles: [],
      total: 0,
      tickers: [],
      categories: Object.keys(CATEGORY_MAP),
    });
  }
}
