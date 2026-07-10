import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getCurrentUser, normalizeRiskProfile } from "@/lib/auth";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * /api/v1/assets/screen — Screening / Watchlist agora consomem o MOTOR REAL de 3 camadas
 * (ranking_service: Qualidade/Momento/Aptidão), NÃO mais a heurística do Node (lib/yfinance).
 *
 * Proxia para o backend novo POST /api/ranking/screen (mesmo X-Internal-Token do proxyToBackend),
 * que reaproveita o cache do Ranking p/ tickers do universo (MESMOS números da aba Ranking) e roda
 * _analyze ao vivo p/ o resto. Em seguida MAPEIA a resposta do motor para o shape AssetScore que a
 * UI espera, incluindo entry_signal_color / entry_leverage / entry_rationale (que antes nunca eram
 * gerados → sinal sempre cinza e leverage sempre 1x ao "Comprei"). market_state vem do REAL.
 */

// Veredito do motor → label descritivo da UI (CVM 04/2023) e cor do sinal.
//   verde  = COMPRAR FORTE / COMPRAR
//   amarelo= JUSTO / ESTICADO
//   vermelho = ESPECULATIVO
//   cinza  = RESERVA (ou sem veredito)
const VERDICT_MAP: Record<string, { label: string; color: string }> = {
  "COMPRAR FORTE": { label: "OPORTUNIDADE FORTE", color: "green" },
  COMPRAR:         { label: "OPORTUNIDADE",       color: "green" },
  JUSTO:           { label: "NEUTRO",             color: "yellow" },
  ESTICADO:        { label: "NEUTRO",             color: "yellow" },
  ESPECULATIVO:    { label: "DESFAVORÁVEL",       color: "red" },
  RESERVA:         { label: "RESERVA",            color: "gray" },
};

function riskFromLeverage(beta?: number | null, sigma?: number | null): string {
  // Espelha a doutrina de risco do motor: beta alto OU σ alta = risco maior.
  const b = beta ?? 0;
  const s = sigma ?? 0;
  if (b >= 1.45 || s >= 45) return "ELEVADO";
  if (b >= 1.1 || s >= 30) return "MODERADO";
  return "BAIXO";
}

// Mapeia 1 ativo do motor real (dict do ranking_service) → AssetScore da UI.
function mapAsset(a: any) {
  const verdict: string = a.verdict || "";
  const vm = VERDICT_MAP[verdict] ?? { label: "SEM DADOS", color: "gray" };
  const leverage: number = typeof a.leverage === "number" ? a.leverage : 1;
  const maxLev: number =
    typeof a.leverage_teto_camada3 === "number" ? a.leverage_teto_camada3 : leverage;
  const quality = a.quality ?? 0;
  const momentum = a.momentum ?? 0;
  const composite = a.rank ?? Math.round(quality * 0.45 + momentum * 0.55);

  // Racional do sinal = veredito + o que está prendendo a alavancagem (binding da Camada 3).
  const binding = a.leverage_teto_binding ? ` · trava: ${a.leverage_teto_binding}` : "";
  let sigLabel = vm.label;
  let sigColor = vm.color;
  let rationale = verdict ? `${verdict}${binding}` : "";

  // GUARDA DE SOBRECOMPRADO (Qualidade ≠ Timing): um nome ESTICADO (RSI semanal ≥ 70)
  // NÃO pode ostentar "OPORTUNIDADE (FORTE)" — empresa ótima não é boa HORA de entrar.
  // Rebaixa o rótulo verde p/ amarelo "ESTICADO" e explica; NÃO mexe nos scores do motor.
  // NOTA (fonte-de-verdade): a partir da correção do backend, o próprio verdict do
  // ranking já emite "ESTICADO" de forma consistente (mesma regra RSI≥70). Esta guarda
  // fica como rede de segurança/retrocompat para o BFF do Screening; não remover sem
  // confirmar que o backend cobre TODOS os caminhos (screen + ranking).
  const rsiW = typeof a.rsi === "number" ? a.rsi : null;
  if (rsiW != null && rsiW >= 70 && sigColor === "green") {
    sigLabel = "ESTICADO";
    sigColor = "yellow";
    rationale = `${verdict || "Qualidade OK"} · RSI semanal ${rsiW.toFixed(0)} sobrecomprado — aguardar recuo p/ entrar`;
  }

  return {
    ticker: a.ticker,
    company_name: a.name,
    sector: a.is_crypto ? "Cripto" : a.is_tatico ? "Tático/Cíclico" : undefined,
    current_price: a.current_price ?? 0,
    change_pct: a.day_change_pct ?? null,   // variação do dia (motor: day_change_pct)
    currency: a.currency || (String(a.ticker).endsWith(".SA") ? "BRL" : "USD"),
    is_brazilian: String(a.ticker).toUpperCase().endsWith(".SA"),

    quality_score: quality,
    opportunity_score: momentum,
    composite_score: composite,
    leverage_score: a.aptidao ?? 0,
    max_recommended_leverage: maxLev,
    recommended_leverage: leverage,
    conservative_leverage: Math.max(1, Math.min(leverage, Math.round(leverage * 0.5 * 10) / 10)),
    risk_rating: riskFromLeverage(a.beta, a.sigma_total),
    risk_rating_is_heuristic: a.beta == null,
    opportunity_rating: vm.label,

    // Campos que a UI lê e que ANTES nunca eram gerados (sinal cinza / leverage 1x):
    entry_signal: sigLabel,
    entry_signal_color: sigColor,
    entry_leverage: leverage,
    entry_rationale: rationale,

    beta: a.beta ?? undefined,
    dividend_yield: a.dividend_yield ?? undefined,

    // Veredito BRUTO do motor (COMPRAR FORTE | COMPRAR | JUSTO | ESTICADO | ESPECULATIVO | RESERVA)
    // — exposto p/ o screener filtrar/agrupar por veredito sem reverter o label da UI.
    verdict: verdict || undefined,
    // Bucket/setor do motor (quando vier) p/ filtro de setor no screener.
    bucket: a.bucket ?? a.sector ?? undefined,

    technicals: {
      ticker: a.ticker,
      timestamp: new Date().toISOString(),
      price: a.current_price ?? 0,
      rsi_weekly: a.rsi ?? undefined,
      rsi_14_weekly: a.rsi ?? undefined,
      rsi_14: a.rsi ?? undefined,
      stoch_k: a.stoch_k ?? undefined,
      stoch_d: a.stoch_d ?? undefined,
      distance_from_ma200: a.distance_ma200 ?? undefined,
      realized_vol_30d: a.sigma_total ?? undefined,
    },

    score_breakdown: {
      quality: quality,
      momentum: momentum,
      aptidao: a.aptidao ?? 0,
      rank_alavancado: a.rank_alavancado ?? composite,
    },

    is_tokenized: String(a.ticker).includes("ONUSDT"),
    underlying_ticker: String(a.ticker).includes("ONUSDT")
      ? String(a.ticker).replace("ONUSDT", "")
      : undefined,
  };
}

export async function GET(req: NextRequest) {
  const requestId = req.headers.get("x-request-id") ?? randomUUID();

  // Auth (mesmo contrato do proxyToBackend).
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const tickersParam = searchParams.get("tickers") || "NEE,SO,D,DUK,JNJ,PG";
  const minScore = parseFloat(searchParams.get("min_score") || "0");
  const tickers = tickersParam
    .split(",")
    .map((t) => t.trim().toUpperCase())
    .filter(Boolean)
    .slice(0, 60);

  // Config do backend interno (mesmas envs do proxyToBackend).
  const backendUrl =
    process.env.BACKEND_INTERNAL_URL ||
    (process.env.NODE_ENV !== "production" ? "http://localhost:8001" : "");
  const internalToken = process.env.BACKEND_INTERNAL_TOKEN;
  if (!backendUrl || !internalToken) {
    logger.error("screen: backend interno não configurado", { requestId });
    return NextResponse.json({ error: "backend_not_configured" }, { status: 503 });
  }

  // Chama o MOTOR REAL via POST /api/ranking/screen (X-Internal-Token, nunca exposto ao client).
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120_000);
  let upstream: Response;
  try {
    upstream = await fetch(`${backendUrl}/api/ranking/screen`, {
      method: "POST",
      headers: {
        "X-Internal-Token": internalToken,
        "X-Request-Id": requestId,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      // profile: perfil de risco do usuário logado → motor calibra alavancagem/travas.
      body: JSON.stringify({ tickers, profile: normalizeRiskProfile(user.riskProfile) }),
      signal: controller.signal,
      cache: "no-store",
    });
  } catch (err) {
    clearTimeout(timeout);
    const e = err as Error & { name?: string };
    const status = e.name === "AbortError" ? 504 : 502;
    logger.error("screen: backend inalcançável", { requestId, err: e.message });
    return NextResponse.json(
      { error: status === 504 ? "backend_timeout" : "backend_unreachable", detail: e.message },
      { status }
    );
  }
  clearTimeout(timeout);

  let payload: any;
  try {
    payload = await upstream.json();
  } catch {
    payload = {};
  }
  if (!upstream.ok) {
    return NextResponse.json(payload || { error: "backend_error" }, { status: upstream.status });
  }

  const rawAssets: any[] = Array.isArray(payload.assets) ? payload.assets : [];
  const assets = rawAssets
    .map(mapAsset)
    .filter((a) => a.composite_score >= minScore);

  // market_state REAL vindo do backend (regime do S&P) → mapeia p/ o shape MarketState da UI.
  const ms = payload.market_state || {};
  const market_state = {
    state: ms.state ?? "NEUTRO",
    multiplier: ms.multiplier ?? 3,
  };

  return NextResponse.json(
    {
      assets,
      failed_tickers: payload.failed_tickers ?? [],
      attempted_count: payload.attempted_count ?? tickers.length,
      total_assets: assets.length,
      total_analyzed: assets.length,
      market_state,
      screening_date: new Date().toISOString(),
      screened_at: new Date().toISOString(),
    },
    { headers: { "X-Request-Id": requestId } }
  );
}
