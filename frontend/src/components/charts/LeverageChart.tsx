"use client";
import React, { useMemo } from "react";
import dynamic from "next/dynamic";

const LeverageChartRenderer = dynamic(
  () => import("./renderers/LeverageChartRenderer"),
  {
    loading: () => (
      <div className="bg-surface-2 rounded-lg h-48 animate-pulse" />
    ),
    ssr: false,
  }
);

interface LeveragePoint { date?: string; month?: number; year?: number; leverage: number }

interface LeverageChartProps {
  data: LeveragePoint[];
  height?: number;
  title?: string;
}

function LeverageChart({ data, height = 200, title = "Alavancagem ao Longo do Tempo" }: LeverageChartProps) {
  if (!data?.length) return null;

  const memoizedData = useMemo(() => {
    const formatted = data.map((d) => ({
      label: d.date ? d.date.slice(0, 7) : `Ano ${d.year?.toFixed(0)}`,
      leverage: d.leverage,
    }));
    return formatted.filter(
      (_, i) => i % Math.max(1, Math.floor(formatted.length / 60)) === 0
    );
  }, [data]);

  return (
    <div className="card">
      <h3 className="text-sm font-semibold text-text-primary mb-4">{title}</h3>
      <LeverageChartRenderer data={memoizedData} height={height} />
    </div>
  );
}

export default React.memo(LeverageChart);
