"use client";
import { useState } from "react";
import { cn, formatCurrency, formatPercent, getScoreColor, getScoreBg, sectorIcon } from "@/lib/utils";
import ScoreGauge from "@/components/ui/ScoreGauge";
import TickerLogo from "@/components/ui/TickerLogo";
import AssetChartModal from "@/components/assets/AssetChartModal";
import type { AssetScore } from "@/types";

interface AssetCardProps {
  asset: AssetScore;
  onSelect?: (ticker: string) => void;
}

const riskColors: Record<string, string> = {
  BAIXO:   "text-success bg-success/10 border-success/20",
  MODERADO: "text-warning bg-warning/10 border-warning/20",
  ELEVADO: "text-danger bg-danger/10 border-danger/20",
  ALTO:    "text-danger bg-danger/10 border-danger/20",
};

const entryConfig: Record<string, { bg: string; border: string; text: string }> = {
  "ENTRAR FORTE":           { bg: "bg-success/12", border: "border-success/35", text: "text-success" },
  "ENTRAR":                 { bg: "bg-success/8",  border: "border-success/25", text: "text-success" },
  "ENTRAR (mercado em topo)": { bg: "bg-warning/10", border: "border-warning/30", text: "text-warning" },
  "AGUARDAR":               { bg: "bg-warning/8",  border: "border-warning/20", text: "text-warning" },
  "EVITAR":                 { bg: "bg-danger/8",   border: "border-danger/20",  text: "text-danger" },
  "SEM DADOS":              { bg: "bg-surface-2",  border: "border-border",     text: "text-text-muted" },
};

export default function AssetCard({ asset, onSelect }: AssetCardProps) {
  const [showChart, setShowChart] = useState(false);
  const tech  = asset.technicals;
  const entry = asset.entry_signal ? (entryConfig[asset.entry_signal] ?? entryConfig["SEM DADOS"]) : null;
  const kelly = asset.kelly;

  return (
    <>
    {showChart && <AssetChartModal ticker={asset.ticker} onClose={() => setShowChart(false)} />}
    <div
      className="card hover:border-primary/30 transition-all cursor-pointer group"
      onClick={() => { onSelect?.(asset.ticker); setShowChart(true); }}
    >
      {/* ── Header ──────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-2.5">
          <TickerLogo ticker={asset.ticker} size={36} className="mt-0.5" />
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-base font-bold text-text-primary font-mono">
                {asset.is_tokenized ? asset.underlying_ticker ?? asset.ticker.replace("ONUSDT","") : asset.ticker}
              </span>
              {asset.is_tokenized && (
                <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-400 uppercase tracking-wide">
                  🪙 Token
                </span>
              )}
              <span className="text-sm">{sectorIcon(asset.sector)}</span>
            </div>
            <p className="text-xs text-text-muted truncate max-w-32">{asset.company_name || "—"}</p>
            <p className="text-xs text-text-muted">{asset.sector || "—"}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-base font-semibold text-text-primary font-mono">{formatCurrency(asset.current_price)}</p>
        </div>
      </div>

      {/* ── Scores ──────────────────────────────────────── */}
      <div className="flex justify-around py-3 border-y border-border mb-4">
        <ScoreGauge score={asset.quality_score}      label="Qualidade"   size="sm" />
        <ScoreGauge score={asset.opportunity_score}  label="Oportunidade" size="sm" />
        <ScoreGauge score={asset.composite_score}    label="Composto"    size="sm" />
      </div>

      {/* ── Sinal de Entrada ────────────────────────────── */}
      {asset.entry_signal && asset.entry_signal !== "SEM DADOS" && entry && (
        <div className={cn("rounded-lg px-3 py-2 mb-3 border", entry.bg, entry.border)}>
          <div className="flex items-center justify-between mb-0.5">
            <span className={cn("text-xs font-bold tracking-wide", entry.text)}>
              {asset.entry_signal}
            </span>
            {asset.entry_leverage != null && (
              <span className={cn("text-sm font-bold font-mono", entry.text)}>
                {asset.entry_leverage.toFixed(1)}x
              </span>
            )}
          </div>
          {tech?.rsi_14_weekly != null && (
            <p className="text-[10px] text-text-muted leading-tight">
              RSI sem. {tech.rsi_14_weekly.toFixed(1)}
              {tech.rsi_14_weekly <= 38
                ? " ✓ abaixo do limiar de entrada"
                : tech.rsi_14_weekly <= 50
                  ? " — zona neutra"
                  : " — aguardar recuo"}
            </p>
          )}
          {asset.entry_rationale && !tech?.rsi_14_weekly && (
            <p className="text-[10px] text-text-muted leading-tight truncate">{asset.entry_rationale}</p>
          )}
        </div>
      )}

      {/* ── Technical Highlights ────────────────────────── */}
      {tech && (
        <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
          {tech.rsi_14_weekly != null ? (
            <div className="bg-surface-2 rounded-lg px-2.5 py-1.5">
              <span className="text-text-muted">RSI Sem</span>
              <span className={cn("ml-2 font-mono font-semibold",
                tech.rsi_14_weekly < 30 ? "text-success" :
                tech.rsi_14_weekly <= 38 ? "text-success/80" :
                tech.rsi_14_weekly > 65 ? "text-danger" : "text-text-primary")}>
                {tech.rsi_14_weekly.toFixed(1)}
              </span>
            </div>
          ) : tech.rsi_14 != null ? (
            <div className="bg-surface-2 rounded-lg px-2.5 py-1.5">
              <span className="text-text-muted">RSI</span>
              <span className={cn("ml-2 font-mono font-semibold",
                tech.rsi_14 < 30 ? "text-success" :
                tech.rsi_14 > 70 ? "text-danger" : "text-text-primary")}>
                {tech.rsi_14.toFixed(1)}
              </span>
            </div>
          ) : null}

          {tech.stoch_k != null && (
            <div className="bg-surface-2 rounded-lg px-2.5 py-1.5">
              <span className="text-text-muted">Stoch</span>
              <span className={cn("ml-2 font-mono font-semibold",
                tech.stoch_k < 20 ? "text-success" :
                tech.stoch_k > 80 ? "text-danger" : "text-text-primary")}>
                {tech.stoch_k.toFixed(1)}
              </span>
            </div>
          )}

          {tech.distance_from_ma200 != null && (
            <div className="bg-surface-2 rounded-lg px-2.5 py-1.5">
              <span className="text-text-muted">MM200</span>
              <span className={cn("ml-2 font-mono font-semibold",
                tech.distance_from_ma200 < -5 ? "text-success" :
                tech.distance_from_ma200 > 20 ? "text-danger" : "text-text-primary")}>
                {formatPercent(tech.distance_from_ma200)}
              </span>
            </div>
          )}

          {tech.realized_vol_30d != null && (
            <div className="bg-surface-2 rounded-lg px-2.5 py-1.5">
              <span className="text-text-muted">Vol 30d</span>
              <span className="ml-2 font-mono font-semibold text-text-primary">
                {tech.realized_vol_30d.toFixed(1)}%
              </span>
            </div>
          )}
        </div>
      )}

      {/* ── Kelly Criterion ─────────────────────────────── */}
      {kelly?.kelly_half != null && (
        <div className="rounded-lg bg-surface-2 px-3 py-2 mb-3 flex items-center justify-between">
          <div>
            <p className="text-[10px] text-text-muted mb-0.5">Kelly Criterion</p>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-semibold text-primary">
                ½K {kelly.kelly_half.toFixed(2)}x
              </span>
              <span className="text-[10px] text-text-muted">
                · ¼K {kelly.kelly_quarter.toFixed(2)}x
              </span>
            </div>
          </div>
          {kelly.win_rate != null && (
            <div className="text-right">
              <p className="text-[10px] text-text-muted">Win rate</p>
              <p className="text-xs font-mono font-semibold text-text-primary">{kelly.win_rate.toFixed(1)}%</p>
            </div>
          )}
        </div>
      )}

      {/* ── Leverage + Risk badges ───────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-text-muted mb-0.5">Alavancagem Recomendada</p>
          <span className="text-base font-bold text-warning font-mono">
            {asset.recommended_leverage.toFixed(2)}x
          </span>
          <span className="text-xs text-text-muted ml-1">
            / máx {asset.max_recommended_leverage.toFixed(1)}x
          </span>
        </div>
        <div className="flex flex-col gap-1 items-end">
          <span className={cn("badge border text-xs", riskColors[asset.risk_rating] || "text-text-secondary")}>
            Risco {asset.risk_rating}
          </span>
          <span className="text-xs text-text-muted">{asset.opportunity_rating}</span>
        </div>
      </div>
    </div>
    </>
  );
}
