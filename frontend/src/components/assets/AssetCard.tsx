"use client";
import React, { useState, memo } from "react";
import { cn, formatCurrency, formatPercent, getScoreColor, getScoreBg, sectorIcon } from "@/lib/utils";
import ScoreGauge from "@/components/ui/ScoreGauge";
import TickerLogo from "@/components/ui/TickerLogo";
import Tooltip from "@/components/ui/Tooltip";
import HeuristicBadge from "@/components/ui/HeuristicBadge";
import AssetChartModal from "@/components/assets/AssetChartModal";
import type { AssetScore } from "@/types";

interface AssetCardProps {
  asset: AssetScore;
  onSelect?: (ticker: string) => void;
  selected?: boolean;
  onToggleSelect?: (ticker: string) => void;
}

const riskColors: Record<string, string> = {
  BAIXO:   "text-success bg-success/10 border-success/20",
  MODERADO: "text-warning bg-warning/10 border-warning/20",
  ELEVADO: "text-danger bg-danger/10 border-danger/20",
  ALTO:    "text-danger bg-danger/10 border-danger/20",
};

// Sinais técnicos descritivos do modelo (CVM 04/2023: NÃO são recomendações de compra/venda).
const entryConfig: Record<string, { bg: string; border: string; text: string }> = {
  "OPORTUNIDADE FORTE":         { bg: "bg-success/12", border: "border-success/35", text: "text-success" },
  "OPORTUNIDADE":               { bg: "bg-success/8",  border: "border-success/25", text: "text-success" },
  "OPORTUNIDADE (mercado topo)":{ bg: "bg-warning/10", border: "border-warning/30", text: "text-warning" },
  "NEUTRO":                     { bg: "bg-warning/8",  border: "border-warning/20", text: "text-warning" },
  "DESFAVORÁVEL":               { bg: "bg-danger/8",   border: "border-danger/20",  text: "text-danger" },
  "SEM DADOS":                  { bg: "bg-surface-2",  border: "border-border",     text: "text-text-muted" },
  // Aliases legados (transição)
  "ENTRAR FORTE":               { bg: "bg-success/12", border: "border-success/35", text: "text-success" },
  "ENTRAR":                     { bg: "bg-success/8",  border: "border-success/25", text: "text-success" },
  "AGUARDAR":                   { bg: "bg-warning/8",  border: "border-warning/20", text: "text-warning" },
  "EVITAR":                     { bg: "bg-danger/8",   border: "border-danger/20",  text: "text-danger" },
};

function AssetCard({ asset, onSelect, selected = false, onToggleSelect }: AssetCardProps) {
  const [showChart, setShowChart] = useState(false);
  const tech  = asset.technicals;
  const entry = asset.entry_signal ? (entryConfig[asset.entry_signal] ?? entryConfig["SEM DADOS"]) : null;
  const kelly = asset.kelly;

  return (
    <>
    {showChart && <AssetChartModal ticker={asset.ticker} onClose={() => setShowChart(false)} />}
    <div
      className={cn(
        "card hover:border-primary/40 hover:shadow-card-lg hover:bg-surface/80 transition-all cursor-pointer group duration-300 relative",
        selected && "border-primary/50 bg-primary/5 shadow-glow"
      )}
      onClick={() => { onSelect?.(asset.ticker); setShowChart(true); }}
    >
      {/* Selection Checkbox */}
      {onToggleSelect && (
        <div
          className="absolute top-3 right-3 z-10"
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect(asset.ticker);
          }}
        >
          <input
            type="checkbox"
            checked={selected}
            onChange={() => {}}
            className="w-4 h-4 cursor-pointer accent-primary"
          />
        </div>
      )}

      {/* ── Header ──────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-5 pb-4 border-b border-border/40">
        <div className="flex items-start gap-3">
          <div className="relative">
            <TickerLogo ticker={asset.ticker} size={40} className="mt-0.5" />
            {asset.is_brazilian && (
              <span className="absolute -bottom-1 -right-1 text-xs font-bold px-1.5 py-0.5 rounded-full bg-green-500/20 border border-green-500/40 text-green-300">
                🇧🇷
              </span>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-lg font-bold text-text-primary font-mono group-hover:text-primary transition-colors">
                {asset.is_tokenized ? asset.underlying_ticker ?? asset.ticker.replace("ONUSDT","") : asset.ticker}
              </span>
              {asset.is_tokenized && (
                <span className="text-[9px] font-bold px-2 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 uppercase tracking-wide">
                  🪙 Token
                </span>
              )}
              <span className="text-base">{sectorIcon(asset.sector)}</span>
            </div>
            <p className="text-xs text-text-muted truncate max-w-40">{asset.company_name || "—"}</p>
            <p className="text-xs text-text-muted/70">{asset.sector || "—"}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-text-primary font-mono group-hover:text-primary transition-colors">
            {formatCurrency(asset.current_price, asset.currency || "USD")}
          </p>
          <p className="text-xs text-success mt-1">↗ +2.3%</p>
        </div>
      </div>

      {/* ── Scores ──────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3 py-4 mb-4 px-2 bg-surface-2/30 rounded-lg border border-border/20">
        <div className="text-center">
          <Tooltip content="Qualidade do ativo: beta baixo, drawdown baixo, dividendos altos, Sharpe, volatilidade" side="top" delay={300}>
            <ScoreGauge score={asset.quality_score}      label="Qualidade"   size="sm" />
          </Tooltip>
        </div>
        <div className="text-center border-l border-r border-border/20">
          <Tooltip content="Oportunidade de entrada: RSI semanal baixo, posição acima/abaixo das Bandas de Bollinger" side="top" delay={300}>
            <ScoreGauge score={asset.opportunity_score}  label="Oportun." size="sm" />
          </Tooltip>
        </div>
        <div className="text-center">
          <Tooltip content="Score composto: média ponderada de Qualidade (60%) e Oportunidade (40%)" side="top" delay={300}>
            <ScoreGauge score={asset.composite_score}    label="Composto"    size="sm" />
          </Tooltip>
        </div>
      </div>

      {/* ── Sinal de Entrada ────────────────────────────── */}
      {asset.entry_signal && asset.entry_signal !== "SEM DADOS" && entry && (
        <div className={cn("rounded-xl px-4 py-3 mb-4 border backdrop-blur-sm transition-all group-hover:shadow-glow", entry.bg, entry.border)}>
          <div className="flex items-center justify-between gap-3 mb-1.5">
            <div className="flex items-center gap-2">
              <span className={cn("text-sm font-bold tracking-wider", entry.text)}>
                {(asset.entry_signal === "OPORTUNIDADE" || asset.entry_signal === "ENTRAR") ? "🟢" : (asset.entry_signal === "OPORTUNIDADE FORTE" || asset.entry_signal === "ENTRAR FORTE") ? "🟢🟢" : "⏸"}
              </span>
              <span className={cn("text-sm font-bold tracking-wider", entry.text)}>
                {asset.entry_signal}
              </span>
            </div>
            {asset.entry_leverage != null && (
              <span className={cn("text-lg font-bold font-mono px-2 py-0.5 rounded-lg bg-black/30", entry.text)}>
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
        <div className="grid grid-cols-2 gap-2.5 mb-4 text-xs">
          {tech.rsi_14_weekly != null ? (
            <div className="bg-surface-2/50 hover:bg-surface-2 rounded-xl px-3 py-2 border border-border/30 transition-colors">
              <p className="text-text-muted text-xs mb-1">RSI Semanal</p>
              <p className={cn("font-mono font-bold text-base",
                tech.rsi_14_weekly < 30 ? "text-success" :
                tech.rsi_14_weekly <= 38 ? "text-success/90" :
                tech.rsi_14_weekly > 65 ? "text-danger" : "text-text-primary")}>
                {tech.rsi_14_weekly.toFixed(1)}
              </p>
            </div>
          ) : tech.rsi_14 != null ? (
            <div className="bg-surface-2/50 hover:bg-surface-2 rounded-xl px-3 py-2 border border-border/30 transition-colors">
              <p className="text-text-muted text-xs mb-1">RSI</p>
              <p className={cn("font-mono font-bold text-base",
                tech.rsi_14 < 30 ? "text-success" :
                tech.rsi_14 > 70 ? "text-danger" : "text-text-primary")}>
                {tech.rsi_14.toFixed(1)}
              </p>
            </div>
          ) : null}

          {tech.stoch_k != null && (
            <div className="bg-surface-2/50 hover:bg-surface-2 rounded-xl px-3 py-2 border border-border/30 transition-colors">
              <p className="text-text-muted text-xs mb-1">Stochastic</p>
              <p className={cn("font-mono font-bold text-base",
                tech.stoch_k < 20 ? "text-success" :
                tech.stoch_k > 80 ? "text-danger" : "text-text-primary")}>
                {tech.stoch_k.toFixed(1)}
              </p>
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
        <Tooltip content="Recomendação de alavancagem via Kelly Criterion: f* = (b·p - q)/b. Sem histórico real, p e b são heurísticas." side="top" delay={300}>
          <div className="rounded-lg bg-surface-2 px-3 py-2 mb-3 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-text-muted mb-0.5 flex items-center gap-1.5">
                Kelly Criterion
                {kelly.is_heuristic && (
                  <HeuristicBadge tooltip="Win rate e payoff ratio são estimativas heurísticas derivadas do composite_score e da volatilidade — não há histórico de trades real. Para Kelly verdadeiro: ≥30 trades fechados." />
                )}
              </p>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-semibold text-primary">
                  ½K {kelly.kelly_half?.toFixed(2)}x
                </span>
                <span className="text-[10px] text-text-muted">
                  · ¼K {kelly.kelly_quarter?.toFixed(2)}x
                </span>
              </div>
            </div>
            {(() => {
              // Prefer the new `confidence_score` field; fall back to legacy
              // `win_rate` during the deprecation window (1 release).
              const conf = kelly.confidence_score ?? kelly.win_rate;
              if (conf == null) return null;
              return (
                <div className="text-right">
                  <p className="text-[10px] text-text-muted flex items-center gap-1 justify-end">
                    Confianca
                    <Tooltip
                      content="Score heuristico derivado do composite. Nao representa taxa historica de acertos."
                      side="top"
                      delay={200}
                    >
                      <span className="text-warning cursor-help" aria-label="heuristica">⚠</span>
                    </Tooltip>
                  </p>
                  <p className="text-xs font-mono font-semibold text-text-primary">
                    {conf.toFixed(1)}%
                  </p>
                </div>
              );
            })()}
          </div>
        </Tooltip>
      )}

      {/* ── Leverage + Risk badges ───────────────────────── */}
      <Tooltip content="Alavancagem recomendada pelo Kelly Criterion baseada no histórico" side="top" delay={300}>
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
            <div className="flex items-center gap-1.5">
              {asset.risk_rating_is_heuristic && (
                <HeuristicBadge tooltip="Beta indisponível — risk_rating estimado apenas pela volatilidade realizada (sem fator CAPM)." />
              )}
              <span className={cn("badge border text-xs", riskColors[asset.risk_rating] || "text-text-secondary")}>
                Risco {asset.risk_rating}
              </span>
            </div>
            <span className="text-xs text-text-muted">{asset.opportunity_rating}</span>
          </div>
        </div>
      </Tooltip>
    </div>
    </>
  );
}

export default memo(AssetCard);
