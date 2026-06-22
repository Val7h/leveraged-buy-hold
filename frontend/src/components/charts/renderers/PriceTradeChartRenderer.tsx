"use client";
import React from "react";
import {
  ComposedChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Brush,
} from "recharts";
import type { TradeMarker, TradeMarkerType } from "@/types";

const TRADE_COLOR: Record<TradeMarkerType, string> = {
  INICIAL: "#00D4FF",
  APORTE: "#0ecb81",
  REBALANCE_ALTA: "#22C55E",
  REBALANCE_BAIXA: "#F59E0B",
  MARGIN_CALL: "#EF4444",
};

const TRADE_LABEL: Record<TradeMarkerType, string> = {
  INICIAL: "Entrada",
  APORTE: "Aporte",
  REBALANCE_ALTA: "Alavancagem ↑",
  REBALANCE_BAIXA: "Alavancagem ↓",
  MARGIN_CALL: "Margin Call",
};

function CustomDot(props: any) {
  const { cx, cy, payload } = props;
  const trade = payload._trade as TradeMarker | undefined;

  if (!trade) return <circle key={payload.date} cx={cx} cy={cy} r={0} />;

  const color = TRADE_COLOR[trade.type];
  const isMC = trade.type === "MARGIN_CALL";
  const isUp = trade.type === "APORTE" || trade.type === "REBALANCE_ALTA" || trade.type === "INICIAL";
  const isSmall = trade.type === "APORTE";

  if (isMC) {
    const s = 8;
    return (
      <g key={`mc-${payload.date}`}>
        <circle
          cx={cx}
          cy={cy}
          r={10}
          fill="#EF444430"
          stroke="#EF4444"
          strokeWidth={1.5}
        />
        <line x1={cx - s} y1={cy - s} x2={cx + s} y2={cy + s} stroke="#EF4444" strokeWidth={2.5} />
        <line x1={cx + s} y1={cy - s} x2={cx - s} y2={cy + s} stroke="#EF4444" strokeWidth={2.5} />
      </g>
    );
  }

  if (isSmall) {
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

interface Props {
  chartData: Array<{ date: string; _date: string; price: number; _trade: TradeMarker | null }>;
  ticker: string;
  height: number;
}

const PriceTradeChartRenderer = React.memo(
  ({ chartData, ticker, height }: Props) => (
    <ResponsiveContainer width="100%" height={height} minWidth={0}>
      <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1E2730" />
        <XAxis
          dataKey="date"
          tick={{ fill: "#475569", fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tickFormatter={(v) => `$${v.toFixed(0)}`}
          tick={{ fill: "#475569", fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          width={55}
        />
        <Tooltip content={<CustomTooltip />} />
        <Line
          type="monotone"
          dataKey="price"
          stroke="#00D4FF"
          strokeWidth={1.5}
          dot={<CustomDot />}
          activeDot={{ r: 4, fill: "#00D4FF" }}
          connectNulls
          name={ticker}
        />
        {/* Brush: pan/zoom de faixa por toque (mobile) + arrasto (desktop) */}
        <Brush
          dataKey="date"
          height={30}
          travellerWidth={14}
          gap={1}
          stroke="#00D4FF"
          fill="#0B0F14"
          tickFormatter={() => ""}
        />
      </ComposedChart>
    </ResponsiveContainer>
  ),
  (prev, next) => {
    return (
      JSON.stringify(prev.chartData) === JSON.stringify(next.chartData) &&
      prev.ticker === next.ticker &&
      prev.height === next.height
    );
  }
);

PriceTradeChartRenderer.displayName = "PriceTradeChartRenderer";

export default PriceTradeChartRenderer;
