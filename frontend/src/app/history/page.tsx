"use client";
import { useEffect, useState } from "react";
import AppShell from "@/components/layout/AppShell";
import TickerLogo from "@/components/ui/TickerLogo";
import { portfolioApi } from "@/lib/api";
import { usePortfolioStore } from "@/store/portfolioStore";
import type { TradeHistoryItem } from "@/types";
import { History, RefreshCw, TrendingUp, TrendingDown, SlidersHorizontal, Lock, RefreshCcw } from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";

const ACTION_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  COMPRA:   { label: "Compra",   color: "text-success", bg: "bg-success/10 border-success/20",  icon: <TrendingUp size={11} /> },
  VENDA:    { label: "Venda",    color: "text-danger",  bg: "bg-danger/10 border-danger/20",    icon: <TrendingDown size={11} /> },
  AJUSTE:   { label: "Ajuste",   color: "text-primary", bg: "bg-primary/10 border-primary/20",  icon: <SlidersHorizontal size={11} /> },
  SEMENTE:  { label: "Semente",  color: "text-warning", bg: "bg-warning/10 border-warning/20",  icon: <Lock size={11} /> },
  CICLO:    { label: "Ciclo",    color: "text-primary", bg: "bg-primary/10 border-primary/20",  icon: <RefreshCcw size={11} /> },
};

function ActionBadge({ action }: { action: string }) {
  const cfg = ACTION_CONFIG[action] ?? { label: action, color: "text-text-muted", bg: "bg-surface-2 border-border", icon: null };
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wide", cfg.bg, cfg.color)}>
      {cfg.icon}{cfg.label}
    </span>
  );
}

function formatDate(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" })
      + " " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  } catch { return iso; }
}

export default function HistoryPage() {
  const { portfolios, activePortfolioId, fetchPortfolios } = usePortfolioStore();
  const [history, setHistory] = useState<TradeHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<string>("TODOS");

  useEffect(() => { fetchPortfolios(); }, []);

  useEffect(() => {
    if (activePortfolioId) loadHistory(activePortfolioId);
  }, [activePortfolioId]);

  const loadHistory = async (portfolioId: number) => {
    setLoading(true);
    setError("");
    try {
      const res = await portfolioApi.getHistory(portfolioId);
      setHistory(res.data);
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Erro ao carregar histórico");
    } finally {
      setLoading(false);
    }
  };

  const filtered = filter === "TODOS" ? history : history.filter(h => h.action === filter);

  // Summary stats
  const totalCompras = history.filter(h => h.action === "COMPRA").reduce((s, h) => s + h.total_value, 0);
  const totalVendas  = history.filter(h => h.action === "VENDA").reduce((s, h) => s + h.total_value, 0);
  const uniqueTickers = new Set(history.map(h => h.ticker)).size;

  return (
    <AppShell>
      <div className="p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-text-primary flex items-center gap-2">
              <History size={18} className="text-primary" />
              Histórico de Operações
            </h1>
            <p className="text-sm text-text-secondary mt-0.5">
              Registro completo de compras, vendas e ajustes da carteira
            </p>
          </div>
          {activePortfolioId && (
            <button onClick={() => loadHistory(activePortfolioId)} disabled={loading}
              className="btn-primary flex items-center gap-2 text-sm">
              {loading ? <RefreshCw size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              Atualizar
            </button>
          )}
        </div>

        {/* Summary cards */}
        {history.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4 mb-5">
            {[
              { label: "Total de Operações", value: history.length.toString(), color: "text-text-primary" },
              { label: "Ativos Operados",    value: uniqueTickers.toString(),  color: "text-primary" },
              { label: "Volume Comprado",    value: formatCurrency(totalCompras, "USD", true), color: "text-success" },
              { label: "Volume Vendido",     value: formatCurrency(totalVendas, "USD", true),  color: "text-danger" },
            ].map(s => (
              <div key={s.label} className="card-sm">
                <p className="text-xs text-text-muted mb-1">{s.label}</p>
                <p className={`text-base font-mono font-semibold ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Filter tabs */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {["TODOS", "COMPRA", "VENDA", "AJUSTE", "SEMENTE", "CICLO"].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={cn("text-xs px-3 py-1.5 rounded-full border transition-colors",
                filter === f
                  ? "bg-primary/15 border-primary/40 text-primary font-semibold"
                  : "border-border text-text-secondary hover:border-primary/30 hover:text-primary"
              )}>
              {f === "TODOS" ? "Todos" : f.charAt(0) + f.slice(1).toLowerCase()}
              {f !== "TODOS" && (
                <span className="ml-1.5 text-[10px] text-text-muted">
                  ({history.filter(h => h.action === f).length})
                </span>
              )}
            </button>
          ))}
        </div>

        {error && (
          <div className="bg-danger/10 border border-danger/20 rounded-lg px-4 py-3 text-sm text-danger mb-4">{error}</div>
        )}

        {/* No portfolio selected */}
        {!activePortfolioId && !loading && (
          <div className="card text-center py-16">
            <History size={36} className="text-text-muted mx-auto mb-3" />
            <p className="text-sm text-text-secondary">Selecione uma carteira na barra lateral para ver o histórico.</p>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="card text-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mb-4" />
            <p className="text-sm text-text-secondary">Carregando histórico...</p>
          </div>
        )}

        {/* Empty state */}
        {!loading && activePortfolioId && history.length === 0 && (
          <div className="card text-center py-16">
            <History size={36} className="text-text-muted mx-auto mb-3" />
            <p className="text-sm text-text-secondary">Nenhuma operação registrada ainda.</p>
            <p className="text-xs text-text-muted mt-1">As operações são registradas automaticamente ao adicionar ou remover posições.</p>
          </div>
        )}

        {/* Table */}
        {!loading && filtered.length > 0 && (
          <div className="card overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface-2">
                    <th className="text-left px-4 py-3 text-xs text-text-muted font-medium">Data</th>
                    <th className="text-left px-4 py-3 text-xs text-text-muted font-medium">Ativo</th>
                    <th className="text-left px-4 py-3 text-xs text-text-muted font-medium">Ação</th>
                    <th className="text-right px-4 py-3 text-xs text-text-muted font-medium">Cotas</th>
                    <th className="text-right px-4 py-3 text-xs text-text-muted font-medium">Preço Médio</th>
                    <th className="text-right px-4 py-3 text-xs text-text-muted font-medium">Valor Total</th>
                    <th className="text-right px-4 py-3 text-xs text-text-muted font-medium">Alavancagem</th>
                    <th className="text-left px-4 py-3 text-xs text-text-muted font-medium">Notas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((item) => (
                    <tr key={item.id} className="hover:bg-surface-2/50 transition-colors">
                      <td className="px-4 py-3 text-xs text-text-muted font-mono whitespace-nowrap">
                        {formatDate(item.executed_at)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <TickerLogo ticker={item.ticker} size={24} />
                          <span className="font-mono font-semibold text-text-primary text-xs">
                            {item.ticker}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <ActionBadge action={item.action} />
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs text-text-primary">
                        {item.shares > 0 ? item.shares.toFixed(4) : "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs text-text-primary">
                        {item.price > 0 ? formatCurrency(item.price) : "—"}
                      </td>
                      <td className={`px-4 py-3 text-right font-mono text-xs font-semibold ${
                        item.action === "VENDA" ? "text-danger" : item.total_value > 0 ? "text-success" : "text-text-muted"
                      }`}>
                        {item.total_value > 0
                          ? (item.action === "VENDA" ? "-" : "+") + formatCurrency(item.total_value)
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs text-warning">
                        {item.leverage > 0 ? `${item.leverage.toFixed(2)}x` : "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-text-muted max-w-[180px] truncate">
                        {item.notes || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-2 border-t border-border bg-surface-2/50">
              <p className="text-xs text-text-muted">
                {filtered.length} operaç{filtered.length === 1 ? "ão" : "ões"}
                {filter !== "TODOS" ? ` de ${filter.toLowerCase()}` : ""} exibidas
              </p>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
