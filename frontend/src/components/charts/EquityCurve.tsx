"use client";
import React, { useMemo } from "react";
import dynamic from "next/dynamic";
import { formatCurrency } from "@/lib/utils";

const EquityCurveRenderer = dynamic(
  () => import("./renderers/EquityCurveRenderer"),
  {
    loading: () => (
      <div className="bg-surface-2 rounded-lg h-80 animate-pulse" />
    ),
    ssr: false,
  }
);

const STRATEGY_CONFIG: Record<string, { color: string; label: string }> = {
  adaptive:      { color: "#00D4FF", label: "Adaptativo" },
  buy_hold_1x:   { color: "#94A3B8", label: "B&H Normal" },
  buy_hold_2x:   { color: "#FFB800", label: "B&H 2x Fixo" },
  sp500:         { color: "#A78BFA", label: "S&P 500" },
};

interface DataPoint { date: string; [key: string]: number | string }

interface EquityCurveProps {
  data: Record<string, Array<{ date: string; value: number }>>;
  title?: string;
  height?: number;
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface-3 border border-border rounded-lg p-3 shadow-card text-xs">
      <p className="text-text-muted mb-1.5">{label}</p>
      {payload.map((entry: any) => (
        <div key={entry.dataKey} className="flex justify-between gap-4">
          <span style={{ color: entry.color }}>{STRATEGY_CONFIG[entry.dataKey]?.label || entry.dataKey}</span>
          <span className="font-mono font-medium text-text-primary">{formatCurrency(entry.value, "USD", true)}</span>
        </div>
      ))}
    </div>
  );
}

function EquityCurve({ data, title = "Curva de Patrimônio", height = 340 }: EquityCurveProps) {
  if (!data || Object.keys(data).length === 0) return null;

  const memoizedData = useMemo(() => {
    const strategies = Object.keys(data);
    const allDates = [...new Set(strategies.flatMap((s) => data[s].map((d) => d.date)))].sort();

    const merged: DataPoint[] = allDates.map((date) => {
      const point: DataPoint = { date: date.slice(0, 7) };
      strategies.forEach((s) => {
        const d = data[s].find((x) => x.date === date);
        if (d) point[s] = d.value;
      });
      return point;
    });

    return merged.filter((_, i) => i % 15 === 0 || i === merged.length - 1);
  }, [data]);

  const strategies = Object.keys(data);

  return (
    <div className="card">
      <h3 className="text-sm font-semibold text-text-primary mb-4">{title}</h3>
      <EquityCurveRenderer
        data={memoizedData}
        strategies={strategies}
        height={height}
      />
    </div>
  );
}

export default React.memo(EquityCurve);
