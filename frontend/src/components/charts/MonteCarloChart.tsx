"use client";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { formatCurrency } from "@/lib/utils";
import type { SimulationScenario } from "@/types";

const SCENARIO_CONFIG: Record<string, { color: string; label: string; opacity: number }> = {
  p5:  { color: "#FF3B3B", label: "Pessimista (P5)",  opacity: 0.15 },
  p25: { color: "#FFB800", label: "Conservador (P25)", opacity: 0.15 },
  p50: { color: "#00D4FF", label: "Base (Mediana)",   opacity: 0.25 },
  p75: { color: "#00E676", label: "Otimista (P75)",   opacity: 0.15 },
  p95: { color: "#A78BFA", label: "Bull Case (P95)",  opacity: 0.10 },
};

interface MonteCarloChartProps {
  scenarios: SimulationScenario[];
  height?: number;
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface-3 border border-border rounded-lg p-3 shadow-card text-xs">
      <p className="text-text-muted mb-1.5">Ano {label}</p>
      {payload.map((entry: any) => (
        <div key={entry.dataKey} className="flex justify-between gap-4">
          <span style={{ color: entry.color }}>{entry.name}</span>
          <span className="font-mono font-medium text-text-primary">{formatCurrency(entry.value, "USD", true)}</span>
        </div>
      ))}
    </div>
  );
}

export default function MonteCarloChart({ scenarios, height = 360 }: MonteCarloChartProps) {
  if (!scenarios?.length) return null;

  const scenarioMap: Record<string, typeof scenarios[0]> = {};
  scenarios.forEach((s) => {
    const key = `p${s.percentile}`;
    if (SCENARIO_CONFIG[key]) scenarioMap[key] = s;
  });

  const allYears = [...new Set(Object.values(scenarioMap).flatMap((s) => s.equity_curve.map((p) => p.year)))].sort((a, b) => a - b);

  const merged = allYears.map((year) => {
    const point: Record<string, number | string> = { year: year.toFixed(1) };
    Object.entries(scenarioMap).forEach(([key, s]) => {
      const p = s.equity_curve.find((x) => Math.abs(x.year - year) < 0.1);
      if (p) point[key] = p.value;
    });
    return point;
  });

  return (
    <div className="card">
      <h3 className="text-sm font-semibold text-text-primary mb-4">Monte Carlo — Evolução do Patrimônio</h3>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={merged} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
          <defs>
            {Object.entries(SCENARIO_CONFIG).map(([key, cfg]) => (
              <linearGradient key={key} id={`mc-${key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={cfg.color} stopOpacity={cfg.opacity * 2} />
                <stop offset="95%" stopColor={cfg.color} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1E2730" />
          <XAxis dataKey="year" tickFormatter={(v) => `Ano ${v}`} tick={{ fill: "#475569", fontSize: 10 }} tickLine={false} axisLine={false} />
          <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} tick={{ fill: "#475569", fontSize: 10 }} tickLine={false} axisLine={false} width={55} />
          <Tooltip content={<CustomTooltip />} />
          <Legend formatter={(v) => <span style={{ color: "#94A3B8", fontSize: 11 }}>{SCENARIO_CONFIG[v]?.label || v}</span>} />
          {Object.entries(SCENARIO_CONFIG).map(([key, cfg]) => (
            scenarioMap[key] ? (
              <Area key={key} type="monotone" dataKey={key} name={cfg.label} stroke={cfg.color}
                strokeWidth={key === "p50" ? 2.5 : 1.5} fill={`url(#mc-${key})`} dot={false} connectNulls />
            ) : null
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
