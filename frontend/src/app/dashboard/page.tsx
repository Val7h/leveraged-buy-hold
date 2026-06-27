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

// Sinais técnicos do modelo — DESCRITIVOS, não imperativos (compliance CVM 04/2023).
const SIGNAL_COLORS: Record<string, string> = {
  "OPORTUNIDADE FORTE":         "text-success bg-success/15 border-success/35",
  "OPORTUNIDADE":               "text-success bg-success/10 border-success/25",
  "OPORTUNIDADE (mercado topo)":"text-warning bg-warning/10 border-warning/30",
  "NEUTRO":                     "text-warning bg-warning/8 border-warning/20",
  "DESFAVORÁVEL":               "text-danger bg-danger/8 border-danger/20",
  // Aliases legados (transição) — remover após cache invalidar
  "ENTRAR FORTE":               "text-success bg-success/15 border-success/35",
  "ENTRAR":                     "text-success bg-success/10 border-success/25",
  "AGUARDAR":                   "text-warning bg-warning/8 border-warning/20",
  "EVITAR":                     "text-danger bg-danger/8 border-danger/20",
};

const BUCKET_LABEL_SHORT: Record<string, string> = {
  ANCORA: "Âncoras",
  GERADOR: "Geradores",
  ACELERADOR: "Aceleradores",
  TATICO: "Táticos",
  RESERVA: "Reserva",
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
        title="Adicionar à carteira simulada (não é recomendação de compra)"
      >
        Simular <ArrowRight size={9} />
      </Link>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { activePortfolioId, metrics, positions, portfolios, analytics, fetchPortfolios, fetchMetrics, fetchPositions, fetchAnalytics } = usePortfolioStore();
  const { opportunities, avoid, awaiting, opportunityCount, checkedAt, loading: signalLoading, setSignals, setLoading } = useSignalStore();
  const [creatingPortfolio, setCreatingPortfolio] = useState(false);
  const [signalError, setSignalError] = useState(false);

  useEffect(() => { fetchPortfolios(); }, []);
  useEffect(() => {
    if (activePortfolioId) {
      fetchMetrics(activePortfolioId);
      fetchPositions(activePortfolioId);
      fetchAnalytics(activePortfolioId);
    }
  }, [activePortfolioId]);

  const fetchSignals = useCallback(async () => {
    setLoading(true);
    setSignalError(false);
    try {
      const res = await watchlistApi.getSignals();
      setSignals(res.data);
    } catch (e) {
      // Watchlist vazia (404/204) é estado normal — o setSignals trata como
      // "sem sinais". Qualquer outra falha é erro de verdade: sinaliza pra UI
      // mostrar aviso discreto em vez de sumir mudo.
      const status = (e as any)?.response?.status;
      if (status === 404 || status === 204) {
        setSignals({ signals: [] });
      } else {
        setSignalError(true);
      }
    }
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

  // ── Cockpit de sobrevivência (deriva do payload analytics — NÃO inventa sinal) ──
  const liqAgg = analytics?.liquidation_watch?.aggregate ?? null;
  const liqStatus: string = analytics?.liquidation_watch?.status ?? "indisponivel";
  const aporteVsAgg = analytics?.aporte_vs_agregado ?? null;
  // Próximo aporte cruzado com o cap agregado: se headroom===false, o cap limita.
  const capLimita = aporteVsAgg?.headroom === false;
  const multSugerido = aporteVsAgg?.mult_sugerido ?? null;
  const multRegime = aporteVsAgg?.mult_regime ?? null;
  const maxLevNovo = aporteVsAgg?.max_lev_novo_fluxo ?? null;

  const liqStatusCls =
    liqStatus === "critico" ? "text-danger"
    : liqStatus === "alerta" ? "text-amber-400"
    : liqStatus === "indisponivel" ? "text-text-muted"
    : "text-success";
  const liqWidgetCls =
    liqStatus === "critico" ? "border-danger/30 bg-danger/5"
    : liqStatus === "alerta" ? "border-amber-500/30 bg-amber-500/5"
    : "border-border/40";

  // Fila de ação do dia — derivada SÓ de dados que o analytics já traz:
  //  • desalavancar: ciclos ESTICADOS / sinais de VENDER da rotação (semente nunca entra)
  //  • rebalancear: buckets fora do alvo±banda (status "rebalancear"/drift>banda)
  //  • liquidação: status alerta/critico da vigília
  type Acao = { kind: "liquidacao" | "desalavancar" | "rebalancear"; label: string; detail: string };
  const filaAcao: Acao[] = [];
  if (analytics) {
    if (liqStatus === "critico" || liqStatus === "alerta") {
      filaAcao.push({
        kind: "liquidacao",
        label: liqStatus === "critico" ? "Liquidação crítica" : "Liquidação em alerta",
        detail: liqAgg?.distance_pct != null
          ? `carteira a -${Number(liqAgg.distance_pct).toFixed(0)}% da liquidação — reduzir exposição ou subir equity`
          : "distância até liquidar em zona de risco",
      });
    }
    const rot = analytics.rotation || {};
    const sells = (rot.signals || []).filter((s: any) => s.action === "VENDER" && !s.is_seed);
    for (const s of sells) {
      filaAcao.push({ kind: "desalavancar", label: `Girar ${s.ticker}`, detail: s.reason || "ciclo esticado — realizar e rotacionar" });
    }
    const esticados = (rot.signals || []).filter(
      (s: any) => s.action === "MANTER" && s.verdict === "ESTICADO" && !s.is_seed && (s.weeks_esticado ?? 0) >= 2
    );
    for (const s of esticados) {
      filaAcao.push({ kind: "desalavancar", label: `Observar ${s.ticker}`, detail: `esticado há ${Number(s.weeks_esticado).toFixed(0)} sem. — candidato a girar` });
    }
    const rebal = (analytics.buckets || []).filter(
      (b: any) => b.status === "rebalancear" || (b.drift != null && Math.abs(Number(b.drift)) > 5)
    );
    for (const b of rebal) {
      filaAcao.push({
        kind: "rebalancear",
        label: `Rebalancear ${BUCKET_LABEL_SHORT[b.bucket] || b.bucket}`,
        detail: `${Number(b.real ?? 0).toFixed(0)}% real vs ${b.target != null ? Number(b.target).toFixed(0) + "% alvo" : "alvo"} (${Number(b.drift) > 0 ? "+" : ""}${Number(b.drift ?? 0).toFixed(0)})`,
      });
    }
  }

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
              Perfil: <span className="text-primary font-medium">{riskProfileLabel(user?.riskProfile)}</span>
              {" "}· Simulador Buy &amp; Hold Alavancado Adaptativo
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

        {/* ── Vigília de liquidação (item nº1 da doutrina — topo) ── */}
        {analytics?.liquidation_watch && (
          <div className={cn("card mb-5 border", liqWidgetCls)}>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0",
                  liqStatus === "critico" ? "bg-danger/15" : liqStatus === "alerta" ? "bg-amber-500/15" : "bg-success/10")}>
                  <Shield size={20} className={liqStatusCls} />
                </div>
                <div>
                  <p className="text-[10px] text-text-muted uppercase tracking-wider mb-0.5">
                    Vigília de liquidação · sobrevivência
                  </p>
                  {liqStatus === "indisponivel" ? (
                    <p className="text-xs text-text-secondary max-w-md">
                      {analytics.liquidation_watch?.nota || "Informe o equity da Quantfury na aba Portfólio para calcular a distância até a liquidação."}
                    </p>
                  ) : (
                    <div className="flex items-baseline gap-2.5">
                      <span className={cn("text-2xl font-bold font-mono leading-none", liqStatusCls)}>
                        {liqAgg?.distance_pct != null ? `-${Number(liqAgg.distance_pct).toFixed(0)}%` : "—"}
                      </span>
                      <span className="text-xs text-text-muted">até liquidar · alav. {liqAgg?.leverage != null ? Number(liqAgg.leverage).toFixed(2) + "x" : "—"}</span>
                    </div>
                  )}
                </div>
              </div>
              {liqStatus !== "indisponivel" && (
                <div className="flex items-center gap-2">
                  <span className={cn("px-2.5 py-1 rounded-full text-xs font-bold",
                    liqStatus === "critico" ? "bg-danger text-white" : liqStatus === "alerta" ? "bg-amber-500 text-black" : "bg-success/15 text-success border border-success/30")}>
                    {liqStatus === "critico" ? "CRÍTICO" : liqStatus === "alerta" ? "ALERTA" : "OK"}
                  </span>
                  <Link href="/portfolio" className="text-xs text-primary hover:underline flex items-center gap-1">
                    Detalhes <ArrowRight size={11} />
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Market State ──────────────────────────────────── */}
        <MarketStateWidget riskProfile={user?.riskProfile} />

        {/* ── Cap agregado limita o próximo aporte (evita induzir over-leverage) ── */}
        {capLimita && (
          <div className="card mb-5 flex items-start gap-3 py-3 border-amber-500/25 bg-amber-500/5">
            <div className="w-9 h-9 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
              <Lock size={16} className="text-amber-400" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-text-primary">
                O cap agregado limita seu próximo aporte
                {maxLevNovo != null && <> a <span className="font-mono text-amber-400">{Number(maxLevNovo).toFixed(2)}x</span></>}
              </p>
              <p className="text-xs text-text-muted">
                O regime sugeriria {multRegime != null ? `${Number(multRegime).toFixed(1)}x` : "mais"}
                {multSugerido != null && <>, mas a alavancagem efetiva da carteira foi capada para {Number(multSugerido).toFixed(2)}x</>}
                . Aportar acima fura o teto de segurança.
                {aporteVsAgg?.nota && <span className="text-amber-400/80"> {aporteVsAgg.nota}</span>}
              </p>
            </div>
          </div>
        )}

        {/* ── Fila de ação do dia (derivada do analytics — sem inventar sinal) ── */}
        {filaAcao.length > 0 && (
          <div className="card mb-5 border-primary/20">
            <div className="flex items-center gap-2 mb-3">
              <Target size={15} className="text-primary" />
              <h2 className="text-sm font-semibold text-text-primary">Fila de ação do dia</h2>
              <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary font-bold">
                {filaAcao.length}
              </span>
            </div>
            <div className="space-y-2">
              {filaAcao.map((a, i) => {
                const cfg = a.kind === "liquidacao"
                  ? { tag: "LIQUIDAÇÃO", cls: "text-danger bg-danger/10 border-danger/30" }
                  : a.kind === "desalavancar"
                  ? { tag: "DESALAVANCAR", cls: "text-amber-400 bg-amber-500/10 border-amber-500/30" }
                  : { tag: "REBALANCEAR", cls: "text-primary bg-primary/10 border-primary/30" };
                return (
                  <div key={i} className="flex items-start gap-2.5 text-xs p-2.5 bg-surface-2 rounded-lg">
                    <span className={cn("px-1.5 py-0.5 rounded border font-semibold text-[10px] shrink-0", cfg.cls)}>{cfg.tag}</span>
                    <div className="min-w-0">
                      <span className="font-semibold text-text-primary">{a.label}</span>
                      <span className="text-text-muted"> — {a.detail}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-[10px] text-text-muted/70 mt-3 leading-tight">
              Derivada da inteligência da carteira (rotação, buckets fora do alvo, vigília de liquidação). Semente nunca entra como venda. Não é recomendação — CVM Of-Circ 04/2023.
            </p>
          </div>
        )}

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
            <p className="text-[10px] text-text-muted/70 mt-3 leading-tight">
              Sinal técnico do modelo. Não constitui recomendação de investimento. CVM Of-Circ 04/2023.
            </p>
          </div>
        )}

        {/* ── Falha ao carregar sinais (aviso discreto, não some mudo) ── */}
        {!signalLoading && signalError && (
          <div className="card mb-5 flex items-center gap-3 py-3 border-warning/20">
            <div className="w-9 h-9 rounded-full bg-warning/10 border border-warning/20 flex items-center justify-center flex-shrink-0">
              <AlertTriangle size={16} className="text-warning" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-text-primary">Oportunidades indisponíveis</p>
              <p className="text-xs text-text-muted">Não foi possível carregar oportunidades agora.</p>
            </div>
            <button
              onClick={fetchSignals}
              className="ml-auto flex items-center gap-1 text-xs text-primary hover:underline flex-shrink-0"
            >
              <RefreshCw size={11} /> Tentar de novo
            </button>
          </div>
        )}

        {/* ── Sem oportunidades mas watchlist tem dados ─────── */}
        {!signalLoading && !signalError && opportunities.length === 0 && (awaiting.length > 0 || avoid.length > 0) && (
          <div className="card mb-5 flex items-center gap-3 py-4">
            <div className="w-9 h-9 rounded-full bg-warning/10 border border-warning/20 flex items-center justify-center flex-shrink-0">
              <Bell size={16} className="text-warning" />
            </div>
            <div>
              <p className="text-sm font-semibold text-text-primary">Nenhuma oportunidade ativa</p>
              <p className="text-xs text-text-muted">
                {awaiting.length} ativo{awaiting.length !== 1 ? "s" : ""} em cenário neutro
                {avoid.length > 0 && ` · ${avoid.length} em cenário desfavorável`}
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
            {(() => {
              const equity    = metrics.total_equity ?? metrics.equity ?? 0;
              const pnl       = metrics.total_pnl ?? 0;
              const pnlPct    = metrics.total_pnl_pct ?? 0;
              const leverage  = metrics.weighted_avg_leverage ?? metrics.effective_leverage ?? 1;
              const vol       = metrics.portfolio_volatility_pct ?? null;
              const sharpe    = metrics.portfolio_sharpe ?? metrics.sharpe_ratio ?? null;
              const drawdown  = metrics.current_drawdown ?? null;
              const maxDD     = metrics.max_drawdown ?? null;
              return (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 md:gap-4 mb-4">
                    <MetricCard label="Patrimônio (Equity)" value={formatCurrency(equity, "USD", true)}
                      accent="primary" icon={<DollarSign size={16} className="text-primary" />} large
                      tooltip="Equity REAL da carteira (ativos − dívida = o que é seu de verdade). Informe o equity da Quantfury na aba Portfólio pra ficar exato; sem ele, mostra a exposição." />
                    <MetricCard label="P&L Total"
                      value={formatCurrency(pnl, "USD", true)}
                      subValue={`${pnlPct >= 0 ? "+" : ""}${pnlPct.toFixed(2)}% vs PM`}
                      accent={pnl >= 0 ? "success" : "danger"}
                      icon={pnl >= 0 ? <TrendingUp size={16} className="text-success" /> : <TrendingDown size={16} className="text-danger" />}
                      tooltip="Lucro/Prejuízo total acumulado vs preço médio" />
                    <MetricCard label="Alavancagem Média"
                      value={formatLeverage(leverage)}
                      accent={leverage > 2.5 ? "danger" : leverage > 1.5 ? "warning" : "success"}
                      icon={<TrendingUp size={16} className={getLeverageColor(leverage)} />}
                      tooltip="Alavancagem MEDIDA da carteira: exposição de risco ÷ equity (SÓ o SHY fica fora). Não se escolhe por posição (Quantfury)." />
                    <MetricCard label="Sharpe Ratio"
                      value={sharpe != null ? sharpe.toFixed(2) : "—"}
                      subValue={vol != null ? `Volatil. ${vol.toFixed(1)}%` : undefined}
                      icon={<BarChart2 size={16} className="text-primary" />}
                      tooltip="Retorno ajustado ao risco (modelo)" />
                  </div>
                  {(drawdown != null || maxDD != null) && (
                    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 md:gap-4 mb-5">
                      {drawdown != null && (
                        <MetricCard label="Drawdown Atual"
                          value={formatPercent(drawdown)}
                          subValue={maxDD != null ? `Máx. histórico: ${formatPercent(maxDD)}` : undefined}
                          accent={drawdown < -15 ? "danger" : "default"}
                          icon={<AlertTriangle size={16} className="text-warning" />}
                          tooltip="Queda desde o pico do patrimônio" />
                      )}
                    </div>
                  )}
                </>
              );
            })()}

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
                      Posições de rotação — modelo monitora o sinal técnico. Cenário DESFAVORÁVEL sugere remoção da simulação.
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
                      Posições base permanentes da simulação — modelo não sugere remoção, apenas aporte adicional em quedas.
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
