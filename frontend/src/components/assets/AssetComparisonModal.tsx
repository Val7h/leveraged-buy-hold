"use client";

import React, { useState, useEffect } from "react";
import { X, Download } from "lucide-react";
import { cn, formatCurrency, formatPercent } from "@/lib/utils";
import type { AssetScore } from "@/types";

interface AssetComparisonModalProps {
  assets: AssetScore[];
  onClose: () => void;
}

export default function AssetComparisonModal({
  assets,
  onClose,
}: AssetComparisonModalProps) {
  if (assets.length === 0) return null;

  // Sort by composite score (descending)
  const sortedAssets = [...assets].sort(
    (a, b) => b.composite_score - a.composite_score
  );

  // Helper functions
  const getScoreBg = (score: number) => {
    if (score >= 8) return "bg-success/10";
    if (score >= 7) return "bg-primary/10";
    return "bg-warning/10";
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return "text-success";
    if (score >= 7) return "text-primary";
    return "text-warning";
  };

  const getSignalColor = (signal: string) => {
    if (signal === "ENTRAR FORTE") return "bg-success/15 border-success/35 text-success";
    if (signal === "ENTRAR") return "bg-success/10 border-success/25 text-success";
    if (signal === "ENTRAR (mercado em topo)") return "bg-warning/10 border-warning/30 text-warning";
    if (signal === "AGUARDAR") return "bg-warning/8 border-warning/20 text-warning";
    if (signal === "EVITAR") return "bg-danger/8 border-danger/20 text-danger";
    return "bg-surface-2 border-border text-text-muted";
  };

  // Export as CSV
  const handleExport = () => {
    const headers = [
      "Ticker",
      "Score Qualidade",
      "Score Oportunidade",
      "Score Composto",
      "Sinal de Entrada",
      "RSI Semanal",
      "Dividend Yield",
      "Beta",
      "Alavancagem Recomendada",
    ];

    const rows = sortedAssets.map((asset) => [
      asset.ticker,
      asset.quality_score.toFixed(1),
      asset.opportunity_score.toFixed(1),
      asset.composite_score.toFixed(1),
      asset.entry_signal || "N/A",
      asset.technicals?.rsi_14_weekly?.toFixed(1) || "N/A",
      `${asset.dividend_yield?.toFixed(2) || 0}%`,
      asset.beta?.toFixed(2) || "N/A",
      `${asset.recommended_leverage.toFixed(2)}x`,
    ]);

    const csv = [
      headers.join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `asset_comparison_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-xl border border-border max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border/40">
          <div>
            <h2 className="text-lg font-bold text-text-primary">
              Comparar {sortedAssets.length} Ativos
            </h2>
            <p className="text-xs text-text-muted mt-1">
              Ordenado por Score Composto (maior primeiro)
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
            >
              <Download size={14} />
              Exportar CSV
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-surface-2 text-text-muted hover:text-text-primary transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Table Container */}
        <div className="flex-1 overflow-auto p-6">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border sticky top-0 bg-surface-2">
                  <th className="text-left text-text-muted font-semibold py-3 px-3 whitespace-nowrap">
                    Ticker
                  </th>
                  <th className="text-left text-text-muted font-semibold py-3 px-3 whitespace-nowrap">
                    Qualidade
                  </th>
                  <th className="text-left text-text-muted font-semibold py-3 px-3 whitespace-nowrap">
                    Oportunidade
                  </th>
                  <th className="text-left text-text-muted font-semibold py-3 px-3 whitespace-nowrap">
                    Composto
                  </th>
                  <th className="text-left text-text-muted font-semibold py-3 px-3 whitespace-nowrap">
                    Sinal de Entrada
                  </th>
                  <th className="text-left text-text-muted font-semibold py-3 px-3 whitespace-nowrap">
                    RSI Semanal
                  </th>
                  <th className="text-left text-text-muted font-semibold py-3 px-3 whitespace-nowrap">
                    Dividend Yield
                  </th>
                  <th className="text-left text-text-muted font-semibold py-3 px-3 whitespace-nowrap">
                    Alavancagem Recomendada
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedAssets.map((asset, idx) => {
                  const isTop = idx === 0;
                  return (
                    <tr
                      key={asset.ticker}
                      className={cn(
                        "border-b border-border/40 hover:bg-surface-2/50 transition-colors",
                        isTop ? "bg-primary/5" : ""
                      )}
                    >
                      <td className="py-3 px-3 font-bold text-text-primary font-mono">
                        {asset.ticker}
                        {isTop && (
                          <span className="ml-2 badge bg-primary/10 border-primary/20 text-primary text-[9px]">
                            MELHOR
                          </span>
                        )}
                      </td>
                      <td className={cn("py-3 px-3 font-semibold", getScoreColor(asset.quality_score))}>
                        {asset.quality_score.toFixed(1)}
                      </td>
                      <td className={cn("py-3 px-3 font-semibold", getScoreColor(asset.opportunity_score))}>
                        {asset.opportunity_score.toFixed(1)}
                      </td>
                      <td className={cn("py-3 px-3 font-bold", getScoreColor(asset.composite_score))}>
                        <span className={`px-2 py-1 rounded ${getScoreBg(asset.composite_score)}`}>
                          {asset.composite_score.toFixed(1)}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={cn(
                            "inline-block px-2 py-1 rounded border text-[9px] font-bold",
                            getSignalColor(asset.entry_signal || "N/A")
                          )}
                        >
                          {asset.entry_signal === "ENTRAR" ? "🟢" : asset.entry_signal === "ENTRAR FORTE" ? "🟢🟢" : "⏸"}
                          {" "}
                          {asset.entry_signal || "N/A"}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono">
                        {asset.technicals?.rsi_14_weekly ? (
                          <span className={asset.technicals.rsi_14_weekly <= 38 ? "text-success font-bold" : "text-text-secondary"}>
                            {asset.technicals.rsi_14_weekly.toFixed(1)}
                          </span>
                        ) : (
                          "N/A"
                        )}
                      </td>
                      <td className="py-3 px-3 font-mono text-success">
                        {(asset.dividend_yield || 0).toFixed(2)}%
                      </td>
                      <td className="py-3 px-3 font-bold text-warning font-mono">
                        {asset.recommended_leverage.toFixed(2)}x
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Recommendations */}
          <div className="mt-6 pt-6 border-t border-border">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-success/10 border border-success/20 rounded-lg p-4">
                <p className="text-xs font-semibold text-success mb-2">✅ Melhor Agora (Maior Oportunidade)</p>
                <p className="text-sm font-bold text-text-primary">
                  {sortedAssets.length > 0 ? sortedAssets[0].ticker : "N/A"}
                </p>
                <p className="text-xs text-text-muted mt-1">
                  Sinal: {sortedAssets[0]?.entry_signal || "N/A"}
                </p>
              </div>

              <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
                <p className="text-xs font-semibold text-primary mb-2">💡 Melhor Qualidade (Maior Score)</p>
                <p className="text-sm font-bold text-text-primary">
                  {sortedAssets.length > 0 ? sortedAssets[0].ticker : "N/A"}
                </p>
                <p className="text-xs text-text-muted mt-1">
                  Score Composto: {sortedAssets[0]?.composite_score.toFixed(2) || "N/A"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
