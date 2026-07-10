"use client";
import { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import AssetCard from "@/components/assets/AssetCard";
import AssetComparisonModal from "@/components/assets/AssetComparisonModal";
import MarketStateWidget from "@/components/assets/MarketStateWidget";
import { assetsApi, authApi } from "@/lib/api";
import type { AssetScore, AssetScreenResult } from "@/types";
import { Search, RefreshCw, Filter, Info, Download } from "lucide-react";

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

// ── Screener (client-side, sobre o que o motor JÁ retorna) ──────────────────
// Ordem de força do veredito (FORTE no topo) e rótulo amigável.
const VERDICT_RANK: Record<string, number> = {
  "COMPRAR FORTE": 0, COMPRAR: 1, JUSTO: 2, ESTICADO: 3, ESPECULATIVO: 4, RESERVA: 5,
};
const VERDICT_LABEL: Record<string, string> = {
  "COMPRAR FORTE": "Oportunidade Forte",
  COMPRAR: "Oportunidade",
  JUSTO: "Neutro (Justo)",
  ESTICADO: "Neutro (Esticado)",
  ESPECULATIVO: "Desfavorável",
  RESERVA: "Reserva",
};

type SortKey = "rank" | "dy" | "momentum" | "quality" | "beta" | "leverage" | "best_aporte";
const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "rank", label: "Rank (composto)" },
  { key: "best_aporte", label: "Melhor aporte agora ★" },
  { key: "dy", label: "Dividend Yield" },
  { key: "momentum", label: "Momento" },
  { key: "quality", label: "Qualidade" },
  { key: "beta", label: "Beta (menor)" },
  { key: "leverage", label: "Alavancagem" },
];

// ── Zona de compra: RSI semanal ≤38 OU desconto MM200 ≥10% ──────────────────
function isBuyZone(a: AssetScore): boolean {
  const rsi = a.technicals?.rsi_14_weekly ?? a.technicals?.rsi_weekly;
  const dist = a.technicals?.distance_from_ma200;
  if (rsi != null && rsi <= 38) return true;
  if (dist != null && dist <= -10) return true;
  return false;
}

// ── Badge de camadas: qual pilar está puxando o veredito ─────────────────────
// Q = Qualidade (quality_score), M = Momento (opportunity_score), A = Aptidão (leverage_score)
function LayerBadge({ asset }: { asset: AssetScore }) {
  const q = asset.quality_score ?? 0;
  const m = asset.opportunity_score ?? 0;
  const a = asset.leverage_score ?? 0;
  const fmt = (score: number, label: string) => {
    const up = score >= 60;
    const ok = score >= 40 && score < 60;
    const cls = up
      ? "text-emerald-400 font-bold"
      : ok
      ? "text-yellow-400"
      : "text-zinc-500";
    return (
      <span key={label} className={cls} title={`${label}: ${score.toFixed(0)}/100`}>
        {label}
        {up ? "↑" : ok ? "→" : "−"}
      </span>
    );
  };
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-surface-2 border border-border/40 select-none">
      {fmt(q, "Q")}
      <span className="text-border">·</span>
      {fmt(m, "M")}
      <span className="text-border">·</span>
      {fmt(a, "A")}
    </span>
  );
}

// ── Confiança de dados: conta quantos pilares têm dado real ──────────────────
function DataConfBadge({ asset }: { asset: AssetScore }) {
  const bd = asset.score_breakdown ?? {};
  const keys = Object.keys(bd);
  // Pilares com valores válidos (não zero, não indefinido)
  const filled = keys.filter((k) => {
    const v = bd[k];
    return typeof v === "number" && Number.isFinite(v) && v !== 0;
  });
  const total = keys.length || 1;
  const pct = Math.round((filled.length / total) * 100);
  const high = pct >= 70;
  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full border select-none ${
        high
          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
          : "bg-warning/10 border-warning/30 text-warning"
      }`}
      title={`Pilares com dado: ${filled.length}/${total} (${pct}%)`}
    >
      {high ? "CONF↑" : "CONF↓"} {filled.length}/{total}
    </span>
  );
}

// ── Score "Melhor aporte agora": veredito + zona de compra ───────────────────
function bestAporteScore(a: AssetScore): number {
  const verdictBonus = [
    "COMPRAR FORTE", "COMPRAR", "JUSTO", "ESTICADO", "ESPECULATIVO", "RESERVA",
  ].indexOf(a.verdict ?? "RESERVA");
  // verdictBonus: 0=FORTE … 5=RESERVA → inverter para que FORTE = alto
  const verdictScore = 5 - (verdictBonus >= 0 ? verdictBonus : 5);
  const zoneBonus = isBuyZone(a) ? 3 : 0;
  return verdictScore * 10 + zoneBonus + (a.composite_score ?? 0) / 100;
}

const num = (v: unknown): number | undefined =>
  typeof v === "number" && Number.isFinite(v) ? v : undefined;

function AssetsPageInner() {
  const searchParams = useSearchParams();
  const [tickers, setTickers] = useState(PRESET_LISTS.defensive.tickers);
  const [minScore, setMinScore] = useState(0);
  const [result, setResult] = useState<AssetScreenResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());
  const [showComparison, setShowComparison] = useState(false);
  const [riskProfile, setRiskProfile] = useState<string | null>(null);

  // ── Filtros do screener (client-side) ──
  const [minDY, setMinDY] = useState(0);              // dividend_yield em %
  const [buyOnly, setBuyOnly] = useState(false);      // só COMPRAR / COMPRAR FORTE
  const [buyZoneOnly, setBuyZoneOnly] = useState(false); // RSI sem ≤38 OU desconto MM200 ≥10%
  const [maxBeta, setMaxBeta] = useState(0);          // 0 = sem teto
  const [minLev, setMinLev] = useState(1);
  const [maxLev, setMaxLev] = useState(5);
  const [sectorFilter, setSectorFilter] = useState("__all__");
  const [sortKey, setSortKey] = useState<SortKey>("rank");
  const [groupByVerdict, setGroupByVerdict] = useState(true);

  // Perfil do usuário (p/ o banner Screening↔Ranking). Não bloqueia a UI se falhar.
  useEffect(() => {
    authApi.me()
      .then((res) => setRiskProfile(res.data?.riskProfile ?? res.data?.risk_profile ?? null))
      .catch(() => setRiskProfile(null));
  }, []);

  // Auto-run when navigated from Sharpe Compare with ?tickers=...&autorun=1
  useEffect(() => {
    const t = searchParams.get("tickers");
    const auto = searchParams.get("autorun");
    if (t) {
      setTickers(t);
      if (auto === "1") {
        // Small delay to let state settle
        setTimeout(() => {
          assetsApi.screen({ tickers: t.toUpperCase(), min_score: 0 })
            .then((res) => setResult(res.data))
            .catch((e) => setError(e?.response?.data?.detail || "Erro ao buscar ativos"))
            .finally(() => setLoading(false));
          setLoading(true);
        }, 100);
      }
    }
  }, [searchParams]);

  // Recebe tickers opcionais (ex.: clique num preset) para evitar a corrida com
  // o setState do campo. Sem argumento, usa o conteúdo atual do campo.
  const handleScreen = async (overrideTickers?: string) => {
    const t = (overrideTickers ?? tickers).toUpperCase();
    setLoading(true);
    setError("");
    setSelectedAssets(new Set()); // Clear selection on new screen
    try {
      const res = await assetsApi.screen({ tickers: t, min_score: minScore });
      setResult(res.data);
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Erro ao buscar ativos. Verifique os tickers.");
    } finally {
      setLoading(false);
    }
  };

  // Clique num preset: POPULA o campo de tickers (transparência do que será
  // analisado) e já dispara o screening com esses mesmos tickers.
  const applyPreset = (presetTickers: string) => {
    setTickers(presetTickers);
    handleScreen(presetTickers);
  };

  const toggleAssetSelection = (ticker: string) => {
    const newSelected = new Set(selectedAssets);
    if (newSelected.has(ticker)) {
      newSelected.delete(ticker);
    } else {
      newSelected.add(ticker);
    }
    setSelectedAssets(newSelected);
  };

  const getSelectedAssets = () => {
    if (!result) return [];
    return result.assets.filter((asset) => selectedAssets.has(asset.ticker));
  };

  // Detecta se os campos vêm do motor — se NÃO vierem em nenhum ativo, ocultamos o filtro.
  const caps = useMemo(() => {
    const a = result?.assets ?? [];
    return {
      hasDY: a.some((x) => num(x.dividend_yield) !== undefined),
      hasBeta: a.some((x) => num(x.beta) !== undefined),
      hasVerdict: a.some((x) => !!x.verdict),
      sectors: Array.from(
        new Set(a.map((x) => x.bucket || x.sector).filter((s): s is string => !!s))
      ).sort(),
    };
  }, [result]);

  // Helpers de leitura de campos do motor.
  const dyOf = (a: AssetScore) => num(a.dividend_yield) ?? 0;
  const betaOf = (a: AssetScore) => num(a.beta);
  const momentumOf = (a: AssetScore) => num(a.opportunity_score) ?? 0;
  const qualityOf = (a: AssetScore) => num(a.quality_score) ?? 0;
  const rankOf = (a: AssetScore) => num(a.composite_score) ?? 0;
  const levOf = (a: AssetScore) => num(a.recommended_leverage) ?? 1;
  const sectorOf = (a: AssetScore) => a.bucket || a.sector || "";

  // Aplica filtros client-side + ordenação. NÃO altera o resultado bruto do motor.
  const filtered = useMemo(() => {
    let list = (result?.assets ?? []).slice();

    // DY já vem em PONTOS PERCENTUAIS (ex.: 10.5 = 10,5%) → compara direto em %.
    if (caps.hasDY && minDY > 0) list = list.filter((a) => dyOf(a) >= minDY);
    if (caps.hasVerdict && buyOnly) {
      list = list.filter((a) => a.verdict === "COMPRAR" || a.verdict === "COMPRAR FORTE");
    }
    if (buyZoneOnly) {
      list = list.filter((a) => isBuyZone(a));
    }
    if (caps.hasBeta && maxBeta > 0) {
      list = list.filter((a) => { const b = betaOf(a); return b === undefined || b <= maxBeta; });
    }
    list = list.filter((a) => { const l = levOf(a); return l >= minLev && l <= maxLev; });
    if (sectorFilter !== "__all__") list = list.filter((a) => sectorOf(a) === sectorFilter);

    list.sort((a, b) => {
      switch (sortKey) {
        case "dy": return dyOf(b) - dyOf(a);
        case "momentum": return momentumOf(b) - momentumOf(a);
        case "quality": return qualityOf(b) - qualityOf(a);
        case "leverage": return levOf(b) - levOf(a);
        case "beta": return (betaOf(a) ?? Infinity) - (betaOf(b) ?? Infinity);
        case "best_aporte": return bestAporteScore(b) - bestAporteScore(a);
        case "rank":
        default: return rankOf(b) - rankOf(a);
      }
    });
    return list;
  }, [result, caps, minDY, buyOnly, buyZoneOnly, maxBeta, minLev, maxLev, sectorFilter, sortKey]);

  // Agrupa por veredito (FORTE no topo). Mantém a ordenação dentro de cada grupo.
  const grouped = useMemo(() => {
    if (!groupByVerdict || !caps.hasVerdict) return null;
    const map = new Map<string, AssetScore[]>();
    for (const a of filtered) {
      const v = a.verdict || "RESERVA";
      if (!map.has(v)) map.set(v, []);
      map.get(v)!.push(a);
    }
    return Array.from(map.entries()).sort(
      (x, y) => (VERDICT_RANK[x[0]] ?? 99) - (VERDICT_RANK[y[0]] ?? 99)
    );
  }, [filtered, groupByVerdict, caps.hasVerdict]);

  const nonAggressive = !!riskProfile && riskProfile.toLowerCase() !== "aggressive" && riskProfile.toLowerCase() !== "agressivo";

  // ── Export CSV do resultado FILTRADO ──
  const exportCsv = () => {
    if (filtered.length === 0) return;
    const cols = [
      "ticker", "company_name", "verdict", "rank", "quality", "momentum",
      "leverage", "beta", "dividend_yield_pct", "risk_rating", "sector", "price",
    ];
    const esc = (v: unknown) => {
      const s = v === undefined || v === null ? "" : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const rows = filtered.map((a) => [
      a.ticker, a.company_name ?? "", a.verdict ?? "", rankOf(a).toFixed(1),
      qualityOf(a).toFixed(1), momentumOf(a).toFixed(1), levOf(a).toFixed(2),
      betaOf(a) ?? "", dyOf(a).toFixed(2),
      a.risk_rating ?? "", sectorOf(a), num(a.current_price) ?? "",
    ]);
    const csv = [cols.join(","), ...rows.map((r) => r.map(esc).join(","))].join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `screening_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const renderCards = (list: AssetScore[]) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {list.map((asset) => (
        <div key={asset.ticker} className="flex flex-col gap-1.5">
          {/* Badges de contexto: camadas + confiança de dados + zona de compra */}
          <div className="flex flex-wrap items-center gap-1.5 px-1">
            <LayerBadge asset={asset} />
            {Object.keys(asset.score_breakdown ?? {}).length > 0 && (
              <DataConfBadge asset={asset} />
            )}
            {isBuyZone(asset) && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/35 text-emerald-300 select-none">
                🎯 Zona compra
              </span>
            )}
          </div>
          <AssetCard
            asset={asset}
            selected={selectedAssets.has(asset.ticker)}
            onToggleSelect={toggleAssetSelection}
          />
        </div>
      ))}
    </div>
  );

  return (
    <AppShell>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-text-primary">Screening de Ativos</h1>
            <p className="text-sm text-text-secondary mt-0.5">Screener quantitativo com filtros sobre o motor de 3 camadas</p>
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
              <button key={key} onClick={() => applyPreset(val.tickers)}
                className="text-xs px-3 py-1 rounded-full border border-border hover:border-primary/50 hover:text-primary text-text-secondary transition-colors">
                {val.flag && <span className="mr-1">{val.flag}</span>}{val.label}
              </button>
            ))}
          </div>

          <button onClick={() => handleScreen()} disabled={loading}
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
            {/* Banner perfil: explica divergência Screening ↔ Ranking p/ perfis não-agressivos */}
            {nonAggressive && (
              <div className="flex items-start gap-2 bg-primary/5 border border-primary/20 rounded-lg px-4 py-3 text-xs text-text-secondary mb-4">
                <Info size={15} className="text-primary shrink-0 mt-0.5" />
                <p>
                  Para perfis <span className="font-semibold text-text-primary">Conservador/Moderado</span>, a alavancagem
                  exibida aqui reflete o <span className="font-semibold">seu perfil</span> (calculada ao vivo com seus caps)
                  e pode diferir da aba <span className="font-semibold">Ranking</span>, que mostra a referência agressiva
                  canônica. Não é bug — é a calibragem do motor ao seu risco.
                </p>
              </div>
            )}

            {/* Screener: filtros client-side sobre campos que o motor JÁ retorna */}
            <div className="card mb-4">
              <div className="flex items-center gap-2 mb-3">
                <Filter size={14} className="text-primary" />
                <span className="text-sm font-semibold text-text-primary">Filtros do screener</span>
                <span className="text-xs text-text-muted">(aplicados sobre o resultado do motor)</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {caps.hasDY && (
                  <div>
                    <label className="label text-xs">DY mínimo (%)</label>
                    <input type="number" min={0} step={0.5} value={minDY}
                      onChange={(e) => setMinDY(Number(e.target.value))} className="input text-sm" />
                  </div>
                )}
                {caps.hasBeta && (
                  <div>
                    <label className="label text-xs">Beta máximo (0=∞)</label>
                    <input type="number" min={0} step={0.1} value={maxBeta}
                      onChange={(e) => setMaxBeta(Number(e.target.value))} className="input text-sm" />
                  </div>
                )}
                <div>
                  <label className="label text-xs">Alav. mín.</label>
                  <input type="number" min={1} max={5} step={0.5} value={minLev}
                    onChange={(e) => setMinLev(Number(e.target.value))} className="input text-sm" />
                </div>
                <div>
                  <label className="label text-xs">Alav. máx.</label>
                  <input type="number" min={1} max={5} step={0.5} value={maxLev}
                    onChange={(e) => setMaxLev(Number(e.target.value))} className="input text-sm" />
                </div>
                {caps.sectors.length > 0 && (
                  <div>
                    <label className="label text-xs">Setor / bucket</label>
                    <select value={sectorFilter} onChange={(e) => setSectorFilter(e.target.value)} className="input text-sm">
                      <option value="__all__">Todos</option>
                      {caps.sectors.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                )}
                <div>
                  <label className="label text-xs">Ordenar por</label>
                  <select value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)} className="input text-sm">
                    {SORT_OPTIONS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-4 mt-3">
                {caps.hasVerdict && (
                  <label className="flex items-center gap-2 text-xs text-text-secondary cursor-pointer">
                    <input type="checkbox" checked={buyOnly} onChange={(e) => setBuyOnly(e.target.checked)}
                      className="accent-primary" />
                    Só Comprar / Comprar Forte
                  </label>
                )}
                <label className="flex items-center gap-2 text-xs text-text-secondary cursor-pointer" title="RSI semanal ≤38 OU desconto MM200 ≥10%">
                  <input type="checkbox" checked={buyZoneOnly} onChange={(e) => setBuyZoneOnly(e.target.checked)}
                    className="accent-primary" />
                  <span>Zona de compra</span>
                  <span className="text-text-muted">(RSI sem. ≤38 ou MM200 ≥−10%)</span>
                </label>
                {caps.hasVerdict && (
                  <label className="flex items-center gap-2 text-xs text-text-secondary cursor-pointer">
                    <input type="checkbox" checked={groupByVerdict} onChange={(e) => setGroupByVerdict(e.target.checked)}
                      className="accent-primary" />
                    Agrupar por veredito (Forte no topo)
                  </label>
                )}
                <button onClick={exportCsv} disabled={filtered.length === 0}
                  className="ml-auto flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-border hover:border-primary/50 hover:text-primary text-text-secondary transition-colors disabled:opacity-40">
                  <Download size={13} /> Exportar CSV
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-text-secondary">
                <span className="text-text-primary font-semibold">{filtered.length}</span> de {result.total_assets} ativos
                {filtered.length !== result.total_assets && <span className="text-text-muted"> (filtrados)</span>}
                {selectedAssets.size > 0 && (
                  <span className="ml-2 px-2 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold">
                    {selectedAssets.size} selecionado{selectedAssets.size > 1 ? "s" : ""}
                  </span>
                )}
              </p>
              <div className="flex gap-2">
                {selectedAssets.size >= 2 && (
                  <>
                    <button
                      onClick={() => setShowComparison(true)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-primary text-white hover:bg-primary/90 transition-colors"
                    >
                      🔍 Comparar ({selectedAssets.size})
                    </button>
                    <button
                      onClick={() => setSelectedAssets(new Set())}
                      className="px-2 py-2 rounded-lg text-xs font-medium text-text-muted hover:text-text-primary hover:bg-surface-2 transition-colors"
                    >
                      Limpar
                    </button>
                  </>
                )}
                <p className="text-xs text-text-muted self-center">
                  Atualizado: {new Date(result.screened_at).toLocaleTimeString("pt-BR")}
                </p>
              </div>
            </div>

            {/* Failed tickers (mantido) */}
            {result.failed_tickers && result.failed_tickers.length > 0 && (
              <div className="bg-warning/10 border border-warning/20 rounded-lg px-4 py-2 text-xs text-warning mb-4">
                Sem dados do motor: {result.failed_tickers.join(", ")}
              </div>
            )}

            {/* Summary bar */}
            <div className="grid grid-cols-4 gap-3 mb-5">
              {[
                { label: "Score Médio", value: filtered.length > 0 ? (filtered.reduce((s, a) => s + rankOf(a), 0) / filtered.length).toFixed(1) : "—" },
                { label: "Melhor aporte", value: filtered[0] ? (filtered[0].underlying_ticker ?? filtered[0].ticker.replace("ONUSDT", "")) : "—" },
                { label: "Zona de compra", value: filtered.filter(isBuyZone).length > 0 ? `${filtered.filter(isBuyZone).length} ativo${filtered.filter(isBuyZone).length !== 1 ? "s" : ""}` : "nenhum" },
                { label: "Alavancagem Méd.", value: filtered.length > 0 ? (filtered.reduce((s, a) => s + levOf(a), 0) / filtered.length).toFixed(2) + "x" : "—" },
              ].map((item) => (
                <div key={item.label} className="card-sm flex items-center justify-between">
                  <span className="text-xs text-text-muted">{item.label}</span>
                  <span className="text-sm font-mono font-semibold text-primary">{item.value}</span>
                </div>
              ))}
            </div>

            {filtered.length === 0 ? (
              <div className="card text-center py-12">
                <Filter size={32} className="text-text-muted mx-auto mb-3" />
                <p className="text-sm text-text-secondary">Nenhum ativo passou pelos filtros. Afrouxe os critérios.</p>
              </div>
            ) : grouped ? (
              <div className="space-y-6">
                {grouped.map(([verdict, list]) => (
                  <div key={verdict}>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-sm font-semibold text-text-primary">{VERDICT_LABEL[verdict] ?? verdict}</span>
                      <span className="text-xs text-text-muted">({list.length})</span>
                      <div className="flex-1 h-px bg-border" />
                    </div>
                    {renderCards(list)}
                  </div>
                ))}
              </div>
            ) : (
              renderCards(filtered)
            )}

            {/* Comparison Modal */}
            {showComparison && (
              <AssetComparisonModal
                assets={getSelectedAssets()}
                onClose={() => setShowComparison(false)}
              />
            )}
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

export default function AssetsPage() {
  return (
    <Suspense fallback={null}>
      <AssetsPageInner />
    </Suspense>
  );
}
