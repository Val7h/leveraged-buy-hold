"use client";
import { useState } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { TrendingUp, TrendingDown } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

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

export default function PortfolioEquityCurve({
  curve, totalInvested, pnlPct, maxDrawdown, loading,
}: Props) {
  const [activeDays, setActiveDays] = useState(365);

  // Filter curve client-side based on selected period
  const filtered = activeDays >= 99999
    ? curve
    : curve.slice(-activeDays);

  const lastEquity  = filtered.at(-1)?.equity ?? 0;
  const firstEquity = filtered[0]?.equity ?? 0;
  const periodPnl   = firstEquity > 0 ? ((lastEquity / firstEquity) - 1) * 100 : 0;
  const isPositive  = periodPnl >= 0;
  const strokeColor = isPositive ? "#00E676" : "#EF4444";

  // Max drawdown within the filtered window
  let peak = 0;
  let windowMaxDD = 0;
  for (const p of filtered) {
    if (p.equity > peak) peak = p.equity;
    const dd = peak > 0 ? ((peak - p.equity) / peak) * 100 : 0;
    if (dd > windowMaxDD) windowMaxDD = dd;
  }

  return (
    <div className="card">
      {/* Header */}
      <div className="flex items-start justify-between mb-4 flex-wrap gap-2">
        <div>
          <h3 className="text-sm font-semibold text-text-primary">Curva de Patrimônio Real</h3>
          <p className="text-xs text-text-muted mt-0.5">
            Evolução do valor de mercado da carteira com alavancagem
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
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={filtered} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="portfolioGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={strokeColor} stopOpacity={0.2} />
                <stop offset="95%" stopColor={strokeColor} stopOpacity={0}   />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1E2730" />
            <XAxis
              dataKey="date"
              tickFormatter={fmtDate}
              tick={{ fill: "#475569", fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
              tick={{ fill: "#475569", fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              width={44}
            />
            <Tooltip
              formatter={(v: any) => [formatCurrency(v, "USD", true), "Patrimônio"]}
              labelFormatter={(l) => new Date(l + "T12:00:00").toLocaleDateString("pt-BR")}
              contentStyle={{
                background: "#161C24", border: "1px solid #1F2937",
                borderRadius: 8, fontSize: 12,
              }}
            />
            {/* Cost reference line */}
            <ReferenceLine
              y={totalInvested}
              stroke="#475569"
              strokeDasharray="4 4"
              label={{ value: "Custo", fill: "#475569", fontSize: 9, position: "insideTopRight" }}
            />
            <Area
              type="monotone"
              dataKey="equity"
              stroke={strokeColor}
              strokeWidth={2}
              fill="url(#portfolioGrad)"
              dot={false}
              activeDot={{ r: 4, fill: strokeColor }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
