/**
 * POST /api/v1/alerts/sweep  — CRON in-process (acionado pelo start.sh, deploy único).
 *
 * Varre TODOS os alertas ativos, busca preço no FastAPI, avalia a condição e DISPARA sozinho:
 * cria uma Notification in-app quando o alerta passa a disparar (anti-spam via notifiedAt) e
 * RE-ARMA quando a condição deixa de valer. Antes, o /alerts/check só rodava quando o usuário
 * abria o app — "stop que depende de você abrir o app não é stop" (PF).
 *
 * Autenticação: X-Internal-Token (não é rota de usuário). Blindada: nunca lança 500 ruidoso.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BACKEND_URL =
  process.env.BACKEND_INTERNAL_URL ??
  (process.env.NODE_ENV !== "production" ? "http://localhost:8001" : "");
const INTERNAL_TOKEN = process.env.BACKEND_INTERNAL_TOKEN ?? "";

async function fetchPrice(ticker: string): Promise<number | null> {
  if (!BACKEND_URL) return null;
  try {
    const res = await fetch(`${BACKEND_URL}/api/v1/assets/${encodeURIComponent(ticker)}/price`, {
      headers: INTERNAL_TOKEN ? { "X-Internal-Token": INTERNAL_TOKEN } : {},
      cache: "no-store",
    });
    if (!res.ok) return null;
    const d = await res.json();
    return typeof d?.price === "number" ? d.price
      : typeof d?.current_price === "number" ? d.current_price : null;
  } catch {
    return null;
  }
}

function evalCondition(condition: string, price: number, threshold: number): boolean {
  const c = (condition || "").toLowerCase();
  if (c === "above" || c === "price_above" || c === "gte") return price >= threshold;
  if (c === "below" || c === "price_below" || c === "lte") return price <= threshold;
  return false;
}

export async function POST(req: NextRequest) {
  // Só o processo interno (start.sh) pode varrer todos os usuários.
  if (!INTERNAL_TOKEN || req.headers.get("x-internal-token") !== INTERNAL_TOKEN) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  try {
    const alerts = await prisma.alert.findMany({ where: { active: true } });
    if (!alerts.length) return NextResponse.json({ checked: 0, fired: 0 });

    const tickers = [...new Set(alerts.map((a) => a.ticker))];
    const prices = await Promise.all(tickers.map(fetchPrice));
    const priceMap = Object.fromEntries(tickers.map((t, i) => [t, prices[i]]));

    let fired = 0;
    for (const a of alerts) {
      const price = priceMap[a.ticker];
      if (price == null) continue;
      const triggered = evalCondition(a.condition, price, Number(a.threshold));
      try {
        if (triggered && !a.notifiedAt) {
          // disparou agora (estava re-armado) → notifica 1x
          await prisma.notification.create({
            data: {
              userId: a.userId,
              type: "price_alert",
              title: `Alerta: ${a.ticker}`,
              body: a.message || `${a.ticker} atingiu ${a.condition} ${Number(a.threshold)} (atual ${price})`,
              url: "/alerts",
            },
          });
          await prisma.alert.update({ where: { id: a.id }, data: { notifiedAt: new Date() } });
          fired++;
        } else if (!triggered && a.notifiedAt) {
          // condição deixou de valer → re-arma p/ poder disparar de novo no futuro
          await prisma.alert.update({ where: { id: a.id }, data: { notifiedAt: null } });
        }
      } catch { /* não deixa um alerta ruim travar a varredura */ }
    }
    return NextResponse.json({ checked: alerts.length, fired });
  } catch (e) {
    return NextResponse.json({ error: "sweep_failed" }, { status: 200 });
  }
}
