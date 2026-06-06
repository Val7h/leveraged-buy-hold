"use client";

import React from "react";
import { cn, formatCurrency, formatPercent } from "@/lib/utils";
import type { BacktestResult, BacktestMetrics } from "@/types";
import { TrendingUp, AlertTriangle, CheckCircle } from "lucide-react";

interface BacktestComparisonPanelProps {
  result: BacktestResult;
  ticker: string;
}

const STRATEGY_LABELS: Record<string, string> = {
  adaptive: "Adaptativo (SUA ESTRATÉGIA)",
  buy_hold_1x: "B&H 1x (Baseline)",
  buy_hold_2x: "B&H 2x",
  sp500: "S&P 500 (Benchmark)",
};

const STRATEGY_COLORS: Record<string, string> = {
  adaptive: "bg-primary/10 border-primary/20 text-primary",
  buy_hold_1x: "bg-surface-2 border-border text-text-secondary",
  buy_hold_2x: "bg-warning/10 border-warning/20 text-warning",
  sp500: "bg-surface-2 border-border text-text-secondary",
};

export default function BacktestComparisonPanel({
  result,
  ticker,
}: BacktestComparisonPanelProps) {
  const metrics = result.metrics;
  const adaptive = metrics.find((m) => m.strategy === "adaptive");
  const buyHold1x = metrics.find((m) => m.strategy === "buy_hold_1x");
  const buyHold2x = metrics.find((m) => m.strategy === "buy_hold_2x");
  const sp500 = metrics.find((m) => m.strategy === "sp500");

  if (!adaptive) return null;

  // Calculate who wins in each category
  const getWinner = (
    getValue: (m: BacktestMetrics) => number,
    higher = true
  ): string | null => {
    const values = metrics.map((m) => ({ strategy: m.strategy, value: getValue(m) }));
    const sorted = values.sort((a, b) =>
      higher ? b.value - a.value : a.value - b.value
    );
    return sorted[0]?.strategy || null;
  };

  const winners = {
    cagr: getWinner((m) => m.cagr_pct, true),
    totalReturn: getWinner((m) => m.total_return_pct, true),
    maxDrawdown: getWinner((m) => m.max_drawdown_pct, false), // lower is better
    sharpe: getWinner((m) => m.sharpe_ratio, true),
  };

  // Score: how many metrics adaptive wins
  const adaptiveWins = Object.values(winners).filter((w) => w === "adaptive").length;
  const totalCategories = Object.values(winners).filter((w) => w !== null).length;

  // Generate verdict
  const verdict =
    adaptiveWins === totalCategories
      ? "Excelente — Adaptativo vence em TODOS os critérios"
      : adaptiveWins >= totalCategories * 0.75
        ? "Muito Bom — Adaptativo é superior"
        : adaptiveWins >= totalCategories * 0.5
          ? "Competitivo — Trade-off entre estratégias"
          : "Considerar Alternativa — Outra estratégia pode ser melhor";

  const verdictColor =
    adaptiveWins === totalCategories
      ? "bg-success/10 border-success/20 text-success"
      : adaptiveWins >= totalCategories * 0.75
        ? "bg-primary/10 border-primary/20 text-primary"
        : adaptiveWins >= totalCategories * 0.5
          ? "bg-warning/10 border-warning/20 text-warning"
          : "bg-danger/10 border-danger/20 text-danger";

  return (
    <div className="space-y-4">
      {/* Verdict Card */}
      <div className={cn("card border", verdictColor)}>
        <div className="flex items-start gap-3">
          {adaptiveWins === totalCategories ? (
            <CheckCircle size={20} className="flex-shrink-0 mt-1" />
          ) : (
            <TrendingUp size={20} className="flex-shrink-0 mt-1" />
          )}
          <div>
            <p className="text-sm font-bold">{verdict}</p>
            <p className="text-xs mt-1 opacity-90">
              {adaptiveWins} de {totalCategories} métricas principais
            </p>
          </div>
        </div>
      </div>

      {/* Comparison Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* CAGR */}
        <div className={cn("card border p-4", STRATEGY_COLORS[winners.cagr || ""])}>
          <p className="text-xs font-semibold text-text-muted mb-3 uppercase">
            📈 Melhor CAGR
          </p>
          <div className="space-y-2">
            {[
              { m: adaptive, label: "Adaptativo" },
              { m: buyHold1x, label: "B&H 1x" },
              { m: buyHold2x, label: "B&H 2x" },
              { m: sp500, label: "S&P 500" },
            ]
              .filter((x) => x.m)
              .sort((a, b) => (b.m?.cagr_pct || 0) - (a.m?.cagr_pct || 0))
              .map((x, i) => (
                <div
                  key={x.label}
                  className={cn(
                    "flex items-center justify-between p-2 rounded",
                    i === 0 ? "bg-white/10 font-bold" : ""
                  )}
                >
                  <span className="text-sm">{x.label}</span>
                  <span className="font-mono font-semibold">
                    {x.m?.cagr_pct.toFixed(1)}%
                  </span>
                </div>
              ))}
          </div>
        </div>

        {/* Sharpe Ratio */}
        <div className={cn("card border p-4", STRATEGY_COLORS[winners.sharpe || ""])}>
          <p className="text-xs font-semibold text-text-muted mb-3 uppercase">
            ⚡ Melhor Sharpe (Risco/Retorno)
          </p>
          <div className="space-y-2">
            {[
              { m: adaptive, label: "Adaptativo" },
              { m: buyHold1x, label: "B&H 1x" },
              { m: buyHold2x, label: "B&H 2x" },
              { m: sp500, label: "S&P 500" },
            ]
              .filter((x) => x.m)
              .sort((a, b) => (b.m?.sharpe_ratio || 0) - (a.m?.sharpe_ratio || 0))
              .map((x, i) => (
                <div
                  key={x.label}
                  className={cn(
                    "flex items-center justify-between p-2 rounded",
                    i === 0 ? "bg-white/10 font-bold" : ""
                  )}
                >
                  <span className="text-sm">{x.label}</span>
                  <span className="font-mono font-semibold">
                    {x.m?.sharpe_ratio.toFixed(2)}
                  </span>
                </div>
              ))}
          </div>
        </div>

        {/* Max Drawdown */}
        <div className={cn("card border p-4", STRATEGY_COLORS[winners.maxDrawdown || ""])}>
          <p className="text-xs font-semibold text-text-muted mb-3 uppercase">
            🛡️ Menor Drawdown
          </p>
          <div className="space-y-2">
            {[
              { m: adaptive, label: "Adaptativo" },
              { m: buyHold1x, label: "B&H 1x" },
              { m: buyHold2x, label: "B&H 2x" },
              { m: sp500, label: "S&P 500" },
            ]
              .filter((x) => x.m)
              .sort((a, b) => (a.m?.max_drawdown_pct || 0) - (b.m?.max_drawdown_pct || 0))
              .map((x, i) => (
                <div
                  key={x.label}
                  className={cn(
                    "flex items-center justify-between p-2 rounded",
                    i === 0 ? "bg-white/10 font-bold" : ""
                  )}
                >
                  <span className="text-sm">{x.label}</span>
                  <span className="font-mono font-semibold text-danger">
                    {x.m?.max_drawdown_pct.toFixed(1)}%
                  </span>
                </div>
              ))}
          </div>
        </div>

        {/* Final Value */}
        <div className={cn("card border p-4", STRATEGY_COLORS[winners.totalReturn || ""])}>
          <p className="text-xs font-semibold text-text-muted mb-3 uppercase">
            💰 Maior Retorno Total
          </p>
          <div className="space-y-2">
            {[
              { m: adaptive, label: "Adaptativo" },
              { m: buyHold1x, label: "B&H 1x" },
              { m: buyHold2x, label: "B&H 2x" },
              { m: sp500, label: "S&P 500" },
            ]
              .filter((x) => x.m)
              .sort((a, b) => (b.m?.total_return_pct || 0) - (a.m?.total_return_pct || 0))
              .map((x, i) => (
                <div
                  key={x.label}
                  className={cn(
                    "flex items-center justify-between p-2 rounded",
                    i === 0 ? "bg-white/10 font-bold" : ""
                  )}
                >
                  <span className="text-sm">{x.label}</span>
                  <span className={cn("font-mono font-semibold", (x.m?.total_return_pct || 0) > 0 ? "text-success" : "text-danger")}>
                    {formatPercent(x.m?.total_return_pct || 0)}
                  </span>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Key Insights */}
      <div className="card border border-primary/20 bg-primary/5">
        <p className="text-xs font-bold text-primary uppercase mb-3">💡 Insights Principais</p>
        <div className="space-y-2 text-xs text-text-secondary">
          <p>
            <strong>CAGR:</strong> Seu Adaptativo alcançou{" "}
            <span className="text-primary font-semibold">{adaptive.cagr_pct.toFixed(1)}%</span>
            {" "}vs{" "}
            <span className="font-semibold">{buyHold1x?.cagr_pct.toFixed(1)}%</span>
            {" "}em B&H 1x (
            <span className={cn(
              "font-semibold",
              adaptive.cagr_pct > (buyHold1x?.cagr_pct || 0) ? "text-success" : "text-warning"
            )}>
              {((adaptive.cagr_pct - (buyHold1x?.cagr_pct || 0)) / (buyHold1x?.cagr_pct || 1) * 100).toFixed(0)}%
            </span>
            {" "}melhor)
          </p>
          <p>
            <strong>Risco/Retorno (Sharpe):</strong>{" "}
            {adaptive.sharpe_ratio > (buyHold2x?.sharpe_ratio || 0)
              ? "Seu Adaptativo supera B&H 2x em qualidade de retorno ajustado"
              : "Trade-off: maior leverage = maior retorno mas também maior drawdown"}
          </p>
          <p>
            <strong>Proteção (Drawdown):</strong> Pior caso foi{" "}
            <span className="font-semibold text-danger">{adaptive.max_drawdown_pct.toFixed(1)}%</span>
            {" "}
            {adaptive.max_drawdown_pct > (buyHold2x?.max_drawdown_pct || 0)
              ? "(esperado com mais leverage)"
              : "(melhor que esperado)"}
          </p>
        </div>
      </div>

      {/* Recommendation */}
      <div className="bg-success/10 border border-success/20 rounded-lg p-4">
        <p className="text-xs font-bold text-success uppercase mb-2">✅ Recomendação</p>
        <p className="text-sm text-text-secondary">
          {adaptiveWins === totalCategories
            ? "A estratégia Adaptativa é estatisticamente superior. Você pode avançar com confiança."
            : adaptiveWins >= totalCategories * 0.75
              ? "A estratégia Adaptativa é sólida e recomendada para uso em produção."
              : adaptiveWins >= totalCategories * 0.5
                ? "A estratégia é viável mas considere ajustes baseado nos dados de crises."
                : "Considere revisar a estratégia ou testar diferentes parâmetros de alavancagem."}
        </p>
      </div>
    </div>
  );
}
