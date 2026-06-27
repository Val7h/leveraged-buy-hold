"use client";
import { useEffect, useState } from "react";
import { assetsApi } from "@/lib/api";
import { formatCurrency, cn } from "@/lib/utils";
import TickerLogo from "@/components/ui/TickerLogo";
import {
  ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Legend, Brush,
} from "recharts";
import { X, RefreshCw, TrendingUp, TrendingDown } from "lucide-react";

interface AssetChartModalProps {
  ticker: string;
  onClose: () => void;
}

const PERIODS = ["3mo", "6mo", "1y", "2y", "5y"] as const;
const PERIOD_LABELS: Record<string, string> = {
  "3mo": "3M", "6mo": "6M", "1y": "1A", "2y": "2A", "5y": "5A",
};

// Dias de calendário visíveis por período (corte do que o investidor vê).
const PERIOD_VISIBLE_DAYS: Record<string, number> = {
  "3mo": 93, "6mo": 186, "1y": 366, "2y": 732, "5y": 1830,
};

// Período que efetivamente pedimos ao backend: SEMPRE com lookback extra
// (~300 pregões ≈ 430 dias de calendário) ANTES do início da janela visível,
// para que a MM200 já exista no 1º ponto plotado (some hoje em 3M/6M/1A).
// Os valores são os labels aceitos pelo backend (_days map em assets.py).
const FETCH_PERIOD: Record<string, string> = {
  "3mo": "2y", "6mo": "2y", "1y": "2y", "2y": "5y", "5y": "10y",
};

function computeMA(data: any[], key: string, period: number): (number | null)[] {
  return data.map((_, i) => {
    if (i < period - 1) return null;
    const slice = data.slice(i - period + 1, i + 1);
    const avg = slice.reduce((s: number, d: any) => s + d[key], 0) / period;
    return Math.round(avg * 100) / 100;
  });
}

// ISO week key (ano-semana) p/ agrupar pregões diários em semanas.
function isoWeekKey(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00Z");
  const day = (d.getUTCDay() + 6) % 7;        // 0 = segunda
  d.setUTCDate(d.getUTCDate() - day + 3);      // quinta-feira da semana ISO
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round(
    ((d.getTime() - firstThursday.getTime()) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7
  );
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

// Reamostra a série DIÁRIA em SEMANAL: último close de cada semana ISO.
// É sobre ISTO que o RSI semanal (gatilho da doutrina ≤38) é calculado.
function resampleWeekly(daily: { date: string; close: number }[]): { date: string; close: number }[] {
  const lastByWeek = new Map<string, { date: string; close: number }>();
  for (const d of daily) {
    if (d == null || typeof d.close !== "number" || !isFinite(d.close)) continue;
    lastByWeek.set(isoWeekKey(d.date), { date: d.date, close: d.close });
  }
  // Mapa preserva ordem de inserção (já cronológica vinda do backend).
  return Array.from(lastByWeek.values());
}

// RSI de Wilder sobre uma série de closes (aqui, closes SEMANAIS).
function computeRSI(data: { close: number }[], period = 14): (number | null)[] {
  const result: (number | null)[] = new Array(data.length).fill(null);
  if (data.length <= period) return result;

  let avgGain = 0;
  let avgLoss = 0;
  // Seed: média simples dos primeiros `period` deltas (Wilder).
  for (let i = 1; i <= period; i++) {
    const diff = data[i].close - data[i - 1].close;
    avgGain += diff > 0 ? diff : 0;
    avgLoss += diff < 0 ? -diff : 0;
  }
  avgGain /= period;
  avgLoss /= period;
  const rsiAt = (g: number, l: number) => {
    const rs = l === 0 ? Infinity : g / l;
    return Math.round((100 - 100 / (1 + rs)) * 10) / 10;
  };
  result[period] = rsiAt(avgGain, avgLoss);

  // Suavização de Wilder para o restante.
  for (let i = period + 1; i < data.length; i++) {
    const diff = data[i].close - data[i - 1].close;
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? -diff : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    result[i] = rsiAt(avgGain, avgLoss);
  }
  return result;
}

export default function AssetChartModal({ ticker, onClose }: AssetChartModalProps) {
  const [period, setPeriod] = useState<string>("1y");
  const [rawData, setRawData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>("");
  const [assetInfo, setAssetInfo] = useState<any>(null);

  const load = async () => {
    setLoading(true);
    setLoadError("");
    try {
      // Pede com LOOKBACK EXTRA (FETCH_PERIOD) para a MM200 já existir no início
      // da janela visível e para o RSI semanal ter histórico suficiente.
      const [histRes] = await Promise.all([
        assetsApi.getHistory(ticker, FETCH_PERIOD[period] ?? period),
      ]);
      const data = Array.isArray(histRes.data) ? histRes.data : [];
      setRawData(data);
      if (data.length === 0) setLoadError("Sem dados de preço para este ativo no período.");
    } catch (e: any) {
      // Não é mais silencioso: mostra o motivo (antes o gráfico ficava vazio sem aviso).
      setRawData([]);
      setLoadError(e?.response?.status === 404
        ? "Sem dados de preço para este ativo."
        : "Não foi possível carregar o gráfico. Tente de novo.");
    }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [ticker, period]);

  // ── Série DIÁRIA completa (com lookback extra) ────────────────────────────
  // Médias móveis são calculadas sobre a série INTEIRA (inclui os ~300 pregões
  // de lookback) → MM200 já tem valor quando a janela visível começa.
  const fullDaily = rawData
    .filter((d) => d && typeof d.close === "number" && isFinite(d.close))
    .map((d) => ({ ...d, close: d.close }));
  const ma50full  = computeMA(fullDaily, "close", 50);
  const ma200full = computeMA(fullDaily, "close", 200);

  // Recorte da JANELA VISÍVEL (últimos N dias de calendário do período escolhido).
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

  // priceData = só a janela visível, mas com MM50/MM200 calculadas com lookback.
  const priceData = fullDaily.slice(visibleStartIdx).map((d, i) => ({
    date:  d.date.slice(5),   // MM-DD
    close: d.close,
    ma50:  ma50full[visibleStartIdx + i],
    ma200: ma200full[visibleStartIdx + i],
  }));

  // ── RSI SEMANAL (gatilho da doutrina ≤38) ─────────────────────────────────
  // Reamostra a série diária COMPLETA em semanal e calcula o RSI de Wilder ANTES
  // de qualquer thinning. O número que o investidor lê é o RSI SEMANAL.
  const weekly = resampleWeekly(fullDaily);
  const weeklyRsi = computeRSI(weekly, 14);
  // Só plota as semanas dentro da janela visível.
  const rsiData = weekly
    .map((w, i) => ({ date: w.date.slice(5), rsi: weeklyRsi[i], _full: w.date }))
    .filter((w) => !cutoffISO || w._full >= cutoffISO)
    .map(({ date, rsi }) => ({ date, rsi }));
  // Valor atual do RSI semanal (último não-nulo) — exibido em destaque.
  const currentWeeklyRsi = (() => {
    for (let i = weeklyRsi.length - 1; i >= 0; i--) {
      if (weeklyRsi[i] != null) return weeklyRsi[i] as number;
    }
    return null;
  })();

  const first = priceData[0]?.close ?? 0;
  const last  = priceData[priceData.length - 1]?.close ?? 0;
  const change    = last - first;
  const changePct = first > 0 ? (change / first) * 100 : 0;
  const isPositive = change >= 0;

  // Distância % do preço atual à MM200 (tamanho do "desconto" da tese).
  const lastMa200 = (() => {
    for (let i = ma200full.length - 1; i >= 0; i--) {
      if (ma200full[i] != null) return ma200full[i] as number;
    }
    return null;
  })();
  const distMa200Pct = lastMa200 && lastMa200 > 0 ? ((last - lastMa200) / lastMa200) * 100 : null;

  // Thin out for performance — só o gráfico de PREÇO (a série diária é densa).
  // O RSI já é semanal (poucos pontos): NÃO sofre thinning.
  const step = Math.max(1, Math.floor(priceData.length / 200));
  const displayData = priceData.filter((_, i) => i % step === 0 || i === priceData.length - 1);
  const displayRsi  = rsiData;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-surface-1 border border-border rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
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
              </div>
              <p className="text-xs text-text-muted">
                {formatCurrency(last)} · variação no período
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Period selector */}
            <div className="flex gap-1">
              {PERIODS.map((p) => (
                <button key={p} onClick={() => setPeriod(p)}
                  className={cn("px-2.5 py-1 rounded-lg text-xs font-medium transition-colors",
                    period === p
                      ? "bg-primary text-black"
                      : "text-text-muted hover:text-text-primary hover:bg-surface-2")}>
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
              {/* Price + MA chart */}
              <div className="mb-1">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-text-muted">Preço · MM50 · MM200</p>
                  {distMa200Pct != null && (
                    <p className="text-xs font-mono">
                      <span className="text-text-muted">vs MM200: </span>
                      <span className={cn("font-semibold", distMa200Pct < 0 ? "text-success" : "text-text-secondary")}>
                        {distMa200Pct > 0 ? "+" : ""}{distMa200Pct.toFixed(1)}%
                      </span>
                    </p>
                  )}
                </div>
                <ResponsiveContainer width="100%" height={320} minWidth={0}>
                  <ComposedChart data={displayData} margin={{ top: 4, right: 8, left: 0, bottom: 8 }}>
                    <defs>
                      <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={isPositive ? "#00E676" : "#FF5252"} stopOpacity={0.15} />
                        <stop offset="95%" stopColor={isPositive ? "#00E676" : "#FF5252"} stopOpacity={0} />
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
                      formatter={(v: any, name: string) => [
                        `$${Number(v).toFixed(2)}`,
                        name === "close" ? "Preço" : name === "ma50" ? "MM50" : "MM200",
                      ]}
                    />
                    <Area type="monotone" dataKey="close" stroke={isPositive ? "#00E676" : "#FF5252"}
                      strokeWidth={1.5} fill="url(#priceGrad)" dot={false} />
                    <Line type="monotone" dataKey="ma50"  stroke="#00D4FF" strokeWidth={1.2} dot={false}
                      strokeDasharray="4 2" connectNulls />
                    <Line type="monotone" dataKey="ma200" stroke="#FF9800" strokeWidth={1.5} dot={false} connectNulls />
                    <Legend formatter={(v) => (
                      <span style={{ color: "#94A3B8", fontSize: 10 }}>
                        {v === "close" ? "Preço" : v === "ma50" ? "MM50" : "MM200"}
                      </span>
                    )} />
                    {/* Brush: pan/zoom de faixa por toque (mobile) + arrasto (desktop) */}
                    <Brush
                      dataKey="date"
                      height={30}
                      travellerWidth={14}
                      gap={1}
                      stroke="#00D4FF"
                      fill="#0B0F14"
                      tickFormatter={() => ""}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              {/* RSI chart — SEMANAL (gatilho da doutrina ≤ 38) */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-text-muted">RSI semanal 14 — entrada quando ≤ 38</p>
                  {currentWeeklyRsi != null && (
                    <p className="text-xs font-mono">
                      <span className="text-text-muted">RSI semanal: </span>
                      <span className={cn(
                        "font-bold text-sm",
                        currentWeeklyRsi <= 38 ? "text-success"
                          : currentWeeklyRsi >= 65 ? "text-danger"
                          : "text-text-primary"
                      )}>
                        {currentWeeklyRsi.toFixed(0)}
                      </span>
                      {currentWeeklyRsi <= 38 && (
                        <span className="text-success ml-1">· zona de entrada</span>
                      )}
                    </p>
                  )}
                </div>
                <ResponsiveContainer width="100%" height={110}>
                  <ComposedChart data={displayRsi} margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E2730" vertical={false} />
                    <XAxis dataKey="date" tick={{ fill: "#475569", fontSize: 9 }} tickLine={false}
                      axisLine={false} interval={Math.floor(displayRsi.length / 6)} />
                    <YAxis domain={[0, 100]} ticks={[25, 38, 50, 65, 80]}
                      tick={{ fill: "#475569", fontSize: 10 }} tickLine={false} axisLine={false} width={30} />
                    <Tooltip contentStyle={{ background: "#161C24", border: "1px solid #1F2937", borderRadius: 8, fontSize: 11 }}
                      formatter={(v: any) => [`${Number(v).toFixed(1)}`, "RSI sem."]} />
                    {/* Zona de entrada ≤ 38 */}
                    <ReferenceLine y={38} stroke="#00E676" strokeDasharray="4 2" strokeWidth={1}
                      label={{ value: "38 entrada", fill: "#00E676", fontSize: 9, position: "insideTopRight" }} />
                    <ReferenceLine y={65} stroke="#FF5252" strokeDasharray="4 2" strokeWidth={1}
                      label={{ value: "65 evitar", fill: "#FF5252", fontSize: 9, position: "insideTopRight" }} />
                    <Line type="monotone" dataKey="rsi" stroke="#A78BFA" strokeWidth={1.5} dot={false} connectNulls />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
