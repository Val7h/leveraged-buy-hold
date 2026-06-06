import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    state: "NORMAL",
    multiplier: 1.5,
    description: "Mercado em consolidação. Bom momento para entradas seletivas em ativos defensivos.",
    signals: {
      rsi_semanal_spy: 52.3,
      distancia_ma200_pct: 5.2,
      distancia_topo_52s_pct: -8.5,
    },
  });
}
