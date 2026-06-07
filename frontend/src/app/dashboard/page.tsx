"use client";
import { useEffect, useState, useCallback } from "react";
import AppShell from "@/components/layout/AppShell";
import MetricCard from "@/components/ui/MetricCard";
import TickerLogo from "@/components/ui/TickerLogo";
import MarketStateWidget from "@/components/assets/MarketStateWidget";
import { usePortfolioStore } from "@/store/portfolioStore";
import { useAuthStore } from "@/store/authStore";
import { useSignalStore } from "@/store/signalStore";
import { watchlistApi, portfolioApi } from "@/lib/api";
import {
  formatCurrency, formatPercent, formatLeverage, getLeverageColor,
  getPnlColor, riskProfileLabel, cn,
} from "@/lib/utils";
import {
  DollarSign, TrendingUp, BarChart2, Shield, AlertTriangle,
  Percent, Clock, Target, Plus, RefreshCw, ArrowRight,
  TrendingDown, Zap, Lock, RefreshCcw, Bell,
} from "lucide-react";
import Link from "next/link";

const SIGNAL_COLORS: Record<string, string> = {
  "ENTRAR FORTE":            "text-success bg-success/15 border-success/35",
  "ENTRAR":                  "text-success bg-success/10 border-success/25",
  "ENTRAR (mercado em topo)":"text-warning bg-warning/10 border-warning/30",
  "AGUARDAR":                "text-warning bg-warning/8 border-warning/20",
  "EVITAR":                  "text-danger bg-danger/8 border-danger/20",
};

function SignalCard({ s, onBuy }: { s: any; onBuy: (ticker: string, leverage: number) => void }) {
  const display = s.is_tokenized ? (s.underlying_ticker ?? s.ticker.replace("ONUSDT","")) : s.ticker;
  const rsi = s.rsi_weekly ?? s.rsi;
  const sigCls = SIGNAL_COLORS[s.entry_signal] ?? "text-text-muted bg-surface-2 border-border";
  return (
    <div className="flex items-center gap-3 p-3 bg-surface-2 rounded-xl border border-border hover:border-primary/30 transition-colors">
      <TickerLogo ticker={s.ticker} size={32} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-mono font-bold text-text-primary text-sm">{display}</span>
          {s.is_tokenized && <span className="text-[9px] bg-amber-500/15 border border-amber-500/30 text-amber-400 px-1 py-0.5 rounded font-bold">🪙</span>}
          <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-full border", sigCls)}>{s.entry_signal}</span>
        </div>
        <p className="text-[10px] text-text-muted mt-0.5 truncate">{s.entry_rationale || s.company_name}</p>
        {rsi != null && <p className="text-[10px] text-text-muted">RSI Sem. {rsi.toFixed(1)}</p>}
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-xs font-mono font-bold text-warning">{s.entry_leverage?.toFixed(1)}x</p>
        {s.current_price && <p className="text-[10px] text-text-muted">{formatCurrency(s.current_price)}</p>}
      </div>
      <Link
        href={`/portfolio?add=${encodeURIComponent(s.ticker)}&leverage=${(s.entry_leverage || 1).toFixed(2)}`}
        className="flex items-center gap-1 text-[10px] font-semibold text-success bg-success/10 border border-success/20 hover:bg-success/20 px-2 py-1.5 rounded-lg transition-colors flex-shrink-0"
      >
        Comprar <ArrowRight size={9} />
      </Link>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { activePortfolioId, metrics, positions, portfolios, fetchPortfolios, fetchMetrics, fetchPositions } = usePortfolioStore();
  const { opportunities, avoid, awaiting, opportunityCount, checkedAt, loading: signalLoading, setSignals, setLoading } = useSignalStore();
  const [creatingPortfolio, setCreatingPortfolio] = useState(false);

  useEffect(() => { fetchPortfolios(); }, []);
  useEffect(() => {
    if (activePortfolioId) {
      fetchMetrics(activePortfolioId);
      fetchPositions(activePortfolioId);
    }
  }, [activePortfolioId]);

  const fetchSignals = useCallback(async () => {
    setLoading(true);
    try {
      const res = await watchlistApi.getSignals();
      setSignals(res.data);
    } catch { /* watchlist vazia ou erro */ }
    finally { setLoading(false); }
  }, []);

  // Auto-fetch signals on mount (silently — sem bloquear UI)
  useEffect(() => { fetchSignals(); }, []);

  const handleCreateDemo = async () => {
    setCreatingPortfolio(true);
    try {
      await portfolioApi.create({ name: "Carteira Defensiva", initial_equity: 50000, monthly_contribution: 1000, currency: "USD" });
      await fetchPortfolios();
    } finally { setCreatingPortfolio(false); }
  };

  // Positions with Ciclo flag
  const cyclePositions = positions.filter(p => p.is_cycle);
  const seedPositions  = positions.filter(p => p.is_seed);

  // Greeting based on time
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";

  return (
    <AppShell>
      <div className="p-6 max-w-7xl mx-auto">

        {/* ── Header ────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-xl font-semibold text-text-primary">
              {greeting}, {user?.fullName?.split(" ")[0] || "Investidor"} 👋
            </h1>
            <p className="text-sm text-text-secondary mt-0.5">
              Perfil: <span className="text-primary font-medium">{riskProfileLabel(user?.riskProfile || "balanced")}</span>
              {" "}· Buy &amp; Hold Alavancado Adaptativo
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchSignals} disabled={signalLoading}
              className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-primary border border-border hover:border-primary/30 px-3 py-1.5 rounded-lg transition-colors">
              {signalLoading ? <RefreshCw size={12} className="animate-spin" /> : <RefreshCw size={12} />}
              Verificar Sinais
            </button>
            <Link href="/assets" className="btn-primary flex items-center gap-2 text-sm">
              <Target size={15} />
              Screening
            </Link>
          </div>
        </div>

        {/* ── Market State ──────────────────────────────────── */}
        <MarketStateWidget />

        {/* ── No portfolio ──────────────────────────────────── */}
        {!portfolios.length && (
          <div className="card text-center py-16">
            <BarChart2 size={40} className="text-text-muted mx-auto mb-4" />
            <h2 className="text-base font-semibold text-text-primary mb-2">Nenhuma carteira criada</h2>
            <p className="text-sm text-text-secondary mb-6 max-w-sm mx-auto">
              Crie sua carteira para acompanhar métricas, posições e sugestões.
            </p>
            <button onClick={handleCreateDemo} disabled={creatingPortfolio} className="btn-primary mx-auto flex items-center gap-2">
              <Plus size={15} />
              Criar Carteira Demo
            </button>
          </div>
        )}

        {/* ── Oportunidades de Entrada ──────────────────────── */}
        {(opportunities.length > 0 || signalLoading) && (
          <div className="card mb-5 border-success/20">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Zap size={15} className="text-success" />
                <h2 className="text-sm font-semibold text-text-primary">
                  Oportunidades de Entrada
                </h2>
                {opportunities.length > 0 && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-success/15 border border-success/30 text-success font-bold">
                    {opportunities.length} sinal{opportunities.length > 1 ? "is" : ""}
                  </span>
                )}
              </div>
              {checkedAt && (
                <p className="text-[10px] text-text-muted">
                  Verificado às {new Date(checkedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </p>
              )}
            </div>
            {signalLoading ? (
              <div className="flex items-center gap-2 text-xs text-text-muted py-2">
                <RefreshCw size={12} className="animate-spin" /> Analisando watchlist...
              </div>
            ) : (
              <div className="space-y-2">
                {opportunities.map(s => (
                  <SignalCard key={s.ticker} s={s} onBuy={() => {}} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Sem oportunidades mas watchlist tem dados ─────── */}
        {!signalLoading && opportunities.length === 0 && (awaiting.length > 0 || avoid.length > 0) && (
          <div className="card mb-5 flex items-center gap-3 py-4">
            <div className="w-9 h-9 rounded-full bg-warning/10 border border-warning/20 flex items-center justify-center flex-shrink-0">
              <Bell size={16} className="text-warning" />
            </div>
            <div>
              <p className="text-sm font-semibold text-text-primary">Nenhuma oportunidade ativa</p>
              <p className="text-xs text-text-muted">
                {awaiting.length} ativo{awaiting.length !== 1 ? "s" : ""} aguardando recuo
                {avoid.length > 0 && ` · ${avoid.length} a evitar`}
                {" "}· watchlist monitorada
              </p>
            </div>
            <Link href="/watchlist" className="ml-auto text-xs text-primary hover:underline flex items-center gap-1">
              Ver watchlist <ArrowRight size={11} />
            </Link>
          </div>
        )}

        {/* ── Portfolio Metrics ─────────────────────────────── */}
        {metrics && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4 mb-4">
              <MetricCard label="Patrimônio (Equity)" value={formatCurrency(metrics.equity, "USD", true)}
                accent="primary" icon={<DollarSign size={16} className="text-primary" />} large
                tooltip="Valor total do seu portfólio em reais" />
              <MetricCard label="Exposição Total"
                value={formatCurrency(metrics.total_exposure, "USD", true)}
                subValue={`Alavancagem: ${formatLeverage(metrics.effective_leverage)}`}
                accent={metrics.effective_leverage > 2.5 ? "danger" : metrics.effective_leverage > 1.5 ? "warning" : "success"}
                icon={<TrendingUp size={16} className={getLeverageColor(metrics.effective_leverage)} />}
                tooltip="Percentual do patrimônio investido em ativos" />
              <MetricCard label="Dividend Yield" value={`${metrics.dividend_yield.toFixed(2)}%`}
                subValue="Yield da carteira" accent="success"
                icon={<Percent size={16} className="text-success" />}
                tooltip="Rendimento de dividendos anualizados das suas posições" />
              <MetricCard label="Margem de Segurança" value={`${metrics.safety_margin.toFixed(1)}%`}
                subValue={`VaR 95%: -${metrics.var_95.toFixed(1)}%`}
                accent={metrics.safety_margin > 60 ? "success" : metrics.safety_margin > 30 ? "warning" : "danger"}
                icon={<Shield size={16} className="text-success" />}
                tooltip="Perda máxima esperada em 95% dos cenários (próximos 30 dias)" />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4 mb-5">
              <MetricCard label="Drawdown Atual"
                value={formatPercent(metrics.current_drawdown)}
                subValue={`Máx. histórico: ${formatPercent(metrics.max_drawdown)}`}
                accent={metrics.current_drawdown < -15 ? "danger" : "default"}
                icon={<AlertTriangle size={16} className="text-warning" />}
                tooltip="Queda percentual máxima do seu patrimônio desde o pico" />
              <MetricCard label="Sharpe Ratio" value={(metrics.sharpe_ratio || 0).toFixed(2)}
                subValue={`Sortino: ${(metrics.sortino_ratio || 0).toFixed(2)}`}
                icon={<BarChart2 size={16} className="text-primary" />}
                tooltip="Retorno ajustado ao risco (quanto retorno por unidade de risco)" />
              <MetricCard label="CAGR Projetado" value={`${metrics.projected_cagr.toFixed(1)}%`}
                subValue="Estimativa conservadora" accent="success"
                icon={<TrendingUp size={16} className="text-success" />}
                tooltip="Retorno anualizado composto da sua carteira" />
              <MetricCard label="Desalavancagem" value={`${metrics.deleverage_years.toFixed(1)} anos`}
                subValue="Para alavanc. natural ~1.0x" accent="primary"
                icon={<Clock size={16} className="text-primary" />}
                tooltip="Alavancagem média ponderada de todas suas posições" />
            </div>

            {/* ── Two-col: Ciclo em Atenção + Sementes ─────── */}
            {(cyclePositions.length > 0 || seedPositions.length > 0) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">

                {/* Ciclo positions */}
                {cyclePositions.length > 0 && (
                  <div className="card">
                    <div className="flex items-center gap-2 mb-3">
                      <RefreshCcw size={14} className="text-primary" />
                      <h3 className="text-sm font-semibold text-text-primary">Posições Ciclo</h3>
                      <span className="text-xs px-1.5 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary font-bold">
                        {cyclePositions.length}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {cyclePositions.map(pos => (
                        <div key={pos.ticker} className="flex items-center gap-3 p-2.5 bg-surface-2 rounded-lg">
                          <TickerLogo ticker={pos.ticker} size={28} />
                          <div className="flex-1 min-w-0">
                            <p className="font-mono font-bold text-text-primary text-xs">{pos.ticker}</p>
                            <p className={`text-[10px] font-semibold ${getPnlColor(pos.pnl || 0)}`}>
                              P&L: {formatCurrency(pos.pnl || 0, "USD", true)} ({formatPercent(pos.pnl_pct || 0)})
                            </p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className={`text-xs font-mono font-semibold ${getLeverageColor(pos.leverage)}`}>
                              {formatLeverage(pos.leverage)}
                            </p>
                            <p className="text-[10px] text-text-muted">{formatCurrency(pos.current_value || 0, "USD", true)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="text-[10px] text-text-muted mt-2 leading-tight">
                      Posições de rotação — monitorar sinal de entrada. Vender quando EVITAR.
                    </p>
                  </div>
                )}

                {/* Seed positions */}
                {seedPositions.length > 0 && (
                  <div className="card">
                    <div className="flex items-center gap-2 mb-3">
                      <Lock size={14} className="text-warning" />
                      <h3 className="text-sm font-semibold text-text-primary">Sementes Permanentes</h3>
                      <span className="text-xs px-1.5 py-0.5 rounded-full bg-warning/10 border border-warning/20 text-warning font-bold">
                        {seedPositions.length}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {seedPositions.map(pos => (
                        <div key={pos.ticker} className="flex items-center gap-3 p-2.5 bg-surface-2 rounded-lg">
                          <TickerLogo ticker={pos.ticker} size={28} />
                          <div className="flex-1 min-w-0">
                            <p className="font-mono font-bold text-text-primary text-xs">{pos.ticker}</p>
                            <p className="text-[10px] text-text-muted">{formatCurrency(pos.avg_price || 0)} PM · {pos.shares?.toFixed(2)} cotas</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className={`text-xs font-mono font-semibold ${getPnlColor(pos.pnl || 0)}`}>
                              {formatPercent(pos.pnl_pct || 0)}
                            </p>
                            <p className="text-[10px] text-text-muted">{formatCurrency(pos.current_value || 0, "USD", true)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="text-[10px] text-text-muted mt-2 leading-tight">
                      Posições base permanentes — nunca vender, apenas adicionar em quedas.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* ── All positions table ───────────────────────── */}
            {positions.length > 0 && (
              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-text-primary">Todas as Posições</h2>
                  <Link href="/portfolio" className="text-xs text-primary hover:underline flex items-center gap-1">
                    Gerenciar <ArrowRight size={11} />
                  </Link>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border">
                        {["Ativo", "Preço", "Valor", "Alavanc.", "P&L", "P&L %", "Peso", "Tipo"].map(h => (
                          <th key={h} className="text-left text-text-muted font-medium py-2 pr-3 last:pr-0">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {positions.map(pos => (
                        <tr key={pos.ticker} className="border-b border-border/50 hover:bg-surface-2/50 transition-colors">
                          <td className="py-2.5 pr-3">
                            <div className="flex items-center gap-2">
                              <TickerLogo ticker={pos.ticker} size={20} />
                              <span className="font-mono font-semibold text-text-primary">{pos.ticker}</span>
                            </div>
                          </td>
                          <td className="py-2.5 pr-3 font-mono text-text-primary">{formatCurrency(pos.current_price || 0)}</td>
                          <td className="py-2.5 pr-3 font-mono text-text-primary">{formatCurrency(pos.current_value || 0, "USD", true)}</td>
                          <td className="py-2.5 pr-3">
                            <span className={`font-mono font-semibold ${getLeverageColor(pos.leverage)}`}>{formatLeverage(pos.leverage)}</span>
                          </td>
                          <td className={`py-2.5 pr-3 font-mono font-semibold ${getPnlColor(pos.pnl || 0)}`}>
                            {formatCurrency(pos.pnl || 0, "USD", true)}
                          </td>
                          <td className={`py-2.5 pr-3 font-mono font-semibold ${getPnlColor(pos.pnl_pct || 0)}`}>
                            {formatPercent(pos.pnl_pct || 0)}
                          </td>
                          <td className="py-2.5 pr-3 text-text-secondary font-mono">{pos.weight?.toFixed(1)}%</td>
                          <td className="py-2.5">
                            {pos.is_seed && <span className="text-[9px] px-1.5 py-0.5 rounded bg-warning/10 border border-warning/20 text-warning font-bold">🔒 Semente</span>}
                            {pos.is_cycle && <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary/10 border border-primary/20 text-primary font-bold">🔄 Ciclo</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {/* Loading state */}
        {portfolios.length > 0 && !metrics && (
          <div className="card text-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mb-4" />
            <p className="text-sm text-text-muted">Carregando métricas...</p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
