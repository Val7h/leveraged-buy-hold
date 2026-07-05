"use client";
import { useEffect, useState } from "react";
import { assetsApi } from "@/lib/api";
import type { MarketState } from "@/types";
import { TrendingUp, TrendingDown, Minus, RefreshCw, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

// Perfil canônico (client-safe — NÃO importar de @/lib/auth, que puxa next/headers
// e quebra o bundle do client). Espelha normalizeRiskProfile do servidor.
type RiskProfile = "conservador" | "moderado" | "agressivo";
function normalizeRiskProfile(raw: string | null | undefined): RiskProfile {
  const v = (raw ?? "").trim().toLowerCase();
  if (v === "conservador" || v === "conservative") return "conservador";
  if (v === "agressivo" || v === "aggressive") return "agressivo";
  return "moderado";
}

// Multiplicador de APORTE por perfil × estado de mercado (presets do motor, valores EXATOS).
const APORTE_PRESETS: Record<RiskProfile, Record<MarketState["state"], number>> = {
  conservador: { TOPO: 1, NORMAL: 1, "CORREÇÃO": 2, "CAPITULAÇÃO": 2 },
  moderado:    { TOPO: 2, NORMAL: 2, "CORREÇÃO": 3, "CAPITULAÇÃO": 3 },
  agressivo:   { TOPO: 2, NORMAL: 3, "CORREÇÃO": 4, "CAPITULAÇÃO": 5 },
};

function aporteMultiplier(state: MarketState["state"], profile: RiskProfile): number {
  return APORTE_PRESETS[profile][state] ?? APORTE_PRESETS[profile].NORMAL;
}

// One-line action guidance per state
const STATE_ACTION: Record<MarketState["state"], string> = {
  TOPO:        "Reduzir novos aportes, proteger posições",
  NORMAL:      "Ritmo normal de aportes",
  "CORREÇÃO":  "Começar a aumentar aportes gradualmente",
  "CAPITULAÇÃO": "Momento de aportar mais agressivamente",
};

const STATE_CONFIG = {
  TOPO: {
    Icon:            TrendingUp,
    bg:              "bg-danger/8",
    border:          "border-danger/40",
    borderPulse:     false,
    iconBg:          "bg-danger/15",
    textColor:       "text-danger",
    badgeBg:         "bg-danger",
    badgeText:       "text-white",
    multiplierColor: "text-danger",
    ringColor:       "ring-danger/50",
  },
  NORMAL: {
    Icon:            Minus,
    bg:              "bg-warning/8",
    border:          "border-warning/25",
    borderPulse:     false,
    iconBg:          "bg-warning/15",
    textColor:       "text-warning",
    badgeBg:         "bg-warning",
    badgeText:       "text-black",
    multiplierColor: "text-warning",
    ringColor:       "",
  },
  "CORREÇÃO": {
    Icon:            TrendingDown,
    bg:              "bg-primary/8",
    border:          "border-primary/25",
    borderPulse:     false,
    iconBg:          "bg-primary/15",
    textColor:       "text-primary",
    badgeBg:         "bg-primary",
    badgeText:       "text-white",
    multiplierColor: "text-primary",
    ringColor:       "",
  },
  CAPITULAÇÃO: {
    Icon:            TrendingDown,
    bg:              "bg-success/8",
    border:          "border-success/50",
    borderPulse:     true,
    iconBg:          "bg-success/15",
    textColor:       "text-success",
    badgeBg:         "bg-success",
    badgeText:       "text-white",
    multiplierColor: "text-success",
    ringColor:       "ring-success/40",
  },
} as const;

interface SignalPillProps {
  label: string;
  value?: number | null;
  unit?: string;
  sign?: boolean;
  lowGood?: boolean;
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

// Skeleton shimmer for loading state
function SkeletonBar({ w = "100%", h = "0.75rem" }: { w?: string; h?: string }) {
  return (
    <div
      className="rounded animate-pulse bg-surface-3"
      style={{ width: w, height: h }}
    />
  );
}

export default function MarketStateWidget({ riskProfile }: { riskProfile?: string | null }) {
  const profile = normalizeRiskProfile(riskProfile);
  const [state, setState]     = useState<MarketState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);

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

  // ── Skeleton loading state ──────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="card mb-5 border border-border/30 bg-surface-2/30 p-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-surface-3 animate-pulse flex-shrink-0" />
            <div className="space-y-2">
              <SkeletonBar w="7rem" h="0.625rem" />
              <SkeletonBar w="10rem" h="1.25rem" />
              <SkeletonBar w="14rem" h="0.75rem" />
            </div>
          </div>
          <div className="flex items-center gap-5">
            {[72, 72, 72, 56, 56].map((w, i) => (
              <div key={i} className="flex flex-col items-center gap-1.5">
                <SkeletonBar w={`${w * 0.6}px`} h="0.625rem" />
                <SkeletonBar w={`${w * 0.7}px`} h="1rem" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Error state ─────────────────────────────────────────────────────────────
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
  const mult = aporteMultiplier(state.state, profile);
  const actionText = STATE_ACTION[state.state] ?? "";

  // Pulsing border style injected via inline style for CAPITULAÇÃO (green) / TOPO (red-orange)
  const pulseStyle: React.CSSProperties =
    cfg.borderPulse
      ? { boxShadow: "0 0 0 2px rgba(0,255,136,0.25), 0 0 12px rgba(0,255,136,0.15)" }
      : state.state === "TOPO"
      ? { boxShadow: "0 0 0 2px rgba(255,77,77,0.20), 0 0 10px rgba(255,77,77,0.12)" }
      : {};

  return (
    <div
      className={cn("card mb-5 border transition-shadow", cfg.border, cfg.bg, cfg.borderPulse && "animate-pulse-border")}
      style={pulseStyle}
    >
      <div className="flex items-center justify-between flex-wrap gap-4">

        {/* ── Bloco esquerdo: estado + descrição ──────────────────────── */}
        <div className="flex items-center gap-4">
          <div className={cn(
            "w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0",
            cfg.iconBg,
            cfg.ringColor && `ring-2 ${cfg.ringColor}`
          )}>
            <Icon size={20} className={cfg.textColor} />
          </div>
          <div>
            <p className="text-[10px] text-text-muted uppercase tracking-wider mb-0.5 flex items-center gap-1.5">
              <Zap size={9} />
              Estado do Mercado · SPY
            </p>
            <div className="flex items-center gap-2.5 mb-0.5">
              <span className={cn("text-lg font-bold font-mono tracking-tight", cfg.textColor)}>
                {state.state}
              </span>
              {/* Large active multiplier badge */}
              <span className={cn(
                "px-3 py-0.5 rounded-full text-sm font-bold leading-none",
                cfg.badgeBg, cfg.badgeText
              )}>
                Multiplicador ativo: {state.multiplier}x
              </span>
            </div>
            <p className="text-xs text-text-secondary max-w-xs">{state.description}</p>
            {/* Action guidance */}
            <p className={cn("text-[11px] font-medium mt-1", cfg.textColor)}>
              → {actionText}
            </p>
          </div>
        </div>

        {/* ── Bloco direito: sinais + refresh ─────────────────────────── */}
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
          {/* Regime = multiplicador legado do estado de mercado (indicador, não aporte). */}
          <div className="flex flex-col items-center gap-1">
            <span className="text-[10px] text-text-muted">Regime</span>
            <span className={cn("text-base font-bold font-mono", cfg.multiplierColor)}>
              {state.multiplier}x
            </span>
          </div>
          <div className="w-px h-8 bg-border/50" />
          {/* Próximo aporte = preset PERFIL × estado */}
          <div className="flex flex-col items-center gap-1">
            <span className="text-[10px] text-text-muted">Próximo aporte</span>
            <span className={cn("text-base font-bold font-mono", cfg.multiplierColor)}>
              {mult}x
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
