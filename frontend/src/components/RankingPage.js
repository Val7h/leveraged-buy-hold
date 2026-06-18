"use client";

/**
 * RankingPage — aba "Ranking de Aporte".
 *
 * Componente auto-contido. Consome os endpoints (mesmo host, URL relativa):
 *   GET    /api/ranking            → ranking por categoria (cache ~20min no backend)
 *   GET    /api/market-bar         → barra de mercado (cache ~5min)
 *   GET    /api/ranking/universe   → universo editável
 *   POST   /api/ranking/universe   → adiciona ativo
 *   DELETE /api/ranking/universe?category=&ticker= → remove ativo
 *
 * Sem libs novas: usa apenas React + lucide-react (já no projeto) e as classes
 * Tailwind do tema dark (tokens em tailwind.config / globals.css).
 *
 * NÃO está integrado no App / roteamento — apenas o componente.
 */

import { useEffect, useState, useCallback } from "react";
import {
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  X,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/* Constantes de apresentação                                          */
/* ------------------------------------------------------------------ */

// Ordem e rótulos dos chips de categoria. As chaves batem com o contrato.
const CATEGORIES = [
  { key: "BR", label: "Brasil" },
  { key: "US", label: "EUA" },
  { key: "ETF", label: "ETF" },
  { key: "EUROPE", label: "Europa" },
  { key: "COMMODITY", label: "Commodities" },
  { key: "CRYPTO", label: "Crypto" },
];

const BUCKETS = ["ANCORA", "ACELERADOR", "SATELITE", "RESERVA"];

// Cores dos vereditos (Tailwind tokens do tema dark).
const VERDICT_STYLE = {
  "COMPRAR FORTE": "text-success bg-success/10 border-success/30",
  COMPRAR: "text-primary bg-primary/10 border-primary/30",
  JUSTO: "text-warning bg-warning/10 border-warning/30",
  ESPECULATIVO: "text-danger bg-danger/10 border-danger/30",
  ESTICADO: "text-text-muted bg-surface-2 border-border",
  RESERVA: "text-[#C084FC] bg-[#C084FC]/10 border-[#C084FC]/30",
};

// Status da barra de mercado → cor.
const MARKET_STATUS_STYLE = {
  good: "text-success",
  neutral: "text-text-secondary",
  warning: "text-warning",
  danger: "text-danger",
};

// Rótulos amigáveis dos fatores de qualidade (8) e momento (3).
const QUALITY_LABELS = {
  beta: "Beta",
  max_drawdown: "Max Drawdown",
  sharpe: "Sharpe",
  cagr: "CAGR",
  crescimento_5a: "Crescimento 5a",
  tsr_esperado: "TSR esperado",
  dividendos: "Dividendos",
  fundamentos: "Fundamentos",
};

const MOMENTUM_LABELS = {
  stoch_lento_semanal: "Stoch lento semanal",
  desconto_x_reversao: "Desconto x reversão",
  distancia_ma200: "Distância MA200",
};

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function fmtPct(v, digits = 1) {
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  const s = v > 0 ? "+" : "";
  return `${s}${Number(v).toFixed(digits)}%`;
}

function fmtNum(v, digits = 2) {
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  return Number(v).toFixed(digits);
}

function scoreColor(score) {
  if (score >= 70) return "bg-success";
  if (score >= 45) return "bg-warning";
  return "bg-danger";
}

/* ------------------------------------------------------------------ */
/* Subcomponentes                                                      */
/* ------------------------------------------------------------------ */

// Barra de score 0–100 com rótulo numérico.
function ScoreBar({ value, label }) {
  const v = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <div className="w-full">
      {label && (
        <div className="flex items-center justify-between mb-0.5">
          <span className="text-[11px] text-text-secondary">{label}</span>
          <span className="text-[11px] font-mono text-text-primary">{Math.round(v)}</span>
        </div>
      )}
      <div className="h-1.5 w-full rounded-full bg-surface-2 overflow-hidden">
        <div
          className={`h-full rounded-full ${scoreColor(v)} transition-all`}
          style={{ width: `${v}%` }}
        />
      </div>
    </div>
  );
}

// Célula compacta da barra de mercado.
function MarketCell({ item }) {
  const up = (item.day_change_pct ?? 0) >= 0;
  const statusCls = MARKET_STATUS_STYLE[item.status] || "text-text-secondary";
  return (
    <div className="flex flex-col px-3 py-2 min-w-[110px] border-r border-border last:border-r-0">
      <div className="flex items-center gap-1">
        <span className="text-[10px] uppercase tracking-wide text-text-muted">{item.label}</span>
        {item.capitulation && (
          <span className="badge bg-danger/15 text-danger border border-danger/30 !px-1 !py-0 text-[9px]">
            capitulação
          </span>
        )}
        {!item.capitulation && item.key === "VIX" && item.status === "warning" && (
          <span className="badge bg-warning/15 text-warning border border-warning/30 !px-1 !py-0 text-[9px]">
            elevado
          </span>
        )}
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className={`text-sm font-mono font-semibold ${statusCls}`}>
          {fmtNum(item.value, 2)}
        </span>
        <span
          className={`text-[11px] font-mono flex items-center gap-0.5 ${
            up ? "text-success" : "text-danger"
          }`}
        >
          {up ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
          {fmtPct(item.day_change_pct, 2)}
        </span>
      </div>
      {item.context && (
        <span className="text-[10px] text-text-muted truncate">{item.context}</span>
      )}
    </div>
  );
}

// Barra de mercado fixa no topo.
function MarketBar({ items, loading, error }) {
  return (
    <div className="sticky top-0 z-20 bg-surface/95 backdrop-blur border-b border-border">
      {loading ? (
        <div className="flex items-center gap-2 px-4 py-3 text-sm text-text-secondary">
          <Loader2 size={14} className="animate-spin" /> carregando mercado…
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 px-4 py-3 text-sm text-danger">
          <AlertCircle size={14} /> {error}
        </div>
      ) : (
        <div className="flex overflow-x-auto">
          {items.map((it) => (
            <MarketCell key={it.key} item={it} />
          ))}
        </div>
      )}
    </div>
  );
}

// Bloco "fator: valor" usado nos breakdowns.
function FactorGrid({ data, labels }) {
  const entries = Object.entries(data || {});
  if (entries.length === 0) return null;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {entries.map(([k, v]) => (
        <div key={k} className="bg-surface-2 rounded-md px-2 py-1.5">
          <ScoreBar value={v} label={labels?.[k] || k} />
        </div>
      ))}
    </div>
  );
}

// Linha do ranking (recolhida + expansível).
function RankingRow({ asset, expanded, onToggle, onRemove }) {
  const verdictCls =
    VERDICT_STYLE[asset.verdict] || "text-text-secondary bg-surface-2 border-border";
  const stops = asset.staggered_stops || {};

  return (
    <div className="border-b border-border last:border-b-0">
      {/* Linha principal */}
      <div className="grid grid-cols-12 items-center gap-2 px-3 py-2.5 hover:bg-surface-2/50 transition-colors">
        {/* Ticker / nome / bucket */}
        <div className="col-span-4 sm:col-span-3 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-text-primary text-sm truncate">{asset.ticker}</span>
            <span className="text-[10px] uppercase text-text-muted bg-surface-2 rounded px-1 py-0.5">
              {asset.bucket}
            </span>
          </div>
          <div className="text-xs text-text-secondary truncate">{asset.name}</div>
        </div>

        {/* Veredito */}
        <div className="col-span-3 sm:col-span-2">
          <span className={`badge border ${verdictCls} whitespace-nowrap`}>{asset.verdict}</span>
        </div>

        {/* Qualidade */}
        <div className="col-span-2 hidden sm:block">
          <ScoreBar value={asset.quality} label="Qualidade" />
        </div>

        {/* Momento */}
        <div className="col-span-2 hidden sm:block">
          <ScoreBar value={asset.momentum} label="Momento" />
        </div>

        {/* Rank + ações */}
        <div className="col-span-5 sm:col-span-3 flex items-center justify-end gap-2">
          <div className="text-right">
            <div className="text-[10px] text-text-muted leading-none">rank</div>
            <div className="text-sm font-mono font-semibold text-primary">
              {fmtNum(asset.rank, 1)}
            </div>
          </div>
          <button
            onClick={() => onRemove(asset)}
            title="Remover do universo"
            className="p-1.5 rounded-md text-text-muted hover:text-danger hover:bg-danger/10 transition-colors"
          >
            <Trash2 size={14} />
          </button>
          <button
            onClick={() => onToggle(asset.ticker)}
            title={expanded ? "Recolher" : "Expandir"}
            className="p-1.5 rounded-md text-text-muted hover:text-text-primary hover:bg-surface-2 transition-colors"
          >
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {/* Linha expandida */}
      {expanded && (
        <div className="px-3 pb-4 pt-1 bg-background/40 space-y-4">
          {/* Mobile: qualidade/momento (escondidos na linha principal) */}
          <div className="grid grid-cols-2 gap-3 sm:hidden">
            <ScoreBar value={asset.quality} label="Qualidade" />
            <ScoreBar value={asset.momentum} label="Momento" />
          </div>

          {/* Dados de entrada */}
          <div>
            <div className="text-[11px] uppercase tracking-wide text-text-muted mb-1.5">
              Dados de entrada
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 text-xs">
              <Stat label="Stoch sem." value={fmtNum(asset.slow_stoch_weekly, 0)} />
              <Stat label="Desc. topo" value={fmtPct(asset.discount_from_top)} />
              <Stat label="Dist. MA200" value={fmtPct(asset.distance_ma200)} />
              <Stat label="Beta" value={fmtNum(asset.beta)} />
              <Stat label="CAGR" value={fmtPct(asset.cagr, 0)} />
              <Stat label="Sharpe" value={fmtNum(asset.sharpe)} />
              <Stat label="Div. Yield" value={fmtPct(asset.dividend_yield)} />
            </div>
          </div>

          {/* Breakdown qualidade */}
          <div>
            <div className="text-[11px] uppercase tracking-wide text-text-muted mb-1.5">
              Qualidade — {Math.round(asset.quality)} / 100
            </div>
            <FactorGrid data={asset.quality_breakdown} labels={QUALITY_LABELS} />
          </div>

          {/* Breakdown momento */}
          <div>
            <div className="text-[11px] uppercase tracking-wide text-text-muted mb-1.5">
              Momento — {Math.round(asset.momentum)} / 100
            </div>
            <FactorGrid data={asset.momentum_breakdown} labels={MOMENTUM_LABELS} />
          </div>

          {/* Alavancagem + stops escalonados */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Stat
              label="Multiplicador"
              value={`${fmtNum(asset.leverage, 1)}x`}
              accent="text-primary"
            />
            <Stat label="Stop 1 (vende ⅓)" value={fmtPct(-stops.stop_1_pct)} accent="text-warning" />
            <Stat label="Stop 2 (vende ⅓)" value={fmtPct(-stops.stop_2_pct)} accent="text-warning" />
            <Stat
              label="Liquidação"
              value={fmtPct(-stops.liquidation_pct)}
              accent="text-danger"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, accent }) {
  return (
    <div className="bg-surface-2 rounded-md px-2 py-1.5">
      <div className="text-[10px] text-text-muted leading-none mb-1">{label}</div>
      <div className={`text-sm font-mono font-semibold ${accent || "text-text-primary"}`}>
        {value}
      </div>
    </div>
  );
}

// Formulário de adição de ativo.
function AddAssetForm({ defaultCategory, onSubmit, onClose, submitting, error }) {
  const [ticker, setTicker] = useState("");
  const [category, setCategory] = useState(defaultCategory);
  const [bucket, setBucket] = useState(BUCKETS[0]);
  const [name, setName] = useState("");

  const submit = (e) => {
    e.preventDefault();
    const t = ticker.trim().toUpperCase();
    if (!t) return;
    onSubmit({ category, ticker: t, bucket, name: name.trim() });
  };

  return (
    <form
      onSubmit={submit}
      className="bg-surface-2 border border-border rounded-lg p-3 mb-3 space-y-3"
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-text-primary">Adicionar ativo</span>
        <button
          type="button"
          onClick={onClose}
          className="p-1 text-text-muted hover:text-text-primary"
        >
          <X size={16} />
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div>
          <label className="label">Ticker</label>
          <input
            className="input"
            placeholder="XPTO3.SA"
            value={ticker}
            onChange={(e) => setTicker(e.target.value)}
            autoFocus
          />
        </div>
        <div>
          <label className="label">Nome</label>
          <input
            className="input"
            placeholder="Xpto S.A."
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Categoria</label>
          <select
            className="input"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {CATEGORIES.map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Bucket</label>
          <select className="input" value={bucket} onChange={(e) => setBucket(e.target.value)}>
            {BUCKETS.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>
      </div>
      {error && (
        <div className="flex items-center gap-2 text-xs text-danger">
          <AlertCircle size={12} /> {error}
        </div>
      )}
      <button type="submit" disabled={submitting} className="btn-primary flex items-center gap-2 text-sm">
        {submitting ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
        {submitting ? "Adicionando…" : "Adicionar"}
      </button>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* Componente principal                                                */
/* ------------------------------------------------------------------ */

export default function RankingPage() {
  const [activeCat, setActiveCat] = useState("BR");

  // Ranking
  const [ranking, setRanking] = useState(null); // { categories: {...} }
  const [rankLoading, setRankLoading] = useState(true);
  const [rankError, setRankError] = useState("");

  // Barra de mercado
  const [market, setMarket] = useState([]);
  const [marketLoading, setMarketLoading] = useState(true);
  const [marketError, setMarketError] = useState("");

  // UI
  const [expanded, setExpanded] = useState(null); // ticker expandido
  const [showAdd, setShowAdd] = useState(false);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");

  /* ----------------------------- fetchers ----------------------------- */

  const fetchRanking = useCallback(async () => {
    setRankLoading(true);
    setRankError("");
    try {
      const res = await fetch("/api/ranking", { credentials: "include" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setRanking(data);
    } catch (e) {
      setRankError(
        "Não foi possível calcular o ranking agora. Tente novamente em instantes."
      );
    } finally {
      setRankLoading(false);
    }
  }, []);

  const fetchMarket = useCallback(async () => {
    setMarketLoading(true);
    setMarketError("");
    try {
      const res = await fetch("/api/market-bar", { credentials: "include" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setMarket(data?.items || []);
    } catch (e) {
      setMarketError("Barra de mercado indisponível.");
    } finally {
      setMarketLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRanking();
    fetchMarket();
  }, [fetchRanking, fetchMarket]);

  /* --------------------------- universo CRUD -------------------------- */

  const handleAdd = async (payload) => {
    setAdding(true);
    setAddError("");
    try {
      const res = await fetch("/api/ranking/universe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setShowAdd(false);
      await fetchRanking(); // recarrega ranking após mudança no universo
    } catch (e) {
      setAddError("Erro ao adicionar ativo. Verifique o ticker e tente de novo.");
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (asset) => {
    const ok = window.confirm(
      `Remover ${asset.ticker} (${asset.name}) do universo de ${activeCat}?`
    );
    if (!ok) return;
    try {
      const url = `/api/ranking/universe?category=${encodeURIComponent(
        activeCat
      )}&ticker=${encodeURIComponent(asset.ticker)}`;
      const res = await fetch(url, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await fetchRanking();
    } catch (e) {
      setRankError("Erro ao remover o ativo. Tente novamente.");
    }
  };

  const toggle = (ticker) => setExpanded((cur) => (cur === ticker ? null : ticker));

  /* ------------------------------ render ------------------------------ */

  const cat = ranking?.categories?.[activeCat];
  const assets = cat?.assets || [];

  return (
    <div className="flex flex-col h-full bg-background text-text-primary">
      {/* 1. Barra de mercado fixa */}
      <MarketBar items={market} loading={marketLoading} error={marketError} />

      <div className="p-4 sm:p-6 max-w-6xl mx-auto w-full">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-semibold flex items-center gap-2">
              <TrendingUp size={18} className="text-primary" />
              Ranking de Aporte
            </h1>
            <p className="text-sm text-text-secondary mt-0.5">
              Onde colocar o próximo aporte — qualidade × momento, por categoria.
            </p>
          </div>
          <button
            onClick={fetchRanking}
            disabled={rankLoading}
            className="btn-ghost flex items-center gap-2 text-sm"
          >
            <RefreshCw size={14} className={rankLoading ? "animate-spin" : ""} />
            Recalcular
          </button>
        </div>

        {/* 2. Chips de categoria */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
          {CATEGORIES.map((c) => {
            const active = c.key === activeCat;
            return (
              <button
                key={c.key}
                onClick={() => {
                  setActiveCat(c.key);
                  setExpanded(null);
                  setShowAdd(false);
                }}
                className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap border transition-colors ${
                  active
                    ? "bg-primary text-background border-primary font-semibold"
                    : "bg-surface-2 text-text-secondary border-border hover:text-text-primary"
                }`}
              >
                {c.label}
              </button>
            );
          })}
        </div>

        {/* 3. Cabeçalho da categoria */}
        {cat && (
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div className="text-sm text-text-secondary">
              regime{" "}
              <span className="font-semibold text-text-primary">{cat.regime}</span> ·
              multiplicador{" "}
              <span className="font-semibold text-primary">{cat.multiplier}x</span>
            </div>
            <button
              onClick={() => setShowAdd((s) => !s)}
              className="btn-primary flex items-center gap-2 text-sm"
            >
              <Plus size={14} /> adicionar ativo
            </button>
          </div>
        )}

        {/* 6. Form de adição */}
        {showAdd && (
          <AddAssetForm
            defaultCategory={activeCat}
            submitting={adding}
            error={addError}
            onSubmit={handleAdd}
            onClose={() => {
              setShowAdd(false);
              setAddError("");
            }}
          />
        )}

        {/* 7. Estados + 4/5. Tabela */}
        {rankLoading ? (
          <div className="card flex items-center justify-center gap-3 py-12 text-text-secondary">
            <Loader2 size={18} className="animate-spin text-primary" />
            calculando ranking…
          </div>
        ) : rankError ? (
          <div className="bg-danger/10 border border-danger/20 rounded-xl px-4 py-3 flex items-center gap-2 text-sm text-danger">
            <AlertCircle size={14} /> {rankError}
            <button onClick={fetchRanking} className="ml-auto underline hover:no-underline">
              tentar de novo
            </button>
          </div>
        ) : !cat ? (
          <div className="card text-center py-12 text-text-secondary">
            Categoria sem dados no momento.
          </div>
        ) : assets.length === 0 ? (
          <div className="card text-center py-12 text-text-secondary">
            Nenhum ativo no universo de{" "}
            <span className="text-text-primary font-medium">
              {CATEGORIES.find((c) => c.key === activeCat)?.label}
            </span>
            . Use “adicionar ativo” para começar.
          </div>
        ) : (
          <div className="card !p-0 overflow-hidden">
            {assets.map((a) => (
              <RankingRow
                key={a.ticker}
                asset={a}
                expanded={expanded === a.ticker}
                onToggle={toggle}
                onRemove={handleRemove}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
