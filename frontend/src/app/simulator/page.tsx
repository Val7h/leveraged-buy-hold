"use client";
import { useState, useEffect } from "react";
import AppShell from "@/components/layout/AppShell";
import MonteCarloChart from "@/components/charts/MonteCarloChart";
import LeverageChart from "@/components/charts/LeverageChart";
import { usePortfolioStore } from "@/store/portfolioStore";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, BarChart, Bar, Legend,
} from "recharts";
import { simulatorApi } from "@/lib/api";
import type { SimulationResult } from "@/types";
import { TrendingUp, RefreshCw, Briefcase, X } from "lucide-react";
import TickerLogo from "@/components/ui/TickerLogo";
import { formatCurrency } from "@/lib/utils";

export default function SimulatorPage() {
  const { positions, activePortfolioId, fetchPortfolios, fetchPositions } = usePortfolioStore();

  useEffect(() => { fetchPortfolios(); }, []);
  useEffect(() => { if (activePortfolioId) fetchPositions(activePortfolioId); }, [activePortfolioId]);
  const [tickers, setTickers] = useState("NEE");
  const [initialEquity, setInitialEquity] = useState(50000);
  const [monthlyContrib, setMonthlyContrib] = useState(1000);
  const [horizonYears, setHorizonYears] = useState(20);
  const [riskProfile, setRiskProfile] = useState("balanced");
  const [rebalancing, setRebalancing] = useState("none");
  const [inflation, setInflation] = useState(3);
  const [numSims, setNumSims] = useState(1000);
  const [dividendYield, setDividendYield] = useState(4);
  const [drip, setDrip] = useState(true);
  const [fxBrlUsd, setFxBrlUsd] = useState<string>("");
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const tickerList = tickers
    .split(",")
    .map((t) => t.trim().toUpperCase())
    .filter(Boolean);

  const handleUsePortfolio = () => {
    if (positions.length === 0) return;
    setTickers(positions.map((p) => p.ticker).join(", "));
  };

  const removeTicker = (t: string) => {
    const updated = tickerList.filter((x) => x !== t);
    setTickers(updated.join(", "));
  };

  const handleRun = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await simulatorApi.run({
        tickers: tickerList,
        initial_equity: initialEquity,
        monthly_contribution: monthlyContrib,
        horizon_years: horizonYears,
        risk_profile: riskProfile,
        inflation_rate: inflation / 100,
        num_simulations: numSims,
        rebalancing,
        dividend_yield: dividendYield / 100,
        drip,
        fx_brl_usd: fxBrlUsd ? parseFloat(fxBrlUsd) : null,
      });
      setResult(res.data);
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Erro ao executar simulação");
    } finally {
      setLoading(false);
    }
  };

  const medianScenario = result?.scenarios?.find((s) => s.percentile === 50);

  return (
    <AppShell>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-text-primary">Simulador de Longo Prazo</h1>
          <p className="text-sm text-text-secondary mt-0.5">Monte Carlo com {numSims.toLocaleString()} simulações · horizonte de 10–30 anos</p>
        </div>

        {/* Config */}
        <div className="card mb-6">
          {/* Tickers row */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1">
              <label className="label mb-0">Ativos da carteira (separados por vírgula)</label>
              {positions.length > 0 && (
                <button
                  onClick={handleUsePortfolio}
                  className="flex items-center gap-1.5 text-xs text-primary hover:underline"
                >
                  <Briefcase size={11} />
                  Usar minha carteira ({positions.length} ativos)
                </button>
              )}
            </div>
            <input
              className="input font-mono uppercase w-full"
              value={tickers}
              onChange={(e) => setTickers(e.target.value)}
              placeholder="NEE, SO, JNJ, KO..."
            />
            {/* Badge list */}
            {tickerList.length > 1 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {tickerList.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-mono text-primary"
                  >
                    <TickerLogo ticker={t} size={14} />
                    {t}
                    <button onClick={() => removeTicker(t)} className="hover:text-danger transition-colors">
                      <X size={10} />
                    </button>
                  </span>
                ))}
                <span className="text-xs text-text-muted self-center">
                  · carteira igualmente ponderada
                </span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4 mb-4">
            <div>
              <label className="label">Equity Inicial ($)</label>
              <input className="input font-mono" type="number" value={initialEquity} onChange={(e) => setInitialEquity(Number(e.target.value))} />
            </div>
            <div>
              <label className="label">Aporte Mensal ($)</label>
              <input className="input font-mono" type="number" value={monthlyContrib} onChange={(e) => setMonthlyContrib(Number(e.target.value))} />
            </div>
            <div>
              <label className="label">Horizonte (anos)</label>
              <select className="input" value={horizonYears} onChange={(e) => setHorizonYears(Number(e.target.value))}>
                {[10, 15, 20, 25, 30].map((y) => <option key={y} value={y}>{y} anos</option>)}
              </select>
            </div>
            <div>
              <label className="label">Perfil de Risco</label>
              <select className="input" value={riskProfile} onChange={(e) => setRiskProfile(e.target.value)}>
                <option value="conservative">Conservador (1.25x)</option>
                <option value="balanced">Balanceado (1.75x)</option>
                <option value="aggressive">Agressivo (2.5x)</option>
              </select>
            </div>
            <div>
              <label className="label">Rebalanceamento</label>
              <select className="input" value={rebalancing} onChange={(e) => setRebalancing(e.target.value)}>
                <option value="none">Sem rebalanceamento</option>
                <option value="monthly">Mensal</option>
                <option value="quarterly">Trimestral</option>
                <option value="annual">Anual</option>
              </select>
            </div>
            <div>
              <label className="label">Inflação (%/ano)</label>
              <input className="input font-mono" type="number" value={inflation} onChange={(e) => setInflation(Number(e.target.value))} min={0} max={20} step={0.5} />
            </div>
            <div>
              <label className="label">Dividend Yield (%/ano)</label>
              <input className="input font-mono" type="number" value={dividendYield} onChange={(e) => setDividendYield(Number(e.target.value))} min={0} max={20} step={0.5} />
            </div>
            <div>
              <label className="label">FX BRL/USD (opcional)</label>
              <input className="input font-mono" type="number" value={fxBrlUsd} onChange={(e) => setFxBrlUsd(e.target.value)} placeholder="ex: 5.70" min={0} step={0.1} />
            </div>
          </div>

          {/* DRIP toggle */}
          <div className="flex items-center gap-3 mb-4 p-3 bg-surface-2 rounded-lg">
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={drip} onChange={(e) => setDrip(e.target.checked)} className="sr-only peer" />
              <div className="w-9 h-5 bg-surface-3 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
            </label>
            <div>
              <p className="text-xs font-semibold text-text-primary">DRIP — Dividend Reinvestment Plan</p>
              <p className="text-xs text-text-muted">
                {drip
                  ? "Dividendos reinvestidos automaticamente (composição acelerada)"
                  : "Dividendos pagos como renda (não reinvestidos — patrimônio cresce mais devagar)"}
              </p>
            </div>
          </div>

          <button onClick={handleRun} disabled={loading} className="btn-primary flex items-center gap-2">
            {loading ? <RefreshCw size={14} className="animate-spin" /> : <TrendingUp size={14} />}
            {loading ? `Simulando ${numSims.toLocaleString()} cenários...` : `Simular ${tickerList.length > 1 ? `carteira (${tickerList.length} ativos)` : tickerList[0] || "ativo"}`}
          </button>
        </div>

        {error && <div className="bg-danger/10 border border-danger/20 rounded-lg px-4 py-3 text-sm text-danger mb-4">{error}</div>}

        {loading && (
          <div className="card text-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mb-4" />
            <p className="text-sm text-text-secondary">Executando Monte Carlo com {numSims.toLocaleString()} trajetórias...</p>
          </div>
        )}

        {result && !loading && (
          <div className="space-y-5">
            {/* Key metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                {
                  label: `Patrimônio Mediano (${horizonYears}a)`,
                  value: formatCurrency(result.scenarios?.find((s) => s.percentile === 50)?.final_value || 0, "USD", true),
                  sub: `CAGR: ${medianScenario?.cagr?.toFixed(1)}%`,
                  color: "text-success",
                },
                {
                  label: "Cenário Pessimista (P5)",
                  value: formatCurrency(result.scenarios?.find((s) => s.percentile === 5)?.final_value || 0, "USD", true),
                  color: "text-danger",
                },
                {
                  label: "Cenário Bull (P95)",
                  value: formatCurrency(result.scenarios?.find((s) => s.percentile === 95)?.final_value || 0, "USD", true),
                  color: "text-primary",
                },
                {
                  label: "Probabilidade de Ruína",
                  value: `${(result.ruin_probability * 100).toFixed(1)}%`,
                  sub: "Equity abaixo de 5%",
                  color: result.ruin_probability > 0.1 ? "text-danger" : "text-success",
                },
              ].map((m) => (
                <div key={m.label} className="card-sm">
                  <p className="text-xs text-text-muted mb-1">{m.label}</p>
                  <p className={`text-base font-mono font-semibold ${m.color}`}>{m.value}</p>
                  {m.sub && <p className="text-xs text-text-muted mt-0.5">{m.sub}</p>}
                </div>
              ))}
            </div>

            {/* Percentile table */}
            {result.percentiles && (
              <div className="card">
                <h2 className="text-sm font-semibold text-text-primary mb-4">Distribuição de Resultados ({horizonYears} anos)</h2>
                <div className="grid grid-cols-4 md:grid-cols-7 gap-3">
                  {Object.entries(result.percentiles).map(([key, val]) => (
                    <div key={key} className="bg-surface-2 rounded-lg p-3 text-center">
                      <p className="text-xs text-text-muted mb-1">{key.toUpperCase()}</p>
                      <p className="text-sm font-mono font-semibold text-text-primary">{formatCurrency(val, "USD", true)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Monte Carlo chart */}
            <MonteCarloChart scenarios={result.scenarios} height={380} />

            {/* Leverage evolution + Dividend accumulation */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <LeverageChart data={result.leverage_evolution} title="Desalavancagem Natural ao Longo do Tempo" height={220} />

              {(result.dividend_accumulation?.length ?? 0) > 0 && (
                <div className="card">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-sm font-semibold text-text-primary">
                        {drip ? "Dividendos Reinvestidos (DRIP ON)" : "Renda Passiva Mensal Projetada"}
                      </h3>
                      <p className="text-xs text-text-muted mt-0.5">
                        {drip
                          ? "Dividendos compostos automaticamente no patrimônio"
                          : "Renda mensal estimada sem reinvestimento"}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${
                      drip ? "bg-success/10 text-success border-success/20" : "bg-warning/10 text-warning border-warning/20"
                    }`}>
                      {drip ? "DRIP ON" : "DRIP OFF"}
                    </span>
                  </div>

                  {/* DRIP OFF — milestone income cards */}
                  {!drip && (
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      {result.dividend_accumulation
                        .filter((_, i) => [2, Math.floor(result.dividend_accumulation.length / 2), result.dividend_accumulation.length - 1].includes(i))
                        .map((d, i) => (
                          <div key={i} className="bg-surface-2 rounded-lg p-2.5 text-center">
                            <p className="text-[9px] text-text-muted">Ano {Math.round(d.year)}</p>
                            <p className="text-sm font-mono font-bold text-warning">
                              {formatCurrency(d.monthly_income, "USD", true)}<span className="text-[9px] font-normal text-text-muted">/mês</span>
                            </p>
                            <p className="text-[9px] text-text-muted">{formatCurrency(d.annual_income, "USD", true)}/ano</p>
                          </div>
                        ))}
                    </div>
                  )}

                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={result.dividend_accumulation.filter((_, i) => i % 2 === 0)}>
                      <defs>
                        <linearGradient id="divGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor={drip ? "#00E676" : "#FFB300"} stopOpacity={0.25} />
                          <stop offset="95%" stopColor={drip ? "#00E676" : "#FFB300"} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1E2730" />
                      <XAxis dataKey="year" tickFormatter={(v) => `Ano ${v}`} tick={{ fill: "#475569", fontSize: 10 }} tickLine={false} axisLine={false} />
                      <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} tick={{ fill: "#475569", fontSize: 10 }} tickLine={false} axisLine={false} width={48} />
                      <Tooltip
                        formatter={(v: any, name: string) => [
                          formatCurrency(v, "USD", true),
                          name === "cumulative_dividends" ? "Total Reinvestido" : "Renda Mensal",
                        ]}
                        contentStyle={{ background: "#161C24", border: "1px solid #1F2937", borderRadius: 8, fontSize: 12 }}
                      />
                      <Area
                        type="monotone"
                        dataKey={drip ? "cumulative_dividends" : "monthly_income"}
                        stroke={drip ? "#00E676" : "#FFB300"}
                        strokeWidth={2}
                        fill="url(#divGrad)"
                        dot={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Contribution breakdown */}
            {(result.contribution_breakdown?.length ?? 0) > 0 && (
              <div className="card">
                <h3 className="text-sm font-semibold text-text-primary mb-4">Decomposição: Aportes vs. Retornos</h3>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={result.contribution_breakdown.filter((_, i) => i % 2 === 0)} barSize={16}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E2730" vertical={false} />
                    <XAxis dataKey="year" tickFormatter={(v) => `Ano ${v}`} tick={{ fill: "#475569", fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} tick={{ fill: "#475569", fontSize: 10 }} tickLine={false} axisLine={false} width={50} />
                    <Tooltip formatter={(v: any, name: string) => [formatCurrency(v, "USD", true), name === "contributions" ? "Aportes" : "Retornos"]} contentStyle={{ background: "#161C24", border: "1px solid #1F2937", borderRadius: 8, fontSize: 12 }} />
                    <Legend formatter={(v) => <span style={{ color: "#94A3B8", fontSize: 11 }}>{v === "contributions" ? "Aportes" : "Retornos"}</span>} />
                    <Bar dataKey="contributions" stackId="a" fill="#00D4FF" fillOpacity={0.7} radius={[0, 0, 2, 2]} />
                    <Bar dataKey="returns" stackId="a" fill="#00E676" fillOpacity={0.7} radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* ── Stress Test ─────────────────────────────────────────────── */}
            {(result.stress_test?.length ?? 0) > 0 && (
              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-semibold text-text-primary">Stress Test — Crises Históricas</h3>
                    <p className="text-xs text-text-muted mt-0.5">
                      Como a carteira com {riskProfile === "conservative" ? "1.25x" : riskProfile === "balanced" ? "1.75x" : "2.5x"} de alavancagem se comportaria em cada crise
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {result.stress_test.map((s) => {
                    const isPositive = s.total_return_pct >= 0;
                    return (
                      <div key={s.key} className="bg-surface-2 rounded-xl p-4 border border-border">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="text-xs font-bold text-text-primary">{s.name}</p>
                            <p className="text-[10px] text-text-muted">{s.period} · {s.total_months} meses</p>
                          </div>
                          <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded-full border ${
                            isPositive ? "text-success bg-success/10 border-success/20" : "text-danger bg-danger/10 border-danger/20"
                          }`}>
                            {isPositive ? "+" : ""}{s.total_return_pct.toFixed(1)}%
                          </span>
                        </div>
                        {/* Mini path chart */}
                        <ResponsiveContainer width="100%" height={72}>
                          <AreaChart data={s.path} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
                            <defs>
                              <linearGradient id={`sg-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%"  stopColor={s.color} stopOpacity={0.3} />
                                <stop offset="95%" stopColor={s.color} stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <Area type="monotone" dataKey="value" stroke={s.color} strokeWidth={1.5}
                              fill={`url(#sg-${s.key})`} dot={false} />
                            <Tooltip
                              formatter={(v: any) => [formatCurrency(v, "USD", true), "Patrimônio"]}
                              labelFormatter={(l) => `Mês ${l}`}
                              contentStyle={{ background: "#161C24", border: "1px solid #1F2937", borderRadius: 8, fontSize: 11 }}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                        {/* Metrics row */}
                        <div className="grid grid-cols-3 gap-2 mt-3">
                          {[
                            { label: "Drawdown máx.", value: `${s.max_drawdown_pct.toFixed(1)}%`, color: "text-danger" },
                            { label: "Vale mínimo",   value: formatCurrency(s.trough, "USD", true), color: "text-warning" },
                            { label: "Meses p/ vale", value: `${s.months_to_trough}m`,              color: "text-text-primary" },
                          ].map(m => (
                            <div key={m.label} className="bg-surface-3/50 rounded-lg p-2 text-center">
                              <p className="text-[9px] text-text-muted">{m.label}</p>
                              <p className={`text-xs font-mono font-semibold ${m.color}`}>{m.value}</p>
                            </div>
                          ))}
                        </div>
                        <p className="text-[10px] text-text-muted mt-2 leading-tight">{s.description}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {!result && !loading && (
          <div className="card text-center py-16">
            <TrendingUp size={40} className="text-text-muted mx-auto mb-4" />
            <p className="text-sm text-text-secondary">Configure os parâmetros e inicie a simulação</p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
