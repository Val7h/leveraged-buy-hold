"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import { usePortfolioStore } from "@/store/portfolioStore";
import { portfolioApi, assetsApi } from "@/lib/api";
import { formatCurrency, formatPercent, formatLeverage, getLeverageColor, getPnlColor } from "@/lib/utils";
import TickerLogo from "@/components/ui/TickerLogo";
import { Plus, Trash2, TrendingUp, Lightbulb, Pencil, Check, X, Loader2, Lock, Unlock, RefreshCw } from "lucide-react";
import type { ContributionSuggestion } from "@/types";

export default function PortfolioPage() {
  const searchParams = useSearchParams();
  const { activePortfolioId, portfolios, metrics, positions, fetchPortfolios, fetchMetrics, fetchPositions, addPosition, updatePosition, removePosition, toggleSeed, toggleCycle } = usePortfolioStore();
  const [suggestions, setSuggestions] = useState<ContributionSuggestion[]>([]);
  const [capital, setCapital] = useState(1000);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newPos, setNewPos] = useState({ ticker: "", shares: "", avg_price: "", leverage: "1" });
  const [fetchingPrice, setFetchingPrice] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ shares: "", avg_price: "", leverage: "1" });

  useEffect(() => {
    fetchPortfolios();
  }, []);

  useEffect(() => {
    if (activePortfolioId) {
      fetchMetrics(activePortfolioId);
      fetchPositions(activePortfolioId);
    }
  }, [activePortfolioId]);

  // Pre-fill from watchlist "Comprei → Portfólio" button
  useEffect(() => {
    const ticker = searchParams.get("add");
    const leverage = searchParams.get("leverage");
    if (ticker) {
      setNewPos((prev) => ({ ...prev, ticker: ticker.toUpperCase(), leverage: leverage || "1" }));
      setShowAddForm(true);
    }
  }, [searchParams]);

  const handleAddPosition = async () => {
    if (!activePortfolioId || !newPos.ticker || !newPos.shares || !newPos.avg_price) return;
    await addPosition(activePortfolioId, {
      ticker: newPos.ticker.toUpperCase(),
      shares: parseFloat(newPos.shares),
      avg_price: parseFloat(newPos.avg_price),
      leverage: parseFloat(newPos.leverage),
    });
    setNewPos({ ticker: "", shares: "", avg_price: "", leverage: "1" });
    setShowAddForm(false);
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
    setEditingId(pos.id);
    setEditForm({ shares: String(pos.shares), avg_price: String(pos.avg_price), leverage: String(pos.leverage) });
  };

  const handleSaveEdit = async (pos: any) => {
    if (!activePortfolioId || !pos.id) return;
    await updatePosition(activePortfolioId, pos.id, {
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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
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
                <label className="label">Alavancagem</label>
                <select className="input" value={newPos.leverage} onChange={(e) => setNewPos({ ...newPos, leverage: e.target.value })}>
                  {["1.0", "1.25", "1.5", "1.75", "2.0", "2.5", "3.0"].map((v) => (
                    <option key={v} value={v}>{v}x</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={handleAddPosition} className="btn-primary text-sm">Adicionar</button>
              <button onClick={() => setShowAddForm(false)} className="btn-ghost text-sm">Cancelar</button>
            </div>
          </div>
        )}

        {/* Metrics summary */}
        {metrics && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {[
              { label: "Patrimônio", value: formatCurrency(metrics.equity, "USD", true) },
              { label: "Alavancagem Efetiva", value: formatLeverage(metrics.effective_leverage), color: getLeverageColor(metrics.effective_leverage) },
              { label: "Dividend Yield", value: `${metrics.dividend_yield.toFixed(2)}%` },
              { label: "VaR 95%", value: `-${metrics.var_95.toFixed(1)}%`, color: "text-danger" },
            ].map((m) => (
              <div key={m.label} className="card-sm">
                <p className="text-xs text-text-muted mb-1">{m.label}</p>
                <p className={`text-base font-mono font-semibold ${m.color || "text-text-primary"}`}>{m.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Positions table */}
        {positions.length > 0 ? (
          <div className="card mb-6">
            <h2 className="text-sm font-semibold text-text-primary mb-4">Posições</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    {["Ativo", "Preço Atual", "Valor (Equity)", "Alavancagem", "Exposição (Notional)", "P&L", "P&L %", "Peso / Qtd", "PM", ""].map((h) => (
                      <th key={h} className="text-left text-text-muted font-medium py-2 pr-3 last:pr-0">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {positions.map((pos) => {
                    const isEditing = editingId === pos.id;
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
                                    <Lock size={8} /> Semente
                                  </span>
                                )}
                                {pos.is_cycle && (
                                  <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold uppercase tracking-wide text-primary bg-primary/10 border border-primary/20 rounded px-1 py-0.5">
                                    <RefreshCw size={8} /> Ciclo
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

                        {/* PM — editável */}
                        <td className="py-2.5 pr-3">
                          {isEditing ? (
                            <input className="input text-xs py-0.5 px-1 w-24 font-mono" type="number" min="0" step="0.01"
                              value={editForm.avg_price} onChange={(e) => setEditForm({ ...editForm, avg_price: e.target.value })} />
                          ) : null}
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
