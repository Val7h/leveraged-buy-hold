"use client";
import React, { useMemo } from "react";
import dynamic from "next/dynamic";
import type { TradeMarker, TradeMarkerType } from "@/types";

const PriceTradeChartRenderer = dynamic(
  () => import("./renderers/PriceTradeChartRenderer"),
  {
    loading: () => (
      <div className="bg-surface-2 rounded-lg h-80 animate-pulse" />
    ),
    ssr: false,
  }
);

interface PricePoint { date: string; value: number }

interface PriceTradeChartProps {
  priceData: PricePoint[];
  trades?: TradeMarker[];
  ticker?: string;
  height?: number;
}

// Colors per trade type
const TRADE_COLOR: Record<TradeMarkerType, string> = {
  INICIAL:         "#00D4FF",
  APORTE:          "#0ecb81",
  REBALANCE_ALTA:  "#22C55E",
  REBALANCE_BAIXA: "#F59E0B",
  MARGIN_CALL:     "#EF4444",
};

const TRADE_LABEL: Record<TradeMarkerType, string> = {
  INICIAL:         "Entrada",
  APORTE:          "Aporte",
  REBALANCE_ALTA:  "Alavancagem ↑",
  REBALANCE_BAIXA: "Alavancagem ↓",
  MARGIN_CALL:     "Margin Call",
};

// ── Custom dot renderer ──────────────────────────────────────────────────────
function CustomDot(props: any) {
  const { cx, cy, payload } = props;
  const trade = payload._trade as TradeMarker | undefined;

  if (!trade) return <circle key={payload.date} cx={cx} cy={cy} r={0} />;

  const color = TRADE_COLOR[trade.type];
  const isMC  = trade.type === "MARGIN_CALL";
  const isUp  = trade.type === "APORTE" || trade.type === "REBALANCE_ALTA" || trade.type === "INICIAL";
  const isSmall = trade.type === "APORTE"; // aportes get smaller markers

  if (isMC) {
    // Red X marker for margin call
    const s = 8;
    return (
      <g key={`mc-${payload.date}`}>
        <circle cx={cx} cy={cy} r={10} fill="#EF444430" stroke="#EF4444" strokeWidth={1.5} />
        <line x1={cx - s} y1={cy - s} x2={cx + s} y2={cy + s} stroke="#EF4444" strokeWidth={2.5} />
        <line x1={cx + s} y1={cy - s} x2={cx - s} y2={cy + s} stroke="#EF4444" strokeWidth={2.5} />
      </g>
    );
  }

  if (isSmall) {
    // Small dot for aportes (many of them)
    return (
      <circle
        key={`aporte-${payload.date}`}
        cx={cx}
        cy={isUp ? cy - 6 : cy + 6}
        r={3}
        fill={color}
        opacity={0.85}
      />
    );
  }

  // Arrow triangle for rebalance events
  const arrowSize = 8;
  const points = isUp
    ? `${cx},${cy - arrowSize - 4} ${cx - 5},${cy - 4} ${cx + 5},${cy - 4}`
    : `${cx},${cy + arrowSize + 4} ${cx - 5},${cy + 4} ${cx + 5},${cy + 4}`;

  return (
    <g key={`trade-${payload.date}`}>
      <circle cx={cx} cy={cy} r={4} fill={color} stroke="white" strokeWidth={1} />
      <polygon points={points} fill={color} />
    </g>
  );
}

// ── Custom tooltip ────────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const data = payload[0]?.payload;
  const trade = data?._trade as TradeMarker | undefined;

  return (
    <div className="bg-surface-3 border border-border rounded-lg p-3 shadow-card text-xs min-w-[160px]">
      <p className="text-text-muted mb-1">{label}</p>
      <p className="font-mono font-semibold text-text-primary">
        ${Number(payload[0]?.value ?? 0).toFixed(2)}
      </p>
      {trade && (
        <div className="mt-1.5 pt-1.5 border-t border-border/40">
          <p style={{ color: TRADE_COLOR[trade.type] }} className="font-medium">
            {TRADE_LABEL[trade.type]}
          </p>
          {trade.details && (
            <p className="text-text-muted mt-0.5">{trade.details}</p>
          )}
          {trade.leverage > 0 && (
            <p className="text-text-muted">{trade.leverage.toFixed(1)}x alavancagem</p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
function PriceTradeChart({
  priceData,
  trades = [],
  ticker = "Ativo",
  height = 320,
}: PriceTradeChartProps) {
  if (!priceData || priceData.length === 0) return null;

  const memoizedData = useMemo(() => {
    // Build trade map (date → trade)
    const tradeMap = new Map(trades.map((t) => [t.date, t]));

    // Merge trade info into price data
    const chartData = priceData.map((p) => ({
      date: p.date.slice(0, 7),   // YYYY-MM for display
      _date: p.date,               // full date for lookup
      price: p.value,
      _trade: tradeMap.get(p.date) ?? null,
    }));

    // Legend entries for trade types present in this run
    const presentTypes = [...new Set(trades.map((t) => t.type))];

    return { chartData, presentTypes };
  }, [priceData, trades]);

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-text-primary">
          Gráfico de Preço — {ticker} + Operações
        </h3>
        <div className="flex flex-wrap gap-3">
          {memoizedData.presentTypes.map((type) => (
            <div key={type} className="flex items-center gap-1">
              <span
                className="inline-block w-2 h-2 rounded-full"
                style={{ backgroundColor: TRADE_COLOR[type] }}
              />
              <span className="text-xs text-text-muted">{TRADE_LABEL[type]}</span>
            </div>
          ))}
        </div>
      </div>

      <PriceTradeChartRenderer
        chartData={memoizedData.chartData}
        ticker={ticker}
        height={height}
      />

      {trades.length > 0 && (
        <p className="text-xs text-text-muted mt-2 text-right">
          {trades.filter((t) => t.type === "APORTE").length} aportes ·{" "}
          {trades.filter((t) => t.type.startsWith("REBALANCE")).length} rebalanceamentos ·{" "}
          {trades.filter((t) => t.type === "MARGIN_CALL").length > 0
            ? <span className="text-danger font-medium">⚠ Margin call detectado</span>
            : <span className="text-success">✓ Sem margin calls</span>
          }
        </p>
      )}
    </div>
  );
}

export default React.memo(PriceTradeChart);
