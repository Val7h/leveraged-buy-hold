"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import TickerLogo from "@/components/ui/TickerLogo";
import { watchlistApi, assetsApi } from "@/lib/api";
import type { WatchlistItem, AssetScore } from "@/types";
import { getScoreColor } from "@/lib/utils";
import {
  Bookmark, Plus, Trash2, RefreshCw, TrendingUp,
  ArrowRight, Loader2, AlertCircle,
} from "lucide-react";

const SIGNAL_COLORS: Record<string, string> = {
  green: "text-success bg-success/10 border-success/30",
  yellow: "text-warning bg-warning/10 border-warning/30",
  red: "text-danger bg-danger/10 border-danger/30",
  gray: "text-text-muted bg-surface-2 border-border",
};

export default function WatchlistPage() {
  const router = useRouter();
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [scores, setScores] = useState<Record<string, AssetScore>>({});
  const [newTicker, setNewTicker] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");

  const fetchList = async () => {
    try {
      const res = await watchlistApi.list();
      setItems(res.data);
      setLoadError("");
    } catch {
      setLoadError("Não foi possível carregar a watchlist. Verifique sua conexão.");
    }
  };

  useEffect(() => { fetchList(); }, []);

  const handleAdd = async () => {
    const t = newTicker.trim().toUpperCase();
    if (!t) return;
    setAddLoading(true);
    setError("");
    try {
      await watchlistApi.add(t);
      setNewTicker("");
      await fetchList();
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Erro ao adicionar ticker");
    } finally {
      setAddLoading(false);
    }
  };

  const handleRemove = async (id: string) => {
    await watchlistApi.remove(id);
    setScores((prev) => {
      const copy = { ...prev };
      const item = items.find((i) => i.id === id);
      if (item) delete copy[item.ticker];
      return copy;
    });
    await fetchList();
  };

  const handleAnalyze = async () => {
    if (items.length === 0) return;
    setAnalyzing(true);
    setError("");
    try {
      const tickers = items.map((i) => i.ticker).join(",");
      const res = await assetsApi.screen({ tickers, min_score: 0 });
      const map: Record<string, AssetScore> = {};
      (res.data.assets as AssetScore[]).forEach((a) => { map[a.ticker] = a; });
      setScores(map);
      if (res.data.failed_tickers?.length) {
        setError(`Análise parcial: ${res.data.failed_tickers.join(", ")} não retornou dados (Yahoo Finance pode estar com rate limit).`);
      }
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Erro ao analisar ativos");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleBought = (ticker: string, leverage: number) => {
    router.push(`/portfolio?add=${encodeURIComponent(ticker)}&leverage=${leverage.toFixed(2)}`);
  };

  return (
    <AppShell>
      <div className="p-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-text-primary flex items-center gap-2">
              <Bookmark size={18} className="text-primary" />
              Watchlist
            </h1>
            <p className="text-sm text-text-secondary mt-0.5">
              Monitore ativos, veja sinais ao vivo e mova para a carteira quando comprar
            </p>
          </div>
          {items.length > 0 && (
            <button onClick={handleAnalyze} disabled={analyzing}
              className="btn-primary flex items-center gap-2 text-sm">
              {analyzing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              {analyzing ? "Analisando..." : `Analisar ${items.length} ativo${items.length > 1 ? "s" : ""}`}
            </button>
          )}
        </div>

        {loadError && (
          <div className="bg-danger/10 border border-danger/20 rounded-xl px-4 py-3 mb-5 flex items-center gap-2 text-sm text-danger">
            <AlertCircle size={14} />
            {loadError}
          </div>
        )}

        {/* Add ticker */}
        <div className="card mb-6">
          <p className="text-xs text-text-muted mb-3 font-medium">Adicionar à watchlist</p>
          <div className="flex gap-2">
            <input
              className="input font-mono uppercase flex-1"
              placeholder="NEE, TAEE11.SA, KO..."
              value={newTicker}
              onChange={(e) => setNewTicker(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            />
            <button onClick={handleAdd} disabled={addLoading || !newTicker.trim()}
              className="btn-primary flex items-center gap-1.5 text-sm px-4">
              {addLoading ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
              Adicionar
            </button>
          </div>
          {error && (
            <p className="text-xs text-danger mt-2 flex items-center gap-1">
              <AlertCircle size={11} /> {error}
            </p>
          )}
        </div>

        {/* Watchlist */}
        {items.length === 0 ? (
          <div className="card text-center py-16">
            <Bookmark size={36} className="text-text-muted mx-auto mb-3" />
            <p className="text-sm text-text-secondary">Sua watchlist está vazia.</p>
            <p className="text-xs text-text-muted mt-1">Adicione tickers acima para monitorar sinais de entrada.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => {
              const score = scores[item.ticker];
              return (
                <div key={item.id}
                  className="card flex items-center gap-4 group hover:border-primary/30 transition-colors">
                  {/* Ticker */}
                  <div className="flex items-center gap-3 w-44 flex-shrink-0">
                    <TickerLogo ticker={item.ticker} size={36} />
                    <div>
                      <p className="font-mono font-bold text-text-primary">{item.ticker}</p>
                      {score?.company_name && (
                        <p className="text-[10px] text-text-muted truncate max-w-[96px]">{score.company_name}</p>
                      )}
                    </div>
                  </div>

                  {/* Scores — shown after analysis */}
                  {score ? (
                    <>
                      {/* Composite score */}
                      <div className="w-20 flex-shrink-0 text-center">
                        <p className="text-[10px] text-text-muted mb-0.5">Score</p>
                        <p className={`text-lg font-mono font-bold ${getScoreColor(score.composite_score)}`}>
                          {score.composite_score.toFixed(0)}
                        </p>
                      </div>

                      {/* Entry signal */}
                      <div className="flex-1 min-w-0">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold border ${SIGNAL_COLORS[score.entry_signal_color || "gray"]}`}>
                          {score.entry_signal || "—"}
                        </span>
                        {score.entry_rationale && (
                          <p className="text-[10px] text-text-muted mt-1 truncate">{score.entry_rationale}</p>
                        )}
                      </div>

                      {/* Leverage */}
                      <div className="w-24 flex-shrink-0 text-center">
                        <p className="text-[10px] text-text-muted mb-0.5">Alavancagem</p>
                        <p className="text-sm font-mono font-bold text-primary">
                          {(score.entry_leverage ?? score.recommended_leverage)?.toFixed(2) || "—"}x
                        </p>
                        {score.kelly?.kelly_half != null && (
                          <p className="text-[10px] text-text-muted">½K {score.kelly.kelly_half.toFixed(2)}x</p>
                        )}
                      </div>

                      {/* RSI semanal */}
                      <div className="w-16 flex-shrink-0 text-center">
                        <p className="text-[10px] text-text-muted mb-0.5">RSI Sem.</p>
                        <p className="text-sm font-mono text-text-primary">
                          {score.technicals?.rsi_weekly?.toFixed(1) ?? score.technicals?.rsi_14_weekly?.toFixed(1) ?? score.technicals?.rsi_14?.toFixed(1) ?? "—"}
                        </p>
                      </div>

                      {/* CTA */}
                      <button
                        onClick={() => handleBought(item.ticker, score.entry_leverage || 1)}
                        className="flex items-center gap-1.5 text-xs font-semibold text-success bg-success/10 border border-success/20 hover:bg-success/20 px-3 py-1.5 rounded-lg transition-colors flex-shrink-0"
                        title="Registrar posição na carteira simulada">
                        Adicionar à carteira
                        <ArrowRight size={11} />
                      </button>
                    </>
                  ) : (
                    <div className="flex-1 flex items-center gap-2">
                      <p className="text-xs text-text-muted italic">
                        {analyzing ? "Analisando..." : "Clique em «Analisar» para ver o sinal"}
                      </p>
                      {analyzing && <Loader2 size={11} className="animate-spin text-text-muted" />}
                      {/* Show buy button even without analysis */}
                      {!analyzing && (
                        <button
                          onClick={() => handleBought(item.ticker, 1)}
                          className="ml-auto flex items-center gap-1.5 text-xs text-text-muted hover:text-success border border-border hover:border-success/30 px-3 py-1.5 rounded-lg transition-colors"
                          title="Registrar posição na carteira simulada">
                          Adicionar à carteira <ArrowRight size={11} />
                        </button>
                      )}
                    </div>
                  )}

                  {/* Remove */}
                  <button onClick={() => handleRemove(item.id)}
                    className="text-text-muted hover:text-danger transition-colors p-1 flex-shrink-0 opacity-0 group-hover:opacity-100"
                    title="Remover da watchlist">
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })}

            {/* Flow hint */}
            {Object.keys(scores).length > 0 && (
              <div className="mt-6 p-4 bg-primary/5 border border-primary/15 rounded-xl">
                <p className="text-xs text-text-secondary leading-relaxed">
                  <span className="text-primary font-semibold">Fluxo sugerido (cenário simulado):</span>{" "}
                  Watchlist → analise o sinal técnico do modelo (OPORTUNIDADE/NEUTRO/DESFAVORÁVEL) →
                  decida por sua conta e risco se executa a operação no seu broker →
                  registre a posição clicando em <span className="text-success font-semibold">Adicionar à carteira →</span> →
                  classifique como <span className="text-warning font-semibold">🔒 Semente</span> (posição permanente)
                  ou <span className="text-primary font-semibold">🔄 Ciclo</span> (rotação).
                </p>
                <p className="text-[10px] text-text-muted/70 mt-2 italic">
                  ⚠️ Sinais técnicos NÃO são recomendações de compra/venda. Sistema informativo. CVM Of-Circ 04/2023.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
