"use client";
import React, { useMemo } from "react";
import dynamic from "next/dynamic";
import type { SimulationScenario } from "@/types";

const MonteCarloChartRenderer = dynamic(
  () => import("./renderers/MonteCarloChartRenderer"),
  {
    loading: () => (
      <div className="bg-surface-2 rounded-lg h-96 animate-pulse" />
    ),
    ssr: false,
  }
);

interface MonteCarloChartProps {
  scenarios: SimulationScenario[];
  height?: number;
}

function MonteCarloChart({ scenarios, height = 360 }: MonteCarloChartProps) {
  if (!scenarios?.length) return null;

  const memoizedData = useMemo(() => {
    const SCENARIO_CONFIG: Record<string, { color: string; label: string; opacity: number }> = {
      p5: { color: "#FF3B3B", label: "Pessimista (P5)", opacity: 0.15 },
      p25: { color: "#FFB800", label: "Conservador (P25)", opacity: 0.15 },
      p50: { color: "#00D4FF", label: "Base (Mediana)", opacity: 0.25 },
      p75: { color: "#00E676", label: "Otimista (P75)", opacity: 0.15 },
      p95: { color: "#A78BFA", label: "Bull Case (P95)", opacity: 0.10 },
    };

    const scenarioMap: Record<string, typeof scenarios[0]> = {};
    scenarios.forEach((s) => {
      const key = `p${s.percentile}`;
      if (SCENARIO_CONFIG[key]) scenarioMap[key] = s;
    });

    const allYears = [...new Set(
      Object.values(scenarioMap).flatMap((s) =>
        s.equity_curve.map((p) => p.year)
      )
    )].sort((a, b) => a - b);

    const merged = allYears.map((year) => {
      const point: Record<string, number | string> = { year: year.toFixed(1) };
      Object.entries(scenarioMap).forEach(([key, s]) => {
        const p = s.equity_curve.find((x) => Math.abs(x.year - year) < 0.1);
        if (p) point[key] = p.value;
      });
      return point;
    });

    return { merged, scenarioMap };
  }, [scenarios]);

  return (
    <div className="card">
      <h3 className="text-sm font-semibold text-text-primary mb-4">
        Monte Carlo — Evolução do Patrimônio
      </h3>
      <MonteCarloChartRenderer
        data={memoizedData.merged}
        scenarios={memoizedData.scenarioMap}
        height={height}
      />
    </div>
  );
}

export default React.memo(MonteCarloChart);
