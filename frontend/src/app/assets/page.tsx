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
  // ── EUA ──────────────────────────────────────────────────────────────────
  defensive:  { tickers: "NEE,SO,D,DUK,JNJ,PG,KO,PEP,T,VZ,WEC,AFL,O,MO", label: "Defensivos", flag: "🇺🇸" },
  utilities:  { tickers: "NEE,SO,D,DUK,AEP,WEC,ES,EXC,PCG,ETR", label: "Utilities EUA", flag: "🇺🇸" },
  healthcare: { tickers: "JNJ,ABT,MDT,BMY,PFE,MRK,UNH,CVS,CI", label: "Healthcare", flag: "🇺🇸" },
  staples:    { tickers: "PG,KO,PEP,MO,CL,GIS,K,CPB,HRL", label: "Consumo EUA", flag: "🇺🇸" },
  dividends:  { tickers: "O,MAIN,STAG,MO,T,VZ,AFL,BEN,WPC", label: "Dividendos EUA", flag: "🇺🇸" },
  // ── B3 — grupos setoriais ─────────────────────────────────────────────────
  b3_top20:   {
    tickers: "PETR4.SA,VALE3.SA,ITUB4.SA,BBDC4.SA,ABEV3.SA,WEGE3.SA,BBAS3.SA,RDOR3.SA,RENT3.SA,HAPV3.SA,BPAC11.SA,SUZB3.SA,RADL3.SA,EGIE3.SA,TAEE11.SA,KLBN11.SA,EQTL3.SA,VIVT3.SA,FLRY3.SA,SANB11.SA",
    label: "B3 Top 20", flag: "🇧🇷",
  },
  b3_top50:   {
    tickers: "PETR4.SA,VALE3.SA,ITUB4.SA,BBDC4.SA,ABEV3.SA,WEGE3.SA,BBAS3.SA,RDOR3.SA,RENT3.SA,HAPV3.SA,BPAC11.SA,SUZB3.SA,RADL3.SA,EGIE3.SA,TAEE11.SA,KLBN11.SA,EQTL3.SA,VIVT3.SA,FLRY3.SA,SANB11.SA,PRIO3.SA,CSNA3.SA,GGBR4.SA,USIM5.SA,JBSS3.SA,BRFS3.SA,MRFG3.SA,LREN3.SA,ASAI3.SA,MGLU3.SA,TOTS3.SA,MULT3.SA,MRVE3.SA,CYRE3.SA,EZTC3.SA,CMIG4.SA,ELET3.SA,SBSP3.SA,SAPR11.SA,CPFE3.SA,ENGI11.SA,TRPL4.SA,CSAN3.SA,VBBR3.SA,UGPA3.SA,BEEF3.SA,SMTO3.SA,ODPV3.SA,HYPE3.SA,CIEL3.SA",
    label: "B3 Top 50", flag: "🇧🇷",
  },
  b3_bancos:  {
    tickers: "ITUB4.SA,BBDC4.SA,BBAS3.SA,SANB11.SA,BPAC11.SA,ITSA4.SA,CIEL3.SA,BBSE3.SA,BRGE3.SA,WIZS3.SA",
    label: "B3 Bancos", flag: "🇧🇷",
  },
  b3_energia: {
    tickers: "TAEE11.SA,EGIE3.SA,CPFE3.SA,ENGI11.SA,TRPL4.SA,CMIG4.SA,ELET3.SA,EQTL3.SA,SBSP3.SA,SAPR11.SA,NEOE3.SA,CPLE6.SA,AURE3.SA",
    label: "B3 Energia", flag: "🇧🇷",
  },
  b3_oleo:    {
    tickers: "PETR4.SA,PETR3.SA,PRIO3.SA,CSAN3.SA,VBBR3.SA,UGPA3.SA,RRRP3.SA,RECV3.SA",
    label: "B3 Petróleo", flag: "🇧🇷",
  },
  b3_mineral: {
    tickers: "VALE3.SA,GGBR4.SA,CSNA3.SA,USIM5.SA,BRAP4.SA,GOAU4.SA,CMIN3.SA,FESA4.SA,KLBN11.SA,SUZB3.SA,DXCO3.SA",
    label: "B3 Mineração", flag: "🇧🇷",
  },
  b3_saude:   {
    tickers: "RDOR3.SA,HAPV3.SA,RADL3.SA,FLRY3.SA,HYPE3.SA,ODPV3.SA,QUAL3.SA,BLAU3.SA",
    label: "B3 Saúde", flag: "🇧🇷",
  },
  b3_alimentos: {
    tickers: "ABEV3.SA,JBSS3.SA,BRFS3.SA,MRFG3.SA,BEEF3.SA,SMTO3.SA,SLCE3.SA,MDIA3.SA",
    label: "B3 Alimentos", flag: "🇧🇷",
  },
  b3_varejo:  {
    tickers: "LREN3.SA,ASAI3.SA,PCAR3.SA,MGLU3.SA,ARZZ3.SA,SOMA3.SA,PETZ3.SA,ALPA4.SA",
    label: "B3 Varejo", flag: "🇧🇷",
  },
  b3_industrial: {
    tickers: "WEGE3.SA,EMBR3.SA,TOTS3.SA,INTB3.SA,KLBN11.SA,SUZB3.SA,RAIL3.SA,DXCO3.SA",
    label: "B3 Industrial", flag: "🇧🇷",
  },
  b3_imoveis: {
    tickers: "MULT3.SA,MRVE3.SA,CYRE3.SA,EZTC3.SA,DIRR3.SA,CURY3.SA,IGTI11.SA,ALSO3.SA",
    label: "B3 Imóveis", flag: "🇧🇷",
  },
  b3_telecom: {
    tickers: "VIVT3.SA,TIMS3.SA",
    label: "B3 Telecom", flag: "🇧🇷",
  },
  b3_mob:     {
    tickers: "RENT3.SA,MOVI3.SA,SIMH3.SA,GOLL4.SA,AZUL4.SA,RAIL3.SA",
    label: "B3 Mobilidade", flag: "🇧🇷",
  },
  b3_blue:    {
    tickers: "PETR4.SA,VALE3.SA,ITUB4.SA,BBDC4.SA,WEGE3.SA,ABEV3.SA",
    label: "B3 Blue Chips", flag: "🇧🇷",
  },
  b3_util:    { tickers: "TAEE11.SA,EGIE3.SA,CPFE3.SA,ENGI11.SA,TRPL4.SA", label: "B3 Utilities", flag: "🇧🇷" },
  b3_qual:    { tickers: "RADL3.SA,FLRY3.SA,RENT3.SA,BBSE3.SA,VIVT3.SA,KLBN11.SA", label: "B3 Qualidade", flag: "🇧🇷" },
  // ── Tokenizadas ──────────────────────────────────────────────────────────
  tokenized:  { tickers: "TSLAONUSDT,NVDAONUSDT,AAPLONUSDT,AMZNONUSDT,GOOGLONUSDT,MSFTONUSDT,METAONUSDT", label: "Tokenizadas (Bitget)", flag: "🪙" },
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
