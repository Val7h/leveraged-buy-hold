import { NextResponse } from "next/server";
import { getQuote } from "@/lib/yfinance";

export async function GET() {
  const spy = await getQuote("SPY");

  if (!spy) {
    // Fallback se Yahoo falhar
    return NextResponse.json({
      state: "NORMAL",
      multiplier: 1.5,
      description: "Dados de mercado indisponíveis no momento. Modo demo ativo.",
      signals: {
        rsi_semanal_spy: 50,
        distancia_ma200_pct: 0,
        distancia_topo_52s_pct: 0,
      },
    });
  }

  // Lógica adaptativa real baseada em RSI semanal do SPY + distância MM200 + topo
  // Thresholds calibrados conforme Pagan-Sossounov (2003) e Ned Davis Research:
  //   - CAPITULAÇÃO: bear market severo (drawdown >-35% + RSI <30), ocorrência rara (2000, 2008, 2020).
  //   - CORREÇÃO: pullback técnico (-15% e RSI fraco), ocorre 1-2x por ano em SPY.
  //   - TOPO: euforia (RSI overbought + perto do high + bem acima MM200).
  //   - NORMAL: tudo entre os extremos.
  //
  // PEGADINHA: distTop é NEGATIVO. "< -35" significa drawdown >35% (mais profundo).
  // RSI null tratado como neutro (50) para evitar falso disparo.
  const rsi = spy.rsi_weekly ?? 50;
  const distMa = spy.ma200_distance_pct;
  const distTop = ((spy.current_price - spy.high_52w) / spy.high_52w) * 100;

  let state: string;
  let multiplier: number;
  let description: string;

  if (rsi < 30 && distTop < -35) {
    state = "CAPITULAÇÃO";
    multiplier = 3.0;
    description = `RSI semanal SPY em ${rsi.toFixed(1)} (oversold) + drawdown ${distTop.toFixed(1)}% do topo. Capitulação severa — janela histórica de compra agressiva.`;
  } else if (rsi < 40 && distTop < -15) {
    state = "CORREÇÃO";
    multiplier = 2.0;
    description = `RSI semanal SPY em ${rsi.toFixed(1)} + queda ${distTop.toFixed(1)}% do topo. Correção técnica — aumentar exposição com cautela.`;
  } else if (rsi > 70 && distMa > 15 && distTop > -3) {
    state = "TOPO";
    multiplier = 0.5;
    description = `RSI semanal SPY em ${rsi.toFixed(1)} (overbought) + ${distMa.toFixed(1)}% acima MM200. Reduzir alavancagem, aguardar correção.`;
  } else {
    state = "NORMAL";
    multiplier = 1.5;
    description = `Mercado em condições normais. RSI ${rsi.toFixed(1)}, MM200 ${distMa > 0 ? "+" : ""}${distMa.toFixed(1)}%.`;
  }

  return NextResponse.json({
    state,
    multiplier,
    description,
    signals: {
      rsi_semanal_spy: spy.rsi_weekly != null ? Number(spy.rsi_weekly.toFixed(1)) : null,
      distancia_ma200_pct: Number(distMa.toFixed(1)),
      distancia_topo_52s_pct: Number(distTop.toFixed(1)),
    },
    spy_price: spy.current_price,
    last_update: new Date().toISOString(),
  });
}
