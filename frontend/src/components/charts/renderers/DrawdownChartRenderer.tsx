"use client";
import React from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";

const STRATEGY_CONFIG: Record<string, { color: string; label: string }> = {
  adaptive: { color: "#00D4FF", label: "Adaptativo" },
  buy_hold_1x: { color: "#94A3B8", label: "B&H Normal" },
  buy_hold_2x: { color: "#FFB800", label: "B&H 2x Fixo" },
  sp500: { color: "#A78BFA", label: "S&P 500" },
};

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface-3 border border-border rounded-lg p-3 shadow-card text-xs">
      <p className="text-text-muted mb-1.5">{label}</p>
      {payload.map((entry: any) => (
        <div key={entry.dataKey} className="flex justify-between gap-4">
          <span style={{ color: entry.color }}>
            {STRATEGY_CONFIG[entry.dataKey]?.label || entry.dataKey}
          </span>
          <span className="font-mono font-medium text-danger">
            {entry.value?.toFixed(1)}%
          </span>
        </div>
      ))}
    </div>
  );
}

interface Props {
  data: Record<string, any>[];
  strategies: string[];
  height: number;
}

const DrawdownChartRenderer = React.memo(
  ({ data, strategies, height }: Props) => (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 5, right: 10, left: 5, bottom: 5 }}>
        <defs>
          {strategies.map((s) => (
            <linearGradient key={s} id={`ddg-${s}`} x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="5%"
                stopColor={STRATEGY_CONFIG[s]?.color || "#FF3B3B"}
                stopOpacity={0.2}
              />
              <stop
                offset="95%"
                stopColor={STRATEGY_CONFIG[s]?.color || "#FF3B3B"}
                stopOpacity={0}
              />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#1E2730" />
        <XAxis
          dataKey="date"
          tick={{ fill: "#475569", fontSize: 10 }}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tickFormatter={(v) => `${v.toFixed(0)}%`}
          tick={{ fill: "#475569", fontSize: 10 }}
          tickLine={false}
          axisLine={false}
          width={42}
        />
        <Tooltip content={<CustomTooltip />} />
        {strategies.map((s) => (
          <Area
            key={s}
            type="monotone"
            dataKey={s}
            stroke={STRATEGY_CONFIG[s]?.color || "#888"}
            strokeWidth={1.5}
            fill={`url(#ddg-${s})`}
            dot={false}
            connectNulls
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  ),
  (prev, next) => {
    return (
      JSON.stringify(prev.data) === JSON.stringify(next.data) &&
      JSON.stringify(prev.strategies) === JSON.stringify(next.strategies) &&
      prev.height === next.height
    );
  }
);

DrawdownChartRenderer.displayName = "DrawdownChartRenderer";

export default DrawdownChartRenderer;
