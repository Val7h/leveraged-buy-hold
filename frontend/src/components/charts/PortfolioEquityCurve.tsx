"use client";
import React, { useState, useMemo, memo } from "react";
import dynamic from "next/dynamic";
import { TrendingUp, TrendingDown, Info } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

const PortfolioChartRenderer = dynamic(
  () => import("./renderers/PortfolioChartRenderer"),
  {
    loading: () => (
      <div className="flex items-center justify-center h-52">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    ),
    ssr: false,
  }
);

interface CurvePoint { date: string; equity: number; }

interface Props {
  curve: CurvePoint[];
  totalInvested: number;
  pnlPct: number;
  maxDrawdown: number;
  loading?: boolean;
}

const PERIODS = [
  { label: "1M",  days: 30 },
  { label: "3M",  days: 90 },
  { label: "6M",  days: 180 },
  { label: "1A",  days: 365 },
  { label: "2A",  days: 730 },
  { label: "Max", days: 99999 },
];

function fmtDate(d: string) {
  return new Date(d + "T12:00:00").toLocaleDateString("pt-BR", {
    day: "2-digit", month: "short",
  });
}

function PortfolioEquityCurve({
  curve, totalInvested, pnlPct, maxDrawdown, loading,
}: Props) {
  const [activeDays, setActiveDays] = useState(365);

  // Memoize filtered curve to prevent unnecessary re-renders
  const filtered = useMemo(() => {
    return activeDays >= 99999
      ? curve
      : curve.slice(-activeDays);
  }, [curve, activeDays]);

  const lastEquity  = useMemo(() => filtered.at(-1)?.equity ?? 0, [filtered]);
  const firstEquity = useMemo(() => filtered[0]?.equity ?? 0, [filtered]);
  const periodPnl   = useMemo(() =>
    firstEquity > 0 ? ((lastEquity / firstEquity) - 1) * 100 : 0,
    [firstEquity, lastEquity]
  );
  const isPositive  = periodPnl >= 0;
  const strokeColor = isPositive ? "#00E676" : "#EF4444";

  // Memoize max drawdown calculation to prevent unnecessary re-renders
  const windowMaxDD = useMemo(() => {
    let peak = 0;
    let maxDD = 0;
    for (const p of filtered) {
      if (p.equity > peak) peak = p.equity;
      const dd = peak > 0 ? ((peak - p.equity) / peak) * 100 : 0;
      if (dd > maxDD) maxDD = dd;
    }
    return maxDD;
  }, [filtered]);

  return (
    <div className="card">
      {/* Header */}
      <div className="flex items-start justify-between mb-4 flex-wrap gap-2">
        <div>
          <h3 className="text-sm font-semibold text-text-primary flex items-center gap-1.5">
            Simulação — backtest dos ativos atuais
            <span
              className="inline-flex text-text-muted cursor-help"
              title={
                "NÃO é o seu histórico real. É um backtest dos ativos que você segura HOJE, " +
                "rodado desde uma data fixa com alavancagem fixa.\n\n" +
                "• Survivorship bias: só inclui ativos que sobreviveram até hoje (vencedores), " +
                "ignorando os que você vendeu ou que quebraram.\n" +
                "• Look-ahead bias: aplica a carteira de hoje ao passado, como se você já " +
                "soubesse no que investir.\n\n" +
                "Use como referência da estratégia, não como extrato da sua carteira."
              }
            >
              <Info size={13} />
            </span>
          </h3>
          <p className="text-xs text-text-muted mt-0.5">
            Backtest dos ativos atuais com alavancagem fixa — não é o seu histórico real (survivorship/look-ahead)
          </p>
        </div>
        {/* Period selector */}
        <div className="flex rounded-lg border border-border overflow-hidden text-xs">
          {PERIODS.map((p) => (
            <button
              key={p.label}
              onClick={() => setActiveDays(p.days)}
              className={`px-2.5 py-1.5 transition-colors ${
                activeDays === p.days
                  ? "bg-primary/15 text-primary font-semibold"
                  : "text-text-muted hover:text-text-primary hover:bg-surface-2"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
        {[
          {
            label: "Patrimônio Atual",
            value: formatCurrency(lastEquity, "USD", true),
            color: "text-text-primary",
          },
          {
            label: "P&L no Período",
            value: `${periodPnl >= 0 ? "+" : ""}${periodPnl.toFixed(1)}%`,
            color: isPositive ? "text-success" : "text-danger",
            icon: isPositive ? <TrendingUp size={11} /> : <TrendingDown size={11} />,
          },
          {
            label: "Max Drawdown (janela)",
            value: `-${windowMaxDD.toFixed(1)}%`,
            color: "text-danger",
          },
          {
            label: "Custo Total",
            value: formatCurrency(totalInvested, "USD", true),
            color: "text-text-secondary",
          },
        ].map((m) => (
          <div key={m.label} className="bg-surface-2 rounded-lg p-2.5">
            <p className="text-[10px] text-text-muted mb-0.5">{m.label}</p>
            <p className={`text-sm font-mono font-bold flex items-center gap-1 ${m.color}`}>
              {m.icon}{m.value}
            </p>
          </div>
        ))}
      </div>

      {/* Chart */}
      {loading ? (
        <div className="flex items-center justify-center h-52">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : filtered.length < 2 ? (
        <div className="flex items-center justify-center h-52 text-sm text-text-muted">
          Dados insuficientes para o período selecionado
        </div>
      ) : (
        <PortfolioChartRenderer
          filtered={filtered}
          strokeColor={strokeColor}
          totalInvested={totalInvested}
          fmtDate={fmtDate}
        />
      )}
    </div>
  );
}

export default memo(PortfolioEquityCurve);
