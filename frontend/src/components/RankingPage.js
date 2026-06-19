"use client";

/**
 * RankingPage — aba "Ranking de Aporte".
 *
 * Consome (mesmo host, URL relativa):
 *   GET    /api/ranking            → ranking por categoria (cache ~20min)
 *   GET    /api/market-bar         → barra de mercado (cache ~5min)
 *   GET    /api/ranking/universe   → universo editável
 *   POST   /api/ranking/universe   → adiciona ativo
 *   DELETE /api/ranking/universe?category=&ticker= → remove ativo
 *
 * Estética: tema "neon fintech" do app (tokens em tailwind.config / globals.css).
 */

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
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
  Minus,
  Trophy,
  X,
} from "lucide-react";
import dynamic from "next/dynamic";
// Lazy: o gráfico (recharts, pesado) só carrega quando o usuário clica num logo.
const AssetChartModal = dynamic(() => import("@/components/assets/AssetChartModal"), {
  ssr: false,
});

/* ------------------------------------------------------------------ */
/* Constantes                                                          */
/* ------------------------------------------------------------------ */

const CATEGORIES = [
  { key: "BR", label: "Brasil" },
  { key: "US", label: "EUA" },
  { key: "ETF", label: "ETF" },
  { key: "EUROPE", label: "Europa" },
  { key: "COMMODITY", label: "Commodities" },
  { key: "CRYPTO", label: "Crypto" },
];
const CAT_LABEL = Object.fromEntries(CATEGORIES.map((c) => [c.key, c.label]));
const BUCKETS = ["ANCORA", "GERADOR", "ACELERADOR", "TATICO", "RESERVA"];

// Veredito → estilo (cores neon do tema).
const VERDICT_STYLE = {
  "COMPRAR FORTE": "text-success bg-success/10 border-success/40",
  COMPRAR: "text-primary bg-primary/10 border-primary/40",
  JUSTO: "text-warning bg-warning/10 border-warning/30",
  ESPECULATIVO: "text-danger bg-danger/10 border-danger/40",
  ESTICADO: "text-text-muted bg-surface-2 border-border",
  RESERVA: "text-[#C084FC] bg-[#C084FC]/10 border-[#C084FC]/40",
};
const VERDICT_DOT = {
  "COMPRAR FORTE": "bg-success shadow-[0_0_8px_#00FF88]",
  COMPRAR: "bg-primary shadow-[0_0_8px_#00E5FF]",
  JUSTO: "bg-warning",
  ESPECULATIVO: "bg-danger",
  ESTICADO: "bg-text-muted",
  RESERVA: "bg-[#C084FC]",
};
const BUYABLE = new Set(["COMPRAR FORTE", "COMPRAR"]);

const MARKET_STATUS_STYLE = {
  good: "text-success",
  neutral: "text-text-primary",
  warning: "text-warning",
  danger: "text-danger",
};

const QUALITY_LABELS = {
  beta: "Beta",
  max_drawdown: "Máx queda",
  sharpe: "Sharpe",
  cagr: "CAGR",
  crescimento_5a: "Cresc. 5a",
  tsr_esperado: "TSR esper.",
  dividendos: "Dividendos",
  fundamentos: "Fundamentos",
};
const MOMENTUM_LABELS = {
  stoch_lento_semanal: "Stoch lento sem.",
  desconto_x_reversao: "Desconto × reversão",
  distancia_ma200: "Distância MM200",
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
  const n = Number(v);
  return n >= 1000 ? n.toLocaleString("pt-BR", { maximumFractionDigits: 0 }) : n.toFixed(digits);
}
function scoreColor(score) {
  if (score >= 70) return "bg-success";
  if (score >= 45) return "bg-warning";
  return "bg-danger";
}

// Preço formatado conforme a moeda do ativo.
function fmtPrice(v, currency) {
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  const n = Number(v);
  const sym = currency === "BRL" ? "R$" : "$";
  const dec = n >= 1000 ? 0 : 2;
  return `${sym} ${n.toLocaleString("pt-BR", { minimumFractionDigits: dec, maximumFractionDigits: dec })}`;
}

/* ------------------------------------------------------------------ */
/* Logo do ticker (fontes grátis + fallback de letra)                  */
/* ------------------------------------------------------------------ */

// Símbolo "limpo" (sem .SA / -USD) p/ montar URLs e a inicial do fallback.
function baseSymbol(ticker) {
  return String(ticker || "")
    .toUpperCase()
    .replace(/\.SA$/, "")
    .replace(/-USD$/, "")
    .replace(/[=^].*$/, "");
}

// Lista ordenada de URLs de logo a tentar (cai p/ a próxima no onError).
function logoSources(ticker) {
  const t = String(ticker || "").toUpperCase();
  const base = baseSymbol(t);
  const out = [];
  if (t.endsWith("-USD")) {
    // Cripto: cryptocurrency-icons CDN (grátis, por símbolo em minúsculo).
    out.push(`https://cdn.jsdelivr.net/gh/spothq/cryptocurrency-icons@master/svg/color/${base.toLowerCase()}.svg`);
  } else {
    // Ações US/Europa/BR: FMP image endpoint (grátis, app já usa FMP).
    // Para .SA o FMP pode não ter — cai no fallback de letra via onError.
    out.push(`https://financialmodelingprep.com/image-stock/${t}.png`);
    if (t.endsWith(".SA")) {
      // tentativa adicional sem sufixo, alguns provedores indexam pelo código puro
      out.push(`https://financialmodelingprep.com/image-stock/${base}.png`);
    }
  }
  return out;
}

// Cor determinística (do tema) p/ o avatar de letra, derivada do ticker.
const AVATAR_COLORS = ["#00E5FF", "#00FF88", "#C084FC", "#FFB020", "#FF4D4D", "#38BDF8"];
function avatarColor(ticker) {
  const s = String(ticker || "");
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

function TickerLogo({ ticker, size = 26 }) {
  const sources = useMemo(() => logoSources(ticker), [ticker]);
  const [idx, setIdx] = useState(0);
  const failed = idx >= sources.length;
  const letter = baseSymbol(ticker).charAt(0) || "?";
  const color = avatarColor(ticker);

  // reseta quando o ticker muda
  const lastTicker = useRef(ticker);
  if (lastTicker.current !== ticker) {
    lastTicker.current = ticker;
    if (idx !== 0) setIdx(0);
  }

  const dim = { width: size, height: size };

  if (failed) {
    return (
      <span
        className="shrink-0 rounded-full flex items-center justify-center font-bold"
        style={{
          ...dim,
          fontSize: size * 0.42,
          color,
          background: `${color}1f`,
          border: `1px solid ${color}55`,
        }}
        aria-hidden
      >
        {letter}
      </span>
    );
  }

  return (
    <img
      src={sources[idx]}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      onError={() => setIdx((i) => i + 1)}
      className="shrink-0 rounded-full object-contain bg-white/90 border border-border/60"
      style={dim}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Barra de mercado                                                    */
/* ------------------------------------------------------------------ */

function MarketCell({ item }) {
  const chg = item.day_change_pct ?? 0;
  const flat = Math.abs(chg) < 0.005;
  const statusCls = MARKET_STATUS_STYLE[item.status] || "text-text-primary";
  return (
    <div className="flex flex-col px-3.5 py-2 min-w-[112px] border-r border-border/60 last:border-r-0">
      <div className="flex items-center gap-1.5 mb-0.5">
        <span className="text-[10px] uppercase tracking-wider text-text-muted font-medium">
          {item.label}
        </span>
        {item.capitulation && (
          <span className="px-1.5 py-px rounded text-[9px] font-semibold text-danger bg-danger/15 border border-danger/40 shadow-[0_0_8px_rgba(255,77,77,0.35)]">
            capitulação
          </span>
        )}
        {!item.capitulation && item.key === "VIX" && item.status === "warning" && (
          <span className="px-1.5 py-px rounded text-[9px] font-semibold text-warning bg-warning/15 border border-warning/40">
            elevado
          </span>
        )}
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className={`text-sm font-mono font-semibold ${statusCls}`}>{fmtNum(item.value, 2)}</span>
        <span
          className={`text-[11px] font-mono flex items-center gap-0.5 ${
            flat ? "text-text-muted" : chg > 0 ? "text-success" : "text-danger"
          }`}
        >
          {flat ? <Minus size={9} /> : chg > 0 ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
          {fmtPct(chg, 2)}
        </span>
      </div>
      {item.context && <span className="text-[10px] text-text-muted truncate">{item.context}</span>}
    </div>
  );
}

function MarketBar({ items, loading, error }) {
  return (
    <div className="sticky top-0 z-20 bg-surface/90 backdrop-blur-md border-b border-border">
      {loading ? (
        <div className="flex items-center gap-2 px-4 py-2.5 text-xs text-text-secondary">
          <Loader2 size={13} className="animate-spin text-primary" /> lendo o mercado…
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 px-4 py-2.5 text-xs text-danger">
          <AlertCircle size={13} /> {error}
        </div>
      ) : (
        <div className="flex items-center">
          <div className="flex items-center gap-1.5 px-3 py-2 border-r border-border/60 text-text-muted shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse shadow-[0_0_8px_#00FF88]" />
            <span className="text-[10px] uppercase tracking-wider font-medium hidden sm:inline">mercado</span>
          </div>
          <div className="flex overflow-x-auto">
            {items.map((it) => (
              <MarketCell key={it.key} item={it} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Melhores aportes (cards de destaque)                                */
/* ------------------------------------------------------------------ */

function BestBuyCard({ asset, top }) {
  const vCls = VERDICT_STYLE[asset.verdict] || "text-text-secondary bg-surface-2 border-border";
  return (
    <div
      className={`relative rounded-xl p-3.5 bg-gradient-card border transition-shadow ${
        top
          ? "border-success/50 shadow-[0_0_24px_rgba(0,255,136,0.18)]"
          : "border-border hover:border-border-light"
      }`}
    >
      {top && (
        <div className="absolute -top-2 left-3 flex items-center gap-1 px-2 py-0.5 rounded-full bg-success text-background text-[10px] font-bold">
          <Trophy size={10} /> melhor agora
        </div>
      )}
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] uppercase tracking-wider text-text-muted">{CAT_LABEL[asset._cat]}</span>
        <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${vCls}`}>
          {asset.verdict}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <TickerLogo ticker={asset.ticker} size={24} />
        <span className="text-lg font-bold text-text-primary tracking-tight">{asset.ticker}</span>
        <span className="text-[11px] text-text-muted truncate">{asset.name}</span>
      </div>
      {asset.current_price !== null && asset.current_price !== undefined && (
        <div className="flex items-baseline gap-2 mt-1">
          <span className="text-sm font-mono font-semibold text-text-primary">
            {fmtPrice(asset.current_price, asset.currency)}
          </span>
          {asset.day_change_pct !== null && asset.day_change_pct !== undefined && (
            <span
              className={`text-[11px] font-mono ${
                asset.day_change_pct > 0 ? "text-success" : asset.day_change_pct < 0 ? "text-danger" : "text-text-muted"
              }`}
            >
              {fmtPct(asset.day_change_pct, 2)}
            </span>
          )}
        </div>
      )}
      <div className="flex items-center gap-3 mt-2 text-[11px] font-mono">
        <span className="text-text-secondary">
          Q <span className="text-success font-semibold">{Math.round(asset.quality)}</span>
        </span>
        <span className="text-text-secondary">
          M <span className="text-primary font-semibold">{Math.round(asset.momentum)}</span>
        </span>
        <span className="ml-auto text-text-muted">{asset._mult}x</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Score bar + Stat                                                    */
/* ------------------------------------------------------------------ */

function ScoreBar({ value, label, compact }) {
  const v = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <div className="w-full">
      {label && (
        <div className="flex items-center justify-between mb-1">
          <span className={`${compact ? "text-[10px]" : "text-[11px]"} text-text-secondary`}>{label}</span>
          <span className="text-[11px] font-mono font-semibold text-text-primary">{Math.round(v)}</span>
        </div>
      )}
      <div className="h-1.5 w-full rounded-full bg-surface-3 overflow-hidden">
        <div className={`h-full rounded-full ${scoreColor(v)} transition-all`} style={{ width: `${v}%` }} />
      </div>
    </div>
  );
}

function Stat({ label, value, accent }) {
  return (
    <div className="bg-surface-2 rounded-lg px-2.5 py-2 border border-border/50">
      <div className="text-[10px] text-text-muted leading-none mb-1.5">{label}</div>
      <div className={`text-sm font-mono font-semibold ${accent || "text-text-primary"}`}>{value}</div>
    </div>
  );
}

function FactorGrid({ data, labels }) {
  const entries = Object.entries(data || {});
  if (entries.length === 0) return null;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {entries.map(([k, v]) => (
        <div key={k} className="bg-surface-2 rounded-lg px-2.5 py-2 border border-border/50">
          <ScoreBar value={v} label={labels?.[k] || k} compact />
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Linha do ranking                                                    */
/* ------------------------------------------------------------------ */

function RankingRow({ asset, expanded, onToggle, onRemove, onLogoClick }) {
  const verdictCls = VERDICT_STYLE[asset.verdict] || "text-text-secondary bg-surface-2 border-border";
  const dotCls = VERDICT_DOT[asset.verdict] || "bg-text-muted";
  const stops = asset.staggered_stops || {};

  return (
    <div className={`border-b border-border/70 last:border-b-0 ${expanded ? "bg-surface-2/30" : ""}`}>
      <button
        onClick={() => onToggle(asset.ticker)}
        className="w-full text-left grid grid-cols-12 items-center gap-2 px-3 sm:px-4 py-3 hover:bg-surface-2/40 transition-colors"
      >
        <div className="col-span-5 sm:col-span-3 min-w-0">
          <div className="flex items-center gap-2">
            <span
              role="button"
              title="Ver gráfico"
              onClick={(e) => {
                e.stopPropagation();
                onLogoClick && onLogoClick(asset.ticker);
              }}
              className="cursor-pointer hover:opacity-80 hover:ring-2 hover:ring-primary/40 rounded-full transition-all"
            >
              <TickerLogo ticker={asset.ticker} size={26} />
            </span>
            <span className={`w-2 h-2 rounded-full shrink-0 ${dotCls}`} />
            <span className="font-bold text-text-primary text-sm truncate">{asset.ticker}</span>
            {asset.dividend_yield > 0 && (
              <span className="hidden sm:inline-flex items-center text-[9px] font-semibold text-success bg-success/10 border border-success/30 rounded px-1.5 py-0.5 whitespace-nowrap">
                DY {fmtPct(asset.dividend_yield).replace("+", "")}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5 pl-9">
            <span className="text-xs text-text-muted truncate">{asset.name}</span>
            <span className="text-[9px] uppercase tracking-wide text-text-muted bg-surface-3 rounded px-1.5 py-0.5 shrink-0">
              {asset.bucket}
            </span>
          </div>
        </div>

        <div className="col-span-4 sm:col-span-2 flex flex-col gap-1">
          <span className={`inline-block self-start px-2 py-1 rounded-md text-[11px] font-semibold border whitespace-nowrap ${verdictCls}`}>
            {asset.verdict}
          </span>
          {asset.dividend_yield > 0 && (
            <span className="sm:hidden inline-flex self-start items-center text-[9px] font-semibold text-success bg-success/10 border border-success/30 rounded px-1.5 py-0.5">
              DY {fmtPct(asset.dividend_yield).replace("+", "")}
            </span>
          )}
        </div>

        <div className="col-span-2 hidden sm:flex flex-col justify-center">
          <div className="text-sm font-mono font-semibold text-text-primary leading-none">
            {fmtPrice(asset.current_price, asset.currency)}
          </div>
          {asset.day_change_pct !== null && asset.day_change_pct !== undefined && (
            <div
              className={`mt-1 text-[11px] font-mono flex items-center gap-0.5 ${
                Math.abs(asset.day_change_pct) < 0.005
                  ? "text-text-muted"
                  : asset.day_change_pct > 0
                  ? "text-success"
                  : "text-danger"
              }`}
            >
              {Math.abs(asset.day_change_pct) < 0.005 ? (
                <Minus size={9} />
              ) : asset.day_change_pct > 0 ? (
                <TrendingUp size={9} />
              ) : (
                <TrendingDown size={9} />
              )}
              {fmtPct(asset.day_change_pct, 2)}
            </div>
          )}
        </div>

        <div className="col-span-2 hidden sm:flex flex-col gap-1.5 justify-center">
          <ScoreBar value={asset.quality} label="Qualidade" compact />
          <ScoreBar value={asset.momentum} label="Momento" compact />
        </div>

        <div className="col-span-3 sm:col-span-3 lg:col-span-1 flex items-center justify-end gap-2 sm:gap-3">
          <div className="text-right">
            <div className="text-[9px] uppercase tracking-wide text-text-muted leading-none">rank</div>
            <div className="text-base font-mono font-bold text-primary leading-tight">{fmtNum(asset.rank, 1)}</div>
          </div>
          <span className="text-text-muted">
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </span>
        </div>
      </button>

      {expanded && (
        <div className="px-3 sm:px-4 pb-4 pt-1 space-y-4">
          {/* Preço / variação no mobile (escondidos no header < sm) */}
          <div className="flex items-center gap-4 sm:hidden">
            <div className="text-base font-mono font-semibold text-text-primary">
              {fmtPrice(asset.current_price, asset.currency)}
            </div>
            {asset.day_change_pct !== null && asset.day_change_pct !== undefined && (
              <div
                className={`text-xs font-mono flex items-center gap-0.5 ${
                  Math.abs(asset.day_change_pct) < 0.005
                    ? "text-text-muted"
                    : asset.day_change_pct > 0
                    ? "text-success"
                    : "text-danger"
                }`}
              >
                {asset.day_change_pct > 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                {fmtPct(asset.day_change_pct, 2)}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 lg:hidden">
            <ScoreBar value={asset.quality} label="Qualidade" />
            <ScoreBar value={asset.momentum} label="Momento" />
          </div>

          <div>
            <div className="text-[10px] uppercase tracking-wider text-text-muted mb-2">Dados de entrada</div>
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-2">
              <Stat label="Stoch sem." value={fmtNum(asset.slow_stoch_weekly, 0)} />
              <Stat label="Desc. topo" value={fmtPct(asset.discount_from_top)} />
              <Stat label="Dist. MM200" value={fmtPct(asset.distance_ma200)} />
              <Stat label="Beta" value={fmtNum(asset.beta)} />
              <Stat label="CAGR" value={fmtPct(asset.cagr, 0)} />
              <Stat
                label={asset.sharpe < 0 ? "Sharpe ⚠" : "Sharpe"}
                value={fmtNum(asset.sharpe)}
                accent={asset.sharpe < 0 ? "text-warning" : undefined}
              />
              <Stat label="Div. yield" value={fmtPct(asset.dividend_yield)} />
            </div>
          </div>

          <div>
            <div className="text-[10px] uppercase tracking-wider text-text-muted mb-2">
              Qualidade — <span className="text-success font-semibold">{Math.round(asset.quality)}</span> / 100
            </div>
            <FactorGrid data={asset.quality_breakdown} labels={QUALITY_LABELS} />
          </div>

          <div>
            <div className="text-[10px] uppercase tracking-wider text-text-muted mb-2">
              Momento — <span className="text-primary font-semibold">{Math.round(asset.momentum)}</span> / 100
            </div>
            <FactorGrid data={asset.momentum_breakdown} labels={MOMENTUM_LABELS} />
          </div>

          <div>
            <div className="text-[10px] uppercase tracking-wider text-text-muted mb-2">
              Alavancagem &amp; saída escalonada
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <Stat label="Multiplicador" value={`${fmtNum(asset.leverage, 1)}x`} accent="text-primary" />
              <Stat label="Stop 1 (vende ⅓)" value={fmtPct(-stops.stop_1_pct)} accent="text-warning" />
              <Stat label="Stop 2 (vende ⅓)" value={fmtPct(-stops.stop_2_pct)} accent="text-warning" />
              <Stat label="Liquidação" value={fmtPct(-stops.liquidation_pct)} accent="text-danger" />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={() => onRemove(asset)}
              className="flex items-center gap-1.5 text-xs text-text-muted hover:text-danger transition-colors"
            >
              <Trash2 size={13} /> remover do universo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Form de adição                                                      */
/* ------------------------------------------------------------------ */

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
    <form onSubmit={submit} className="card-sm mb-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-text-primary">Adicionar ativo ao universo</span>
        <button type="button" onClick={onClose} className="p-1 text-text-muted hover:text-text-primary">
          <X size={16} />
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div>
          <label className="label">Ticker</label>
          <input className="input" placeholder="XPTO3.SA" value={ticker} onChange={(e) => setTicker(e.target.value)} autoFocus />
        </div>
        <div>
          <label className="label">Nome</label>
          <input className="input" placeholder="Xpto S.A." value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="label">Categoria</label>
          <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map((c) => (
              <option key={c.key} value={c.key}>{c.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Bucket</label>
          <select className="input" value={bucket} onChange={(e) => setBucket(e.target.value)}>
            {BUCKETS.map((b) => (
              <option key={b} value={b}>{b}</option>
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
  const [ranking, setRanking] = useState(null);
  const [rankLoading, setRankLoading] = useState(true);
  const [rankError, setRankError] = useState("");
  const [market, setMarket] = useState([]);
  const [marketLoading, setMarketLoading] = useState(true);
  const [marketError, setMarketError] = useState("");
  const [expanded, setExpanded] = useState(null);
  const [chartTicker, setChartTicker] = useState(null); // gráfico (modal) ao clicar no logo
  const [showAdd, setShowAdd] = useState(false);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");

  const fetchRanking = useCallback(async () => {
    setRankLoading(true);
    setRankError("");
    try {
      const res = await fetch("/api/ranking", { credentials: "include" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setRanking(await res.json());
    } catch (e) {
      setRankError("Não foi possível calcular o ranking agora. Tente novamente em instantes.");
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
      await fetchRanking();
    } catch (e) {
      setAddError("Erro ao adicionar ativo. Verifique o ticker e tente de novo.");
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (asset) => {
    const ok = window.confirm(`Remover ${asset.ticker} (${asset.name}) do universo de ${activeCat}?`);
    if (!ok) return;
    try {
      const url = `/api/ranking/universe?category=${encodeURIComponent(activeCat)}&ticker=${encodeURIComponent(asset.ticker)}`;
      const res = await fetch(url, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await fetchRanking();
    } catch (e) {
      setRankError("Erro ao remover o ativo. Tente novamente.");
    }
  };

  const toggle = (ticker) => setExpanded((cur) => (cur === ticker ? null : ticker));

  // Melhores aportes agora — top compráveis de TODAS as categorias.
  const bestBuys = useMemo(() => {
    const cats = ranking?.categories || {};
    const all = Object.entries(cats).flatMap(([catKey, c]) =>
      (c?.assets || []).map((a) => ({ ...a, _cat: catKey, _mult: c.multiplier }))
    );
    return all
      .filter((a) => BUYABLE.has(a.verdict))
      .sort((a, b) => (b.rank ?? 0) - (a.rank ?? 0))
      .slice(0, 4);
  }, [ranking]);

  const cat = ranking?.categories?.[activeCat];
  const assets = cat?.assets || [];

  return (
    <div className="flex flex-col h-full bg-background text-text-primary">
      <MarketBar items={market} loading={marketLoading} error={marketError} />

      <div className="p-4 sm:p-6 max-w-6xl mx-auto w-full">
        {/* Cabeçalho */}
        <div className="flex items-end justify-between mb-5 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <span className="bg-gradient-primary bg-clip-text text-transparent">Ranking de Aporte</span>
            </h1>
            <p className="text-sm text-text-secondary mt-1">
              Onde colocar o próximo aporte — qualidade × momento, por categoria.
            </p>
          </div>
          <button onClick={fetchRanking} disabled={rankLoading} className="btn-ghost flex items-center gap-2 text-sm">
            <RefreshCw size={14} className={rankLoading ? "animate-spin" : ""} /> Recalcular
          </button>
        </div>

        {/* Melhores aportes */}
        {!rankLoading && !rankError && bestBuys.length > 0 && (
          <div className="mb-6">
            <div className="text-[11px] uppercase tracking-wider text-text-muted mb-2 flex items-center gap-1.5">
              <Trophy size={12} className="text-success" /> melhores aportes agora
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {bestBuys.map((a, i) => (
                <BestBuyCard key={`${a._cat}-${a.ticker}`} asset={a} top={i === 0} />
              ))}
            </div>
          </div>
        )}

        {/* Chips de categoria */}
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
                className={`px-4 py-1.5 rounded-full text-sm whitespace-nowrap border transition-all ${
                  active
                    ? "bg-primary text-background border-primary font-semibold shadow-[0_0_16px_rgba(0,229,255,0.3)]"
                    : "bg-surface-2 text-text-secondary border-border hover:text-text-primary hover:border-border-light"
                }`}
              >
                {c.label}
              </button>
            );
          })}
        </div>

        {/* Cabeçalho da categoria */}
        {cat && (
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-text-secondary">regime</span>
              <span className="px-2 py-0.5 rounded-md bg-surface-2 border border-border font-semibold text-text-primary">
                {cat.regime}
              </span>
              <span className="text-text-secondary">·</span>
              <span className="px-2 py-0.5 rounded-md bg-primary/10 border border-primary/30 font-mono font-semibold text-primary">
                {cat.multiplier}x
              </span>
            </div>
            <button onClick={() => setShowAdd((s) => !s)} className="btn-ghost flex items-center gap-2 text-sm">
              <Plus size={14} /> adicionar ativo
            </button>
          </div>
        )}

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

        {/* Tabela / estados */}
        {rankLoading ? (
          <div className="card flex flex-col items-center justify-center gap-3 py-16 text-text-secondary">
            <Loader2 size={22} className="animate-spin text-primary" />
            <span>calculando ranking…</span>
            <span className="text-xs text-text-muted">primeira carga pode levar alguns segundos</span>
          </div>
        ) : rankError ? (
          <div className="bg-danger/10 border border-danger/30 rounded-xl px-4 py-3 flex items-center gap-2 text-sm text-danger">
            <AlertCircle size={14} /> {rankError}
            <button onClick={fetchRanking} className="ml-auto underline hover:no-underline">tentar de novo</button>
          </div>
        ) : !cat ? (
          <div className="card text-center py-16 text-text-secondary">Categoria sem dados no momento.</div>
        ) : assets.length === 0 ? (
          <div className="card text-center py-16 text-text-secondary">
            Nenhum ativo no universo de{" "}
            <span className="text-text-primary font-medium">{CAT_LABEL[activeCat]}</span>. Use “adicionar ativo”.
          </div>
        ) : (
          <div className="bg-surface border border-border rounded-xl overflow-hidden shadow-card">
            {assets.map((a) => (
              <RankingRow
                key={a.ticker}
                asset={a}
                expanded={expanded === a.ticker}
                onToggle={toggle}
                onRemove={handleRemove}
                onLogoClick={setChartTicker}
              />
            ))}
          </div>
        )}
      </div>

      {chartTicker && (
        <AssetChartModal ticker={chartTicker} onClose={() => setChartTicker(null)} />
      )}
    </div>
  );
}
