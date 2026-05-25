"use client";
import { useState } from "react";
import AppShell from "@/components/layout/AppShell";
import AssetCard from "@/components/assets/AssetCard";
import MarketStateWidget from "@/components/assets/MarketStateWidget";
import { assetsApi } from "@/lib/api";
import type { AssetScore, AssetScreenResult } from "@/types";
import { Search, RefreshCw, Filter, TrendingUp } from "lucide-react";
import { getScoreColor } from "@/lib/utils";

const PRESET_LISTS: Record<string, { tickers: string; label: string; flag?: string }> = {
  defensive: { tickers: "NEE,SO,D,DUK,JNJ,PG,KO,PEP,T,VZ,WEC,AFL,O,MO", label: "Defensivos", flag: "🇺🇸" },
  utilities: { tickers: "NEE,SO,D,DUK,AEP,WEC,ES,EXC,PCG,ETR", label: "Utilities", flag: "🇺🇸" },
  healthcare: { tickers: "JNJ,ABT,MDT,BMY,PFE,MRK,UNH,CVS,CI", label: "Healthcare", flag: "🇺🇸" },
  staples:   { tickers: "PG,KO,PEP,MO,CL,GIS,K,CPB,HRL", label: "Consumo", flag: "🇺🇸" },
  dividends: { tickers: "O,MAIN,STAG,MO,T,VZ,AFL,BEN,WPC", label: "Dividendos", flag: "🇺🇸" },
  b3_blue:   { tickers: "PETR4.SA,VALE3.SA,ITUB4.SA,BBDC4.SA,WEGE3.SA,ABEV3.SA", label: "B3 Blue Chips", flag: "🇧🇷" },
  b3_util:   { tickers: "TAEE11.SA,EGIE3.SA,CPFE3.SA,ENGI11.SA,TRPL4.SA", label: "B3 Utilities", flag: "🇧🇷" },
  b3_qual:   { tickers: "RADL3.SA,FLRY3.SA,RENT3.SA,BBSE3.SA,VIVT3.SA,KLBN11.SA", label: "B3 Qualidade", flag: "🇧🇷" },
  tokenized: { tickers: "TSLAONUSDT,NVDAONUSDT,AAPLONUSDT,AMZNONUSDT,GOOGLONUSDT,MSFTONUSDT,METAONUSDT", label: "Tokenizadas (Bitget)", flag: "🪙" },
};

export default function AssetsPage() {
  const [tickers, setTickers] = useState(PRESET_LISTS.defensive.tickers);
  const [minScore, setMinScore] = useState(0);
  const [result, setResult] = useState<AssetScreenResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleScreen = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await assetsApi.screen({ tickers: tickers.toUpperCase(), min_score: minScore });
      setResult(res.data);
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Erro ao buscar ativos. Verifique os tickers.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-text-primary">Screening de Ativos</h1>
            <p className="text-sm text-text-secondary mt-0.5">Análise quantitativa de ativos defensivos com score 0-100</p>
          </div>
        </div>

        {/* Market State */}
        <MarketStateWidget />

        {/* Filters */}
        <div className="card mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="md:col-span-2">
              <label className="label">Tickers (separados por vírgula)</label>
              <input className="input font-mono" value={tickers} onChange={(e) => setTickers(e.target.value)} placeholder="NEE,SO,JNJ,KO..." />
            </div>
            <div>
              <label className="label">Score mínimo composto</label>
              <div className="flex items-center gap-3">
                <input type="range" min={0} max={80} step={5} value={minScore} onChange={(e) => setMinScore(Number(e.target.value))}
                  className="flex-1 accent-primary" />
                <span className="text-sm font-mono text-primary w-8">{minScore}</span>
              </div>
            </div>
          </div>

          {/* Presets */}
          <div className="flex flex-wrap gap-2 mb-4">
            <span className="text-xs text-text-muted self-center">Presets:</span>
            {Object.entries(PRESET_LISTS).map(([key, val]) => (
              <button key={key} onClick={() => setTickers(val.tickers)}
                className="text-xs px-3 py-1 rounded-full border border-border hover:border-primary/50 hover:text-primary text-text-secondary transition-colors">
                {val.flag && <span className="mr-1">{val.flag}</span>}{val.label}
              </button>
            ))}
          </div>

          <button onClick={handleScreen} disabled={loading}
            className="btn-primary flex items-center gap-2">
            {loading ? <RefreshCw size={14} className="animate-spin" /> : <Search size={14} />}
            {loading ? "Analisando..." : "Analisar Ativos"}
          </button>
        </div>

        {error && (
          <div className="bg-danger/10 border border-danger/20 rounded-lg px-4 py-3 text-sm text-danger mb-4">{error}</div>
        )}

        {/* Results */}
        {result && (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-text-secondary">
                <span className="text-text-primary font-semibold">{result.total_assets}</span> ativos encontrados
                {" "}· ordenados por score composto
              </p>
              <p className="text-xs text-text-muted">
                Atualizado: {new Date(result.screened_at).toLocaleTimeString("pt-BR")}
              </p>
            </div>

            {/* Summary bar */}
            <div className="grid grid-cols-3 gap-3 mb-5">
              {[
                { label: "Score Médio", value: result.assets.length > 0 ? (result.assets.reduce((s, a) => s + a.composite_score, 0) / result.assets.length).toFixed(1) : "—" },
                { label: "Melhor Oport.", value: result.assets[0] ? (result.assets[0].underlying_ticker ?? result.assets[0].ticker.replace("ONUSDT","")) : "—" },
                { label: "Alavancagem Méd.", value: result.assets.length > 0 ? (result.assets.reduce((s, a) => s + a.recommended_leverage, 0) / result.assets.length).toFixed(2) + "x" : "—" },
              ].map((item) => (
                <div key={item.label} className="card-sm flex items-center justify-between">
                  <span className="text-xs text-text-muted">{item.label}</span>
                  <span className="text-sm font-mono font-semibold text-primary">{item.value}</span>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {result.assets.map((asset) => (
                <AssetCard key={asset.ticker} asset={asset} />
              ))}
            </div>
          </>
        )}

        {!result && !loading && (
          <div className="card text-center py-16">
            <Filter size={40} className="text-text-muted mx-auto mb-4" />
            <p className="text-sm text-text-secondary">Configure os tickers e clique em &quot;Analisar Ativos&quot;</p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
