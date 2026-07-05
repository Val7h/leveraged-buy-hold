"use client";

import React, { useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
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
    // FII pattern
    if (/[A-Z]{4}11/.test(upperTicker.replace(".SA", ""))) {
      return "FII (BR)";
    }
    // Default to other
    return "Other (BR)";
  }

  // Crypto/Tokenized
  if (upperTicker.includes("USDT") || upperTicker.includes("BTC") || upperTicker.includes("ETH")) {
    return "Crypto";
  }

  return "Other";
};

// Doctrine target allocations (sector group → target %)
// ~40% Utilities/defensives, ~30% US dividend/REITs, ~20% FII, ~10% Crypto/seed
const SECTOR_TARGETS: Record<string, number> = {
  "Utilities":        20,
  "Utilities (BR)":   10,
  "Healthcare":       10,
  "Consumer Staples": 10,
  "REITs/Income":     15,
  "FII (BR)":         20,
  "Crypto":           10,
  "Technology":        0,
  "Banks (BR)":        5,
  "Energy (BR)":       0,
  "Other (BR)":        0,
  "Other":             0,
};

function getTargetPct(sectorName: string): number {
  return SECTOR_TARGETS[sectorName] ?? 0;
}

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

    // Convert to array with percentages and targets
    return Array.from(sectorMap.entries())
      .map(([name, value]) => {
        const realPct = total > 0 ? (value / total) * 100 : 0;
        const targetPct = getTargetPct(name);
        const delta = realPct - targetPct;
        return {
          name,
          value: parseFloat(value.toFixed(2)),
          percentage: parseFloat(realPct.toFixed(1)),
          targetPct,
          delta: parseFloat(delta.toFixed(1)),
        };
      })
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

  // Empty state
  if (positions.length === 0 || sectorBreakdown.length === 0) {
    return (
      <div className="card bg-surface-2/50 border-border/40 p-8 text-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-surface-3 flex items-center justify-center">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-text-muted">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/>
              <path d="M2 17l10 5 10-5"/>
              <path d="M2 12l10 5 10-5"/>
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-text-secondary">Sem dados de setor</p>
            <p className="text-xs text-text-muted mt-1">Adicione posições para ver a alocação setorial</p>
          </div>
        </div>
      </div>
    );
  }

  const total = sectorBreakdown.reduce((sum, s) => sum + s.value, 0);

  return (
    <div className="card mb-5">
      <div className="mb-4">
        <h3 className="text-sm font-bold text-text-primary">Composição por Setor</h3>
        <p className="text-xs text-text-muted mt-0.5">Exposição em valor nominal (incluindo leverage) · Alvo vs Real</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pie Chart */}
        <div className="flex items-center justify-center min-h-[220px]">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={sectorBreakdown}
                cx="50%"
                cy="50%"
                labelLine={false}
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
        </div>

        {/* Sector List with Alvo vs Real bars */}
        <div className="space-y-2.5">
          {sectorBreakdown.map((sector, index) => {
            const color = COLORS[index % COLORS.length];
            const isOver  = sector.targetPct > 0 && sector.delta > 2;
            const isUnder = sector.targetPct > 0 && sector.delta < -2;
            const deltaColor = isOver ? "#FF4D4D" : isUnder ? "#00FF88" : "#9CA3AF";
            const deltaSign  = sector.delta > 0 ? "+" : "";

            return (
              <div key={sector.name} className="bg-surface-2/50 rounded-lg p-3 border border-border/20">
                {/* Header row */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                    <span className="text-xs font-semibold text-text-primary">{sector.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-text-primary">{sector.percentage.toFixed(1)}%</span>
                    {sector.targetPct > 0 && (
                      <span
                        className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                        style={{ color: deltaColor, background: `${deltaColor}18` }}
                      >
                        {deltaSign}{sector.delta.toFixed(1)}%
                      </span>
                    )}
                  </div>
                </div>

                {/* Dual bar: real vs alvo */}
                <div className="space-y-1">
                  {/* Real bar */}
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] text-text-muted w-8 flex-shrink-0">Real</span>
                    <div className="flex-1 bg-surface-3 rounded-full h-2">
                      <div
                        className="h-2 rounded-full transition-all"
                        style={{ width: `${Math.min(sector.percentage, 100)}%`, backgroundColor: color }}
                      />
                    </div>
                    <span className="text-[9px] text-text-muted w-7 text-right">{sector.percentage.toFixed(0)}%</span>
                  </div>

                  {/* Target bar */}
                  {sector.targetPct > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] text-text-muted w-8 flex-shrink-0">Alvo</span>
                      <div className="flex-1 bg-surface-3 rounded-full h-2">
                        <div
                          className="h-2 rounded-full transition-all opacity-50"
                          style={{ width: `${Math.min(sector.targetPct, 100)}%`, backgroundColor: color }}
                        />
                      </div>
                      <span className="text-[9px] text-text-muted w-7 text-right">{sector.targetPct}%</span>
                    </div>
                  )}
                </div>

                <p className="text-[10px] text-text-muted mt-1.5">${sector.value.toFixed(2)}</p>
              </div>
            );
          })}

          {/* Summary */}
          <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 mt-2">
            <p className="text-xs text-text-muted mb-1">Exposição Total</p>
            <p className="text-sm font-bold text-primary">${total.toFixed(2)}</p>
            <p className="text-[10px] text-text-muted/70 mt-1">
              {positions.length} posição{positions.length > 1 ? "s" : ""}
            </p>
          </div>
        </div>
      </div>

      {/* Insights */}
      <div className="mt-4 pt-4 border-t border-border/40">
        <p className="text-xs font-semibold text-text-muted uppercase mb-2">Insights</p>
        <div className="space-y-1 text-xs text-text-secondary">
          <p>
            <strong>Maior exposição:</strong> {sectorBreakdown[0]?.name} ({sectorBreakdown[0]?.percentage.toFixed(1)}%)
          </p>
          {sectorBreakdown.length > 1 && (
            <p>
              <strong>Diversificação:</strong> {sectorBreakdown.length} setor{sectorBreakdown.length > 1 ? "es" : ""}
            </p>
          )}
          {/* Over-allocated warnings */}
          {sectorBreakdown
            .filter((s) => s.targetPct > 0 && s.delta > 5)
            .map((s) => (
              <p key={s.name} style={{ color: "#FF4D4D" }}>
                ⚠ {s.name} acima do alvo em {s.delta.toFixed(1)}% — considere rebalancear
              </p>
            ))}
          {/* Under-allocated hints */}
          {sectorBreakdown
            .filter((s) => s.targetPct > 0 && s.delta < -10)
            .map((s) => (
              <p key={s.name} style={{ color: "#00FF88" }}>
                ↑ {s.name} abaixo do alvo em {Math.abs(s.delta).toFixed(1)}% — oportunidade de aporte
              </p>
            ))}
          {parseFloat((sectorBreakdown[0]?.percentage ?? 0).toString()) > 60 && (
            <p className="text-warning">
              ⚠ Concentração elevada — um setor tem mais de 60% da exposição
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
