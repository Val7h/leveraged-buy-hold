"use client";
import { useState } from "react";
import AppShell from "@/components/layout/AppShell";
import EquityCurve from "@/components/charts/EquityCurve";
import DrawdownChart from "@/components/charts/DrawdownChart";
import LeverageChart from "@/components/charts/LeverageChart";
import PriceTradeChart from "@/components/charts/PriceTradeChart";
import BacktestComparisonPanel from "@/components/backtest/BacktestComparisonPanel";
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

// Cesta DEFAULT anti-survivorship: utility boa (NEE) + cíclicas/casos que
// SOFRERAM de verdade (energia que afundou no petróleo, banco que apanhou na
// GFC, industrial cíclica). Mais honesta que 1 vencedor isolado.
const DEFAULT_BASKET = "NEE,XOM,BAC,CAT";

export default function BacktestPage() {
  const [tickers, setTickers] = useState(DEFAULT_BASKET);
  const [initialCapital, setInitialCapital] = useState(100000);
  const [monthlyContrib, setMonthlyContrib] = useState(1000);
  const [riskProfile, setRiskProfile] = useState("balanced");
  const [applyCosts, setApplyCosts] = useState(true);
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
        apply_costs: applyCosts,
        run_monte_carlo: true,
      });
      setResult(res.data);
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Erro ao executar backtest");
    } finally {
      setLoading(false);
    }
  };

  const adaptiveMetrics = result?.metrics?.find((m) => m.strategy === "adaptive");
  const primaryLabel = result?.basket?.is_basket
    ? `CESTA (${result.basket.tickers.join(" + ")})`
    : tickers.split(",")[0].trim().toUpperCase();

  return (
    <AppShell>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-text-primary">Motor de Backtest</h1>
          <p className="text-sm text-text-secondary mt-0.5">Compare estratégias em crises históricas: 2008, COVID, 2022</p>
        </div>

        {/* Rótulo honesto: o que este backtest valida (e o que NÃO valida) */}
        <div className="bg-warning/5 border border-warning/20 rounded-xl px-4 py-3 mb-6">
          <p className="text-xs text-text-secondary leading-relaxed">
            <span className="text-warning font-semibold">O que este backtest valida:</span>{" "}
            a mecânica de <span className="text-text-primary font-medium">alavancagem por REGIME</span> (multiplicador
            dinâmico sobre os fluxos) — uma referência histórica de como a rede de sobrevivência se comportou em crises.
          </p>
          <p className="text-xs text-text-secondary leading-relaxed mt-1.5">
            <span className="text-warning font-semibold">O que NÃO é:</span>{" "}
            não é exatamente o motor de 3 camadas (Qualidade × Momento × Aptidão) da aba{" "}
            <span className="text-text-primary font-medium">Ranking</span>. Não prova as recomendações atuais —
            é a mecânica de sobrevivência testada no passado, não a seleção de ativos de hoje.
          </p>
          <p className="text-xs text-text-secondary leading-relaxed mt-1.5">
            <span className="text-warning font-semibold">Por que o número agora é mais defensável:</span>{" "}
            antes era um <span className="text-text-primary font-medium">teto otimista</span> — um único vencedor (NEE),
            sem fricção e um só caminho histórico. Agora: (1) <span className="text-text-primary font-medium">cesta</span> que
            carrega cíclicas/perdedores junto (anti-survivorship); (2) <span className="text-text-primary font-medium">custos</span>{" "}
            (slippage na liquidação/stops + imposto sobre os ⅓ vendidos) → CAGR <span className="text-text-primary font-medium">líquido</span> vs bruto;
            (3) <span className="text-text-primary font-medium">Monte Carlo</span> com a distribuição de maxDD e a probabilidade
            de ruína — não um caminho só. <span className="text-text-muted">(Carry segue zero — Quantfury, sem juro de margem.)</span>
          </p>
        </div>

        {/* Config */}
        <div className="card mb-6">
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4 mb-4">
            <div>
              <label className="label">Cesta (tickers, vírgula)</label>
              <input className="input font-mono uppercase" value={tickers} onChange={(e) => setTickers(e.target.value)} placeholder="NEE,XOM,BAC,CAT" />
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
          <div className="flex items-center gap-4 flex-wrap">
            <button onClick={handleRun} disabled={loading} className="btn-primary flex items-center gap-2">
              {loading ? <RefreshCw size={14} className="animate-spin" /> : <FlaskConical size={14} />}
              {loading ? "Executando Backtest..." : "Executar Backtest"}
            </button>
            <label className="flex items-center gap-2 text-xs text-text-secondary cursor-pointer select-none">
              <input
                type="checkbox"
                checked={applyCosts}
                onChange={(e) => setApplyCosts(e.target.checked)}
                className="accent-primary"
              />
              Aplicar custos (slippage 0,4% + imposto 15% nos ⅓ vendidos)
            </label>
          </div>
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
                  Comparação de Estratégias — {primaryLabel}
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

            {/* Gross vs Net (camada de custos) + Monte Carlo de ruína */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {result.cost_breakdown && (
                <div className="card">
                  <h2 className="text-sm font-semibold text-text-primary mb-1">CAGR Bruto vs Líquido</h2>
                  <p className="text-xs text-text-muted mb-4">
                    Custos = slippage na liquidação/stops + imposto sobre os ⅓ vendidos.
                    Carry zero (Quantfury). {result.cost_breakdown.applied ? "Custos ON." : "Custos OFF (mostrando teto bruto)."}
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-surface-2 rounded-lg p-3">
                      <p className="text-xs text-text-muted mb-1">CAGR Bruto (teto otimista)</p>
                      <p className="text-lg font-mono font-semibold text-text-secondary">
                        {result.cost_breakdown.cagr_gross_pct.toFixed(2)}%
                      </p>
                      <p className="text-xs font-mono text-text-muted mt-1">
                        {formatCurrency(result.cost_breakdown.final_gross, "USD", true)}
                      </p>
                    </div>
                    <div className="bg-primary/5 rounded-lg p-3">
                      <p className="text-xs text-primary mb-1">CAGR Líquido (defensável)</p>
                      <p className="text-lg font-mono font-semibold text-primary">
                        {result.cost_breakdown.cagr_net_pct.toFixed(2)}%
                      </p>
                      <p className="text-xs font-mono text-text-muted mt-1">
                        {formatCurrency(result.cost_breakdown.final_net, "USD", true)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-3 text-xs">
                    <span className="text-text-muted">
                      Slippage {result.cost_breakdown.slippage_pct}% · Imposto {result.cost_breakdown.tax_pct}%
                    </span>
                    <span className="text-danger font-mono">
                      Custos: −{formatCurrency(result.cost_breakdown.total_costs_usd, "USD", true)}
                    </span>
                  </div>
                </div>
              )}

              {result.monte_carlo && result.monte_carlo.n_paths > 0 && (
                <div className="card">
                  <h2 className="text-sm font-semibold text-text-primary mb-1">
                    Monte Carlo — Distribuição & Ruína
                  </h2>
                  <p className="text-xs text-text-muted mb-4">
                    {result.monte_carlo.n_paths.toLocaleString()} caminhos (bootstrap de blocos + GBM),
                    horizonte {result.monte_carlo.horizon_years}a. Não é um caminho histórico só.
                  </p>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className={`rounded-lg p-3 ${result.monte_carlo.ruin_probability > 0.05 ? "bg-danger/10" : "bg-success/10"}`}>
                      <p className="text-xs text-text-muted mb-1">Prob. de liquidação/ruína</p>
                      <p className={`text-lg font-mono font-semibold ${result.monte_carlo.ruin_probability > 0.05 ? "text-danger" : "text-success"}`}>
                        {(result.monte_carlo.ruin_probability * 100).toFixed(2)}%
                      </p>
                    </div>
                    <div className="bg-surface-2 rounded-lg p-3">
                      <p className="text-xs text-text-muted mb-1">Max Drawdown (p50)</p>
                      <p className="text-lg font-mono font-semibold text-danger">
                        {result.monte_carlo.max_dd_distribution.p50.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                  {/* Histograma de maxDD */}
                  <div className="mb-2">
                    <div className="flex items-end gap-0.5 h-16">
                      {(() => {
                        const hist = result.monte_carlo.max_dd_histogram;
                        const maxC = Math.max(1, ...hist.map((b) => b.count));
                        return hist.map((b, i) => (
                          <div
                            key={i}
                            className="flex-1 bg-danger/40 rounded-t"
                            style={{ height: `${(b.count / maxC) * 100}%` }}
                            title={`${b.bin_lo}% a ${b.bin_hi}%: ${b.count} caminhos`}
                          />
                        ));
                      })()}
                    </div>
                    <div className="flex justify-between text-[10px] text-text-muted mt-1">
                      <span>−100%</span>
                      <span>maxDD por caminho</span>
                      <span>0%</span>
                    </div>
                  </div>
                  <div className="flex justify-between text-xs text-text-secondary font-mono">
                    <span>p5: {result.monte_carlo.max_dd_distribution.p5.toFixed(1)}%</span>
                    <span>p50: {result.monte_carlo.max_dd_distribution.p50.toFixed(1)}%</span>
                    <span>pior: {result.monte_carlo.max_dd_distribution.worst.toFixed(1)}%</span>
                  </div>
                </div>
              )}
            </div>

            {/* Backtest Comparison Panel */}
            <BacktestComparisonPanel result={result} ticker={tickers.split(",")[0].trim().toUpperCase()} />

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
                      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
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
