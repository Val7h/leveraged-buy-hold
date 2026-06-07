"use client";

import React, { useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import type { Position } from "@/types";

// Simple sector detection based on ticker
const getSectorFromTicker = (ticker: string): string => {
  const upperTicker = ticker.toUpperCase();

  // US Utilities
  if (["NEE", "SO", "D", "DUK", "AEP", "WEC", "ES", "EXC", "PCG", "ETR", "AWK"].includes(upperTicker)) {
    return "Utilities";
  }

  // US Healthcare
  if (["JNJ", "ABT", "MDT", "BMY", "PFE", "MRK", "UNH", "CVS", "CI", "ELV", "HCA"].includes(upperTicker)) {
    return "Healthcare";
  }

  // US Consumer Staples
  if (["PG", "KO", "PEP", "MO", "CL", "GIS", "K", "CPB", "HRL", "SJM"].includes(upperTicker)) {
    return "Consumer Staples";
  }

  // US Technology
  if (["AAPL", "MSFT", "NVDA", "GOOGL", "META", "TSLA", "AMD", "QCOM"].includes(upperTicker)) {
    return "Technology";
  }

  // US Financials & REITs
  if (["O", "MAIN", "STAG", "WPC", "NNN", "ADC", "VICI", "AMT", "CCI", "EQIX"].includes(upperTicker)) {
    return "REITs/Income";
  }

  // Brazilian stocks
  if (upperTicker.endsWith(".SA")) {
    // Utilities
    if (["TAEE11.SA", "EGIE3.SA", "CPFE3.SA", "ENGI11.SA", "TRPL4.SA"].includes(upperTicker)) {
      return "Utilities (BR)";
    }
    // Banks
    if (["ITUB4.SA", "BBDC4.SA", "BBAS3.SA", "SANB11.SA", "BPAC11.SA"].includes(upperTicker)) {
      return "Banks (BR)";
    }
    // Energy
    if (["PETR4.SA", "PETR3.SA", "PRIO3.SA"].includes(upperTicker)) {
      return "Energy (BR)";
    }
    // Default to other
    return "Other (BR)";
  }

  // Crypto/Tokenized
  if (upperTicker.includes("ONUSDT")) {
    return "Crypto";
  }

  return "Other";
};

interface SectorBreakdownWidgetProps {
  positions: Position[];
}

export default function SectorBreakdownWidget({ positions }: SectorBreakdownWidgetProps) {
  const sectorBreakdown = useMemo(() => {
    if (positions.length === 0) return [];

    // Group by sector
    const sectorMap = new Map<string, number>();
    let total = 0;

    positions.forEach((pos) => {
      const sector = getSectorFromTicker(pos.ticker);
      const value = (pos.current_value || 0) * (pos.leverage || 1);
      total += value;
      sectorMap.set(sector, (sectorMap.get(sector) || 0) + value);
    });

    // Convert to array with percentages
    return Array.from(sectorMap.entries())
      .map(([name, value]) => ({
        name,
        value: parseFloat(value.toFixed(2)),
        percentage: total > 0 ? ((value / total) * 100).toFixed(1) : "0",
      }))
      .sort((a, b) => b.value - a.value);
  }, [positions]);

  // Colors for sectors
  const COLORS = [
    "#00FF88", // success
    "#00D4FF", // primary
    "#FFD700", // warning
    "#FF4D4D", // danger
    "#00E5FF", // cyan
    "#88FF00", // lime
    "#FF88FF", // magenta
    "#FFAA00", // orange
  ];

  if (positions.length === 0 || sectorBreakdown.length === 0) {
    return (
      <div className="card bg-surface-2/50 border-border/40 p-4 text-center">
        <p className="text-xs text-text-muted">Nenhuma posição na carteira</p>
      </div>
    );
  }

  const total = sectorBreakdown.reduce((sum, s) => sum + s.value, 0);

  return (
    <div className="card mb-5">
      <div className="mb-4">
        <h3 className="text-sm font-bold text-text-primary">Composição por Setor</h3>
        <p className="text-xs text-text-muted mt-0.5">Exposição em valor nominal (incluindo leverage)</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pie Chart */}
        <div className="flex items-center justify-center min-h-[250px]">
          {sectorBreakdown.length > 0 && (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={sectorBreakdown}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percentage }) => `${name} ${percentage}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {sectorBreakdown.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => `$${value.toFixed(2)}`}
                  contentStyle={{ background: "#0A0E14", border: "1px solid #1E2530", borderRadius: 8 }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Sector List */}
        <div className="space-y-2">
          {sectorBreakdown.map((sector, index) => (
            <div key={sector.name} className="bg-surface-2/50 rounded-lg p-3 border border-border/20">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="text-xs font-semibold text-text-primary">{sector.name}</span>
                </div>
                <span className="text-xs font-bold text-text-primary">{sector.percentage}%</span>
              </div>
              <div className="w-full bg-surface-3 rounded-full h-1.5">
                <div
                  className="h-1.5 rounded-full transition-all"
                  style={{
                    width: `${sector.percentage}%`,
                    backgroundColor: COLORS[index % COLORS.length],
                  }}
                />
              </div>
              <p className="text-[10px] text-text-muted mt-1">
                ${sector.value.toFixed(2)}
              </p>
            </div>
          ))}

          {/* Summary */}
          <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 mt-4">
            <p className="text-xs text-text-muted mb-1">Exposição Total</p>
            <p className="text-sm font-bold text-primary">${total.toFixed(2)}</p>
            <p className="text-[10px] text-text-muted/70 mt-1">
              {positions.length} posição{positions.length > 1 ? "s" : ""}
            </p>
          </div>
        </div>
      </div>

      {/* Recommendations */}
      <div className="mt-4 pt-4 border-t border-border/40">
        <p className="text-xs font-semibold text-text-muted uppercase mb-2">💡 Insights</p>
        <div className="space-y-1 text-xs text-text-secondary">
          {sectorBreakdown.length > 0 && (
            <>
              <p>
                <strong>Maior exposição:</strong> {sectorBreakdown[0]?.name} ({sectorBreakdown[0]?.percentage}%)
              </p>
              {sectorBreakdown.length > 1 && (
                <p>
                  <strong>Diversificação:</strong> {sectorBreakdown.length} setor{sectorBreakdown.length > 1 ? "es" : ""}
                </p>
              )}
              {parseFloat(sectorBreakdown[0]?.percentage || "0") > 60 && (
                <p className="text-warning">
                  ⚠️ Considere rebalancear — um setor tem mais de 60% da exposição
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
