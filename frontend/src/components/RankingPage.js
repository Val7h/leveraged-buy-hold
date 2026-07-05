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
  ShoppingCart,
  CheckCircle2,
  Zap,
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
  // Camada 2 (momento de entrada) — chaves novas (renormalizadas; podem estar ausentes).
  desconto_reversao: "Desconto × reversão",
  tendencia_primaria: "Tendência primária",
  valuation_relativo: "Valuation relativo",
  osciladores: "Osciladores (divergência)",
  momentum_relativo: "Momentum relativo",
  estrutura: "Estrutura/suporte",
  // Retrocompat — chaves antigas (pré-refatoração da Camada 2).
  stoch_lento_semanal: "Stoch lento sem.",
  desconto_x_reversao: "Desconto × reversão",
  distancia_ma200: "Distância MM200",
};
// Camada 3 (alavancagem): fatores do score de aptidão pra alavancar.
const APTIDAO_LABELS = {
  max_dd: "Máx queda",
  maxdd: "Máx queda",
  sigma: "Volatilidade σ",
  gap: "Gap p/ teto",
  dy: "Dividendos",
  recuperacao: "Recuperação",
  recovery: "Recuperação",
  beta: "Beta",
};
// Rótulo legível do teto que limitou a alavancagem (leverage_teto_binding).
const TETO_BINDING_LABELS = {
  sigma: "volatilidade σ",
  regime: "regime de mercado",
  beta: "beta",
  gap: "gap p/ topo",
  GATE: "gate de aptidão",
  gate: "gate de aptidão",
};
// Crypto usa framework SEPARADO (Pal/Hayes/Woo): sobrevivência (qualidade) +
// regime/timing (momento). Rótulos próprios — fundamentos/dividendo/beta não se aplicam.
const CRYPTO_QUALITY_LABELS = {
  liquidez: "Liquidez (vol 24h)",
  marketcap_dominancia: "Market cap / Dom.",
  saude_onchain: "Saúde on-chain",
  lindy: "Lindy (idade)",
};
const CRYPTO_MOMENTUM_LABELS = {
  regime: "Regime liquidez",
  timing: "Timing",
  regime_dxy: "DXY",
  regime_carry_iene_usdjpy: "Carry iene (USD/JPY)",
  regime_regime_preco_btc: "Regime preço BTC",
  timing_funding_contrarian: "Funding (contrarian)",
  timing_tecnico_preco: "Técnico de preço",
  timing_stoch_lento_semanal: "Stoch lento sem.",
  timing_distancia_ma200: "Distância MM200",
  timing_desconto_x_reversao: "Desconto × reversão",
};
// Nome legível de cada fator OMITIDO (transparência: por que saiu do score).
const CRYPTO_OMIT_LABELS = {
  saude_onchain: "Saúde on-chain (z-score)",
  mvrv_z: "MVRV-Z",
  reserve_risk: "Reserve Risk",
  puell: "Puell Multiple",
  sopr: "SOPR",
  liquidez_global_fed_rrp_tga: "Liquidez global (Fed−RRP−TGA)",
  credito_china: "Crédito China",
  credito_hy_oas: "Crédito HY (OAS)",
  halving: "Halving",
  funding_contrarian: "Funding",
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

function FactorGrid({ data, labels, raw }) {
  const entries = Object.entries(data || {});
  if (entries.length === 0) return null;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {entries.map(([k, v]) => (
        <div key={k} className="bg-surface-2 rounded-lg px-2.5 py-2 border border-border/50">
          <ScoreBar value={v} label={labels?.[k] || k} compact />
          {raw && raw[k] != null && (
            <div className="text-[10px] font-mono text-text-secondary mt-1 leading-none">{raw[k]}</div>
          )}
        </div>
      ))}
    </div>
  );
}

// Valor bruto de cada fator (mostrado junto do score no detalhe).
function qualityRaw(a) {
  const r = {};
  if (a.max_dd != null) {
    let s =
      a.max_dd_full != null && Math.round(a.max_dd_full) !== Math.round(a.max_dd)
        ? `${Math.round(a.max_dd)}% (hist ${Math.round(a.max_dd_full)}%)`
        : `${Math.round(a.max_dd)}%`;
    if (a.recovered === false && a.years_since_trough != null) {
      s += a.years_since_trough > 3 ? ` · não voltou há ${a.years_since_trough}a ⚠` : ` · no fundo`;
    }
    r.max_drawdown = s;
  }
  if (a.sharpe != null) r.sharpe = Number(a.sharpe).toFixed(2);
  if (a.cagr != null) r.cagr = `${Math.round(a.cagr)}%/ano`;
  if (a.cagr != null) r.crescimento_5a = `${Math.round(a.cagr)}%/ano`;
  if (a.tsr_expected != null) r.tsr_esperado = `${Math.round(a.tsr_expected)}%`;
  if (a.dividend_yield != null) {
    r.dividendos =
      a.dy_avg10 != null
        ? `atual ${Number(a.dividend_yield).toFixed(1)}% · méd10 ${Number(a.dy_avg10).toFixed(1)}%` +
          (a.dy_worst_year != null ? ` · pior ${Number(a.dy_worst_year).toFixed(1)}%` : "")
        : `${Number(a.dividend_yield).toFixed(1)}%`;
  }
  if (a.beta != null) {
    const src = a.beta_source ? ` ·${a.beta_source}` : "";
    r.beta = Number(a.beta).toFixed(2) + (a.is_tatico ? " (tático)" : "") + src;
  }
  return r;
}
function momentumRaw(a) {
  const r = {};
  // Camada 2 (chaves novas): valor bruto sob a chave nova, quando há dado.
  if (a.discount_from_top != null) r.desconto_reversao = `-${Math.round(a.discount_from_top)}% topo`;
  if (a.distance_ma200 != null)
    r.tendencia_primaria = `${a.distance_ma200 > 0 ? "+" : ""}${Math.round(a.distance_ma200)}% MM200`;
  // Retrocompat (chaves antigas): se vier breakdown antigo, FactorGrid ainda casa o raw.
  if (a.stoch_k != null && a.stoch_d != null) r.stoch_lento_semanal = `%K ${a.stoch_k} · %D ${a.stoch_d}`;
  else if (a.slow_stoch_weekly != null) r.stoch_lento_semanal = `${Math.round(a.slow_stoch_weekly)}`;
  if (a.discount_from_top != null) r.desconto_x_reversao = `-${Math.round(a.discount_from_top)}% topo`;
  if (a.distance_ma200 != null)
    r.distancia_ma200 = `${a.distance_ma200 > 0 ? "+" : ""}${Math.round(a.distance_ma200)}% MM200`;
  return r;
}

/* ------------------------------------------------------------------ */
/* Helpers p/ badges novos                                             */
/* ------------------------------------------------------------------ */

function medalEmoji(rank) {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return null;
}

// Badge Q/M/A (Qualidade / Momento / Aptidão) com seta colorida.
function LayerBadge({ label, value }) {
  const v = Number(value) || 0;
  if (v >= 60) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-success bg-success/10 border border-success/30 rounded px-1.5 py-0.5">
        ↑ {label}
      </span>
    );
  }
  if (v >= 40) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-warning bg-warning/10 border border-warning/30 rounded px-1.5 py-0.5">
        → {label}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-text-muted bg-surface-3 border border-border rounded px-1.5 py-0.5">
      − {label}
    </span>
  );
}

// Badge de tier de sobrevivência baseado em composite_score ou score.
function SurvivalTierBadge({ asset }) {
  const score = asset.composite_score ?? asset.score ?? asset.quality ?? 0;
  const v = Number(score) || 0;
  if (v >= 75) {
    return (
      <span className="inline-flex items-center text-[9px] font-semibold text-[#C084FC] bg-[#C084FC]/10 border border-[#C084FC]/30 rounded px-1.5 py-0.5 shrink-0">
        Elite
      </span>
    );
  }
  if (v >= 55) {
    return (
      <span className="inline-flex items-center text-[9px] font-semibold text-success bg-success/10 border border-success/30 rounded px-1.5 py-0.5 shrink-0">
        Sólido
      </span>
    );
  }
  if (v >= 40) {
    return (
      <span className="inline-flex items-center text-[9px] font-semibold text-warning bg-warning/10 border border-warning/30 rounded px-1.5 py-0.5 shrink-0">
        Neutro
      </span>
    );
  }
  return (
    <span className="inline-flex items-center text-[9px] font-semibold text-danger bg-danger/10 border border-danger/30 rounded px-1.5 py-0.5 shrink-0">
      Frágil
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Linha do ranking                                                    */
/* ------------------------------------------------------------------ */

function RankingRow({ asset, position, expanded, onToggle, onRemove, onLogoClick, onBuy, showLeverage }) {
  const verdictCls = VERDICT_STYLE[asset.verdict] || "text-text-secondary bg-surface-2 border-border";
  const dotCls = VERDICT_DOT[asset.verdict] || "bg-text-muted";
  const stops = asset.staggered_stops || {};
  // Camada 3 ligada: ordena/exibe pelo rank alavancado (fallback p/ rank base).
  const displayRank = showLeverage
    ? asset.rank_alavancado ?? asset.rank
    : asset.rank;

  // Medal usa posição na lista (1-based), não o score de rank.
  const medal = medalEmoji(position);
  // Momentum: pode vir como momentum, opportunity_score ou momentum_score
  const momentumVal = asset.momentum ?? asset.opportunity_score ?? asset.momentum_score ?? 0;
  // Aptidao: Camada 3
  const aptidaoVal = asset.aptidao ?? null;

  return (
    <div className={`border-b border-border/70 last:border-b-0 ${expanded ? "bg-surface-2/30" : ""}`}>
      <button
        onClick={() => onToggle(asset.ticker)}
        className="w-full text-left grid grid-cols-12 items-center gap-2 px-3 sm:px-4 py-3 hover:bg-surface-2/40 transition-colors"
      >
        <div className="col-span-5 sm:col-span-3 min-w-0">
          <div className="flex items-center gap-2">
            {medal ? (
              <span className="shrink-0 text-base leading-none" aria-label={`Rank ${displayRank}`}>{medal}</span>
            ) : (
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
            )}
            {medal && (
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
            )}
            <span className={`w-2 h-2 rounded-full shrink-0 ${dotCls}`} />
            <span className="font-bold text-text-primary text-sm truncate">{asset.ticker}</span>
            {asset.dividend_yield > 0 && (
              <span className="hidden sm:inline-flex items-center text-[9px] font-semibold text-success bg-success/10 border border-success/30 rounded px-1.5 py-0.5 whitespace-nowrap">
                DY {fmtPct(asset.dividend_yield).replace("+", "")}
              </span>
            )}
          </div>
          {/* Q/M/A layer badges + Survival tier */}
          <div className="flex items-center gap-1 mt-0.5 pl-9 flex-wrap">
            <LayerBadge label="Q" value={asset.quality_score ?? asset.quality} />
            <LayerBadge label="M" value={momentumVal} />
            {aptidaoVal !== null && <LayerBadge label="A" value={aptidaoVal} />}
            <SurvivalTierBadge asset={asset} />
          </div>
          <div className="flex items-center gap-1.5 mt-0.5 pl-9">
            <span className="text-xs text-text-muted truncate">{asset.name}</span>
            <span className="text-[9px] uppercase tracking-wide text-text-muted bg-surface-3 rounded px-1.5 py-0.5 shrink-0">
              {asset.bucket}
            </span>
            {asset.is_tatico && (
              <span
                title="Cíclica descolada (commodity/idiossincrática): renda e beta menos confiáveis — position trade"
                className="text-[9px] uppercase tracking-wide text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded px-1.5 py-0.5 shrink-0"
              >
                tático
              </span>
            )}
            {asset.hist_curto && (
              <span
                title={`Histórico curto (${asset.hist_years} anos) — não testado em crises antigas (2008/2015)`}
                className="text-[9px] uppercase tracking-wide text-sky-400 bg-sky-500/10 border border-sky-500/30 rounded px-1.5 py-0.5 shrink-0"
              >
                não testado
              </span>
            )}
            {(asset.confidence === "BAIXA" || asset.confidence === "MEDIA") && (
              <span
                title={asset.confidence === "BAIXA"
                  ? "Confiança BAIXA — sem fundamentos e beta de regressão. Trate o score com cautela (não é 'mediano', é 'sem dados')."
                  : "Confiança MÉDIA — dados parciais (fundamentos OU beta publicado)."}
                className={`text-[9px] uppercase tracking-wide rounded px-1.5 py-0.5 shrink-0 border ${
                  asset.confidence === "BAIXA"
                    ? "text-red-400 bg-red-500/10 border-red-500/30"
                    : "text-amber-400 bg-amber-500/10 border-amber-500/30"}`}
              >
                conf {asset.confidence === "BAIXA" ? "baixa" : "média"}
              </span>
            )}
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
          {asset.leverage != null && (
            <div className="text-right">
              <div className="text-[9px] uppercase tracking-wide text-text-muted leading-none">
                {showLeverage ? "alav." : "recom."}
              </div>
              <div className={`text-base font-mono font-bold leading-tight flex items-center justify-end gap-0.5 ${
                showLeverage ? "text-[#C084FC]" : "text-primary"
              }`}>
                <Zap size={12} className={showLeverage ? "text-[#C084FC]" : "text-primary"} />
                {fmtNum(asset.leverage, 1)}x
              </div>
            </div>
          )}
          <div className="text-right">
            <div className="text-[9px] uppercase tracking-wide text-text-muted leading-none">
              {showLeverage ? "rank alav." : "rank"}
            </div>
            <div className="text-base font-mono font-bold text-primary leading-tight">{fmtNum(displayRank, 1)}</div>
          </div>
          {/* Botão explícito de gráfico — abre o AssetChartModal (afford. visível). */}
          <span
            role="button"
            title="Ver gráfico de preço"
            onClick={(e) => {
              e.stopPropagation();
              onLogoClick && onLogoClick(asset.ticker);
            }}
            className="hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold bg-surface-2 border border-border text-text-secondary hover:border-primary/50 hover:text-primary hover:bg-primary/5 transition-colors cursor-pointer whitespace-nowrap"
          >
            📈 gráfico
          </span>
          {/* Botão "Analisar →" — abre o screener de ativos com autorun */}
          <a
            href={`/assets?tickers=${encodeURIComponent(asset.ticker)}&autorun=1`}
            title="Analisar este ativo no screener"
            onClick={(e) => e.stopPropagation()}
            className="hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold bg-surface-2 border border-border text-text-secondary hover:border-success/50 hover:text-success hover:bg-success/5 transition-colors whitespace-nowrap"
          >
            Analisar →
          </a>
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
            {asset.is_crypto ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                <Stat label="Stoch sem." value={fmtNum(asset.slow_stoch_weekly, 0)} />
                <Stat label="Desc. topo" value={fmtPct(asset.discount_from_top)} />
                <Stat label="Dist. MM200" value={fmtPct(asset.distance_ma200)} />
                <Stat label="MC rank" value={asset.market_cap_rank != null ? `#${asset.market_cap_rank}` : "—"} />
                <Stat label="Dominância BTC" value={fmtPct(asset.btc_dominance, 1)} />
                <Stat label="Idade" value={asset.age_years != null ? `${asset.age_years}a` : "—"} />
                <Stat
                  label="Funding"
                  value={asset.funding_rate != null ? `${(asset.funding_rate * 100).toFixed(3)}%` : "—"}
                  accent={asset.funding_rate != null && asset.funding_rate < 0 ? "text-success" : undefined}
                />
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
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
            )}
          </div>

          <div>
            <div className="text-[10px] uppercase tracking-wider text-text-muted mb-2">
              {asset.is_crypto ? "Sobrevivência" : "Qualidade"} —{" "}
              <span className="text-success font-semibold">{Math.round(asset.quality)}</span> / 100
            </div>
            <FactorGrid
              data={asset.quality_breakdown}
              labels={asset.is_crypto ? CRYPTO_QUALITY_LABELS : QUALITY_LABELS}
              raw={asset.is_crypto ? undefined : qualityRaw(asset)}
            />
          </div>

          <div>
            <div className="text-[10px] uppercase tracking-wider text-text-muted mb-2">
              {asset.is_crypto ? "Regime + Timing" : "Momento"} —{" "}
              <span className="text-primary font-semibold">{Math.round(asset.momentum)}</span> / 100
            </div>
            <FactorGrid
              data={asset.momentum_breakdown}
              labels={asset.is_crypto ? CRYPTO_MOMENTUM_LABELS : MOMENTUM_LABELS}
              raw={asset.is_crypto ? undefined : momentumRaw(asset)}
            />
          </div>

          {asset.is_crypto && (
            <div className="space-y-2">
              {asset.circuit_breaker && (
                <div className="text-[11px] text-danger font-medium">
                  ⚡ Circuit breaker SOBREALAVANCADO (OI &gt; p90 E funding &gt; p90) — entradas travadas, sizing 1x
                </div>
              )}
              <div className="text-[10px] text-text-muted leading-relaxed">
                Stop por <span className="text-warning">fechamento SEMANAL</span> (nunca intraday — wicks liquidam no fundo).
                {asset.leverage_cap_asset != null && (
                  <> Teto por ativo: <span className="text-primary">{asset.leverage_cap_asset}x</span>.</>
                )}
              </div>
              {asset.crypto_omitted &&
                (() => {
                  const all = [
                    ...(asset.crypto_omitted.survival || []),
                    ...(asset.crypto_omitted.regime || []),
                    ...(asset.crypto_omitted.timing || []),
                  ];
                  const seen = new Set();
                  const names = all
                    .filter((k) => !seen.has(k) && seen.add(k))
                    .map((k) => CRYPTO_OMIT_LABELS[k] || k);
                  if (names.length === 0) return null;
                  return (
                    <div className="text-[10px] text-text-muted leading-relaxed">
                      Fatores omitidos (sem fonte grátis confiável — pesos renormalizados):{" "}
                      <span className="text-text-secondary">{names.join(" · ")}</span>
                    </div>
                  );
                })()}
            </div>
          )}

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

          {/* Camada 3 ligada: detalhe da aptidão pra alavancar */}
          {showLeverage && (
            <div className="rounded-xl border border-[#C084FC]/30 bg-[#C084FC]/[0.04] p-3 space-y-3">
              <div className="text-[10px] uppercase tracking-wider text-[#C084FC] mb-1 flex items-center gap-1.5">
                <Zap size={12} /> Aptidão pra alavancar (Camada 3)
                {asset.aptidao != null && (
                  <span className="ml-auto text-text-primary font-semibold normal-case tracking-normal">
                    {Math.round(asset.aptidao)} / 100
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <Stat
                  label="Alavancagem sug."
                  value={asset.leverage != null ? `${fmtNum(asset.leverage, 1)}x` : "—"}
                  accent="text-[#C084FC]"
                />
                <Stat
                  label="Volatilidade σ"
                  value={asset.sigma_total != null ? `${fmtNum(asset.sigma_total, 0)}%` : "—"}
                />
                <Stat
                  label="Gap máx"
                  value={asset.gap_max != null ? fmtPct(asset.gap_max, 0) : "—"}
                />
                <Stat
                  label="Limitado por"
                  value={
                    asset.leverage_teto_binding
                      ? TETO_BINDING_LABELS[asset.leverage_teto_binding] || asset.leverage_teto_binding
                      : "—"
                  }
                  accent="text-warning"
                />
              </div>

              {asset.aptidao_breakdown && Object.keys(asset.aptidao_breakdown).length > 0 && (
                <FactorGrid data={asset.aptidao_breakdown} labels={APTIDAO_LABELS} />
              )}
            </div>
          )}

          <div className="flex justify-between items-center">
            <button
              onClick={() => onBuy(asset)}
              className="btn-primary flex items-center gap-2 text-sm"
            >
              <ShoppingCart size={14} /> Comprei — adicionar à carteira
            </button>
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
/* Modal "Comprei → adicionar à carteira"                              */
/* ------------------------------------------------------------------ */

function todayISO() {
  // YYYY-MM-DD no fuso local (sem puxar UTC e voltar um dia).
  const d = new Date();
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - off).toISOString().slice(0, 10);
}

function BuyToPortfolioModal({ asset, portfolios, onClose, onDone }) {
  const hasPortfolios = portfolios && portfolios.length > 0;
  const [portfolioId, setPortfolioId] = useState(hasPortfolios ? portfolios[0].id : "");
  const [shares, setShares] = useState("");
  const [avgPrice, setAvgPrice] = useState(
    asset.current_price != null ? String(asset.current_price) : ""
  );
  const [openedAt, setOpenedAt] = useState(todayISO());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(null); // {merged: bool}

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    const nShares = Number(shares);
    const nPrice = Number(avgPrice);
    if (!portfolioId) return setError("Selecione uma carteira.");
    if (!(nShares > 0)) return setError("Quantidade deve ser maior que zero.");
    if (!(nPrice > 0)) return setError("Preço médio deve ser maior que zero.");

    setSubmitting(true);
    try {
      const res = await fetch(`/api/v1/portfolio/${portfolioId}/positions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ticker: asset.ticker,
          shares: nShares,
          avg_price: nPrice,
          // Quantfury: alavancagem é MEDIDA pela carteira, não escolhida por posição.
          leverage: 1,
          opened_at: openedAt || undefined,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setDone({ merged: !!data?.merged });
      onDone?.();
    } catch (e) {
      setError("Não foi possível adicionar. Verifique os dados e tente de novo.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="card w-full max-w-md space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-text-primary flex items-center gap-2">
            <ShoppingCart size={15} className="text-primary" />
            Comprei {asset.ticker}
          </span>
          <button onClick={onClose} className="p-1 text-text-muted hover:text-text-primary">
            <X size={16} />
          </button>
        </div>

        {done ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <CheckCircle2 size={36} className="text-success" />
            <div className="text-sm text-text-primary">
              {done.merged
                ? `Posição de ${asset.ticker} consolidada na carteira (preço médio recalculado).`
                : `${asset.ticker} adicionado à carteira.`}
            </div>
            <button onClick={onClose} className="btn-ghost text-sm mt-1">Fechar</button>
          </div>
        ) : !hasPortfolios ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <AlertCircle size={28} className="text-warning" />
            <div className="text-sm text-text-secondary">
              Você ainda não tem carteira. Crie uma na aba <span className="text-text-primary font-medium">Portfólio</span> antes de registrar a compra.
            </div>
            <button onClick={onClose} className="btn-ghost text-sm mt-1">Entendi</button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            {portfolios.length > 1 && (
              <div>
                <label className="label">Carteira</label>
                <select
                  className="input"
                  value={portfolioId}
                  onChange={(e) => setPortfolioId(e.target.value)}
                >
                  {portfolios.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="label">Quantidade</label>
                <input
                  className="input"
                  type="number"
                  step="any"
                  min="0"
                  placeholder="100"
                  value={shares}
                  onChange={(e) => setShares(e.target.value)}
                  autoFocus
                />
              </div>
              <div>
                <label className="label">Preço médio {asset.currency === "BRL" ? "(R$)" : "($)"}</label>
                <input
                  className="input"
                  type="number"
                  step="any"
                  min="0"
                  value={avgPrice}
                  onChange={(e) => setAvgPrice(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="label">Data da compra</label>
              <input
                className="input"
                type="date"
                value={openedAt}
                max={todayISO()}
                onChange={(e) => setOpenedAt(e.target.value)}
              />
            </div>
            <p className="text-[11px] text-text-muted">
              A alavancagem não é por posição — é medida pela carteira (Quantfury). Se já houver
              {" "}{asset.ticker} na carteira, as posições são consolidadas (preço médio recalculado).
            </p>
            {error && (
              <div className="flex items-center gap-2 text-xs text-danger">
                <AlertCircle size={12} /> {error}
              </div>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary w-full flex items-center justify-center gap-2 text-sm"
            >
              {submitting ? <Loader2 size={14} className="animate-spin" /> : <ShoppingCart size={14} />}
              {submitting ? "Adicionando…" : "Adicionar à carteira"}
            </button>
          </form>
        )}
      </div>
    </div>
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
  const [portfolios, setPortfolios] = useState([]); // carteiras do usuário (destino do "Comprei")
  const [buyAsset, setBuyAsset] = useState(null);    // ativo escolhido para registrar compra
  // Camada 3 (alavancagem): overlay opcional. DESLIGADO por padrão — compra/venda
  // e ordem dependem só de qualidade+momento (rank base). Ligado, reordena pelo
  // melhor pick alavancável (rank_alavancado).
  const [showLeverage, setShowLeverage] = useState(false);
  // Filtro de mercado aplicado sobre a lista da categoria ativa.
  const [marketFilter, setMarketFilter] = useState("Todos");

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

  const fetchPortfolios = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/portfolio", { credentials: "include" });
      if (!res.ok) return; // 401/erro → sem carteira; modal trata o caso vazio
      const data = await res.json();
      if (Array.isArray(data)) setPortfolios(data);
    } catch {
      /* silencioso — "Comprei" mostra orientação se não houver carteira */
    }
  }, []);

  useEffect(() => {
    fetchRanking();
    fetchMarket();
    fetchPortfolios();
  }, [fetchRanking, fetchMarket, fetchPortfolios]);

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

  // Chave de rank conforme o modo: base (qualidade+momento) ou alavancado.
  // Fallback p/ rank base se rank_alavancado não vier (retrocompat).
  const rankKey = useCallback(
    (a) => (showLeverage ? a?.rank_alavancado ?? a?.rank ?? 0 : a?.rank ?? 0),
    [showLeverage]
  );

  // Melhores aportes agora — top compráveis de TODAS as categorias.
  const bestBuys = useMemo(() => {
    const cats = ranking?.categories || {};
    const all = Object.entries(cats).flatMap(([catKey, c]) =>
      (c?.assets || []).map((a) => ({ ...a, _cat: catKey, _mult: c.multiplier }))
    );
    return all
      .filter((a) => BUYABLE.has(a.verdict))
      .sort((a, b) => rankKey(b) - rankKey(a))
      .slice(0, 4);
  }, [ranking, rankKey]);

  const cat = ranking?.categories?.[activeCat];
  // Ordenação condicional: modo OFF mantém a ordem do backend (rank base, foco no
  // veredito). Modo ON reordena pelo rank_alavancado — a alavancagem reordena
  // cross-veredito (um COMPRAR alavancável 3x pode subir acima de um COMPRAR FORTE 1x).
  // Função que determina em qual "mercado" um ativo se encaixa para o filtro de chips.
  const assetMarket = useCallback((a) => {
    const ticker = String(a.ticker || "").toUpperCase();
    const cat = String(a._cat || activeCat || "").toUpperCase();
    if (cat === "CRYPTO" || ticker.endsWith("-USD")) return "Crypto";
    if (cat === "BR" || ticker.endsWith(".SA")) {
      // FII: sufixo 11 no código BR (heurística padrão B3)
      if (/\d{2}$/.test(ticker.replace(".SA", "")) && ticker.replace(".SA", "").length >= 6) return "FII";
      return "BR";
    }
    if (cat === "US" || cat === "ETF" || cat === "EUROPE" || cat === "COMMODITY") return "US";
    return "US";
  }, [activeCat]);

  const assets = useMemo(() => {
    const list = cat?.assets || [];
    let filtered = list;
    if (marketFilter !== "Todos") {
      filtered = list.filter((a) => assetMarket(a) === marketFilter);
    }
    if (!showLeverage) return filtered;
    return [...filtered].sort((a, b) => rankKey(b) - rankKey(a));
  }, [cat, showLeverage, rankKey, marketFilter, assetMarket]);

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
            {showLeverage && (
              <>
                <p className="text-xs text-[#C084FC] mt-1 flex items-center gap-1.5">
                  <Zap size={11} /> ranking reordenado pelo melhor pick alavancável
                </p>
                <p className="text-[11px] text-text-muted mt-1 max-w-xl leading-relaxed">
                  A alavancagem por ativo <span className="text-text-secondary font-medium">NÃO</span> considera sua
                  carteira atual. A rede de sobrevivência agregada (cap 2,5x) está na aba{" "}
                  <span className="text-text-secondary font-medium">Portfólio</span> — alavanque por lá.
                </p>
              </>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Toggle Camada 3 (alavancagem) — overlay opcional, OFF por padrão. */}
            <button
              type="button"
              role="switch"
              aria-checked={showLeverage}
              onClick={() => setShowLeverage((s) => !s)}
              title={
                showLeverage
                  ? "Alavancagem ligada — ranking reordenado pelo melhor pick alavancável"
                  : "Compra/venda e ordem dependem só de qualidade × momento. Ligue p/ reordenar pela alavancagem."
              }
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm border transition-all ${
                showLeverage
                  ? "bg-[#C084FC]/15 text-[#C084FC] border-[#C084FC]/50 shadow-[0_0_16px_rgba(192,132,252,0.25)] font-semibold"
                  : "bg-surface-2 text-text-secondary border-border hover:text-text-primary hover:border-border-light"
              }`}
            >
              <Zap size={14} className={showLeverage ? "text-[#C084FC]" : "text-text-muted"} />
              <span className="whitespace-nowrap">Alavancagem (Camada 3)</span>
              <span
                className={`relative inline-flex h-4 w-7 shrink-0 items-center rounded-full transition-colors ${
                  showLeverage ? "bg-[#C084FC]" : "bg-surface-3"
                }`}
              >
                <span
                  className={`inline-block h-3 w-3 transform rounded-full bg-background transition-transform ${
                    showLeverage ? "translate-x-3.5" : "translate-x-0.5"
                  }`}
                />
              </span>
            </button>
            <button onClick={fetchRanking} disabled={rankLoading} className="btn-ghost flex items-center gap-2 text-sm">
              <RefreshCw size={14} className={rankLoading ? "animate-spin" : ""} /> Recalcular
            </button>
          </div>
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

        {/* Filtro de mercado */}
        {!rankLoading && !rankError && cat && (
          <div className="flex gap-2 overflow-x-auto pb-2 mb-3">
            {["Todos", "BR", "US", "FII", "Crypto"].map((mkt) => {
              const active = marketFilter === mkt;
              return (
                <button
                  key={mkt}
                  onClick={() => setMarketFilter(mkt)}
                  className={`px-3 py-1 rounded-full text-xs whitespace-nowrap border transition-all ${
                    active
                      ? "bg-success/20 text-success border-success/50 font-semibold shadow-[0_0_10px_rgba(0,255,136,0.15)]"
                      : "bg-surface-2 text-text-secondary border-border hover:text-text-primary hover:border-border-light"
                  }`}
                >
                  {mkt}
                </button>
              );
            })}
          </div>
        )}

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
            {assets.map((a, i) => (
              <RankingRow
                key={a.ticker}
                asset={a}
                position={i + 1}
                expanded={expanded === a.ticker}
                onToggle={toggle}
                onRemove={handleRemove}
                onLogoClick={setChartTicker}
                onBuy={setBuyAsset}
                showLeverage={showLeverage}
              />
            ))}
          </div>
        )}
      </div>

      {chartTicker && (
        <AssetChartModal ticker={chartTicker} onClose={() => setChartTicker(null)} />
      )}

      {buyAsset && (
        <BuyToPortfolioModal
          asset={buyAsset}
          portfolios={portfolios}
          onClose={() => setBuyAsset(null)}
          onDone={fetchPortfolios}
        />
      )}
    </div>
  );
}
