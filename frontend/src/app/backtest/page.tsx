"use client";
import { useState } from "react";
import AppShell from "@/components/layout/AppShell";
import EquityCurve from "@/components/charts/EquityCurve";
import DrawdownChart from "@/components/charts/DrawdownChart";
import LeverageChart from "@/components/charts/LeverageChart";
import PriceTradeChart from "@/components/charts/PriceTradeChart";
import { backtestApi } from "@/lib/api";
import type { BacktestResult, BacktestMetrics } from "@/types";
import { FlaskConical, RefreshCw, TrendingUp, TrendingDown } from "lucide-react";
import TickerLogo from "@/components/ui/TickerLogo";
import { formatCurrency, formatPercent } from "@/lib/utils";

const STRATEGY_LABELS: Record<string, string> = {
  adaptive: "Adaptativo",
  buy_hold_1x: "B&H Normal",
  buy_hold_2x: "B&H 2x Fixo",
  sp500: "S&P 500",
};

export default function BacktestPage() {
  const [tickers, setTickers] = useState("NEE");
  const [initialCapital, setInitialCapital] = useState(100000);
  const [monthlyContrib, setMonthlyContrib] = useState(1000);
  const [riskProfile, setRiskProfile] = useState("balanced");
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleRun = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await backtestApi.run({
        tickers: tickers.split(",").map((t) => t.trim().toUpperCase()),
        initial_capital: initialCapital,
        monthly_contribution: monthlyContrib,
        risk_profile: riskProfile,
      });
      setResult(res.data);
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Erro ao executar backtest");
    } finally {
      setLoading(false);
    }
  };

  const adaptiveMetrics = result?.metrics?.find((m) => m.strategy === "adaptive");

  return (
    <AppShell>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-text-primary">Motor de Backtest</h1>
          <p className="text-sm text-text-secondary mt-0.5">Compare estratégias em crises históricas: 2008, COVID, 2022</p>
        </div>

        {/* Config */}
        <div className="card mb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="label">Ticker principal</label>
              <input className="input font-mono uppercase" value={tickers} onChange={(e) => setTickers(e.target.value)} placeholder="NEE" />
            </div>
            <div>
              <label className="label">Capital inicial (USD)</label>
              <input className="input font-mono" type="number" value={initialCapital} onChange={(e) => setInitialCapital(Number(e.target.value))} />
            </div>
            <div>
              <label className="label">Aporte mensal (USD)</label>
              <input className="input font-mono" type="number" value={monthlyContrib} onChange={(e) => setMonthlyContrib(Number(e.target.value))} />
            </div>
            <div>
              <label className="label">Perfil de Risco</label>
              <select className="input" value={riskProfile} onChange={(e) => setRiskProfile(e.target.value)}>
                <option value="conservative">Conservador</option>
                <option value="balanced">Balanceado</option>
                <option value="aggressive">Agressivo</option>
              </select>
            </div>
          </div>
          <button onClick={handleRun} disabled={loading} className="btn-primary flex items-center gap-2">
            {loading ? <RefreshCw size={14} className="animate-spin" /> : <FlaskConical size={14} />}
            {loading ? "Executando Backtest..." : "Executar Backtest"}
          </button>
        </div>

        {error && <div className="bg-danger/10 border border-danger/20 rounded-lg px-4 py-3 text-sm text-danger mb-4">{error}</div>}

        {loading && (
          <div className="card text-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mb-4" />
            <p className="text-sm text-text-secondary">Processando dados históricos...</p>
          </div>
        )}

        {result && !loading && (
          <div className="space-y-5">
            {/* Metrics table */}
            <div className="card overflow-x-auto">
              <div className="flex items-center gap-2.5 mb-4">
                <TickerLogo ticker={tickers.split(",")[0].trim().toUpperCase()} size={28} />
                <h2 className="text-sm font-semibold text-text-primary">
                  Comparação de Estratégias — {tickers.split(",")[0].trim().toUpperCase()}
                </h2>
              </div>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    {["Estratégia", "CAGR", "Retorno Total", "Max Drawdown", "Sharpe", "Sortino", "Calmar", "Vol", "Win Rate", "Valor Final"].map((h) => (
                      <th key={h} className="text-left text-text-muted font-medium py-2 pr-4">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.metrics.map((m) => {
                    const isAdaptive = m.strategy === "adaptive";
                    return (
                      <tr key={m.strategy} className={`border-b border-border/40 ${isAdaptive ? "bg-primary/5" : ""}`}>
                        <td className="py-2.5 pr-4">
                          <span className={`font-semibold ${isAdaptive ? "text-primary" : "text-text-secondary"}`}>
                            {STRATEGY_LABELS[m.strategy] || m.strategy}
                          </span>
                        </td>
                        <td className={`py-2.5 pr-4 font-mono font-semibold ${m.cagr_pct > 8 ? "text-success" : "text-text-primary"}`}>{m.cagr_pct.toFixed(1)}%</td>
                        <td className={`py-2.5 pr-4 font-mono font-semibold ${m.total_return_pct > 0 ? "text-success" : "text-danger"}`}>{formatPercent(m.total_return_pct)}</td>
                        <td className="py-2.5 pr-4 font-mono text-danger">{m.max_drawdown_pct.toFixed(1)}%</td>
                        <td className={`py-2.5 pr-4 font-mono ${m.sharpe_ratio > 1 ? "text-success" : "text-text-primary"}`}>{m.sharpe_ratio.toFixed(2)}</td>
                        <td className={`py-2.5 pr-4 font-mono ${m.sortino_ratio > 1.5 ? "text-success" : "text-text-primary"}`}>{m.sortino_ratio.toFixed(2)}</td>
                        <td className="py-2.5 pr-4 font-mono text-text-primary">{m.calmar_ratio.toFixed(2)}</td>
                        <td className="py-2.5 pr-4 font-mono text-text-secondary">{m.annualized_vol_pct.toFixed(1)}%</td>
                        <td className="py-2.5 pr-4 font-mono text-text-secondary">{m.win_rate_pct.toFixed(1)}%</td>
                        <td className="py-2.5 pr-4 font-mono font-semibold text-text-primary">{formatCurrency(m.final_value, "USD", true)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Charts */}
            <EquityCurve data={result.equity_curves} title="Curva de Patrimônio — Comparação de Estratégias" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DrawdownChart data={result.drawdown_curves} />
              <LeverageChart data={result.leverage_curve} title="Alavancagem — Estratégia Adaptativa" />
            </div>

            {/* Price chart with trade markers */}
            {result.price_series && result.price_series.length > 0 && (
              <PriceTradeChart
                priceData={result.price_series}
                trades={result.trades ?? []}
                ticker={tickers.split(",")[0].trim().toUpperCase()}
              />
            )}

            {/* Crisis analysis */}
            {(result.crisis_analysis?.length ?? 0) > 0 && (
              <div className="card">
                <h2 className="text-sm font-semibold text-text-primary mb-4">Análise de Crises Históricas</h2>
                <div className="space-y-3">
                  {result.crisis_analysis.map((crisis: any, i) => (
                    <div key={i} className="bg-surface-2 rounded-lg p-3">
                      <p className="text-xs font-semibold text-text-primary mb-2">{crisis.name}</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {Object.entries(STRATEGY_LABELS).map(([key, label]) => {
                          const data = crisis[key] as { return_pct: number; max_drawdown_pct: number } | undefined;
                          if (!data) return null;
                          return (
                            <div key={key} className={key === "adaptive" ? "bg-primary/5 rounded p-2" : "rounded p-2"}>
                              <p className={`text-xs font-medium mb-1 ${key === "adaptive" ? "text-primary" : "text-text-secondary"}`}>{label}</p>
                              <p className={`text-xs font-mono font-semibold ${data.return_pct > 0 ? "text-success" : "text-danger"}`}>{formatPercent(data.return_pct)}</p>
                              <p className="text-xs font-mono text-danger">DD: {data.max_drawdown_pct.toFixed(1)}%</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {!result && !loading && (
          <div className="card text-center py-16">
            <FlaskConical size={40} className="text-text-muted mx-auto mb-4" />
            <p className="text-sm text-text-secondary">Configure os parâmetros e execute o backtest</p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
