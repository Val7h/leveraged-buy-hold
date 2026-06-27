/**
 * POST /api/v1/alerts/sweep  — CRON in-process (acionado pelo start.sh, deploy único).
 *
 * CAMADA SENTINELA. Varre e DISPARA sozinho três famílias:
 *
 *  1) ALERTAS DE PREÇO do usuário (legado): condição above/below vs threshold. Anti-spam por
 *     notifiedAt, re-arma quando a condição deixa de valer.
 *
 *  2) ALERTAS DE SOBREVIVÊNCIA (derivados da POSIÇÃO, não preço fixo de trader):
 *      • stop_pm  — escada -10/-20/-30% do PM REAL da posição. RE-ANCORA sozinho quando o PM
 *        muda (novo aporte): se o anchorPrice guardado difere do avgPrice atual, re-arma. NÃO
 *        gera alerta de venda para SEMENTE (âncora previdenciária — só tese a tira).
 *      • liq_near — folga até a liquidação cruzando faixas (25/15/8%). É o alerta existencial
 *        do alavancado. Derivado da leverage da própria posição.
 *     São AUTO-gerenciados (não criados na mão); persistidos na tabela alerts com kind!=price
 *     só para anti-spam/re-arme/re-ancoragem.
 *
 *  3) WATCHLIST QUE VIGIA — re-roda o screen do motor real e notifica a TRANSIÇÃO para
 *     COMPRAR / COMPRAR FORTE (o "quique", razão de existir da watchlist). Cacheia o último
 *     veredito+timestamp no item (signalAt) p/ a UI mostrar "atualizado há X" sem reanalisar.
 *
 * ENTREGA POR SEVERIDADE: info = só in-app; critical (stop -20/-30, liquidação <15%) =
 * in-app + e-mail (Resend, gated por RESEND_API_KEY — ausente NÃO quebra, só loga e segue).
 *
 * Survival-first: nada de sinal intraday/day-trade; foco em stop/liquidação/transição.
 * Autenticação: X-Internal-Token. Blindada: nunca lança 500 ruidoso.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { shouldSendEmail } from "@/lib/email/preferences";
import { sendEmail, survivalAlertEmail, alertTriggeredEmail } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BACKEND_URL =
  process.env.BACKEND_INTERNAL_URL ??
  (process.env.NODE_ENV !== "production" ? "http://localhost:8001" : "");
const INTERNAL_TOKEN = process.env.BACKEND_INTERNAL_TOKEN ?? "";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://lbh-system.onrender.com";

// Escada do stop ancorado no PM (queda % do PM real). -20/-30 são CRÍTICOS (escalam e-mail).
const STOP_STEPS = [10, 20, 30] as const;
const STOP_CRITICAL_FROM = 20;
// Faixas de FOLGA até a liquidação (avisar quando a folga cai abaixo). <15% é CRÍTICO.
const LIQ_BANDS = [25, 15, 8] as const;
const LIQ_CRITICAL_BELOW = 15;
// Mesmo limiar de equity da liquidação do backend (perda ~ equity). Usado p/ derivar a
// folga de PREÇO por posição a partir da própria leverage (queda% que zera o equity ≈ 100/L).
const LIQ_EQUITY_PCT = 97.0;

// Vereditos que contam como "zona de compra" (o quique que a watchlist espera).
const BUY_VERDICTS = new Set(["COMPRAR", "COMPRAR FORTE"]);

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

// Notifica in-app + (se crítico) e-mail. E-mail gated por RESEND_API_KEY (cliente já opera em
// stub sem a chave) E pela preferência LGPD "alerts". Nunca quebra a varredura.
async function dispatch(opts: {
  userId: string;
  email: string | null;
  userName: string;
  type: string;
  title: string;
  body: string;
  url: string;
  critical: boolean;
  emailContent?: { subject: string; html: string; text: string };
}) {
  try {
    await prisma.notification.create({
      data: { userId: opts.userId, type: opts.type, title: opts.title, body: opts.body, url: opts.url },
    });
  } catch { /* não trava a varredura */ }

  if (!opts.critical || !opts.emailContent || !opts.email) return;
  try {
    if (!process.env.RESEND_API_KEY) {
      logger.info("sweep.email_skipped", { reason: "RESEND_API_KEY ausente — só in-app", userId: opts.userId });
      // segue: o cliente sendEmail também loga em stub_mode; não disparamos p/ evitar ruído.
      return;
    }
    if (!(await shouldSendEmail(opts.userId, "alerts"))) return;
    await sendEmail({ to: opts.email, ...opts.emailContent });
  } catch (e) {
    logger.warn("sweep.email_failed", { userId: opts.userId, error: (e as Error)?.message });
  }
}

// ── 1) ALERTAS DE PREÇO (legado) ───────────────────────────────────────────────
async function sweepPriceAlerts(): Promise<number> {
  const alerts = await prisma.alert.findMany({ where: { active: true, kind: "price" } });
  if (!alerts.length) return 0;

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
        await prisma.alert.update({ where: { id: a.id }, data: { notifiedAt: null } });
      }
    } catch { /* não deixa um alerta ruim travar a varredura */ }
  }
  return fired;
}

// Upsert do estado de um alerta de survival AUTO-gerenciado (kind stop_pm / liq_near).
// Chave lógica: (userId, ticker, condition). condition carrega o "nível" (ex stop_pm_20).
// Re-ancora: se o anchorPrice mudou (novo PM), re-arma (notifiedAt=null) para poder disparar
// de novo no novo patamar. Retorna o registro atual.
async function getOrCreateSurvivalAlert(
  userId: string, ticker: string, condition: string, kind: string,
  threshold: number, anchorPrice: number, severity: string
) {
  const existing = await prisma.alert.findFirst({
    where: { userId, ticker, condition, kind },
  });
  if (!existing) {
    return prisma.alert.create({
      data: { userId, ticker, condition, kind, threshold, anchorPrice, severity, active: true },
    });
  }
  // Re-ancoragem: PM mudou (aporte) → atualiza âncora/threshold e re-arma.
  const anchorChanged = Math.abs(Number(existing.anchorPrice ?? 0) - anchorPrice) > 1e-6;
  if (anchorChanged) {
    return prisma.alert.update({
      where: { id: existing.id },
      data: { anchorPrice, threshold, severity, notifiedAt: null },
    });
  }
  return existing;
}

// ── 2) ALERTAS DE SOBREVIVÊNCIA (derivados da posição) ──────────────────────────
async function sweepSurvivalAlerts(): Promise<number> {
  // Lê posições de risco (leitura — não toca portfolio_service). Junta user+email.
  const positions = await prisma.position.findMany({
    include: {
      portfolio: { select: { userId: true, user: { select: { email: true, fullName: true } } } },
    },
  });
  if (!positions.length) return 0;

  // Preço por ticker (dedup).
  const tickers = [...new Set(positions.map((p) => p.ticker))];
  const prices = await Promise.all(tickers.map(fetchPrice));
  const priceMap = Object.fromEntries(tickers.map((t, i) => [t, prices[i]]));

  let fired = 0;
  for (const pos of positions) {
    const price = priceMap[pos.ticker];
    if (price == null) continue;
    const userId = pos.portfolio.userId;
    const email = pos.portfolio.user?.email ?? null;
    const userName = pos.portfolio.user?.fullName ?? "investidor";
    const pm = Number(pos.avgPrice);
    const lev = Math.max(1, Number(pos.leverage));
    if (!(pm > 0)) continue;

    const dropPct = ((pm - price) / pm) * 100; // queda % do PM (positivo = abaixo do PM)

    // — STOP ANCORADO NO PM (escada). SEMENTE nunca vira alerta de VENDA (âncora). Para semente
    //   emitimos no máximo um aviso informativo de acompanhamento, nunca sugestão de reduzir.
    for (const step of STOP_STEPS) {
      const condition = `stop_pm_${step}`;
      const critical = step >= STOP_CRITICAL_FROM;
      const severity = critical ? "critical" : "info";
      const alert = await getOrCreateSurvivalAlert(userId, pos.ticker, condition, "stop_pm", step, pm, severity);
      const hit = dropPct >= step;
      try {
        if (hit && !alert.notifiedAt) {
          const suggestion = pos.isSeed
            ? "Posição SEMENTE (âncora previdenciária): acompanhar; só a tese tira, não o preço."
            : "Avaliar reduzir uma fração e abater dívida (desalavancar de verdade).";
          const headline = `caiu -${step}% do PM real (PM ${pm.toFixed(2)}, atual ${price.toFixed(2)})`;
          await dispatch({
            userId, email, userName,
            type: "survival_stop",
            title: `Stop -${step}% (PM): ${pos.ticker}`,
            body: `${pos.ticker} ${headline}. ${suggestion}`,
            url: "/portfolio",
            critical: critical && !pos.isSeed, // semente não escala e-mail de venda
            emailContent: survivalAlertEmail({
              name: userName, ticker: pos.ticker, kind: "stop_pm",
              headline, suggestion, currentPrice: price, dashboardUrl: `${APP_URL}/portfolio`,
            }),
          });
          await prisma.alert.update({ where: { id: alert.id }, data: { notifiedAt: new Date() } });
          fired++;
        } else if (!hit && alert.notifiedAt) {
          await prisma.alert.update({ where: { id: alert.id }, data: { notifiedAt: null } });
        }
      } catch { /* posição ruim não trava a varredura */ }
    }

    // — LIQUIDAÇÃO SE APROXIMANDO (faixas de FOLGA). Só p/ posição alavancada (lev>1).
    if (lev > 1) {
      // queda% de preço que zera ~o equity ≈ LIQ_EQUITY_PCT / lev (mesma lógica do backend).
      const distToLiqPct = LIQ_EQUITY_PCT / lev; // folga total se o preço estivesse no PM
      // folga ATUAL = quanto ainda pode cair até liquidar, partindo do preço corrente.
      // Se já caiu dropPct do PM, a folga restante encolhe; se subiu, aumenta.
      const slackPct = Math.max(0, distToLiqPct - dropPct);
      for (const band of LIQ_BANDS) {
        const condition = `liq_near_${band}`;
        const critical = band <= LIQ_CRITICAL_BELOW;
        const severity = critical ? "critical" : "info";
        // âncora = PM (re-ancora no aporte); threshold = a faixa.
        const alert = await getOrCreateSurvivalAlert(userId, pos.ticker, condition, "liq_near", band, pm, severity);
        const hit = slackPct <= band;
        try {
          if (hit && !alert.notifiedAt) {
            const headline = `folga até a liquidação caiu para ~${slackPct.toFixed(0)}% (≤ ${band}%, ${lev.toFixed(1)}x)`;
            const suggestion = "Folga existencial encolhendo — avaliar desalavancar/abater dívida antes do gatilho.";
            await dispatch({
              userId, email, userName,
              type: "survival_liq",
              title: `Liquidação a ~${slackPct.toFixed(0)}% de folga: ${pos.ticker}`,
              body: `${pos.ticker}: ${headline}. ${suggestion}`,
              url: "/portfolio",
              critical,
              emailContent: survivalAlertEmail({
                name: userName, ticker: pos.ticker, kind: "liq_near",
                headline, suggestion, currentPrice: price, dashboardUrl: `${APP_URL}/portfolio`,
              }),
            });
            await prisma.alert.update({ where: { id: alert.id }, data: { notifiedAt: new Date() } });
            fired++;
          } else if (!hit && alert.notifiedAt) {
            await prisma.alert.update({ where: { id: alert.id }, data: { notifiedAt: null } });
          }
        } catch { /* não trava */ }
      }
    }
  }
  return fired;
}

// ── 3) WATCHLIST QUE VIGIA (transição de veredito = o quique) ───────────────────
async function sweepWatchlistTransitions(): Promise<number> {
  if (!BACKEND_URL || !INTERNAL_TOKEN) return 0;

  const watchlists = await prisma.watchlist.findMany({
    include: {
      user: { select: { id: true, email: true, fullName: true, riskProfile: true } },
      items: true,
    },
  });
  if (!watchlists.length) return 0;

  let fired = 0;
  for (const wl of watchlists) {
    if (!wl.items.length) continue;
    const tickers = [...new Set(wl.items.map((i) => i.ticker.trim().toUpperCase()).filter(Boolean))];
    if (!tickers.length) continue;

    // Re-roda o motor real (mesmo contrato do /watchlist/signals). Reaproveita cache do Ranking.
    let assets: any[] = [];
    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 120_000);
      const res = await fetch(`${BACKEND_URL}/api/ranking/screen`, {
        method: "POST",
        headers: { "X-Internal-Token": INTERNAL_TOKEN, "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ tickers, profile: wl.user?.riskProfile || "moderado" }),
        signal: controller.signal,
        cache: "no-store",
      });
      clearTimeout(t);
      if (!res.ok) continue;
      const payload = await res.json();
      assets = Array.isArray(payload.assets) ? payload.assets : [];
    } catch {
      continue; // backend indisponível → pula esta watchlist (não fabrica sinal)
    }

    const byTicker = new Map<string, any>();
    for (const a of assets) byTicker.set(String(a.ticker).trim().toUpperCase(), a);

    const email = wl.user?.email ?? null;
    const userName = wl.user?.fullName ?? "investidor";

    for (const item of wl.items) {
      const a = byTicker.get(item.ticker.trim().toUpperCase());
      if (!a) continue;
      const verdict: string = a.verdict || "";
      const color: string = a.verdict === "COMPRAR FORTE" || a.verdict === "COMPRAR" ? "green"
        : a.verdict === "JUSTO" || a.verdict === "ESTICADO" ? "yellow"
        : a.verdict === "ESPECULATIVO" ? "red" : "gray";
      const leverage = typeof a.leverage === "number" ? a.leverage : null;

      // Cacheia o último sinal SEMPRE (a UI lê signalAt p/ "atualizado há X" sem reanalisar).
      const inBuyZone = BUY_VERDICTS.has(verdict);
      const wasInBuyZone = !!item.transitionNotifiedAt;
      try {
        await prisma.watchlistItem.update({
          where: { id: item.id },
          data: {
            lastVerdict: verdict || null,
            lastSignalColor: color,
            lastLeverage: leverage,
            signalAt: new Date(),
            // re-arma a transição quando SAI da zona de compra (volta a poder notificar no futuro)
            ...(!inBuyZone && wasInBuyZone ? { transitionNotifiedAt: null } : {}),
          },
        });
      } catch { /* não trava */ }

      // TRANSIÇÃO: cruzou PARA a zona de compra e ainda não notificou → dispara.
      if (inBuyZone && !wasInBuyZone) {
        const strong = verdict === "COMPRAR FORTE";
        try {
          const targetLine =
            item.targetPrice != null && a.current_price != null
              ? ` (seu alvo: ${Number(item.targetPrice).toFixed(2)})`
              : "";
          await dispatch({
            userId: wl.userId, email, userName,
            type: "watchlist_transition",
            title: `Quique: ${item.ticker} → ${verdict}`,
            body: `${item.ticker} cruzou para ${verdict}${targetLine}. ${item.note ? `Sua tese: ${item.note}` : "A watchlist esperava este sinal de entrada."}`,
            url: "/watchlist",
            critical: strong, // COMPRAR FORTE escala e-mail; COMPRAR fica in-app
            emailContent: alertTriggeredEmail({
              name: userName, ticker: item.ticker, alertType: "OPORTUNIDADE",
              currentValue: a.current_price ?? verdict,
              dashboardUrl: `${APP_URL}/watchlist`,
              strategyName: `Transição de veredito (${verdict})`,
            }),
          });
          await prisma.watchlistItem.update({
            where: { id: item.id },
            data: { transitionNotifiedAt: new Date() },
          });
          fired++;
        } catch { /* não trava */ }
      }
    }
  }
  return fired;
}

export async function POST(req: NextRequest) {
  // Só o processo interno (start.sh) pode varrer todos os usuários.
  if (!INTERNAL_TOKEN || req.headers.get("x-internal-token") !== INTERNAL_TOKEN) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let priceFired = 0, survivalFired = 0, watchlistFired = 0;
  try { priceFired = await sweepPriceAlerts(); }
  catch (e) { logger.warn("sweep.price_failed", { error: (e as Error)?.message }); }
  try { survivalFired = await sweepSurvivalAlerts(); }
  catch (e) { logger.warn("sweep.survival_failed", { error: (e as Error)?.message }); }
  try { watchlistFired = await sweepWatchlistTransitions(); }
  catch (e) { logger.warn("sweep.watchlist_failed", { error: (e as Error)?.message }); }

  return NextResponse.json({
    fired: priceFired + survivalFired + watchlistFired,
    price: priceFired,
    survival: survivalFired,
    watchlist: watchlistFired,
  });
}
