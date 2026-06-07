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
  const rsi = spy.rsi_weekly;
  const distMa = spy.ma200_distance_pct;
  const distTop = ((spy.current_price - spy.high_52w) / spy.high_52w) * 100;

  let state: string, multiplier: number, description: string;

  // CAPITULAÇÃO: RSI muito baixo + abaixo MM200 ou longe do topo
  if (rsi < 35 || distTop < -20) {
    state = "CAPITULAÇÃO";
    multiplier = 3.0;
    description = `RSI semanal SPY em ${rsi.toFixed(1)} (oversold). Momento histórico de compras agressivas.`;
  }
  // TOPO: RSI muito alto + perto do topo + bem acima MM200
  else if (rsi > 70 && distMa > 15 && distTop > -3) {
    state = "TOPO";
    multiplier = 0.5;
    description = `RSI semanal SPY em ${rsi.toFixed(1)} (overbought). Reduzir alavancagem, aguardar correção.`;
  }
  // NORMAL: tudo entre os extremos
  else {
    state = "NORMAL";
    multiplier = 1.5;
    description = `Mercado em condições normais. RSI ${rsi.toFixed(1)}, MM200 ${distMa > 0 ? "+" : ""}${distMa.toFixed(1)}%.`;
  }

  return NextResponse.json({
    state,
    multiplier,
    description,
    signals: {
      rsi_semanal_spy: Number(rsi.toFixed(1)),
      distancia_ma200_pct: Number(distMa.toFixed(1)),
      distancia_topo_52s_pct: Number(distTop.toFixed(1)),
    },
    spy_price: spy.current_price,
    last_update: new Date().toISOString(),
  });
}
