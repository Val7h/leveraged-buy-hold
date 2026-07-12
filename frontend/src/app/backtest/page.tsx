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
  const [leverEquity, setLeverEquity] = useState(false); // dial de risco: default = recomendado (fluxos)
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
        lever_equity: leverEquity,
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

          {/* DIAL DE RISCO — você escolhe DEPOIS de ver o custo; o app aponta o recomendado */}
          <div className="mt-4 rounded-xl border border-border bg-bg-secondary/40 px-4 py-3">
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={leverEquity}
                onChange={(e) => setLeverEquity(e.target.checked)}
                className="accent-danger mt-0.5"
              />
              <span className="text-xs leading-relaxed">
                <span className="text-text-primary font-semibold">Modo agressivo — alavancar o PATRIMÔNIO</span>{" "}
                {!leverEquity ? (
                  <span className="inline-block rounded bg-success/15 text-success font-semibold px-1.5 py-0.5">
                    desligado — RECOMENDADO
                  </span>
                ) : (
                  <span className="inline-block rounded bg-danger/15 text-danger font-semibold px-1.5 py-0.5">
                    ligado — mais risco
                  </span>
                )}
                <span className="block text-text-secondary mt-1">
                  <span className="text-success font-medium">Recomendado (desligado):</span> alavanca só os FLUXOS — a
                  dívida é fixa e se desalavanca sozinha. Melhor retorno-por-risco (Calmar ~0,69), tombo ~−16%,{" "}
                  <span className="text-text-primary font-medium">zero risco de liquidação</span>.
                </span>
                {leverEquity && (
                  <span className="block text-danger/90 mt-1">
                    ⚠ <span className="font-medium">Ligado:</span> re-margina o patrimônio rumo ao teto (capado em 1,8x
                    p/ não liquidar o core). Mais CAGR, mas tombo pode passar de −50% a −90% em crises. Compare as curvas
                    abaixo antes de adotar — o retorno-por-risco (Calmar) PIORA; você ganha CAGR bruto pagando muito mais drawdown.
                  </span>
                )}
              </span>
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
                    {[
                      { label: "Estratégia", tip: "" },
                      { label: "Calmar ★", tip: "CAGR ÷ |MaxDD| — métrica de sobrevivência (maior = melhor)" },
                      { label: "CAGR", tip: "" },
                      { label: "Max Drawdown", tip: "" },
                      { label: "Retorno Total", tip: "" },
                      { label: "Sharpe", tip: "" },
                      { label: "Sortino", tip: "" },
                      { label: "Vol", tip: "" },
                      { label: "Win Rate", tip: "" },
                      { label: "Valor Final", tip: "" },
                    ].map((h) => (
                      <th key={h.label} className="text-left text-text-muted font-medium py-2 pr-4" title={h.tip}>
                        {h.label === "Calmar ★" ? (
                          <span className="text-primary">{h.label}</span>
                        ) : h.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.metrics.map((m) => {
                    const isAdaptive = m.strategy === "adaptive";
                    const calmarColor = m.calmar_ratio >= 0.5 ? "text-success" : m.calmar_ratio >= 0.3 ? "text-warning" : "text-danger";
                    return (
                      <tr key={m.strategy} className={`border-b border-border/40 ${isAdaptive ? "bg-primary/5" : ""}`}>
                        <td className="py-2.5 pr-4">
                          <span className={`font-semibold ${isAdaptive ? "text-primary" : "text-text-secondary"}`}>
                            {STRATEGY_LABELS[m.strategy] || m.strategy}
                          </span>
                        </td>
                        <td className={`py-2.5 pr-4 font-mono font-bold ${calmarColor}`}>{m.calmar_ratio.toFixed(2)}</td>
                        <td className={`py-2.5 pr-4 font-mono font-semibold ${m.cagr_pct > 8 ? "text-success" : "text-text-primary"}`}>{m.cagr_pct.toFixed(1)}%</td>
                        <td className="py-2.5 pr-4 font-mono text-danger">{m.max_drawdown_pct.toFixed(1)}%</td>
                        <td className={`py-2.5 pr-4 font-mono font-semibold ${m.total_return_pct > 0 ? "text-success" : "text-danger"}`}>{formatPercent(m.total_return_pct)}</td>
                        <td className={`py-2.5 pr-4 font-mono ${m.sharpe_ratio > 1 ? "text-success" : "text-text-primary"}`}>{m.sharpe_ratio.toFixed(2)}</td>
                        <td className={`py-2.5 pr-4 font-mono ${m.sortino_ratio > 1.5 ? "text-success" : "text-text-primary"}`}>{m.sortino_ratio.toFixed(2)}</td>
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

                  {/* Hero: Prob de Ruína — grande e color-coded */}
                  {(() => {
                    const ruin = result.monte_carlo!.ruin_probability;
                    const ruinPct = (ruin * 100).toFixed(2);
                    const isRed = ruin > 0.10;
                    const isYellow = ruin > 0.03 && ruin <= 0.10;
                    const heroColor = isRed ? "bg-danger/10 border-danger/30" : isYellow ? "bg-warning/10 border-warning/30" : "bg-success/10 border-success/30";
                    const textColor = isRed ? "text-danger" : isYellow ? "text-warning" : "text-success";
                    const label = isRed ? "ALTO — revisar alavancagem" : isYellow ? "MODERADO — monitorar" : "BAIXO — estratégia defensável";
                    return (
                      <div className={`rounded-xl border p-4 mb-4 ${heroColor}`}>
                        <p className="text-xs text-text-muted mb-1 uppercase font-semibold tracking-wide">Probabilidade de Ruína / Liquidação Forçada</p>
                        <p className={`text-4xl font-mono font-bold mb-1 ${textColor}`}>{ruinPct}%</p>
                        <p className={`text-xs font-semibold ${textColor}`}>{label}</p>
                        <p className="text-[10px] text-text-muted mt-1">
                          Fração dos {result.monte_carlo!.n_paths.toLocaleString()} caminhos em que o patrimônio tocou zero (margin call).
                          Limiar defensável: &lt; 3%.
                        </p>
                      </div>
                    );
                  })()}

                  {/* Distribuição do patrimônio final p5/p50/p95 */}
                  {result.monte_carlo.final_value_percentiles && (
                    <div className="mb-4">
                      <p className="text-xs font-semibold text-text-secondary mb-2">Distribuição do Patrimônio Final</p>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="bg-danger/10 rounded-lg p-2.5 text-center">
                          <p className="text-[10px] text-text-muted mb-1">Pessimista (P5)</p>
                          <p className="text-sm font-mono font-bold text-danger">
                            {formatCurrency(result.monte_carlo.final_value_percentiles.p5, "USD", true)}
                          </p>
                        </div>
                        <div className="bg-primary/10 rounded-lg p-2.5 text-center">
                          <p className="text-[10px] text-text-muted mb-1">Base (P50)</p>
                          <p className="text-sm font-mono font-bold text-primary">
                            {formatCurrency(result.monte_carlo.final_value_percentiles.p50, "USD", true)}
                          </p>
                        </div>
                        <div className="bg-success/10 rounded-lg p-2.5 text-center">
                          <p className="text-[10px] text-text-muted mb-1">Bull (P95)</p>
                          <p className="text-sm font-mono font-bold text-success">
                            {formatCurrency(result.monte_carlo.final_value_percentiles.p95, "USD", true)}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* MaxDD distribution */}
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="bg-surface-2 rounded-lg p-3">
                      <p className="text-xs text-text-muted mb-1">MaxDD Mediano (p50)</p>
                      <p className="text-lg font-mono font-semibold text-danger">
                        {result.monte_carlo.max_dd_distribution.p50.toFixed(1)}%
                      </p>
                    </div>
                    <div className="bg-surface-2 rounded-lg p-3">
                      <p className="text-xs text-text-muted mb-1">MaxDD Pior Caso</p>
                      <p className="text-lg font-mono font-semibold text-danger">
                        {result.monte_carlo.max_dd_distribution.worst.toFixed(1)}%
                      </p>
                    </div>
                  </div>

                  {/* Histograma de maxDD */}
                  <div className="mb-2">
                    <p className="text-[10px] text-text-muted mb-1">Distribuição de MaxDD por caminho</p>
                    <div className="flex items-end gap-0.5 h-16">
                      {(() => {
                        const hist = result.monte_carlo!.max_dd_histogram;
                        const maxC = Math.max(1, ...hist.map((b) => b.count));
                        return hist.map((b, i) => (
                          <div
                            key={i}
                            className="flex-1 bg-danger/40 rounded-t"
                            style={{ height: `${(b.count / maxC) * 100}%` }}
                            title={`${b.bin_lo.toFixed(0)}% a ${b.bin_hi.toFixed(0)}%: ${b.count} caminhos`}
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

            {/* Survival Dashboard: Rule of 72 + Projection Panel */}
            {adaptiveMetrics && (
              <div className="card">
                <h2 className="text-sm font-semibold text-text-primary mb-4">
                  Painel de Sobrevivência — Estratégia Adaptativa
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                  {/* Calmar — hero survival metric */}
                  {(() => {
                    const calmar = adaptiveMetrics.calmar_ratio;
                    const calmarColor = calmar >= 0.5 ? "bg-success/10 text-success" : calmar >= 0.3 ? "bg-warning/10 text-warning" : "bg-danger/10 text-danger";
                    const calmarLabel = calmar >= 0.5 ? "Excelente" : calmar >= 0.3 ? "Aceitável" : "Crítico";
                    return (
                      <div className={`rounded-xl p-3 ${calmarColor}`}>
                        <p className="text-[10px] uppercase font-semibold tracking-wide opacity-80 mb-1">Calmar (sobrevivência)</p>
                        <p className="text-2xl font-mono font-bold">{calmar.toFixed(2)}</p>
                        <p className="text-[10px] font-semibold mt-1">{calmarLabel}</p>
                      </div>
                    );
                  })()}

                  {/* Rule of 72 — anos para dobrar */}
                  {(() => {
                    const cagr = result.cost_breakdown?.cagr_net_pct ?? adaptiveMetrics.cagr_pct;
                    const anos = cagr > 0 ? (72 / cagr).toFixed(1) : "∞";
                    return (
                      <div className="bg-primary/5 rounded-xl p-3">
                        <p className="text-[10px] uppercase font-semibold tracking-wide text-text-muted mb-1">Anos p/ dobrar capital</p>
                        <p className="text-2xl font-mono font-bold text-primary">{anos}</p>
                        <p className="text-[10px] text-text-muted mt-1">Regra de 72 / CAGR líquido {cagr.toFixed(1)}%</p>
                      </div>
                    );
                  })()}

                  {/* MaxDD */}
                  <div className="bg-danger/10 rounded-xl p-3">
                    <p className="text-[10px] uppercase font-semibold tracking-wide text-text-muted mb-1">MaxDrawdown histórico</p>
                    <p className="text-2xl font-mono font-bold text-danger">{adaptiveMetrics.max_drawdown_pct.toFixed(1)}%</p>
                    <p className="text-[10px] text-text-muted mt-1">Suportar sem liquidar = sobreviver</p>
                  </div>

                  {/* Win Rate */}
                  <div className="bg-surface-2 rounded-xl p-3">
                    <p className="text-[10px] uppercase font-semibold tracking-wide text-text-muted mb-1">Win Rate mensal</p>
                    <p className="text-2xl font-mono font-bold text-text-primary">{adaptiveMetrics.win_rate_pct.toFixed(1)}%</p>
                    <p className="text-[10px] text-text-muted mt-1">Meses positivos / total</p>
                  </div>
                </div>

                {/* "Se você sobreviver X anos" projection */}
                {(() => {
                  const cagr = result.cost_breakdown?.cagr_net_pct ?? adaptiveMetrics.cagr_pct;
                  if (cagr <= 0) return null;
                  const horizons = [5, 10, 15, 20, 30];
                  return (
                    <div>
                      <p className="text-xs font-semibold text-text-secondary mb-2">
                        Projeção: "Se você sobreviver X anos com CAGR líquido de {cagr.toFixed(1)}%"
                      </p>
                      <p className="text-[10px] text-text-muted mb-3">
                        Capital inicial + aportes mensais. Sobreviver (não liquidar) é condição necessária — não é garantia de retorno.
                      </p>
                      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                        {horizons.map((yr) => {
                          const r = cagr / 100;
                          // FV = PV*(1+r)^n + PMT*((1+r)^n - 1)/r  (monthly compounding approx)
                          const rm = Math.pow(1 + r, 1 / 12) - 1;
                          const n = yr * 12;
                          const fv = initialCapital * Math.pow(1 + rm, n) +
                            monthlyContrib * (Math.pow(1 + rm, n) - 1) / rm;
                          const multiple = fv / (initialCapital + monthlyContrib * n);
                          return (
                            <div key={yr} className="bg-surface-2 rounded-lg p-2.5 text-center">
                              <p className="text-[10px] text-text-muted mb-1">{yr} anos</p>
                              <p className="text-sm font-mono font-bold text-text-primary">
                                {formatCurrency(fv, "USD", true)}
                              </p>
                              <p className="text-[10px] text-success font-semibold mt-1">
                                {multiple.toFixed(1)}× do investido
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

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
