"use client";

import React from "react";
import { X, Download, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AssetScore } from "@/types";

interface AssetComparisonModalProps {
  assets: AssetScore[];
  onClose: () => void;
}

// ── helpers ────────────────────────────────────────────────────────────────

function scoreColor(score: number) {
  if (score >= 70) return "text-success";
  if (score >= 45) return "text-warning";
  return "text-danger";
}

function scoreBg(score: number) {
  if (score >= 70) return "bg-success/10";
  if (score >= 45) return "bg-warning/10";
  return "bg-danger/10";
}

function signalCls(signal: string) {
  if (signal === "OPORTUNIDADE FORTE" || signal === "ENTRAR FORTE")
    return "bg-success/15 border-success/35 text-success";
  if (signal === "OPORTUNIDADE" || signal === "ENTRAR")
    return "bg-success/10 border-success/25 text-success";
  if (signal === "OPORTUNIDADE (mercado topo)")
    return "bg-warning/10 border-warning/30 text-warning";
  if (signal === "NEUTRO" || signal === "AGUARDAR")
    return "bg-warning/8 border-warning/20 text-warning";
  if (signal === "DESFAVORÁVEL" || signal === "EVITAR")
    return "bg-danger/8 border-danger/20 text-danger";
  return "bg-surface-2 border-border text-text-muted";
}

// RSI zone label + color
function rsiZone(rsi: number | undefined): { label: string; cls: string } {
  if (rsi === undefined) return { label: "N/A", cls: "text-text-muted" };
  if (rsi <= 38) return { label: `${rsi.toFixed(1)} (sobrevenda)`, cls: "text-success font-bold" };
  if (rsi >= 70) return { label: `${rsi.toFixed(1)} (sobrecompra)`, cls: "text-danger" };
  return { label: rsi.toFixed(1), cls: "text-text-secondary" };
}

// Layer badge: ↑ green ≥60, → yellow 40-59, − gray <40
function LayerBadge({ score, label }: { score: number; label: string }) {
  const arrow = score >= 60 ? "↑" : score >= 40 ? "→" : "−";
  const cls =
    score >= 60
      ? "bg-success/15 border-success/30 text-success"
      : score >= 40
      ? "bg-warning/15 border-warning/30 text-warning"
      : "bg-surface-2 border-border text-text-muted";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border text-[10px] font-bold font-mono",
        cls
      )}
    >
      {label} {arrow} {score.toFixed(0)}
    </span>
  );
}

// Identify winner index (highest value) among an array of numbers
function winnerIdx(values: (number | undefined)[], higherIsBetter = true): number {
  let best = -1;
  let bestVal = higherIsBetter ? -Infinity : Infinity;
  values.forEach((v, i) => {
    if (v === undefined) return;
    if (higherIsBetter ? v > bestVal : v < bestVal) {
      bestVal = v;
      best = i;
    }
  });
  return best;
}

// ── main component ─────────────────────────────────────────────────────────

export default function AssetComparisonModal({
  assets,
  onClose,
}: AssetComparisonModalProps) {
  if (assets.length === 0) return null;

  const sorted = [...assets].sort((a, b) => b.composite_score - a.composite_score);

  // ── Survival-first winner rows ──────────────────────────────────────────
  // Calmar proxy: composite_score / leverage (higher composite with lower lev = safer)
  // We use composite_score as the main proxy since calmar isn't on AssetScore directly.
  // MM200 discount: technicals.distance_from_ma200 (negative = below MM200 = discount, better)
  const compositeVals = sorted.map((a) => a.composite_score);
  const rsiVals = sorted.map((a) => a.technicals?.rsi_14_weekly ?? a.technicals?.rsi_weekly);
  const mm200Vals = sorted.map((a) => a.technicals?.distance_from_ma200);
  const leverageVals = sorted.map((a) => a.leverage_score);

  const compositeWinner = winnerIdx(compositeVals, true);
  // RSI winner = closest to 35 (best buy zone) — lower is better up to a point
  const rsiWinner = winnerIdx(rsiVals, false); // lower RSI = better entry
  // MM200 winner: most negative distance = biggest discount below MM200
  const mm200Winner = winnerIdx(mm200Vals, false);
  const leverageWinner = winnerIdx(leverageVals, true);

  // ── "Qual aportar agora" verdict ────────────────────────────────────────
  // Score = composite * 0.5 + leverage_score * 0.3 + rsi_bonus * 0.2
  const verdictScores = sorted.map((a) => {
    const rsiBonusRaw = (() => {
      const rsi = a.technicals?.rsi_14_weekly ?? a.technicals?.rsi_weekly;
      if (rsi === undefined) return 50;
      if (rsi <= 30) return 100;
      if (rsi <= 38) return 85;
      if (rsi <= 50) return 60;
      if (rsi <= 60) return 40;
      return 20;
    })();
    return a.composite_score * 0.5 + a.leverage_score * 0.3 + rsiBonusRaw * 0.2;
  });
  const verdictWinnerIdx = winnerIdx(verdictScores, true);
  const verdictAsset = sorted[verdictWinnerIdx >= 0 ? verdictWinnerIdx : 0];
  const verdictRsiRaw = verdictAsset.technicals?.rsi_14_weekly ?? verdictAsset.technicals?.rsi_weekly;
  const verdictRsiLabel =
    verdictRsiRaw === undefined
      ? "RSI N/D"
      : verdictRsiRaw <= 38
      ? `RSI ${verdictRsiRaw.toFixed(0)} (sobrevenda)`
      : `RSI ${verdictRsiRaw.toFixed(0)}`;
  const verdictRationale = `Score composto ${verdictAsset.composite_score.toFixed(1)}, alavancagem ${verdictAsset.recommended_leverage.toFixed(2)}x, ${verdictRsiLabel}`;

  // ── Export CSV ──────────────────────────────────────────────────────────
  const handleExport = () => {
    const headers = [
      "Ticker", "Qualidade (Q)", "Momento (M)", "Aptidao (A)",
      "Composto", "Sinal", "RSI Semanal", "MM200 Distancia %",
      "DY", "Alavancagem",
    ];
    const rows = sorted.map((a) => [
      a.ticker,
      a.quality_score.toFixed(1),
      a.opportunity_score.toFixed(1),
      a.leverage_score.toFixed(1),
      a.composite_score.toFixed(1),
      a.entry_signal || "N/A",
      (a.technicals?.rsi_14_weekly ?? a.technicals?.rsi_weekly)?.toFixed(1) || "N/A",
      a.technicals?.distance_from_ma200?.toFixed(2) || "N/A",
      `${(a.dividend_yield || 0).toFixed(2)}%`,
      `${a.recommended_leverage.toFixed(2)}x`,
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `comparacao_ativos_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── alternating row helpers ─────────────────────────────────────────────
  const rowBg = (idx: number) =>
    idx % 2 === 0 ? "bg-surface" : "bg-surface-2/40";

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-xl border border-border max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">

        {/* ── Modal header ─────────────────────────────────────────────── */}
        <div className="flex items-center justify-between p-6 border-b border-border/40">
          <div>
            <h2 className="text-lg font-bold text-text-primary">
              Comparar {sorted.length} Ativos
            </h2>
            <p className="text-xs text-text-muted mt-1">
              Ordenado por Score Composto (maior primeiro)
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
            >
              <Download size={14} />
              Exportar CSV
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-surface-2 text-text-muted hover:text-text-primary transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ── Body ─────────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-auto p-6 space-y-6">

          {/* ── SECTION 1: Survival-first comparison ──────────────────── */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck size={14} className="text-success" />
              <span className="text-xs font-bold text-text-primary uppercase tracking-wide">
                Vencedor de sobrevivência
              </span>
              <span className="text-[10px] text-text-muted">(survival-first)</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border border-border/30 rounded-lg overflow-hidden">
                <thead>
                  <tr className="bg-surface-2 border-b border-border/40">
                    <th className="text-left text-text-muted font-semibold py-2.5 px-3 whitespace-nowrap w-40">
                      Dimensão
                    </th>
                    {sorted.map((a) => (
                      <th key={a.ticker} className="text-center text-text-muted font-semibold py-2.5 px-3 whitespace-nowrap font-mono">
                        {a.ticker}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {/* Composite score row */}
                  <tr className={rowBg(0)}>
                    <td className="py-2.5 px-3 text-text-secondary font-medium">Score composto</td>
                    {sorted.map((a, i) => (
                      <td key={a.ticker} className="py-2.5 px-3 text-center">
                        <span className={cn("font-mono font-bold", scoreColor(a.composite_score))}>
                          {a.composite_score.toFixed(1)}
                        </span>
                        {i === compositeWinner && (
                          <span className="ml-1 text-success text-[11px]">✓</span>
                        )}
                      </td>
                    ))}
                  </tr>

                  {/* RSI zone row */}
                  <tr className={rowBg(1)}>
                    <td className="py-2.5 px-3 text-text-secondary font-medium">RSI semanal</td>
                    {sorted.map((a, i) => {
                      const rsiVal = a.technicals?.rsi_14_weekly ?? a.technicals?.rsi_weekly;
                      const z = rsiZone(rsiVal);
                      return (
                        <td key={a.ticker} className="py-2.5 px-3 text-center">
                          <span className={cn("font-mono", z.cls)}>{z.label}</span>
                          {i === rsiWinner && rsiVal !== undefined && (
                            <span className="ml-1 text-success text-[11px]">✓</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>

                  {/* MM200 distance row */}
                  <tr className={rowBg(2)}>
                    <td className="py-2.5 px-3 text-text-secondary font-medium">Distância MM200</td>
                    {sorted.map((a, i) => {
                      const d = a.technicals?.distance_from_ma200;
                      const cls =
                        d === undefined
                          ? "text-text-muted"
                          : d < -15
                          ? "text-success font-bold"
                          : d < 0
                          ? "text-success"
                          : d < 10
                          ? "text-text-secondary"
                          : "text-danger";
                      return (
                        <td key={a.ticker} className="py-2.5 px-3 text-center">
                          <span className={cn("font-mono", cls)}>
                            {d !== undefined ? `${d > 0 ? "+" : ""}${d.toFixed(1)}%` : "N/A"}
                          </span>
                          {i === mm200Winner && d !== undefined && (
                            <span className="ml-1 text-success text-[11px]">✓</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>

                  {/* Leverage score row */}
                  <tr className={rowBg(3)}>
                    <td className="py-2.5 px-3 text-text-secondary font-medium">Aptidão (alavancagem)</td>
                    {sorted.map((a, i) => (
                      <td key={a.ticker} className="py-2.5 px-3 text-center">
                        <span className={cn("font-mono", scoreColor(a.leverage_score))}>
                          {a.leverage_score.toFixed(1)}
                        </span>
                        {i === leverageWinner && (
                          <span className="ml-1 text-success text-[11px]">✓</span>
                        )}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* ── SECTION 2: Q / M / A layer comparison ─────────────────── */}
          <div>
            <p className="text-xs font-bold text-text-primary uppercase tracking-wide mb-3">
              Camadas Q / M / A
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border border-border/30 rounded-lg overflow-hidden">
                <thead>
                  <tr className="bg-surface-2 border-b border-border/40">
                    <th className="text-left text-text-muted font-semibold py-2.5 px-3 w-40">Camada</th>
                    {sorted.map((a) => (
                      <th key={a.ticker} className="text-center text-text-muted font-semibold py-2.5 px-3 font-mono">
                        {a.ticker}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {/* Q — Qualidade */}
                  <tr className={rowBg(0)}>
                    <td className="py-2.5 px-3 text-text-secondary font-medium">
                      Q — Qualidade
                    </td>
                    {sorted.map((a) => (
                      <td key={a.ticker} className="py-2.5 px-3 text-center">
                        <LayerBadge label="Q" score={a.quality_score} />
                      </td>
                    ))}
                  </tr>

                  {/* M — Momento */}
                  <tr className={rowBg(1)}>
                    <td className="py-2.5 px-3 text-text-secondary font-medium">
                      M — Momento
                    </td>
                    {sorted.map((a) => (
                      <td key={a.ticker} className="py-2.5 px-3 text-center">
                        <LayerBadge label="M" score={a.opportunity_score} />
                      </td>
                    ))}
                  </tr>

                  {/* A — Aptidão */}
                  <tr className={rowBg(2)}>
                    <td className="py-2.5 px-3 text-text-secondary font-medium">
                      A — Aptidão
                    </td>
                    {sorted.map((a) => (
                      <td key={a.ticker} className="py-2.5 px-3 text-center">
                        <LayerBadge label="A" score={a.leverage_score} />
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* ── SECTION 3: Main comparison table ──────────────────────── */}
          <div>
            <p className="text-xs font-bold text-text-primary uppercase tracking-wide mb-3">
              Comparativo completo
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border sticky top-0 bg-surface-2">
                    <th className="text-left text-text-muted font-semibold py-3 px-3 whitespace-nowrap">Ticker</th>
                    <th className="text-left text-text-muted font-semibold py-3 px-3 whitespace-nowrap">Qualidade</th>
                    <th className="text-left text-text-muted font-semibold py-3 px-3 whitespace-nowrap">Oportunidade</th>
                    <th className="text-left text-text-muted font-semibold py-3 px-3 whitespace-nowrap">Composto</th>
                    <th className="text-left text-text-muted font-semibold py-3 px-3 whitespace-nowrap">Sinal técnico</th>
                    <th className="text-left text-text-muted font-semibold py-3 px-3 whitespace-nowrap">RSI Semanal</th>
                    <th className="text-left text-text-muted font-semibold py-3 px-3 whitespace-nowrap">MM200 dist.</th>
                    <th className="text-left text-text-muted font-semibold py-3 px-3 whitespace-nowrap">DY</th>
                    <th className="text-left text-text-muted font-semibold py-3 px-3 whitespace-nowrap">Alavancagem</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((asset, idx) => {
                    const isTop = idx === 0;
                    const rsiVal = asset.technicals?.rsi_14_weekly ?? asset.technicals?.rsi_weekly;
                    const mm200 = asset.technicals?.distance_from_ma200;
                    const mm200Cls =
                      mm200 === undefined
                        ? "text-text-muted"
                        : mm200 < -15
                        ? "text-success font-bold"
                        : mm200 < 0
                        ? "text-success"
                        : mm200 < 10
                        ? "text-text-secondary"
                        : "text-danger";
                    return (
                      <tr
                        key={asset.ticker}
                        className={cn(
                          "border-b border-border/40 hover:bg-surface-2/50 transition-colors",
                          idx % 2 === 1 ? "bg-surface-2/30" : "",
                          isTop ? "bg-primary/5" : ""
                        )}
                      >
                        <td className="py-3 px-3 font-bold text-text-primary font-mono">
                          {asset.ticker}
                          {isTop && (
                            <span className="ml-2 badge bg-primary/10 border-primary/20 text-primary text-[9px]">
                              MELHOR
                            </span>
                          )}
                        </td>
                        <td className={cn("py-3 px-3 font-semibold", scoreColor(asset.quality_score))}>
                          {asset.quality_score.toFixed(1)}
                        </td>
                        <td className={cn("py-3 px-3 font-semibold", scoreColor(asset.opportunity_score))}>
                          {asset.opportunity_score.toFixed(1)}
                        </td>
                        <td className={cn("py-3 px-3 font-bold", scoreColor(asset.composite_score))}>
                          <span className={`px-2 py-1 rounded ${scoreBg(asset.composite_score)}`}>
                            {asset.composite_score.toFixed(1)}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={cn(
                              "inline-block px-2 py-1 rounded border text-[9px] font-bold",
                              signalCls(asset.entry_signal || "N/A")
                            )}
                          >
                            {asset.entry_signal === "ENTRAR" || asset.entry_signal === "OPORTUNIDADE"
                              ? "🟢"
                              : asset.entry_signal === "ENTRAR FORTE" || asset.entry_signal === "OPORTUNIDADE FORTE"
                              ? "🟢🟢"
                              : "⏸"}{" "}
                            {asset.entry_signal || "N/A"}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono">
                          {rsiVal !== undefined ? (
                            <span className={rsiVal <= 38 ? "text-success font-bold" : "text-text-secondary"}>
                              {rsiVal.toFixed(1)}
                            </span>
                          ) : (
                            <span className="text-text-muted">N/A</span>
                          )}
                        </td>
                        <td className={cn("py-3 px-3 font-mono", mm200Cls)}>
                          {mm200 !== undefined
                            ? `${mm200 > 0 ? "+" : ""}${mm200.toFixed(1)}%`
                            : <span className="text-text-muted">N/A</span>}
                        </td>
                        <td className="py-3 px-3 font-mono text-success">
                          {(asset.dividend_yield || 0).toFixed(2)}%
                        </td>
                        <td className="py-3 px-3 font-bold text-warning font-mono">
                          {asset.recommended_leverage.toFixed(2)}x
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── SECTION 4: "Qual aportar agora" verdict ───────────────── */}
          <div className="bg-success/8 border border-success/25 rounded-xl p-5">
            <p className="text-[10px] font-bold text-success uppercase tracking-widest mb-1">
              Qual aportar agora
            </p>
            <p className="text-xl font-bold text-text-primary font-mono">
              Aportar em {verdictAsset.ticker}
            </p>
            <p className="text-xs text-text-muted mt-2 leading-relaxed">
              {verdictRationale}
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
