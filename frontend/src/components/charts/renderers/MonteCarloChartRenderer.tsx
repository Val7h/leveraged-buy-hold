"use client";
import React from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { formatCurrency } from "@/lib/utils";
import type { SimulationScenario } from "@/types";

const SCENARIO_CONFIG: Record<string, { color: string; label: string; opacity: number }> = {
  p5: { color: "#FF3B3B", label: "Pessimista (P5)", opacity: 0.15 },
  p25: { color: "#FFB800", label: "Conservador (P25)", opacity: 0.15 },
  p50: { color: "#00D4FF", label: "Base (Mediana)", opacity: 0.25 },
  p75: { color: "#00E676", label: "Otimista (P75)", opacity: 0.15 },
  p95: { color: "#A78BFA", label: "Bull Case (P95)", opacity: 0.10 },
};

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface-3 border border-border rounded-lg p-3 shadow-card text-xs">
      <p className="text-text-muted mb-1.5">Ano {label}</p>
      {payload.map((entry: any) => (
        <div key={entry.dataKey} className="flex justify-between gap-4">
          <span style={{ color: entry.color }}>{entry.name}</span>
          <span className="font-mono font-medium text-text-primary">
            {formatCurrency(entry.value, "USD", true)}
          </span>
        </div>
      ))}
    </div>
  );
}

interface Props {
  data: Record<string, any>[];
  scenarios: Record<string, SimulationScenario>;
  height: number;
}

const MonteCarloChartRenderer = React.memo(
  ({ data, scenarios, height }: Props) => (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
        <defs>
          {Object.entries(SCENARIO_CONFIG).map(([key, cfg]) => (
            <linearGradient key={key} id={`mc-${key}`} x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="5%"
                stopColor={cfg.color}
                stopOpacity={cfg.opacity * 2}
              />
              <stop offset="95%" stopColor={cfg.color} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#1E2730" />
        <XAxis
          dataKey="year"
          tickFormatter={(v) => `Ano ${v}`}
          tick={{ fill: "#475569", fontSize: 10 }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
          tick={{ fill: "#475569", fontSize: 10 }}
          tickLine={false}
          axisLine={false}
          width={55}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          formatter={(v) => (
            <span style={{ color: "#94A3B8", fontSize: 11 }}>
              {SCENARIO_CONFIG[v]?.label || v}
            </span>
          )}
        />
        {Object.entries(SCENARIO_CONFIG).map(([key, cfg]) =>
          scenarios[key] ? (
            <Area
              key={key}
              type="monotone"
              dataKey={key}
              name={cfg.label}
              stroke={cfg.color}
              strokeWidth={key === "p50" ? 2.5 : 1.5}
              fill={`url(#mc-${key})`}
              dot={false}
              connectNulls
            />
          ) : null
        )}
      </AreaChart>
    </ResponsiveContainer>
  ),
  (prev, next) => {
    return (
      JSON.stringify(prev.data) === JSON.stringify(next.data) &&
      Object.keys(prev.scenarios).length === Object.keys(next.scenarios).length &&
      prev.height === next.height
    );
  }
);

MonteCarloChartRenderer.displayName = "MonteCarloChartRenderer";

export default MonteCarloChartRenderer;
