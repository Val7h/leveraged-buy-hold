"use client";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";

interface DrawdownChartProps {
  data: Record<string, Array<{ date: string; value: number }>>;
  height?: number;
}

const STRATEGY_CONFIG: Record<string, { color: string; label: string }> = {
  adaptive:    { color: "#00D4FF", label: "Adaptativo" },
  buy_hold_1x: { color: "#94A3B8", label: "B&H Normal" },
  buy_hold_2x: { color: "#FFB800", label: "B&H 2x Fixo" },
  sp500:       { color: "#A78BFA", label: "S&P 500" },
};

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface-3 border border-border rounded-lg p-3 shadow-card text-xs">
      <p className="text-text-muted mb-1.5">{label}</p>
      {payload.map((entry: any) => (
        <div key={entry.dataKey} className="flex justify-between gap-4">
          <span style={{ color: entry.color }}>{STRATEGY_CONFIG[entry.dataKey]?.label || entry.dataKey}</span>
          <span className="font-mono font-medium text-danger">{entry.value?.toFixed(1)}%</span>
        </div>
      ))}
    </div>
  );
}

export default function DrawdownChart({ data, height = 220 }: DrawdownChartProps) {
  if (!data || Object.keys(data).length === 0) return null;

  const strategies = Object.keys(data);
  const allDates = [...new Set(strategies.flatMap((s) => (data[s] || []).map((d) => d.date)))].sort();
  const merged = allDates.map((date) => {
    const point: Record<string, number | string> = { date: date.slice(0, 7) };
    strategies.forEach((s) => {
      const d = (data[s] || []).find((x) => x.date === date);
      if (d) point[s] = d.value;
    });
    return point;
  });

  const sample = merged.filter((_, i) => i % 15 === 0 || i === merged.length - 1);

  return (
    <div className="card">
      <h3 className="text-sm font-semibold text-text-primary mb-4">Drawdown (%)</h3>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={sample} margin={{ top: 5, right: 10, left: 5, bottom: 5 }}>
          <defs>
            {strategies.map((s) => (
              <linearGradient key={s} id={`ddg-${s}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={STRATEGY_CONFIG[s]?.color || "#FF3B3B"} stopOpacity={0.2} />
                <stop offset="95%" stopColor={STRATEGY_CONFIG[s]?.color || "#FF3B3B"} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1E2730" />
          <XAxis dataKey="date" tick={{ fill: "#475569", fontSize: 10 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
          <YAxis tickFormatter={(v) => `${v.toFixed(0)}%`} tick={{ fill: "#475569", fontSize: 10 }} tickLine={false} axisLine={false} width={42} />
          <Tooltip content={<CustomTooltip />} />
          {strategies.map((s) => (
            <Area key={s} type="monotone" dataKey={s} stroke={STRATEGY_CONFIG[s]?.color || "#888"} strokeWidth={1.5} fill={`url(#ddg-${s})`} dot={false} connectNulls />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
