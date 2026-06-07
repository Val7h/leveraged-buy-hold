"use client";
import { useEffect, useState } from "react";
import { assetsApi } from "@/lib/api";
import type { MarketState } from "@/types";
import { TrendingUp, TrendingDown, Minus, RefreshCw, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

const STATE_CONFIG = {
  TOPO: {
    Icon:         TrendingUp,
    bg:           "bg-danger/8",
    border:       "border-danger/25",
    iconBg:       "bg-danger/15",
    textColor:    "text-danger",
    badgeBg:      "bg-danger",
    badgeText:    "text-white",
    multiplierColor: "text-danger",
  },
  NORMAL: {
    Icon:         Minus,
    bg:           "bg-warning/8",
    border:       "border-warning/25",
    iconBg:       "bg-warning/15",
    textColor:    "text-warning",
    badgeBg:      "bg-warning",
    badgeText:    "text-black",
    multiplierColor: "text-warning",
  },
  CORREÇÃO: {
    Icon:         TrendingDown,
    bg:           "bg-primary/8",
    border:       "border-primary/25",
    iconBg:       "bg-primary/15",
    textColor:    "text-primary",
    badgeBg:      "bg-primary",
    badgeText:    "text-white",
    multiplierColor: "text-primary",
  },
  CAPITULAÇÃO: {
    Icon:         TrendingDown,
    bg:           "bg-success/8",
    border:       "border-success/25",
    iconBg:       "bg-success/15",
    textColor:    "text-success",
    badgeBg:      "bg-success",
    badgeText:    "text-white",
    multiplierColor: "text-success",
  },
} as const;

interface SignalPillProps {
  label: string;
  value?: number | null;
  unit?: string;
  sign?: boolean;
  lowGood?: boolean;   // true = lower value = green (e.g. dist from top negative is good)
}

function SignalPill({ label, value, unit = "", sign = false, lowGood = false }: SignalPillProps) {
  let color = "text-text-primary";
  if (value != null) {
    if (lowGood) {
      color = value < -10 ? "text-success" : value > -3 ? "text-danger" : "text-text-primary";
    } else {
      color = value < 40 ? "text-success" : value > 65 ? "text-danger" : "text-text-primary";
    }
  }
  return (
    <div className="flex flex-col items-center min-w-[72px]">
      <span className="text-[10px] text-text-muted mb-0.5 whitespace-nowrap">{label}</span>
      <span className={cn("text-sm font-mono font-semibold", value == null ? "text-text-muted" : color)}>
        {value != null
          ? `${sign && value > 0 ? "+" : ""}${value.toFixed(1)}${unit}`
          : "—"}
      </span>
    </div>
  );
}

export default function MarketStateWidget() {
  const [state, setState]   = useState<MarketState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(false);

  const load = async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await assetsApi.getMarketState();
      setState(res.data as MarketState);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading) {
    return (
      <div className="card mb-5 flex items-center gap-3 py-4 border-border/40">
        <RefreshCw size={13} className="animate-spin text-text-muted" />
        <span className="text-xs text-text-muted">Detectando estado do mercado via SPY...</span>
      </div>
    );
  }

  if (error || !state) {
    return (
      <div className="card mb-5 flex items-center justify-between py-3 border-border/40">
        <span className="text-xs text-text-muted">Estado do mercado indisponível</span>
        <button onClick={load} className="text-xs text-primary hover:underline">Tentar novamente</button>
      </div>
    );
  }

  const cfg = STATE_CONFIG[state.state] ?? STATE_CONFIG.NORMAL;
  const { Icon } = cfg;
  const s = state.signals;

  return (
    <div className={cn("card mb-5 border", cfg.border, cfg.bg)}>
      <div className="flex items-center justify-between flex-wrap gap-4">

        {/* ── Bloco esquerdo: estado + descrição ───────────────── */}
        <div className="flex items-center gap-4">
          <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0", cfg.iconBg)}>
            <Icon size={20} className={cfg.textColor} />
          </div>
          <div>
            <p className="text-[10px] text-text-muted uppercase tracking-wider mb-0.5 flex items-center gap-1.5">
              <Zap size={9} />
              Estado do Mercado · SPY
            </p>
            <div className="flex items-center gap-2.5">
              <span className={cn("text-lg font-bold font-mono tracking-tight", cfg.textColor)}>
                {state.state}
              </span>
              <span className={cn(
                "px-2.5 py-0.5 rounded-full text-sm font-bold leading-none",
                cfg.badgeBg, cfg.badgeText
              )}>
                {state.multiplier}x
              </span>
            </div>
            <p className="text-xs text-text-secondary mt-0.5 max-w-xs">{state.description}</p>
          </div>
        </div>

        {/* ── Bloco direito: sinais + refresh ──────────────────── */}
        <div className="flex items-center gap-5 flex-wrap">
          <SignalPill
            label="RSI Sem. SPY"
            value={s.rsi_semanal_spy}
            unit=""
          />
          <div className="w-px h-8 bg-border/50" />
          <SignalPill
            label="Dist. MM200"
            value={s.distancia_ma200_pct}
            unit="%"
            sign
            lowGood={false}
          />
          <div className="w-px h-8 bg-border/50" />
          <SignalPill
            label="Dist. Topo 52s"
            value={s.distancia_topo_52s_pct}
            unit="%"
            sign
            lowGood
          />
          <div className="w-px h-8 bg-border/50" />
          <div className="flex flex-col items-center gap-1">
            <span className="text-[10px] text-text-muted">Próximo aporte</span>
            <span className={cn("text-base font-bold font-mono", cfg.multiplierColor)}>
              {state.multiplier}x
            </span>
          </div>
          <button
            onClick={load}
            className="text-text-muted hover:text-primary transition-colors p-1.5 rounded-lg hover:bg-surface-2"
            title="Atualizar"
          >
            <RefreshCw size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}
