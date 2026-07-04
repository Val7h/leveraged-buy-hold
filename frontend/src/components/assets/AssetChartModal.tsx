"use client";
import { useEffect, useState } from "react";
import { assetsApi } from "@/lib/api";
import { formatCurrency, cn } from "@/lib/utils";
import TickerLogo from "@/components/ui/TickerLogo";
import {
  ComposedChart, Line, Area, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Legend, Brush,
} from "recharts";
import { X, RefreshCw, TrendingUp, TrendingDown, AlertTriangle, ShieldAlert } from "lucide-react";

interface AssetChartModalProps {
  ticker: string;
  onClose: () => void;
  leverage?: number;
  avgPrice?: number;
}

const PERIODS = ["3mo", "6mo", "1y", "2y", "5y"] as const;
const PERIOD_LABELS: Record<string, string> = {
  "3mo": "3M", "6mo": "6M", "1y": "1A", "2y": "2A", "5y": "5A",
};
const PERIOD_VISIBLE_DAYS: Record<string, number> = {
  "3mo": 93, "6mo": 186, "1y": 366, "2y": 732, "5y": 1830,
};
const FETCH_PERIOD: Record<string, string> = {
  "3mo": "2y", "6mo": "2y", "1y": "2y", "2y": "5y", "5y": "10y",
};

// ── Utilitários de cálculo ────────────────────────────────────────────────────

function computeMA(data: any[], key: string, period: number): (number | null)[] {
  return data.map((_, i) => {
    if (i < period - 1) return null;
    const slice = data.slice(i - period + 1, i + 1);
    const avg = slice.reduce((s: number, d: any) => s + d[key], 0) / period;
    return Math.round(avg * 100) / 100;
  });
}

// Bollinger Bands (20,2): envelope de volatilidade — "o preço está caro/barato
// relativamente ao seu próprio histórico recente?" Mais útil que desconto estático
// da MM200 pois considera o regime de volatilidade do ativo.
function computeBB(data: any[], key: string, period = 20, nStd = 2): { upper: (number | null)[], lower: (number | null)[] } {
  const upper: (number | null)[] = new Array(data.length).fill(null);
  const lower: (number | null)[] = new Array(data.length).fill(null);
  for (let i = period - 1; i < data.length; i++) {
    const slice = data.slice(i - period + 1, i + 1).map((d: any) => d[key] as number);
    const mean = slice.reduce((s, v) => s + v, 0) / period;
    const std = Math.sqrt(slice.reduce((s, v) => s + (v - mean) ** 2, 0) / period);
    upper[i] = Math.round((mean + nStd * std) * 100) / 100;
    lower[i] = Math.round((mean - nStd * std) * 100) / 100;
  }
  return { upper, lower };
}

function isoWeekKey(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00Z");
  const day = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - day + 3);
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round(
    ((d.getTime() - firstThursday.getTime()) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7
  );
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function resampleWeekly(daily: { date: string; close: number }[]): { date: string; close: number }[] {
  const lastByWeek = new Map<string, { date: string; close: number }>();
  for (const d of daily) {
    if (d == null || typeof d.close !== "number" || !isFinite(d.close)) continue;
    lastByWeek.set(isoWeekKey(d.date), { date: d.date, close: d.close });
  }
  return Array.from(lastByWeek.values());
}

function computeRSI(data: { close: number }[], period = 14): (number | null)[] {
  const result: (number | null)[] = new Array(data.length).fill(null);
  if (data.length <= period) return result;
  let avgGain = 0, avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    const diff = data[i].close - data[i - 1].close;
    avgGain += diff > 0 ? diff : 0;
    avgLoss += diff < 0 ? -diff : 0;
  }
  avgGain /= period; avgLoss /= period;
  const rsiAt = (g: number, l: number) => {
    const rs = l === 0 ? Infinity : g / l;
    return Math.round((100 - 100 / (1 + rs)) * 10) / 10;
  };
  result[period] = rsiAt(avgGain, avgLoss);
  for (let i = period + 1; i < data.length; i++) {
    const diff = data[i].close - data[i - 1].close;
    const gain = diff > 0 ? diff : 0; const loss = diff < 0 ? -diff : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    result[i] = rsiAt(avgGain, avgLoss);
  }
  return result;
}

// Slow Stochastic (K=14, smooth=3, D=3): segundo indicador da zona de compra.
// Agora exibido explicitamente — antes estava invisível no cálculo mas ausente na tela.
function computeSlowStoch(
  data: { close: number; high?: number; low?: number }[],
  kPeriod = 14, smooth = 3, dPeriod = 3
): { k: (number | null)[], d: (number | null)[] } {
  const fastK: (number | null)[] = new Array(data.length).fill(null);
  for (let i = kPeriod - 1; i < data.length; i++) {
    const slice = data.slice(i - kPeriod + 1, i + 1);
    const highest = Math.max(...slice.map((d) => d.high ?? d.close));
    const lowest  = Math.min(...slice.map((d) => d.low  ?? d.close));
    const range = highest - lowest;
    fastK[i] = range > 0 ? Math.round(((data[i].close - lowest) / range) * 1000) / 10 : 50;
  }
  const slowK: (number | null)[] = new Array(data.length).fill(null);
  for (let i = kPeriod + smooth - 2; i < data.length; i++) {
    const vals = (fastK.slice(i - smooth + 1, i + 1).filter(v => v !== null)) as number[];
    if (vals.length === smooth) slowK[i] = Math.round(vals.reduce((s, v) => s + v, 0) / smooth * 10) / 10;
  }
  const slowD: (number | null)[] = new Array(data.length).fill(null);
  for (let i = kPeriod + smooth + dPeriod - 3; i < data.length; i++) {
    const vals = (slowK.slice(i - dPeriod + 1, i + 1).filter(v => v !== null)) as number[];
    if (vals.length === dPeriod) slowD[i] = Math.round(vals.reduce((s, v) => s + v, 0) / dPeriod * 10) / 10;
  }
  return { k: slowK, d: slowD };
}

// ── Semáforo de proximidade da liquidação ─────────────────────────────────────
// liqDistPct é negativo (liqPrice < last). |dist| = folga até a liquidação.
// > 40% folga: cinza (seguro) | 15-40%: amarelo (atenção) | < 15%: vermelho pulsante (crítico).
type LiqState = "safe" | "warn" | "danger" | null;
function liqSemaphore(liqDistPct: number | null): LiqState {
  if (liqDistPct == null) return null;
  const dist = Math.abs(liqDistPct);
  if (dist > 40) return "safe";
  if (dist > 15) return "warn";
  return "danger";
}

export default function AssetChartModal({ ticker, onClose, leverage, avgPrice }: AssetChartModalProps) {
  const [period, setPeriod] = useState<string>("1y");
  const [rawData, setRawData] = useState<any[]>([]);
  const [dividends, setDividends] = useState<{ date: string; amount: number }[]>([]);
  const [dyTrailing, setDyTrailing] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>("");

  // Toggles de camada
  const [showMM50, setShowMM50]   = useState(false); // off por padrão — ruído p/ 10-15a
  const [showBB,   setShowBB]     = useState(true);  // Bandas de Bollinger
  const [showDivs, setShowDivs]   = useState(false); // linhas verticais de dividendos

  const [levInput, setLevInput] = useState<number>(leverage ?? 3);

  const load = async () => {
    setLoading(true); setLoadError("");
    try {
      const [histRes] = await Promise.all([assetsApi.getHistory(ticker, FETCH_PERIOD[period] ?? period)]);
      const body = histRes.data;
      const data = Array.isArray(body) ? body : (Array.isArray(body?.history) ? body.history : []);
      const divs = Array.isArray(body?.dividends) ? body.dividends : [];
      setRawData(data); setDividends(divs);
      setDyTrailing(typeof body?.dy_trailing === "number" ? body.dy_trailing : null);
      if (data.length === 0) setLoadError("Sem dados de preço para este ativo no período.");
    } catch (e: any) {
      setRawData([]); setDividends([]); setDyTrailing(null);
      setLoadError(e?.response?.status === 404
        ? "Sem dados de preço para este ativo."
        : "Não foi possível carregar o gráfico. Tente de novo.");
    }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [ticker, period]);

  // ── Série diária completa (com lookback extra) ────────────────────────────
  const fullDaily = rawData
    .filter((d) => d && typeof d.close === "number" && isFinite(d.close))
    .map((d) => ({ ...d, close: d.close }));

  const ma50full  = computeMA(fullDaily, "close", 50);
  const ma200full = computeMA(fullDaily, "close", 200);
  const bb = computeBB(fullDaily, "close", 20, 2);

  // Stochastic calculado sobre série diária completa (com high/low quando disponível)
  const stoch = computeSlowStoch(fullDaily);

  // Recorte da janela visível
  const visibleDays = PERIOD_VISIBLE_DAYS[period] ?? 366;
  let cutoffISO = "";
  if (fullDaily.length > 0) {
    const lastDate = new Date(fullDaily[fullDaily.length - 1].date + "T00:00:00Z");
    lastDate.setUTCDate(lastDate.getUTCDate() - visibleDays);
    cutoffISO = lastDate.toISOString().slice(0, 10);
  }
  const visibleStartIdx = (() => {
    if (!cutoffISO) return 0;
    const idx = fullDaily.findIndex((d) => d.date >= cutoffISO);
    return idx < 0 ? 0 : idx;
  })();

  // RSI semanal
  const weekly = resampleWeekly(fullDaily);
  const weeklyRsi = computeRSI(weekly, 14);
  const rsiByWeek = new Map<string, number | null>();
  weekly.forEach((w, i) => rsiByWeek.set(isoWeekKey(w.date), weeklyRsi[i]));

  const BUY_ZONE_MM200_DISCOUNT = 10;
  const RSI_ENTRY = 38;

  // priceData: janela visível com todos os overlays
  const priceData = fullDaily.slice(visibleStartIdx).map((d, i) => {
    const gi = visibleStartIdx + i;
    const ma200 = ma200full[gi];
    const wRsi = rsiByWeek.get(isoWeekKey(d.date));
    const belowMa200 = ma200 != null && ma200 > 0
      ? ((d.close - ma200) / ma200) * 100 <= -BUY_ZONE_MM200_DISCOUNT : false;
    const rsiZone = wRsi != null && wRsi <= RSI_ENTRY;
    const inBuyZone = belowMa200 || rsiZone;
    return {
      date:    d.date.slice(5),
      close:   d.close,
      high:    d.high  ?? d.close,
      low:     d.low   ?? d.close,
      volume:  d.volume ?? null,
      ma50:    ma50full[gi],
      ma200,
      bbUpper: bb.upper[gi],
      bbLower: bb.lower[gi],
      buyZone: inBuyZone ? d.close : null,
    };
  });

  // Stochastic na janela visível
  const stochData = fullDaily.slice(visibleStartIdx).map((d, i) => ({
    date:   d.date.slice(5),
    stochK: stoch.k[visibleStartIdx + i],
    stochD: stoch.d[visibleStartIdx + i],
  }));

  // RSI na janela visível
  const rsiData = weekly
    .map((w, i) => ({ date: w.date.slice(5), rsi: weeklyRsi[i], _full: w.date }))
    .filter((w) => !cutoffISO || w._full >= cutoffISO)
    .map(({ date, rsi }) => ({ date, rsi }));

  const currentWeeklyRsi = (() => {
    for (let i = weeklyRsi.length - 1; i >= 0; i--) {
      if (weeklyRsi[i] != null) return weeklyRsi[i] as number;
    }
    return null;
  })();

  // Stochastic atual
  const currentStochK = (() => {
    for (let i = stoch.k.length - 1; i >= 0; i--) {
      if (stoch.k[i] != null) return stoch.k[i] as number;
    }
    return null;
  })();

  const first = priceData[0]?.close ?? 0;
  const last  = priceData[priceData.length - 1]?.close ?? 0;
  const change    = last - first;
  const changePct = first > 0 ? (change / first) * 100 : 0;
  const isPositive = change >= 0;

  const lastMa200 = (() => {
    for (let i = ma200full.length - 1; i >= 0; i--) {
      if (ma200full[i] != null) return ma200full[i] as number;
    }
    return null;
  })();
  const distMa200Pct = lastMa200 && lastMa200 > 0 ? ((last - lastMa200) / lastMa200) * 100 : null;
  const aboveMa200 = distMa200Pct != null && distMa200Pct >= 0;

  const drawdown = (() => {
    if (priceData.length < 2) return null;
    let peak = priceData[0].close; let worstPct = 0;
    let troughClose = priceData[0].close; let troughDate = priceData[0].date;
    for (const p of priceData) {
      if (p.close > peak) peak = p.close;
      const dd = peak > 0 ? ((p.close - peak) / peak) * 100 : 0;
      if (dd < worstPct) { worstPct = dd; troughClose = p.close; troughDate = p.date; }
    }
    if (worstPct >= -0.01) return null;
    return { pct: worstPct, troughClose, troughDate };
  })();

  const stopBase = (avgPrice && avgPrice > 0) ? avgPrice : (last > 0 ? last : null);
  const lev = Number.isFinite(levInput) && levInput >= 1 ? levInput : null;
  // Níveis de desalavancagem (-10/-20/-30% do PM) — renomeados: B&H não tem "stop", tem escada de destranche.
  const deleverageLevels = stopBase
    ? [10, 20, 30].map((d, idx) => ({ pct: d, price: stopBase * (1 - d / 100), label: `−${idx + 1}x` }))
    : [];
  const liqPrice = (stopBase && lev && lev > 1) ? stopBase * (1 - 1 / lev) : null;
  const liqDistPct = (liqPrice && last > 0) ? ((liqPrice - last) / last) * 100 : null;
  const semaphore = liqSemaphore(liqDistPct);

  const visibleDividends = (() => {
    if (!showDivs || !dividends.length || !priceData.length || !cutoffISO) return [];
    return dividends
      .filter((dv) => dv.date >= cutoffISO)
      .map((dv) => ({ date: dv.date.slice(5), amount: dv.amount }));
  })();

  const step = Math.max(1, Math.floor(priceData.length / 200));
  const displayData  = priceData.filter((_, i) => i % step === 0 || i === priceData.length - 1);
  const displayStoch = stochData.filter((_, i) => i % step === 0 || i === stochData.length - 1);
  const displayRsi   = rsiData;

  // Volume máximo (para escala da barra)
  const maxVol = Math.max(...displayData.map((d) => d.volume ?? 0), 1);

  const isCritical = semaphore === "danger";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className={cn(
          "bg-surface-1 border rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl transition-colors",
          isCritical ? "border-danger" : "border-border"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* BANNER CRÍTICO — liquidação < 15% (survival-first) */}
        {isCritical && (
          <div className="flex items-center gap-2 px-5 py-2.5 bg-danger/15 border-b border-danger/40 animate-pulse">
            <ShieldAlert size={16} className="text-danger shrink-0" />
            <p className="text-sm font-semibold text-danger">
              ALERTA: liquidação a {Math.abs(liqDistPct!).toFixed(0)}% — considere reduzir alavancagem
            </p>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-3">
            <TickerLogo ticker={ticker} size={36} />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold font-mono text-text-primary">{ticker}</span>
                <span className={cn("text-sm font-mono font-semibold flex items-center gap-1",
                  isPositive ? "text-success" : "text-danger")}>
                  {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                  {isPositive ? "+" : ""}{changePct.toFixed(2)}%
                </span>
                {/* Badge MM200 — posição estrutural clara */}
                {distMa200Pct != null && (
                  <span className={cn(
                    "text-xs font-semibold px-2 py-0.5 rounded-full",
                    aboveMa200
                      ? "bg-text-secondary/10 text-text-secondary"
                      : "bg-success/15 text-success"
                  )}>
                    {aboveMa200 ? "▲" : "▼"} MM200 {distMa200Pct > 0 ? "+" : ""}{distMa200Pct.toFixed(1)}%
                  </span>
                )}
              </div>
              <p className="text-xs text-text-muted">
                {formatCurrency(last)} · variação no período
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Toggles de camada */}
            <div className="flex gap-1">
              {[
                { label: "MM50",  active: showMM50, toggle: () => setShowMM50(v => !v) },
                { label: "BB",    active: showBB,   toggle: () => setShowBB(v => !v) },
                { label: "Divs",  active: showDivs, toggle: () => setShowDivs(v => !v) },
              ].map(({ label, active, toggle }) => (
                <button key={label} onClick={toggle}
                  className={cn("px-2 py-0.5 rounded text-xs font-mono transition-colors",
                    active ? "bg-primary/20 text-primary border border-primary/40" : "text-text-muted border border-border hover:border-border-active")}>
                  {label}
                </button>
              ))}
            </div>
            <div className="flex gap-1">
              {PERIODS.map((p) => (
                <button key={p} onClick={() => setPeriod(p)}
                  className={cn("px-2.5 py-1 rounded-lg text-xs font-medium transition-colors",
                    period === p ? "bg-primary text-black" : "text-text-muted hover:text-text-primary hover:bg-surface-2")}>
                  {PERIOD_LABELS[p]}
                </button>
              ))}
            </div>
            <button onClick={onClose} className="text-text-muted hover:text-text-primary p-1.5 rounded-lg hover:bg-surface-2">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Charts */}
        <div className="p-5">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <RefreshCw size={20} className="animate-spin text-primary" />
            </div>
          ) : (loadError || rawData.length === 0) ? (
            <div className="flex flex-col items-center justify-center h-64 gap-2 text-center">
              <p className="text-sm text-text-secondary">{loadError || "Sem dados para exibir."}</p>
              <button onClick={load} className="btn-ghost text-sm">Tentar de novo</button>
            </div>
          ) : (
            <>
              {/* Métricas de risco */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-3 text-xs font-mono">
                {drawdown != null && (
                  <span>
                    <span className="text-text-muted">pior tombo: </span>
                    <span className="font-semibold text-danger">{drawdown.pct.toFixed(1)}%</span>
                  </span>
                )}
                {dyTrailing != null && dyTrailing > 0 && (
                  <span>
                    <span className="text-text-muted">DY 12m: </span>
                    <span className="font-semibold text-primary">{dyTrailing.toFixed(2)}%</span>
                    {dividends.length > 0 && (
                      <span className="text-text-muted ml-1">({dividends.length} proventos)</span>
                    )}
                  </span>
                )}
                {/* Alavancagem + Semáforo de liquidação */}
                <span className="flex items-center gap-1.5">
                  <span className="text-text-muted">alav.:</span>
                  <input
                    type="number" min={1} max={10} step={0.5} value={levInput}
                    onChange={(e) => setLevInput(parseFloat(e.target.value) || 1)}
                    className="w-12 bg-surface-2 border border-border rounded px-1 py-0.5 text-text-primary text-xs"
                    title={avgPrice ? "Alavancagem da posição" : "Projete onde liquidaria"}
                  />
                  <span className="text-text-muted">x</span>
                  {liqPrice != null && liqDistPct != null && (
                    <span className={cn(
                      "flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold",
                      semaphore === "safe"   && "bg-surface-2 text-text-muted",
                      semaphore === "warn"   && "bg-warning/20 text-warning",
                      semaphore === "danger" && "bg-danger/20 text-danger",
                    )}>
                      {semaphore === "warn"   && <AlertTriangle size={10} />}
                      {semaphore === "danger" && <ShieldAlert   size={10} />}
                      {semaphore === "safe"   ? `Folga: ${Math.abs(liqDistPct).toFixed(0)}%`
                       : semaphore === "warn" ? `Atenção: ${Math.abs(liqDistPct).toFixed(0)}%`
                       :                        `CRÍTICO: ${Math.abs(liqDistPct).toFixed(0)}%`}
                    </span>
                  )}
                </span>
              </div>

              {/* Preço + MM50/MM200 + BB + Zona de compra */}
              <div className="mb-1">
                <p className="text-xs text-text-muted mb-2">
                  Preço · MM200{showMM50 && " · MM50"}{showBB && " · BB(20,2)"}
                  {stopBase && <span className="text-text-muted"> · desalavancagem −1x/−2x/−3x</span>}
                </p>
                <ResponsiveContainer width="100%" height={300} minWidth={0}>
                  <ComposedChart data={displayData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                    <defs>
                      <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={isPositive ? "#00E676" : "#FF5252"} stopOpacity={0.15} />
                        <stop offset="95%" stopColor={isPositive ? "#00E676" : "#FF5252"} stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="buyZoneGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#00E676" stopOpacity={0.28} />
                        <stop offset="95%" stopColor="#00E676" stopOpacity={0.04} />
                      </linearGradient>
                      {/* BB: faixa translúcida entre upper e lower */}
                      <linearGradient id="bbGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#818CF8" stopOpacity={0.12} />
                        <stop offset="95%" stopColor="#818CF8" stopOpacity={0.04} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E2730" vertical={false} />
                    <XAxis dataKey="date" tick={{ fill: "#475569", fontSize: 9 }} tickLine={false} axisLine={false}
                      interval={Math.floor(displayData.length / 6)} />
                    <YAxis domain={["auto", "auto"]} tick={{ fill: "#475569", fontSize: 10 }}
                      tickLine={false} axisLine={false} width={55}
                      tickFormatter={(v) => `$${v.toFixed(0)}`} />
                    <Tooltip
                      contentStyle={{ background: "#161C24", border: "1px solid #1F2937", borderRadius: 8, fontSize: 11 }}
                      formatter={(v: any, name: string) => {
                        if (name === "buyZone" || name === "bbLower") return [null, null];
                        if (name === "bbUpper") return [`$${Number(v).toFixed(2)}`, "BB"];
                        return [`$${Number(v).toFixed(2)}`,
                          name === "close" ? "Preço" : name === "ma50" ? "MM50" : "MM200"];
                      }}
                    />
                    {/* BB: upper como linha topo + lower como área inferior (canal de volatilidade) */}
                    {showBB && (
                      <>
                        <Area type="monotone" dataKey="bbUpper" stroke="#818CF8" strokeWidth={0.8}
                          fill="url(#bbGrad)" dot={false} connectNulls strokeDasharray="3 2"
                          isAnimationActive={false} activeDot={false} />
                        <Line type="monotone" dataKey="bbLower" stroke="#818CF8" strokeWidth={0.8}
                          dot={false} connectNulls strokeDasharray="3 2" />
                      </>
                    )}
                    <Area type="monotone" dataKey="close" stroke={isPositive ? "#00E676" : "#FF5252"}
                      strokeWidth={1.5} fill="url(#priceGrad)" dot={false} />
                    <Area type="monotone" dataKey="buyZone" stroke="#00E676" strokeWidth={0}
                      fill="url(#buyZoneGrad)" dot={false} connectNulls={false}
                      isAnimationActive={false} activeDot={false} />
                    {showMM50 && (
                      <Line type="monotone" dataKey="ma50" stroke="#00D4FF" strokeWidth={1.2}
                        dot={false} strokeDasharray="4 2" connectNulls />
                    )}
                    <Line type="monotone" dataKey="ma200" stroke="#FF9800" strokeWidth={1.5} dot={false} connectNulls />

                    {/* Desalavancagem −1x/−2x/−3x (B&H: não são stops de venda, são níveis de destranche) */}
                    {deleverageLevels.map((s) => (
                      <ReferenceLine key={`dlev${s.pct}`} y={s.price} stroke="#FFB020"
                        strokeDasharray="2 3" strokeWidth={1}
                        label={{ value: s.label, fill: "#FFB020", fontSize: 8, position: "insideBottomLeft" }} />
                    ))}
                    {liqPrice != null && (
                      <ReferenceLine y={liqPrice} stroke="#FF5252" strokeWidth={1.5}
                        label={{ value: `liq ${levInput}x`, fill: "#FF5252", fontSize: 9, position: "insideBottomLeft" }} />
                    )}
                    {drawdown != null && (
                      <ReferenceLine y={drawdown.troughClose} stroke="#94A3B8" strokeDasharray="5 4"
                        strokeWidth={1}
                        label={{ value: `fundo ${drawdown.pct.toFixed(0)}%`, fill: "#94A3B8", fontSize: 8, position: "insideTopLeft" }} />
                    )}
                    {visibleDividends.map((dv, i) => (
                      <ReferenceLine key={`div${i}-${dv.date}`} x={dv.date} stroke="#22D3EE"
                        strokeDasharray="1 2" strokeWidth={1} opacity={0.5}
                        label={{ value: "÷", fill: "#22D3EE", fontSize: 10, position: "insideTop" }} />
                    ))}
                    <Brush dataKey="date" height={28} travellerWidth={14} gap={1}
                      stroke="#00D4FF" fill="#0B0F14" tickFormatter={() => ""} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              {/* Volume — distingue correção técnica (volume seco) de capitulação (volume crescente) */}
              {displayData.some((d) => d.volume) && (
                <div className="mb-1">
                  <p className="text-xs text-text-muted mb-1">Volume</p>
                  <ResponsiveContainer width="100%" height={55} minWidth={0}>
                    <ComposedChart data={displayData} margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                      <XAxis dataKey="date" hide />
                      <YAxis hide domain={[0, maxVol * 1.2]} />
                      <Tooltip contentStyle={{ background: "#161C24", border: "1px solid #1F2937", borderRadius: 8, fontSize: 11 }}
                        formatter={(v: any) => [Number(v).toLocaleString("pt-BR"), "Volume"]} />
                      <Bar dataKey="volume" fill="#334155" opacity={0.7} isAnimationActive={false} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* RSI semanal + Slow Stochastic — lado a lado (ambos os gatilhos da zona de compra visíveis) */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-text-muted">RSI semanal 14 — entrada ≤ 38</p>
                    {currentWeeklyRsi != null && (
                      <span className={cn("text-xs font-mono font-bold",
                        currentWeeklyRsi <= 38 ? "text-success"
                          : currentWeeklyRsi >= 65 ? "text-danger"
                          : "text-text-primary")}>
                        {currentWeeklyRsi.toFixed(0)}
                        {currentWeeklyRsi <= 38 && <span className="text-success text-xs font-normal ml-1">· entrada</span>}
                      </span>
                    )}
                  </div>
                  <ResponsiveContainer width="100%" height={100}>
                    <ComposedChart data={displayRsi} margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1E2730" vertical={false} />
                      <XAxis dataKey="date" tick={{ fill: "#475569", fontSize: 9 }} tickLine={false}
                        axisLine={false} interval={Math.floor(displayRsi.length / 4)} />
                      <YAxis domain={[0, 100]} ticks={[25, 38, 65, 80]}
                        tick={{ fill: "#475569", fontSize: 9 }} tickLine={false} axisLine={false} width={24} />
                      <Tooltip contentStyle={{ background: "#161C24", border: "1px solid #1F2937", borderRadius: 8, fontSize: 11 }}
                        formatter={(v: any) => [`${Number(v).toFixed(1)}`, "RSI sem."]} />
                      <ReferenceLine y={38} stroke="#00E676" strokeDasharray="4 2" strokeWidth={1}
                        label={{ value: "38", fill: "#00E676", fontSize: 8, position: "insideTopRight" }} />
                      <ReferenceLine y={65} stroke="#FF5252" strokeDasharray="4 2" strokeWidth={1}
                        label={{ value: "65", fill: "#FF5252", fontSize: 8, position: "insideTopRight" }} />
                      <Line type="monotone" dataKey="rsi" stroke="#A78BFA" strokeWidth={1.5} dot={false} connectNulls />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>

                {/* Slow Stochastic — antes invisível, agora explícito (K cruzando D embaixo de 20 = tese) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-text-muted">Stochastic lento — K cruzar D &lt; 20</p>
                    {currentStochK != null && (
                      <span className={cn("text-xs font-mono font-bold",
                        currentStochK <= 20 ? "text-success"
                          : currentStochK >= 80 ? "text-danger"
                          : "text-text-primary")}>
                        K {currentStochK.toFixed(0)}
                        {currentStochK <= 20 && <span className="text-success text-xs font-normal ml-1">· oversold</span>}
                      </span>
                    )}
                  </div>
                  <ResponsiveContainer width="100%" height={100}>
                    <ComposedChart data={displayStoch} margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1E2730" vertical={false} />
                      <XAxis dataKey="date" tick={{ fill: "#475569", fontSize: 9 }} tickLine={false}
                        axisLine={false} interval={Math.floor(displayStoch.length / 4)} />
                      <YAxis domain={[0, 100]} ticks={[20, 50, 80]}
                        tick={{ fill: "#475569", fontSize: 9 }} tickLine={false} axisLine={false} width={24} />
                      <Tooltip contentStyle={{ background: "#161C24", border: "1px solid #1F2937", borderRadius: 8, fontSize: 11 }}
                        formatter={(v: any, name: string) => [`${Number(v).toFixed(1)}`, name === "stochK" ? "K" : "D"]} />
                      <ReferenceLine y={20} stroke="#00E676" strokeDasharray="4 2" strokeWidth={1}
                        label={{ value: "20", fill: "#00E676", fontSize: 8, position: "insideTopRight" }} />
                      <ReferenceLine y={80} stroke="#FF5252" strokeDasharray="4 2" strokeWidth={1}
                        label={{ value: "80", fill: "#FF5252", fontSize: 8, position: "insideTopRight" }} />
                      <Line type="monotone" dataKey="stochK" stroke="#34D399" strokeWidth={1.5} dot={false} connectNulls />
                      <Line type="monotone" dataKey="stochD" stroke="#F59E0B" strokeWidth={1} dot={false} connectNulls strokeDasharray="3 2" />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
