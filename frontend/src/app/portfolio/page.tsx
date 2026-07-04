"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import SectorBreakdownWidget from "@/components/portfolio/SectorBreakdownWidget";
import PortfolioIntelligence from "@/components/portfolio/PortfolioIntelligence";
import { usePortfolioStore } from "@/store/portfolioStore";
import { portfolioApi, assetsApi } from "@/lib/api";
import { formatCurrency, formatPercent, formatLeverage, getLeverageColor, getPnlColor } from "@/lib/utils";
import TickerLogo from "@/components/ui/TickerLogo";
import PortfolioEquityCurve from "@/components/charts/PortfolioEquityCurve";
import { Plus, Trash2, TrendingUp, Lightbulb, Pencil, Check, X, Loader2, Lock, Unlock, RefreshCw } from "lucide-react";
import type { ContributionSuggestion } from "@/types";

// ─── helpers ────────────────────────────────────────────────────────────────

/** Returns liquidation slack% for a ticker from analytics.liquidation_watch */
function getLiqSlack(analytics: any, ticker: string): number | null {
  const pos = (analytics?.liquidation_watch?.por_posicao ?? []) as any[];
  const found = pos.find((p: any) => p.ticker === ticker);
  if (found?.distance_pct != null) return Number(found.distance_pct);
  // fallback: aggregate distance if no per-position data
  const agg = analytics?.liquidation_watch?.aggregate;
  if (agg?.distance_pct != null) return Number(agg.distance_pct);
  return null;
}

function LiqSemaphore({ slack }: { slack: number | null }) {
  if (slack === null) return <span className="text-text-muted text-[10px]">—</span>;
  const isGreen = slack > 40;
  const isYellow = slack >= 15 && slack <= 40;
  // red + pulse when < 15%
  const dot = isGreen
    ? "bg-success"
    : isYellow
    ? "bg-amber-400"
    : "bg-danger animate-pulse";
  const textCls = isGreen ? "text-success" : isYellow ? "text-amber-400" : "text-danger";
  return (
    <div className="flex items-center gap-1" title={`Folga até liquidação: -${slack.toFixed(0)}%`}>
      <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${dot}`} />
      <span className={`font-mono text-[10px] ${textCls}`}>-{slack.toFixed(0)}%</span>
    </div>
  );
}

/** Weighted average leverage by notional — computed client-side as fallback */
function calcEffectiveLeverage(positions: any[]): number | null {
  const totalNotional = positions.reduce((s, p) => s + (p.notional_value ?? 0), 0);
  if (!totalNotional) return null;
  const weighted = positions.reduce((s, p) => s + (p.notional_value ?? 0) * (p.leverage ?? 1), 0);
  return weighted / totalNotional;
}

function PortfolioPageInner() {
  const searchParams = useSearchParams();
  const { activePortfolioId, portfolios, metrics, positions, analytics, analyticsLoading, analyticsError, fetchPortfolios, fetchMetrics, fetchPositions, fetchAnalytics, addPosition, updatePosition, removePosition, toggleSeed, toggleCycle } = usePortfolioStore();
  const [suggestions, setSuggestions] = useState<ContributionSuggestion[]>([]);
  const [capital, setCapital] = useState(1000);
  const [equityCurve, setEquityCurve] = useState<any>(null);
  const [curveLoading, setCurveLoading] = useState(false);
  const [curveError, setCurveError] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newPos, setNewPos] = useState({ ticker: "", shares: "", avg_price: "", opened_at: "" });
  const [equityInput, setEquityInput] = useState("");
  const [savingEquity, setSavingEquity] = useState(false);
  const [fetchingPrice, setFetchingPrice] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ shares: "", avg_price: "", leverage: "1" });

  useEffect(() => {
    fetchPortfolios();
  }, []);

  useEffect(() => {
    if (activePortfolioId) {
      fetchMetrics(activePortfolioId);
      fetchPositions(activePortfolioId);
      fetchAnalytics(activePortfolioId);
      // Load equity curve
      setCurveLoading(true);
      setCurveError(false);
      portfolioApi.getEquityCurve(activePortfolioId)
        .then((res) => {
          // New endpoint returns { equity_curve: [], summary: {} }
          // PortfolioEquityCurve expects { curve: [], ... } — adapt here
          const d = res.data;
          setEquityCurve({
            curve: d.equity_curve ?? d.curve ?? [],
            total_invested: d.initial_capital ?? d.total_invested ?? 0,
            pnl_pct: d.summary?.total_return_pct ?? d.pnl_pct ?? 0,
            max_drawdown: Math.abs(d.summary?.max_drawdown_pct ?? d.max_drawdown ?? 0),
          });
        })
        .catch(() => setCurveError(true))
        .finally(() => setCurveLoading(false));
    }
  }, [activePortfolioId]);

  // Pre-fill from watchlist / dashboard "Simular → Portfólio" button
  useEffect(() => {
    const ticker = searchParams.get("add");
    if (ticker) {
      setNewPos((prev) => ({ ...prev, ticker: ticker.toUpperCase() }));
      setShowAddForm(true);
    }
  }, [searchParams]);

  const handleAddPosition = async () => {
    if (!activePortfolioId || !newPos.ticker || !newPos.shares || !newPos.avg_price) return;
    await addPosition(activePortfolioId, {
      ticker: newPos.ticker.toUpperCase(),
      shares: parseFloat(newPos.shares),
      avg_price: parseFloat(newPos.avg_price),
      opened_at: newPos.opened_at || undefined,
    });
    setNewPos({ ticker: "", shares: "", avg_price: "", opened_at: "" });
    setShowAddForm(false);
  };

  const handleSaveEquity = async () => {
    if (!activePortfolioId || !equityInput) return;
    setSavingEquity(true);
    try {
      await portfolioApi.setEquity(activePortfolioId, parseFloat(equityInput));
      await fetchAnalytics(activePortfolioId);
    } finally {
      setSavingEquity(false);
    }
  };

  const handleTickerBlur = async () => {
    const ticker = newPos.ticker.trim().toUpperCase();
    if (!ticker || newPos.avg_price) return;
    setFetchingPrice(true);
    try {
      const res = await assetsApi.getPrice(ticker);
      setNewPos((prev) => ({ ...prev, avg_price: String(res.data.price) }));
    } catch {
      // silently ignore — user can type manually
    } finally {
      setFetchingPrice(false);
    }
  };

  const handleStartEdit = (pos: any) => {
    setEditingId(String(pos.id));
    setEditForm({ shares: String(pos.shares ?? pos.quantity), avg_price: String(pos.avg_price ?? pos.avgPrice), leverage: String(pos.leverage) });
  };

  const handleSaveEdit = async (pos: any) => {
    if (!activePortfolioId || !pos.id) return;
    await updatePosition(activePortfolioId, String(pos.id), {
      ticker: pos.ticker,
      shares: parseFloat(editForm.shares),
      avg_price: parseFloat(editForm.avg_price),
      leverage: parseFloat(editForm.leverage),
    });
    setEditingId(null);
  };

  const handleSuggestions = async () => {
    if (!activePortfolioId) return;
    const res = await portfolioApi.getSuggestions(activePortfolioId, capital);
    setSuggestions(res.data);
  };

  return (
    <AppShell>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-text-primary">Carteira</h1>
            <p className="text-sm text-text-secondary mt-0.5">Gestão de posições e sugestões de aporte</p>
          </div>
          <button onClick={() => setShowAddForm(!showAddForm)} className="btn-primary flex items-center gap-2 text-sm">
            <Plus size={14} />
            Adicionar Posição
          </button>
        </div>

        {/* Add position form */}
        {showAddForm && (
          <div className="card mb-6 border-primary/20">
            <h3 className="text-sm font-semibold text-text-primary mb-4">Nova Posição</h3>
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4 mb-4">
              <div>
                <label className="label">Ticker</label>
                <input
                  className="input font-mono uppercase"
                  placeholder="NEE"
                  value={newPos.ticker}
                  onChange={(e) => setNewPos({ ...newPos, ticker: e.target.value, avg_price: "" })}
                  onBlur={handleTickerBlur}
                />
              </div>
              <div>
                <label className="label">Quantidade</label>
                <input className="input font-mono" type="number" min="0" placeholder="10" value={newPos.shares} onChange={(e) => setNewPos({ ...newPos, shares: e.target.value })} />
              </div>
              <div>
                <label className="label flex items-center gap-1.5">
                  Preço Médio (USD)
                  {fetchingPrice && <Loader2 size={11} className="animate-spin text-primary" />}
                </label>
                <input
                  className="input font-mono"
                  type="number" min="0" step="0.01"
                  placeholder={fetchingPrice ? "Buscando..." : "45.00"}
                  value={newPos.avg_price}
                  onChange={(e) => setNewPos({ ...newPos, avg_price: e.target.value })}
                  readOnly={fetchingPrice}
                />
              </div>
              <div>
                <label className="label">Data de abertura</label>
                <input
                  className="input font-mono"
                  type="date"
                  value={newPos.opened_at}
                  onChange={(e) => setNewPos({ ...newPos, opened_at: e.target.value })}
                />
                <p className="text-[10px] text-text-muted mt-1">Alavancagem é calculada pela carteira (Quantfury) — não se escolhe por ativo.</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={handleAddPosition} className="btn-primary text-sm">Adicionar</button>
              <button onClick={() => setShowAddForm(false)} className="btn-ghost text-sm">Cancelar</button>
            </div>
          </div>
        )}

        {/* Equity atual (Quantfury) — denominador da alavancagem */}
        <div className="card mb-4 flex flex-wrap items-end gap-3">
          <div>
            <label className="label">Equity atual (Quantfury)</label>
            <input
              className="input font-mono w-44"
              type="number"
              min="0"
              placeholder={analytics?.totals?.equity ? String(analytics.totals.equity) : "ex: 25000"}
              value={equityInput}
              onChange={(e) => setEquityInput(e.target.value)}
            />
          </div>
          <button onClick={handleSaveEquity} disabled={savingEquity || !equityInput} className="btn-primary text-sm">
            {savingEquity ? "Salvando…" : "Salvar equity"}
          </button>
          {analytics?.totals?.equity != null && (
            <div className="text-xs text-text-muted ml-auto">
              Atual: <span className="font-mono text-text-primary">{formatCurrency(analytics.totals.equity, "USD", true)}</span>
              {analytics?.totals?.effective_leverage != null && (
                <> · Alav. de risco: <span className="font-mono text-warning">{analytics.totals.effective_leverage}x</span></>
              )}
            </div>
          )}
        </div>

        {/* Metrics summary */}
        {metrics && (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4 mb-6">
            {[
              {
                label: "Patrimônio",
                // Supports both old (equity) and new (total_equity) field names
                value: formatCurrency((metrics as any).total_equity ?? (metrics as any).equity ?? 0, "USD", true),
              },
              {
                label: "Alav. de risco",
                value: analytics?.totals?.effective_leverage != null
                  ? formatLeverage(analytics.totals.effective_leverage)
                  : "—",
                color: analytics?.totals?.effective_leverage != null
                  ? getLeverageColor(analytics.totals.effective_leverage) : undefined,
              },
              {
                label: "P&L Total",
                value: formatCurrency((metrics as any).total_pnl ?? 0, "USD", true),
                color: ((metrics as any).total_pnl ?? 0) >= 0 ? "text-success" : "text-danger",
              },
              {
                label: "P&L %",
                value: `${((metrics as any).total_pnl_pct ?? 0) >= 0 ? "+" : ""}${((metrics as any).total_pnl_pct ?? 0).toFixed(2)}%`,
                color: ((metrics as any).total_pnl_pct ?? 0) >= 0 ? "text-success" : "text-danger",
              },
              {
                label: "CAGR (ativos)",
                value: analytics?.totals?.cagr != null ? `${analytics.totals.cagr.toFixed(1)}%` : "—",
              },
              {
                label: "DY ponderado",
                value: analytics?.totals?.dividend_yield != null ? `${analytics.totals.dividend_yield.toFixed(2)}%` : "—",
              },
              {
                label: "Beta carteira",
                value: analytics?.totals?.beta != null ? analytics.totals.beta.toFixed(2) : "—",
              },
            ].map((m) => (
              <div key={m.label} className="card-sm">
                <p className="text-xs text-text-muted mb-1">{m.label}</p>
                <p className={`text-base font-mono font-semibold ${m.color || "text-text-primary"}`}>{m.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Equity Curve */}
        {(equityCurve || curveLoading || curveError) && (
          <div className="mb-6">
            {curveError && !curveLoading ? (
              <div className="card flex items-center justify-center h-32 text-sm text-text-muted">
                Curva de patrimônio indisponível no momento
              </div>
            ) : (
              <PortfolioEquityCurve
                curve={equityCurve?.curve ?? []}
                totalInvested={equityCurve?.total_invested ?? 0}
                pnlPct={equityCurve?.pnl_pct ?? 0}
                maxDrawdown={equityCurve?.max_drawdown ?? 0}
                loading={curveLoading}
              />
            )}
          </div>
        )}

        {/* Sector Breakdown */}
        {positions.length > 0 && (
          <SectorBreakdownWidget positions={positions} />
        )}

        {/* Inteligência da carteira: ROTAÇÃO, estrutura alvo×real, risco, correlação.
            Não some em silêncio quando o analytics falha/carrega — mostra estado + retry,
            senão o usuário acha que a rotação "sumiu". */}
        {positions.length > 0 && (
          <div className="mb-6">
            {analytics ? (
              <PortfolioIntelligence analytics={analytics} />
            ) : analyticsLoading ? (
              <div className="bg-surface rounded-xl border border-border p-6 flex items-center justify-center gap-2 text-sm text-text-secondary">
                <RefreshCw size={16} className="animate-spin" />
                Carregando inteligência da carteira (rotação, risco)…
              </div>
            ) : analyticsError ? (
              <div className="bg-surface rounded-xl border border-warning/40 p-6 text-center">
                <p className="text-sm text-text-secondary mb-2">{analyticsError}</p>
                <button onClick={() => activePortfolioId && fetchAnalytics(activePortfolioId)}
                  className="btn-ghost text-sm inline-flex items-center gap-2">
                  <RefreshCw size={14} /> Tentar de novo
                </button>
              </div>
            ) : null}
          </div>
        )}

        {/* Positions table */}
        {positions.length > 0 ? (
          <div className="card mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-text-primary">Posições</h2>
              {/* Effective portfolio leverage — weighted average by notional */}
              {(() => {
                const levAnalytics = analytics?.leverage_agregado?.effective_leverage ?? analytics?.totals?.effective_leverage;
                const levCalc = levAnalytics ?? calcEffectiveLeverage(positions);
                if (levCalc == null) return null;
                return (
                  <div className="flex items-center gap-1.5 text-xs text-text-muted">
                    <span>Alav. efetiva carteira:</span>
                    <span className={`font-mono font-bold ${getLeverageColor(levCalc)}`}>{levCalc.toFixed(2)}x</span>
                    <span className="text-[10px] text-text-muted">(média ponderada por notional)</span>
                  </div>
                );
              })()}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    {["Ativo", "Preço Atual", "Valor (Equity)", "Alavancagem", "Exposição (Notional)", "P&L", "P&L %", "Peso / Qtd", "PM / Stops", "Liq.", ""].map((h) => (
                      <th key={h} className="text-left text-text-muted font-medium py-2 pr-3 last:pr-0">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {positions.map((pos) => {
                    const isEditing = editingId === String(pos.id);
                    // Liquidation semaphore
                    const liqSlack = getLiqSlack(analytics, pos.ticker);
                    // Stop levels from PM (only for Ciclo, never Semente)
                    const pm = pos.avg_price ?? 0;
                    const showStops = pos.is_cycle && !pos.is_seed && pm > 0;
                    const stop10 = pm * 0.90;
                    const stop20 = pm * 0.80;
                    const stop30 = pm * 0.70;
                    const curPrice = pos.current_price ?? 0;
                    // which stop level is breached
                    const stopBreached = curPrice > 0 && curPrice <= stop30 ? 3
                      : curPrice > 0 && curPrice <= stop20 ? 2
                      : curPrice > 0 && curPrice <= stop10 ? 1
                      : 0;
                    return (
                      <tr key={pos.ticker} className="border-b border-border/40 hover:bg-surface-2/40 transition-colors">
                        <td className="py-2.5 pr-3">
                          <div className="flex items-center gap-2">
                            <TickerLogo ticker={pos.ticker} size={26} />
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono font-bold text-text-primary">{pos.ticker}</span>
                                {pos.is_seed && (
                                  <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold uppercase tracking-wide text-warning bg-warning/10 border border-warning/20 rounded px-1 py-0.5">
                                    🔒 Semente
                                  </span>
                                )}
                                {pos.is_cycle && (
                                  <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold uppercase tracking-wide text-primary bg-primary/10 border border-primary/20 rounded px-1 py-0.5">
                                    🔄 Ciclo
                                  </span>
                                )}
                              </div>
                              {!isEditing && (
                                <span className="block text-[10px] text-text-muted font-mono">
                                  {pos.shares?.toFixed(2)} cotas · PM {formatCurrency(pos.avg_price)}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 pr-3 font-mono text-text-primary">{formatCurrency(pos.current_price || 0)}</td>
                        <td className="py-2.5 pr-3 font-mono font-semibold text-text-primary">{formatCurrency(pos.current_value || 0, "USD", true)}</td>

                        {/* Alavancagem — editável */}
                        <td className="py-2.5 pr-3">
                          {isEditing ? (
                            <select className="input text-xs py-0.5 px-1 w-20" value={editForm.leverage}
                              onChange={(e) => setEditForm({ ...editForm, leverage: e.target.value })}>
                              {["1.0","1.25","1.5","1.75","2.0","2.5","3.0"].map((v) => (
                                <option key={v} value={v}>{v}x</option>
                              ))}
                            </select>
                          ) : (
                            <span className={`font-mono font-semibold ${getLeverageColor(pos.leverage)}`}>{formatLeverage(pos.leverage)}</span>
                          )}
                        </td>

                        <td className="py-2.5 pr-3 font-mono font-semibold text-primary">{formatCurrency(pos.notional_value || 0, "USD", true)}</td>
                        <td className={`py-2.5 pr-3 font-mono font-semibold ${getPnlColor(pos.pnl || 0)}`}>{formatCurrency(pos.pnl || 0, "USD", true)}</td>
                        <td className={`py-2.5 pr-3 font-mono font-semibold ${getPnlColor(pos.pnl_pct || 0)}`}>{formatPercent(pos.pnl_pct || 0)}</td>

                        {/* Qtd — editável */}
                        <td className="py-2.5 pr-3">
                          {isEditing ? (
                            <input className="input text-xs py-0.5 px-1 w-20 font-mono" type="number" min="0" step="0.01"
                              value={editForm.shares} onChange={(e) => setEditForm({ ...editForm, shares: e.target.value })} />
                          ) : (
                            <span className="font-mono text-text-secondary">{pos.weight?.toFixed(1)}%</span>
                          )}
                        </td>

                        {/* PM + Stops (Ciclo only) — editável */}
                        <td className="py-2.5 pr-3 min-w-[110px]">
                          {isEditing ? (
                            <input className="input text-xs py-0.5 px-1 w-24 font-mono" type="number" min="0" step="0.01"
                              value={editForm.avg_price} onChange={(e) => setEditForm({ ...editForm, avg_price: e.target.value })} />
                          ) : showStops ? (
                            <div className="space-y-0.5">
                              <div className={`font-mono text-[10px] ${stopBreached >= 1 ? "text-danger font-bold" : "text-text-muted"}`}
                                title="-10% do PM: stop escada nível 1">
                                -10% {formatCurrency(stop10)}
                              </div>
                              <div className={`font-mono text-[10px] ${stopBreached >= 2 ? "text-danger font-bold" : "text-text-muted"}`}
                                title="-20% do PM: stop escada nível 2">
                                -20% {formatCurrency(stop20)}
                              </div>
                              <div className={`font-mono text-[10px] ${stopBreached >= 3 ? "text-danger font-bold animate-pulse" : "text-text-muted"}`}
                                title="-30% do PM: stop escada nível 3">
                                -30% {formatCurrency(stop30)}
                              </div>
                            </div>
                          ) : null}
                        </td>

                        {/* Liquidation semaphore */}
                        <td className="py-2.5 pr-3">
                          <LiqSemaphore slack={liqSlack} />
                        </td>

                        <td className="py-2.5">
                          <div className="flex items-center gap-1">
                            {isEditing ? (
                              <>
                                <button onClick={() => handleSaveEdit(pos)} className="text-success hover:text-success/80 p-1" title="Salvar">
                                  <Check size={13} />
                                </button>
                                <button onClick={() => setEditingId(null)} className="text-text-muted hover:text-text-primary p-1" title="Cancelar">
                                  <X size={13} />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => activePortfolioId && pos.id && toggleSeed(activePortfolioId, pos.id)}
                                  className={`p-1 transition-colors ${pos.is_seed ? "text-warning hover:text-warning/70" : "text-text-muted hover:text-warning"}`}
                                  title={pos.is_seed ? "Semente permanente (clique para remover)" : "Marcar como semente permanente"}
                                >
                                  {pos.is_seed ? <Lock size={12} /> : <Unlock size={12} />}
                                </button>
                                <button
                                  onClick={() => activePortfolioId && pos.id && toggleCycle(activePortfolioId, pos.id)}
                                  className={`p-1 transition-colors ${pos.is_cycle ? "text-primary hover:text-primary/70" : "text-text-muted hover:text-primary"}`}
                                  title={pos.is_cycle ? "Posição de ciclo (clique para remover)" : "Marcar como ciclo (rotação)"}
                                >
                                  <RefreshCw size={12} />
                                </button>
                                <button onClick={() => handleStartEdit(pos)} className="text-text-muted hover:text-primary transition-colors p-1" title="Editar">
                                  <Pencil size={12} />
                                </button>
                                <button onClick={() => activePortfolioId && pos.id && removePosition(activePortfolioId, pos.id)}
                                  className="text-text-muted hover:text-danger transition-colors p-1" title="Remover">
                                  <Trash2 size={13} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="card text-center py-12 mb-6">
            <TrendingUp size={36} className="text-text-muted mx-auto mb-3" />
            <p className="text-sm text-text-secondary">Nenhuma posição. Adicione ativos para começar.</p>
          </div>
        )}

        {/* Contribution suggestions */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-text-primary flex items-center gap-2">
              <Lightbulb size={15} className="text-warning" />
              Sugestões de Aporte
            </h2>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <label className="text-xs text-text-muted">Capital disponível:</label>
                <input type="number" className="input w-28 text-xs font-mono" value={capital} onChange={(e) => setCapital(Number(e.target.value))} min={100} step={100} />
              </div>
              <button onClick={handleSuggestions} className="btn-primary text-xs py-1.5">Analisar</button>
            </div>
          </div>

          {suggestions.length > 0 ? (
            <div className="space-y-3">
              {suggestions.map((s) => (
                <div key={s.ticker} className="bg-surface-2 rounded-lg p-3 flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-mono font-bold text-text-primary text-sm">{s.ticker}</span>
                      <span className="text-xs text-text-muted">{s.company_name}</span>
                    </div>
                    <p className="text-xs text-text-secondary">{s.rationale}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-semibold font-mono text-success">{formatCurrency(s.suggested_amount)}</p>
                    <p className="text-xs text-text-muted">Alavancagem: <span className="text-warning">{s.suggested_leverage.toFixed(2)}x</span></p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-text-muted text-center py-4">Clique em &quot;Analisar&quot; para ver sugestões de alocação</p>
          )}
        </div>
      </div>
    </AppShell>
  );
}

export default function PortfolioPage() {
  return (
    <Suspense fallback={null}>
      <PortfolioPageInner />
    </Suspense>
  );
}
