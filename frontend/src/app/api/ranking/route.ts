import { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/backend-proxy";
import { getCurrentUser, normalizeRiskProfile } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // O backend serve a coluna de ALAVANCAGEM por perfil (?profile=conservador|moderado|agressivo).
  // Sem perfil → agressivo (cache canônico). Lemos o user logado e repassamos o perfil
  // pra que o Ranking bata com Screening/Aporte/Portfólio — coerência do perfil.
  const user = await getCurrentUser();
  const profile = normalizeRiskProfile(user?.riskProfile);

  // Repassamos o perfil como query param. forwardSearch=false pra não duplicar
  // a search original (a aba não envia query relevante hoje).
  // EXCEÇÃO: ?force=true é repassado explicitamente — sem isso o backend NUNCA
  // recebia o force e servia o cache (~20min) eternamente (ex: dado CVM novo no
  // disco não aparecia até o TTL vencer). O botão "Recalcular" depende disto.
  const force = req.nextUrl.searchParams.get("force") === "true";
  const backendPath =
    `/api/ranking?profile=${encodeURIComponent(profile)}` +
    (force ? "&force=true" : "");

  // ~116 tickers a frio é pesado; o FastAPI cacheia ~20min, então fica rápido depois.
  return proxyToBackend(req, backendPath, {
    timeoutMs: 120_000,
    forwardSearch: false,
  });
}
