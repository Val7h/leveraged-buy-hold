"use client";
import { useEffect, useMemo, useState } from "react";
import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Legend,
} from "recharts";
import AppShell from "@/components/layout/AppShell";
import TickerLogo from "@/components/ui/TickerLogo";
import { portfolioApi } from "@/lib/api";
import { usePortfolioStore } from "@/store/portfolioStore";
import type { TradeHistoryItem } from "@/types";
import {
  History, RefreshCw, TrendingUp, TrendingDown, SlidersHorizontal,
  Lock, RefreshCcw, Gauge, Banknote, LineChart as LineChartIcon, Flag, Info,
  CalendarDays, Target, Compass,
} from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";

const ACTION_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  COMPRA:   { label: "Compra",   color: "text-success", bg: "bg-success/10 border-success/20",  icon: <TrendingUp size={11} /> },
  VENDA:    { label: "Venda",    color: "text-danger",  bg: "bg-danger/10 border-danger/20",    icon: <TrendingDown size={11} /> },
  AJUSTE:   { label: "Ajuste",   color: "text-primary", bg: "bg-primary/10 border-primary/20",  icon: <SlidersHorizontal size={11} /> },
  SEMENTE:  { label: "Semente",  color: "text-warning", bg: "bg-warning/10 border-warning/20",  icon: <Lock size={11} /> },
  CICLO:    { label: "Ciclo",    color: "text-primary", bg: "bg-primary/10 border-primary/20",  icon: <RefreshCcw size={11} /> },
  INICIO:   { label: "Início",   color: "text-primary", bg: "bg-primary/15 border-primary/30",  icon: <Compass size={11} /> },
};

function ActionBadge({ action }: { action: string }) {
  const cfg = ACTION_CONFIG[action] ?? { label: action, color: "text-text-muted", bg: "bg-surface-2 border-border", icon: null };
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wide", cfg.bg, cfg.color)}>
      {cfg.icon}{cfg.label}
    </span>
  );
}

function formatDate(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" })
      + " " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  } catch { return iso; }
}

function formatDay(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
  } catch { return iso; }
}

const isCashEvent = (h: TradeHistoryItem) =>
  typeof h.is_cash === "boolean" ? h.is_cash : (h.action === "COMPRA" || h.action === "VENDA");

/**
 * A "história do composto": tudo aqui é DERIVADO dos PositionEvent reais
 * (ordenados por executed_at asc). Nada é fabricado nem é backtest — é a jornada
 * honesta do capital aportado, da alavancagem efetiva e do P&L realizado no tempo.
 */
type CompoundPoint = {
  label: string;        // dia do evento
  iso: string;
  netInvested: number;  // capital aportado líquido acumulado (compras − vendas, isCash)
  leverage: number;     // alavancagem efetiva ponderada por exposição (carry-forward)
  cumRealized: number;  // P&L realizado acumulado
  totalReturn: number;  // netInvested + cumRealized (visão "o composto")
};

type Milestone = {
  iso: string;
  action: string;
  ticker: string;
  label: string;
};

function buildCompoundStory(events: TradeHistoryItem[]) {
  // ordem cronológica ascendente (a página recebe desc do BFF)
  const asc = [...events].sort(
    (a, b) => new Date(a.executed_at).getTime() - new Date(b.executed_at).getTime()
  );

  let netInvested = 0;
  let cumRealized = 0;

  // Alavancagem EFETIVA ponderada por exposição (notional) por ativo.
  // Carry-forward: a alavancagem de cada ticker persiste até um novo evento mudar.
  // Pondera pela exposição (valor) de cada ticker — sobe no aporte alavancado,
  // cai na desalavancagem/venda. Instrumento do disjuntor da doutrina.
  const expo: Record<string, { notional: number; lev: number }> = {};

  const points: CompoundPoint[] = [];
  const milestones: Milestone[] = [];

  for (const e of asc) {
    const cash = isCashEvent(e);
    const val = e.total_value ?? 0;

    if (cash) {
      if (e.action === "COMPRA") netInvested += val;
      else if (e.action === "VENDA") netInvested -= val;
    }
    if (e.action === "VENDA" && e.realized_pnl != null) cumRealized += e.realized_pnl;

    // Atualiza exposição/alavancagem do ticker tocado.
    const lev = e.leverage && e.leverage > 0 ? e.leverage : null;
    if (lev != null) {
      const prev = expo[e.ticker] ?? { notional: 0, lev };
      if (e.action === "VENDA") {
        // venda reduz exposição; se zera, remove
        const reduced = Math.max(0, prev.notional - val);
        if (reduced <= 0.01) delete expo[e.ticker];
        else expo[e.ticker] = { notional: reduced, lev: prev.lev };
      } else {
        // compra/aporte/semente/ciclo/ajuste: define exposição e alavancagem corrente
        expo[e.ticker] = { notional: prev.notional + (val > 0 ? val : 0), lev };
      }
    }

    // alavancagem efetiva = média ponderada por exposição
    let wSum = 0, wLev = 0;
    for (const k of Object.keys(expo)) {
      wSum += expo[k].notional;
      wLev += expo[k].notional * expo[k].lev;
    }
    const effLev = wSum > 0 ? wLev / wSum : 0;

    points.push({
      label: formatDay(e.executed_at),
      iso: e.executed_at,
      netInvested,
      leverage: Number(effLev.toFixed(3)),
      cumRealized: Number(cumRealized.toFixed(2)),
      totalReturn: Number((netInvested + cumRealized).toFixed(2)),
    });

    if (e.action === "SEMENTE") {
      milestones.push({ iso: e.executed_at, action: e.action, ticker: e.ticker, label: `Semente plantada — ${e.ticker}` });
    } else if (e.action === "CICLO") {
      milestones.push({ iso: e.executed_at, action: e.action, ticker: e.ticker, label: `Ciclo — ${e.ticker}` });
    }
  }

  // Injeta o "início da jornada" como primeiro marco se houver eventos
  if (asc.length > 0) {
    const first = asc[0];
    milestones.unshift({ iso: first.executed_at, action: "INICIO", ticker: first.ticker, label: `Início da jornada — primeiro aporte em ${first.ticker}` });
  }

  // P&L realizado por ANO (trilha fiscal honesta).
  const realizedByYear: Record<string, number> = {};
  for (const e of asc) {
    if (e.action === "VENDA" && e.realized_pnl != null) {
      const y = new Date(e.executed_at).getFullYear().toString();
      realizedByYear[y] = (realizedByYear[y] ?? 0) + e.realized_pnl;
    }
  }

  return { points, milestones, realizedByYear };
}

function ChartTooltip({ active, payload, label, fmt }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface-3 border border-border rounded-lg p-2.5 shadow-card text-xs">
      <p className="text-text-muted mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} className="font-mono font-semibold" style={{ color: p.color }}>
          {p.name}: {fmt ? fmt(p.value) : p.value}
        </p>
      ))}
    </div>
  );
}

export default function HistoryPage() {
  const { activePortfolioId, fetchPortfolios } = usePortfolioStore();
  const [history, setHistory] = useState<TradeHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<string>("TODOS");

  useEffect(() => { fetchPortfolios(); }, []);

  useEffect(() => {
    if (activePortfolioId) loadHistory(activePortfolioId);
  }, [activePortfolioId]);

  const loadHistory = async (portfolioId: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await portfolioApi.getHistory(portfolioId);
      const data = res.data;
      const events: TradeHistoryItem[] = Array.isArray(data)
        ? data
        : Array.isArray(data?.events)
          ? data.events
          : [];
      setHistory(events);
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Erro ao carregar histórico");
    } finally {
      setLoading(false);
    }
  };

  const filtered = filter === "TODOS" ? history : history.filter(h => h.action === filter);

  // Summary stats — SÓ eventos de CAIXA (COMPRA/VENDA) contam como volume/operação.
  const cashEvents = history.filter(isCashEvent);
  const totalCompras = cashEvents.filter(h => h.action === "COMPRA").reduce((s, h) => s + h.total_value, 0);
  const totalVendas  = cashEvents.filter(h => h.action === "VENDA").reduce((s, h) => s + h.total_value, 0);
  const uniqueTickers = new Set(history.map(h => h.ticker)).size;
  const realizedPnl = cashEvents.reduce((s, h) => s + (h.realized_pnl ?? 0), 0);
  const sellsMissingExit = cashEvents.filter(h => h.action === "VENDA" && (h.realized_pnl == null)).length;

  // A história do composto (derivada dos eventos reais).
  const story = useMemo(() => buildCompoundStory(history), [history]);
  const { points, milestones, realizedByYear } = story;
  const lastPoint = points[points.length - 1];
  const currentYear = new Date().getFullYear().toString();
  const realizedThisYear = realizedByYear[currentYear] ?? 0;

  // Existe algum evento de ações (não-cripto)? heurística simples por ticker.
  const hasEquity = history.some(h => !/(-USD|USDT|BTC|ETH|\bSOL\b)/i.test(h.ticker));

  // === Dados da jornada (para o painel "Onde estou") ===
  const journeyStats = useMemo(() => {
    if (history.length === 0) return null;
    const asc = [...history].sort(
      (a, b) => new Date(a.executed_at).getTime() - new Date(b.executed_at).getTime()
    );
    const firstDate = new Date(asc[0].executed_at);
    const now = new Date();
    const diffMs = now.getTime() - firstDate.getTime();
    const totalDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const totalMonths = Math.floor(totalDays / 30.44);
    const years = Math.floor(totalMonths / 12);
    const months = totalMonths % 12;

    // Contribuição média mensal (só compras de caixa)
    const cashBuyCount = history.filter(h => h.action === "COMPRA" && isCashEvent(h)).length;
    const avgMonthly = totalMonths > 0 ? (totalCompras / Math.max(totalMonths, 1)) : 0;

    // Capital efficiency: P&L realizado / capital aportado bruto
    const efficiency = totalCompras > 0 ? (realizedPnl / totalCompras) * 100 : 0;

    // Progresso num horizonte de 10 anos (120 meses)
    const horizonMonths = 120;
    const progressPct = Math.min((totalMonths / horizonMonths) * 100, 100);

    // Projeção linear simples: se continuar aportando avgMonthly, em quanto meses atinge 10 anos?
    const monthsLeft = Math.max(0, horizonMonths - totalMonths);

    return {
      firstDate,
      years,
      months,
      totalMonths,
      totalDays,
      avgMonthly,
      efficiency,
      progressPct,
      monthsLeft,
      eventsPerMonth: totalMonths > 0 ? (cashBuyCount / Math.max(totalMonths, 1)).toFixed(1) : "—",
    };
  }, [history, totalCompras, realizedPnl]);

  return (
    <AppShell>
      <div className="p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-text-primary flex items-center gap-2">
              <History size={18} className="text-primary" />
              História do Composto
            </h1>
            <p className="text-sm text-text-secondary mt-0.5">
              A jornada do capital aportado, da alavancagem no tempo e do P&amp;L realizado — derivada dos eventos reais da carteira
            </p>
          </div>
          {activePortfolioId && (
            <button onClick={() => loadHistory(activePortfolioId)} disabled={loading}
              className="btn-primary flex items-center gap-2 text-sm">
              {loading ? <RefreshCw size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              Atualizar
            </button>
          )}
        </div>

        {/* Summary cards */}
        {history.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3 md:gap-4 mb-5">
            {[
              { label: "Operações de Caixa", value: cashEvents.length.toString(), color: "text-text-primary", hint: `${history.length} eventos no total (inclui classificação)` },
              { label: "Ativos Operados",    value: uniqueTickers.toString(),  color: "text-primary" },
              { label: "Capital Aportado Líq.", value: formatCurrency(totalCompras - totalVendas, "USD", true), color: "text-success", hint: `Compras ${formatCurrency(totalCompras, "USD", true)} − Vendas ${formatCurrency(totalVendas, "USD", true)}` },
              { label: "Alavancagem Efetiva", value: lastPoint && lastPoint.leverage > 0 ? `${lastPoint.leverage.toFixed(2)}x` : "n/d", color: "text-warning", hint: "Ponderada pela exposição corrente (último evento)" },
              {
                label: "P&L Realizado",
                value: (realizedPnl >= 0 ? "+" : "") + formatCurrency(realizedPnl, "USD", true),
                color: realizedPnl >= 0 ? "text-success" : "text-danger",
                hint: sellsMissingExit > 0 ? `${sellsMissingExit} venda(s) sem preço de saída — não computada(s)` : undefined,
              },
            ].map(s => (
              <div key={s.label} className="card-sm" title={s.hint}>
                <p className="text-xs text-text-muted mb-1">{s.label}</p>
                <p className={`text-base font-mono font-semibold ${s.color}`}>{s.value}</p>
                {s.hint && <p className="text-[10px] text-text-muted mt-0.5">{s.hint}</p>}
              </div>
            ))}
          </div>
        )}

        {/* ====== ONDE ESTOU NA JORNADA ====== */}
        {!loading && journeyStats && (
          <div className="card p-4 mb-5">
            <div className="flex items-center gap-2 mb-3">
              <Compass size={15} className="text-primary" />
              <h2 className="text-sm font-semibold text-text-primary">Onde Estou na Jornada</h2>
              <span className="text-[10px] text-text-muted ml-1">(horizonte de referência: 10 anos)</span>
            </div>

            {/* Barra de progresso */}
            <div className="mb-4">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-text-muted">
                  Início: {journeyStats.firstDate.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}
                </span>
                <span className="font-mono font-semibold text-primary">
                  {journeyStats.progressPct.toFixed(1)}% do horizonte de 10 anos
                </span>
                <span className="text-text-muted">
                  {journeyStats.monthsLeft} meses restantes
                </span>
              </div>
              <div className="h-3 bg-surface-3 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary/70 to-primary transition-all duration-500"
                  style={{ width: `${journeyStats.progressPct}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-text-muted mt-1">
                <span>Ano 0</span>
                <span>Ano 2</span>
                <span>Ano 5</span>
                <span>Ano 7</span>
                <span>Ano 10</span>
              </div>
            </div>

            {/* Métricas da jornada */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-surface-2 rounded-lg p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <CalendarDays size={12} className="text-primary" />
                  <p className="text-[11px] text-text-muted">Tempo investindo</p>
                </div>
                <p className="font-mono font-semibold text-text-primary text-sm">
                  {journeyStats.years > 0
                    ? `${journeyStats.years}a ${journeyStats.months}m`
                    : `${journeyStats.totalMonths}m`}
                </p>
                <p className="text-[10px] text-text-muted">{journeyStats.totalDays} dias</p>
              </div>

              <div className="bg-surface-2 rounded-lg p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <Banknote size={12} className="text-success" />
                  <p className="text-[11px] text-text-muted">Aporte médio/mês</p>
                </div>
                <p className="font-mono font-semibold text-success text-sm">
                  {formatCurrency(journeyStats.avgMonthly, "USD", true)}
                </p>
                <p className="text-[10px] text-text-muted">{journeyStats.eventsPerMonth} compras/mês</p>
              </div>

              <div className="bg-surface-2 rounded-lg p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <Target size={12} className="text-warning" />
                  <p className="text-[11px] text-text-muted">Eficiência do capital</p>
                </div>
                <p className={cn("font-mono font-semibold text-sm", journeyStats.efficiency >= 0 ? "text-success" : "text-danger")}>
                  {(journeyStats.efficiency >= 0 ? "+" : "") + journeyStats.efficiency.toFixed(1)}%
                </p>
                <p className="text-[10px] text-text-muted">P&L realizado / aportado</p>
              </div>

              <div className="bg-surface-2 rounded-lg p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <Gauge size={12} className="text-warning" />
                  <p className="text-[11px] text-text-muted">Alav. efetiva atual</p>
                </div>
                <p className="font-mono font-semibold text-warning text-sm">
                  {lastPoint && lastPoint.leverage > 0 ? `${lastPoint.leverage.toFixed(2)}x` : "n/d"}
                </p>
                <p className="text-[10px] text-text-muted">ponderada pela exposição</p>
              </div>
            </div>
          </div>
        )}

        {/* ====== A HISTÓRIA DO COMPOSTO (gráficos derivados) ====== */}
        {!loading && points.length >= 2 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
            {/* Capital aportado líquido + retorno composto no tempo */}
            <div className="card p-4">
              <div className="flex items-center gap-2 mb-1">
                <Banknote size={15} className="text-success" />
                <h2 className="text-sm font-semibold text-text-primary">Capital: Aportado vs. Composto</h2>
              </div>
              <p className="text-[11px] text-text-muted mb-3">
                Verde = dinheiro real colocado (compras − vendas). Azul = aportado + P&L realizado acumulado. A distância entre as curvas é o juro do composto já realizado.
              </p>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={points} margin={{ top: 5, right: 10, left: 5, bottom: 5 }}>
                  <defs>
                    <linearGradient id="netInvFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#16C784" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#16C784" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="totalRetFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.20} />
                      <stop offset="100%" stopColor="#3B82F6" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E2730" />
                  <XAxis dataKey="label" tick={{ fill: "#475569", fontSize: 10 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                  <YAxis tickFormatter={(v) => formatCurrency(v, "USD", true)} tick={{ fill: "#475569", fontSize: 10 }} tickLine={false} axisLine={false} width={56} />
                  <Tooltip content={<ChartTooltip fmt={(v: number) => formatCurrency(v)} />} />
                  <Legend wrapperStyle={{ fontSize: 10, color: "#475569" }} />
                  <Area type="monotone" name="Composto (aport.+P&L)" dataKey="totalReturn" stroke="#3B82F6" strokeWidth={1.5} fill="url(#totalRetFill)" dot={false} />
                  <Area type="monotone" name="Aportado líq." dataKey="netInvested" stroke="#16C784" strokeWidth={2} fill="url(#netInvFill)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Alavancagem efetiva no tempo — com zonas de doutrina */}
            <div className="card p-4">
              <div className="flex items-center gap-2 mb-1">
                <Gauge size={15} className="text-warning" />
                <h2 className="text-sm font-semibold text-text-primary">Alavancagem Efetiva no Tempo</h2>
              </div>
              <p className="text-[11px] text-text-muted mb-3">
                Ponderada pela exposição — sobe no aporte, cai na desalavancagem. Linhas de referência: zonas da doutrina (2x/3x/4x/5x).
              </p>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={points} margin={{ top: 5, right: 10, left: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E2730" />
                  <XAxis dataKey="label" tick={{ fill: "#475569", fontSize: 10 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                  <YAxis tickFormatter={(v) => `${v.toFixed(1)}x`} tick={{ fill: "#475569", fontSize: 10 }} tickLine={false} axisLine={false} width={36} domain={[0, "dataMax + 0.5"]} />
                  <Tooltip content={<ChartTooltip fmt={(v: number) => `${Number(v).toFixed(2)}x`} />} />
                  {/* Zonas de doutrina */}
                  <ReferenceLine y={1} stroke="#334155" strokeDasharray="4 2" label={{ value: "1×", fill: "#475569", fontSize: 9, position: "insideTopRight" }} />
                  <ReferenceLine y={2} stroke="#1e40af55" strokeDasharray="3 3" label={{ value: "2×", fill: "#3B82F6", fontSize: 9, position: "insideTopRight" }} />
                  <ReferenceLine y={3} stroke="#d9770655" strokeDasharray="3 3" label={{ value: "3×", fill: "#f59e0b", fontSize: 9, position: "insideTopRight" }} />
                  <ReferenceLine y={4} stroke="#b9112755" strokeDasharray="3 3" label={{ value: "4×", fill: "#ef4444", fontSize: 9, position: "insideTopRight" }} />
                  <ReferenceLine y={5} stroke="#7f1d1d55" strokeDasharray="3 3" label={{ value: "5×", fill: "#ef4444", fontSize: 9, position: "insideTopRight" }} />
                  <Line type="stepAfter" name="Alav. efetiva" dataKey="leverage" stroke="#FFB800" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* P&L realizado acumulado + trilha fiscal */}
            <div className="card p-4 lg:col-span-2">
              <div className="flex items-center gap-2 mb-1">
                <LineChartIcon size={15} className="text-primary" />
                <h2 className="text-sm font-semibold text-text-primary">P&amp;L Realizado Acumulado</h2>
              </div>
              <p className="text-[11px] text-text-muted mb-3">
                Soma do P&amp;L realizado em cada venda (preço de saída real), acumulado no tempo. Só o que foi de fato realizado.
              </p>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={points} margin={{ top: 5, right: 10, left: 5, bottom: 5 }}>
                  <defs>
                    <linearGradient id="pnlFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#3B82F6" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E2730" />
                  <XAxis dataKey="label" tick={{ fill: "#475569", fontSize: 10 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                  <YAxis tickFormatter={(v) => formatCurrency(v, "USD", true)} tick={{ fill: "#475569", fontSize: 10 }} tickLine={false} axisLine={false} width={52} />
                  <Tooltip content={<ChartTooltip fmt={(v: number) => formatCurrency(v)} />} />
                  <ReferenceLine y={0} stroke="#2D3748" strokeDasharray="4 2" />
                  <Area type="monotone" name="P&L realiz. acum." dataKey="cumRealized" stroke="#3B82F6" strokeWidth={2} fill="url(#pnlFill)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>

              {/* Trilha fiscal */}
              <div className="mt-4 border-t border-border pt-3">
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
                  <span className="text-text-muted flex items-center gap-1.5">
                    <Info size={13} /> Trilha fiscal (ganho realizado por ano):
                  </span>
                  {Object.keys(realizedByYear).length === 0 ? (
                    <span className="text-text-muted">nenhuma venda realizada ainda</span>
                  ) : (
                    Object.entries(realizedByYear).sort().map(([year, v]) => (
                      <span key={year} className="font-mono">
                        <span className="text-text-secondary">{year}: </span>
                        <span className={v >= 0 ? "text-success font-semibold" : "text-danger font-semibold"}>
                          {(v >= 0 ? "+" : "") + formatCurrency(v)}
                        </span>
                      </span>
                    ))
                  )}
                </div>
                <p className="text-[10px] text-text-muted mt-2 leading-relaxed">
                  Ganho realizado em {currentYear}: <span className="font-mono text-text-secondary">{(realizedThisYear >= 0 ? "+" : "") + formatCurrency(realizedThisYear)}</span>.
                  {hasEquity && (
                    <> Lembrete BR: vendas de <span className="text-text-secondary">ações</span> até R$ 20.000/mês são isentas de IR sobre o ganho;
                    acima disso, o lucro é tributável. Isto é só orientação — não calcula DARF, não inclui cripto/ETF/exterior. Consulte regras vigentes.</>
                  )}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Marcos de doutrina */}
        {!loading && milestones.length > 0 && (
          <div className="card p-4 mb-5">
            <div className="flex items-center gap-2 mb-3">
              <Flag size={15} className="text-warning" />
              <h2 className="text-sm font-semibold text-text-primary">Marcos da Doutrina</h2>
            </div>
            <ol className="relative border-l border-border ml-2 space-y-3">
              {milestones.map((m, i) => (
                <li key={`${m.iso}-${i}`} className="ml-4">
                  <span className={cn(
                    "absolute -left-1.5 mt-1 h-3 w-3 rounded-full border-2 border-surface",
                    m.action === "SEMENTE" ? "bg-warning" : m.action === "INICIO" ? "bg-primary ring-2 ring-primary/30" : "bg-primary"
                  )} />
                  <div className="flex items-center gap-2 flex-wrap">
                    <ActionBadge action={m.action} />
                    <TickerLogo ticker={m.ticker} size={18} />
                    <span className="text-xs text-text-secondary">{m.label}</span>
                    <span className="text-[10px] text-text-muted font-mono">{formatDate(m.iso)}</span>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Filter tabs */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {["TODOS", "COMPRA", "VENDA", "AJUSTE", "SEMENTE", "CICLO"].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={cn("text-xs px-3 py-1.5 rounded-full border transition-colors",
                filter === f
                  ? "bg-primary/15 border-primary/40 text-primary font-semibold"
                  : "border-border text-text-secondary hover:border-primary/30 hover:text-primary"
              )}>
              {f === "TODOS" ? "Todos" : f.charAt(0) + f.slice(1).toLowerCase()}
              {f !== "TODOS" && (
                <span className="ml-1.5 text-[10px] text-text-muted">
                  ({history.filter(h => h.action === f).length})
                </span>
              )}
            </button>
          ))}
        </div>

        {error && (
          <div className="bg-danger/10 border border-danger/20 rounded-lg px-4 py-3 text-sm text-danger mb-4">{error}</div>
        )}

        {/* No portfolio selected */}
        {!activePortfolioId && !loading && (
          <div className="card text-center py-16">
            <History size={36} className="text-text-muted mx-auto mb-3" />
            <p className="text-sm text-text-secondary">Selecione uma carteira na barra lateral para ver a história.</p>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="card text-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mb-4" />
            <p className="text-sm text-text-secondary">Carregando história do composto...</p>
          </div>
        )}

        {/* Empty state */}
        {!loading && activePortfolioId && history.length === 0 && (
          <div className="card text-center py-16">
            <History size={36} className="text-text-muted mx-auto mb-3" />
            <p className="text-sm text-text-secondary">Nenhuma operação registrada ainda.</p>
            <p className="text-xs text-text-muted mt-1">A história começa a ser contada assim que você planta a primeira semente ou faz o primeiro aporte.</p>
          </div>
        )}

        {/* Table — o diário de eventos que sustenta a história */}
        {!loading && filtered.length > 0 && (
          <div className="card overflow-hidden p-0">
            <div className="px-4 py-3 border-b border-border bg-surface-2">
              <h2 className="text-sm font-semibold text-text-primary">Diário de Eventos</h2>
              <p className="text-[11px] text-text-muted">Cada linha é um evento real da carteira — a matéria-prima da história acima.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface-2">
                    <th className="text-left px-4 py-3 text-xs text-text-muted font-medium">Data</th>
                    <th className="text-left px-4 py-3 text-xs text-text-muted font-medium">Ativo</th>
                    <th className="text-left px-4 py-3 text-xs text-text-muted font-medium">Ação</th>
                    <th className="text-right px-4 py-3 text-xs text-text-muted font-medium">Cotas</th>
                    <th className="text-right px-4 py-3 text-xs text-text-muted font-medium">Preço Médio</th>
                    <th className="text-right px-4 py-3 text-xs text-text-muted font-medium">Valor Total</th>
                    <th className="text-right px-4 py-3 text-xs text-text-muted font-medium">P&amp;L Realizado</th>
                    <th className="text-right px-4 py-3 text-xs text-text-muted font-medium">Alavancagem</th>
                    <th className="text-left px-4 py-3 text-xs text-text-muted font-medium">Notas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((item) => (
                    <tr key={item.id} className="hover:bg-surface-2/50 transition-colors">
                      <td className="px-4 py-3 text-xs text-text-muted font-mono whitespace-nowrap">
                        {formatDate(item.executed_at)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <TickerLogo ticker={item.ticker} size={24} />
                          <span className="font-mono font-semibold text-text-primary text-xs">
                            {item.ticker}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <ActionBadge action={item.action} />
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs text-text-primary">
                        {item.shares > 0 ? item.shares.toFixed(4) : "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs text-text-primary">
                        {item.price > 0 ? formatCurrency(item.price) : "—"}
                      </td>
                      <td className={`px-4 py-3 text-right font-mono text-xs font-semibold ${
                        item.action === "VENDA" ? "text-danger" : item.total_value > 0 ? "text-success" : "text-text-muted"
                      }`}>
                        {item.total_value > 0
                          ? (item.action === "VENDA" ? "-" : "+") + formatCurrency(item.total_value)
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs">
                        {item.action !== "VENDA" ? (
                          <span className="text-text-muted">—</span>
                        ) : item.realized_pnl == null ? (
                          <span className="text-text-muted" title="Preço de saída indisponível no momento da venda — P&L não apurado">
                            n/d
                          </span>
                        ) : (
                          <span className={item.realized_pnl >= 0 ? "text-success font-semibold" : "text-danger font-semibold"}>
                            {(item.realized_pnl >= 0 ? "+" : "") + formatCurrency(item.realized_pnl)}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs text-warning">
                        {item.leverage > 0 ? `${item.leverage.toFixed(2)}x` : "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-text-muted max-w-[180px] truncate">
                        {item.notes || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-2 border-t border-border bg-surface-2/50">
              <p className="text-xs text-text-muted">
                {filtered.length} evento{filtered.length === 1 ? "" : "s"}
                {filter !== "TODOS" ? ` de ${filter.toLowerCase()}` : ""} exibido{filtered.length === 1 ? "" : "s"}
              </p>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
