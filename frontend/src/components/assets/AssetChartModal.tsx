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

function computeMA(data: any[], key: string, period: number): (number | null)[] {
  return data.map((_, i) => {
    if (i < period - 1) return null;
    const slice = data.slice(i - period + 1, i + 1);
    const avg = slice.reduce((s: number, d: any) => s + d[key], 0) / period;
    return Math.round(avg * 100) / 100;
  });
}

function computeRSI(data: any[], period = 14): (number | null)[] {
  const gains: number[] = [];
  const losses: number[] = [];
  const result: (number | null)[] = new Array(data.length).fill(null);

  for (let i = 1; i < data.length; i++) {
    const diff = data[i].close - data[i - 1].close;
    gains.push(diff > 0 ? diff : 0);
    losses.push(diff < 0 ? -diff : 0);

    if (i >= period) {
      const avgGain = gains.slice(-period).reduce((a, b) => a + b, 0) / period;
      const avgLoss = losses.slice(-period).reduce((a, b) => a + b, 0) / period;
      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      result[i] = Math.round((100 - 100 / (1 + rs)) * 10) / 10;
    }
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
      const [histRes] = await Promise.all([
        assetsApi.getHistory(ticker, period),
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

  // Build chart data with MA50, MA200, RSI
  const chartData = rawData.map((d) => ({ ...d, close: d.close }));
  const ma50values  = computeMA(chartData, "close", 50);
  const ma200values = computeMA(chartData, "close", 200);
  const rsiValues   = computeRSI(chartData, 14);

  const priceData = chartData.map((d, i) => ({
    date:  d.date.slice(5),   // MM-DD
    close: d.close,
    ma50:  ma50values[i],
    ma200: ma200values[i],
  }));

  const rsiData = chartData.map((d, i) => ({
    date: d.date.slice(5),
    rsi:  rsiValues[i],
  }));

  const first = priceData[0]?.close ?? 0;
  const last  = priceData[priceData.length - 1]?.close ?? 0;
  const change    = last - first;
  const changePct = first > 0 ? (change / first) * 100 : 0;
  const isPositive = change >= 0;

  // Thin out for performance
  const step = Math.max(1, Math.floor(priceData.length / 200));
  const displayData = priceData.filter((_, i) => i % step === 0 || i === priceData.length - 1);
  const displayRsi  = rsiData.filter((_, i) => i % step === 0 || i === rsiData.length - 1);

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
                <p className="text-xs text-text-muted mb-2">Preço · MM50 · MM200</p>
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

              {/* RSI chart */}
              <div>
                <p className="text-xs text-text-muted mb-2">RSI 14 — entrada quando ≤ 38</p>
                <ResponsiveContainer width="100%" height={110}>
                  <ComposedChart data={displayRsi} margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E2730" vertical={false} />
                    <XAxis dataKey="date" tick={{ fill: "#475569", fontSize: 9 }} tickLine={false}
                      axisLine={false} interval={Math.floor(displayRsi.length / 6)} />
                    <YAxis domain={[0, 100]} ticks={[25, 38, 50, 65, 80]}
                      tick={{ fill: "#475569", fontSize: 10 }} tickLine={false} axisLine={false} width={30} />
                    <Tooltip contentStyle={{ background: "#161C24", border: "1px solid #1F2937", borderRadius: 8, fontSize: 11 }}
                      formatter={(v: any) => [`${Number(v).toFixed(1)}`, "RSI"]} />
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
