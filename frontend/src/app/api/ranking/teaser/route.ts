import { NextResponse } from "next/server";

// ISCA DO RANKING (conversão — 26/09/2026): rota PÚBLICA que devolve só o TOP 3
// de oportunidades pro visitante ANÔNIMO da página /ranking, mais o tamanho do
// universo. O ranking completo continua exigindo conta (grátis). Nenhum dado
// sensível: são 3 linhas do mesmo ranking que qualquer conta grátis vê.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type TeaserAsset = {
  ticker: string;
  name?: string;
  verdict?: string;
  leverage?: number;
  max_dd?: number;
  quality_data_thin?: boolean;
  leverage_teto_binding?: string;
  category?: string;
};

function flatten(node: unknown, out: TeaserAsset[], cat?: string) {
  if (Array.isArray(node)) {
    for (const v of node) flatten(v, out, cat);
    return;
  }
  if (node && typeof node === "object") {
    const o = node as Record<string, unknown>;
    if (typeof o.ticker === "string") {
      out.push({
        ticker: o.ticker,
        name: typeof o.name === "string" ? o.name : undefined,
        verdict: typeof o.verdict === "string" ? o.verdict : undefined,
        leverage: typeof o.leverage === "number" ? o.leverage : undefined,
        max_dd: typeof o.max_dd === "number" ? o.max_dd : undefined,
        quality_data_thin: o.quality_data_thin === true,
        leverage_teto_binding:
          typeof o.leverage_teto_binding === "string" ? o.leverage_teto_binding : undefined,
        category: cat,
      });
      return;
    }
    for (const [k, v] of Object.entries(o)) flatten(v, out, cat ?? k);
  }
}

export async function GET() {
  const backendUrl =
    process.env.BACKEND_INTERNAL_URL ||
    (process.env.NODE_ENV !== "production" ? "http://localhost:8001" : "");
  const internalToken = process.env.BACKEND_INTERNAL_TOKEN;
  if (!backendUrl || !internalToken) {
    return NextResponse.json({ error: "backend_not_configured" }, { status: 503 });
  }

  try {
    const res = await fetch(`${backendUrl}/api/ranking`, {
      headers: { "X-Internal-Token": internalToken, Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return NextResponse.json({ error: "ranking_unavailable" }, { status: 503 });
    const data = (await res.json()) as Record<string, unknown>;

    const all: TeaserAsset[] = [];
    flatten(data?.categories, all);

    const buys = all
      .filter((a) => a.verdict === "COMPRAR FORTE" || a.verdict === "COMPRAR")
      .sort((a, b) => {
        // COMPRAR FORTE primeiro; dentro do grupo, maior alavancagem sugerida primeiro.
        const sv = (v?: string) => (v === "COMPRAR FORTE" ? 1 : 0);
        if (sv(b.verdict) !== sv(a.verdict)) return sv(b.verdict) - sv(a.verdict);
        return (b.leverage ?? 0) - (a.leverage ?? 0);
      });

    return NextResponse.json(
      {
        teaser: true,
        top: buys.slice(0, 3),
        total_assets: all.length,
        total_opportunities: buys.length,
        generated_at: (data as { generated_at?: string })?.generated_at ?? null,
      },
      { headers: { "Cache-Control": "public, max-age=300" } }
    );
  } catch {
    return NextResponse.json({ error: "ranking_unavailable" }, { status: 503 });
  }
}
