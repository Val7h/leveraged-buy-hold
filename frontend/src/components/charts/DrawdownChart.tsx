"use client";
import React, { useMemo } from "react";
import dynamic from "next/dynamic";

const DrawdownChartRenderer = dynamic(
  () => import("./renderers/DrawdownChartRenderer"),
  {
    loading: () => (
      <div className="bg-surface-2 rounded-lg h-56 animate-pulse" />
    ),
    ssr: false,
  }
);

interface DrawdownChartProps {
  data: Record<string, Array<{ date: string; value: number }>>;
  height?: number;
}

function DrawdownChart({ data, height = 220 }: DrawdownChartProps) {
  if (!data || Object.keys(data).length === 0) return null;

  const memoizedData = useMemo(() => {
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

    return merged.filter((_, i) => i % 15 === 0 || i === merged.length - 1);
  }, [data]);

  const strategies = Object.keys(data);

  return (
    <div className="card">
      <h3 className="text-sm font-semibold text-text-primary mb-4">Drawdown (%)</h3>
      <DrawdownChartRenderer
        data={memoizedData}
        strategies={strategies}
        height={height}
      />
    </div>
  );
}

export default React.memo(DrawdownChart);
