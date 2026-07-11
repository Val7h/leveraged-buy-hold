"use client";

import React from "react";
import { cn, formatCurrency, formatPercent } from "@/lib/utils";
import type { BacktestResult, BacktestMetrics } from "@/types";
import { TrendingUp, AlertTriangle, CheckCircle, ShieldCheck, Zap } from "lucide-react";

interface BacktestComparisonPanelProps {
  result: BacktestResult;
  ticker: string;
}

const STRATEGY_LABELS: Record<string, string> = {
  adaptive: "Adaptativo (modelo do sistema)",
  buy_hold_1x: "B&H 1x (Baseline)",
  buy_hold_2x: "B&H 2x",
  sp500: "S&P 500 (Benchmark)",
};

const STRATEGY_COLORS: Record<string, string> = {
  adaptive: "bg-primary/10 border-primary/20 text-primary",
  buy_hold_1x: "bg-surface-2 border-border text-text-secondary",
  buy_hold_2x: "bg-warning/10 border-warning/20 text-warning",
  sp500: "bg-surface-2 border-border text-text-secondary",
};

export default function BacktestComparisonPanel({
  result,
  ticker,
}: BacktestComparisonPanelProps) {
  const metrics = result.metrics;
  const adaptive = metrics.find((m) => m.strategy === "adaptive");
  const buyHold1x = metrics.find((m) => m.strategy === "buy_hold_1x");
  const buyHold2x = metrics.find((m) => m.strategy === "buy_hold_2x");
  const sp500 = metrics.find((m) => m.strategy === "sp500");

  if (!adaptive) return null;

  // --- Custo do seguro survival-first: adaptive vs B&H 1x (baseline) ---
  // Números reais das metrics — quanto de patrimônio terminal a proteção custou.
  const insurance = (() => {
    if (!buyHold1x) return null;
    const advFinal = adaptive.final_value;
    const baseFinal = buyHold1x.final_value;
    const diffAbs = advFinal - baseFinal; // negativo = adaptive rendeu menos
    const diffPct = baseFinal !== 0 ? (diffAbs / baseFinal) * 100 : 0;
    const ddGap = adaptive.max_drawdown_pct - buyHold1x.max_drawdown_pct; // ambos negativos; positivo = adaptive protegeu
    const sharpeGap = adaptive.sharpe_ratio - buyHold1x.sharpe_ratio;
    return { advFinal, baseFinal, diffAbs, diffPct, ddGap, sharpeGap };
  })();

  // Períodos de crise em "V" (recuperação rápida) — onde a proteção pode gerar whipsaw.
  const vShapedCrises = (result.crisis_analysis ?? [])
    .map((c: any) => c?.name as string | undefined)
    .filter((n): n is string => !!n && /2020|2015|2018|covid|flash|volmageddon/i.test(n));

  // Calculate who wins in each category
  const getWinner = (
    getValue: (m: BacktestMetrics) => number,
    higher = true
  ): string | null => {
    const values = metrics.map((m) => ({ strategy: m.strategy, value: getValue(m) }));
    const sorted = values.sort((a, b) =>
      higher ? b.value - a.value : a.value - b.value
    );
    return sorted[0]?.strategy || null;
  };

  const winners = {
    cagr: getWinner((m) => m.cagr_pct, true),
    totalReturn: getWinner((m) => m.total_return_pct, true),
    maxDrawdown: getWinner((m) => m.max_drawdown_pct, false), // lower is better
    calmar: getWinner((m) => m.calmar_ratio, true), // survival-first: CAGR / |MaxDD|
  };

  // Score: how many metrics adaptive wins
  const adaptiveWins = Object.values(winners).filter((w) => w === "adaptive").length;
  const totalCategories = Object.values(winners).filter((w) => w !== null).length;

  // Generate verdict
  const verdict =
    adaptiveWins === totalCategories
      ? "Cenário simulado mostra Adaptativo à frente em TODOS os critérios"
      : adaptiveWins >= totalCategories * 0.75
        ? "Cenário simulado mostra Adaptativo à frente na maioria dos critérios"
        : adaptiveWins >= totalCategories * 0.5
          ? "Cenário simulado mostra trade-off entre estratégias"
          : "Cenário simulado mostra outra estratégia à frente em vários critérios";

  const verdictColor =
    adaptiveWins === totalCategories
      ? "bg-success/10 border-success/20 text-success"
      : adaptiveWins >= totalCategories * 0.75
        ? "bg-primary/10 border-primary/20 text-primary"
        : adaptiveWins >= totalCategories * 0.5
          ? "bg-warning/10 border-warning/20 text-warning"
          : "bg-danger/10 border-danger/20 text-danger";

  return (
    <div className="space-y-4">
      {/* Verdict Card */}
      <div className={cn("card border", verdictColor)}>
        <div className="flex items-start gap-3">
          {adaptiveWins === totalCategories ? (
            <CheckCircle size={20} className="flex-shrink-0 mt-1" />
          ) : (
            <TrendingUp size={20} className="flex-shrink-0 mt-1" />
          )}
          <div>
            <p className="text-sm font-bold">{verdict}</p>
            <p className="text-xs mt-1 opacity-90">
              {adaptiveWins} de {totalCategories} métricas principais
            </p>
          </div>
        </div>
      </div>

      {/* Custo do seguro survival-first — patrimônio terminal adaptive vs B&H 1x */}
      {insurance && (
        <div className="card border border-warning/20 bg-warning/5">
          <div className="flex items-start gap-3">
            <ShieldCheck size={20} className="flex-shrink-0 mt-0.5 text-warning" />
            <div className="flex-1">
              <p className="text-xs font-bold text-warning uppercase tracking-wide">
                Custo do seguro survival-first
              </p>
              <p className="text-[11px] text-text-muted mt-0.5">
                O que a proteção adaptativa custou em patrimônio terminal vs. B&amp;H 1x (baseline)
              </p>

              <div className="grid grid-cols-3 gap-2 mt-3">
                <div className="bg-primary/10 rounded-lg p-2.5 text-center">
                  <p className="text-[10px] text-text-muted mb-1">Adaptativo (final)</p>
                  <p className="text-sm font-mono font-bold text-primary">
                    {formatCurrency(insurance.advFinal, "USD", true)}
                  </p>
                </div>
                <div className="bg-surface-2 rounded-lg p-2.5 text-center">
                  <p className="text-[10px] text-text-muted mb-1">B&amp;H 1x (final)</p>
                  <p className="text-sm font-mono font-bold text-text-secondary">
                    {formatCurrency(insurance.baseFinal, "USD", true)}
                  </p>
                </div>
                <div
                  className={cn(
                    "rounded-lg p-2.5 text-center",
                    insurance.diffAbs >= 0 ? "bg-success/10" : "bg-danger/10"
                  )}
                >
                  <p className="text-[10px] text-text-muted mb-1">Diferença (prêmio)</p>
                  <p
                    className={cn(
                      "text-sm font-mono font-bold",
                      insurance.diffAbs >= 0 ? "text-success" : "text-danger"
                    )}
                  >
                    {insurance.diffAbs >= 0 ? "+" : "−"}
                    {formatCurrency(Math.abs(insurance.diffAbs), "USD", true)}
                  </p>
                  <p
                    className={cn(
                      "text-[10px] font-mono font-semibold mt-0.5",
                      insurance.diffAbs >= 0 ? "text-success" : "text-danger"
                    )}
                  >
                    {insurance.diffPct >= 0 ? "+" : ""}
                    {insurance.diffPct.toFixed(1)}%
                  </p>
                </div>
              </div>

              <p className="text-xs text-text-secondary mt-3 leading-relaxed">
                {insurance.diffAbs < 0 ? (
                  <>
                    A estratégia adaptativa <strong>trocou {Math.abs(insurance.diffPct).toFixed(1)}% de
                    patrimônio final</strong> por um drawdown{" "}
                    <strong>{Math.abs(insurance.ddGap).toFixed(0)} pontos menor</strong> (
                    {adaptive.max_drawdown_pct.toFixed(0)}% vs {buyHold1x!.max_drawdown_pct.toFixed(0)}%)
                    {insurance.sharpeGap > 0 && (
                      <> e Sharpe maior ({adaptive.sharpe_ratio.toFixed(2)} vs {buyHold1x!.sharpe_ratio.toFixed(2)})</>
                    )}
                    . Esse é o <strong>preço do seguro</strong> contra crises — você paga em CAGR e recebe
                    sobrevivência.
                  </>
                ) : (
                  <>
                    Neste cenário a adaptativa <strong>não cobrou prêmio</strong>: entregou{" "}
                    <strong>+{insurance.diffPct.toFixed(1)}% de patrimônio final</strong> vs B&amp;H 1x
                    {insurance.ddGap > 0 && (
                      <> ainda com drawdown {Math.abs(insurance.ddGap).toFixed(0)} pts menor</>
                    )}
                    . O seguro saiu de graça — não é o caso geral, depende da cesta e do período.
                  </>
                )}
              </p>

              {/* Comparação lado a lado adaptive vs 1x: CAGR / MaxDD / Sharpe / Final */}
              <div className="grid grid-cols-4 gap-2 mt-3 pt-3 border-t border-warning/15 text-center">
                {[
                  { k: "CAGR", a: `${adaptive.cagr_pct.toFixed(1)}%`, b: `${buyHold1x!.cagr_pct.toFixed(1)}%` },
                  { k: "MaxDD", a: `${adaptive.max_drawdown_pct.toFixed(1)}%`, b: `${buyHold1x!.max_drawdown_pct.toFixed(1)}%` },
                  { k: "Sharpe", a: adaptive.sharpe_ratio.toFixed(2), b: buyHold1x!.sharpe_ratio.toFixed(2) },
                  { k: "Patrim.", a: formatCurrency(adaptive.final_value, "USD", true), b: formatCurrency(buyHold1x!.final_value, "USD", true) },
                ].map((row) => (
                  <div key={row.k}>
                    <p className="text-[10px] uppercase text-text-muted mb-1">{row.k}</p>
                    <p className="text-xs font-mono font-bold text-primary">{row.a}</p>
                    <p className="text-[10px] font-mono text-text-muted">{row.b}</p>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-text-muted/70 mt-1.5 text-center">
                linha de cima = Adaptativo · linha de baixo = B&amp;H 1x
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Aviso de comportamento em choques — bear prolongado vs crash em V (whipsaw) */}
      <div className="flex items-start gap-2.5 rounded-lg border border-border bg-surface-2 px-3 py-2.5">
        <Zap size={16} className="flex-shrink-0 mt-0.5 text-warning" />
        <p className="text-[11px] text-text-secondary leading-relaxed">
          <strong className="text-text-primary">Como a proteção se comporta:</strong> a rede da adaptativa é
          forte em <strong>bear-markets prolongados</strong> (ex. 2008), onde desalavancar cedo evita a ruína.
          Em <strong>crashes rápidos em &ldquo;V&rdquo;</strong> ela pode sofrer{" "}
          <strong>whipsaw</strong> — desalavanca na queda e perde parte do repique
          {vShapedCrises.length > 0 && (
            <> (observe os períodos {vShapedCrises.join(", ")} na análise de crises abaixo)</>
          )}
          . É o outro lado do seguro, não um defeito.
        </p>
      </div>

      {/* Comparison Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* CAGR */}
        <div className={cn("card border p-4", STRATEGY_COLORS[winners.cagr || ""])}>
          <p className="text-xs font-semibold text-text-muted mb-3 uppercase">
            📈 Melhor CAGR
          </p>
          <div className="space-y-2">
            {[
              { m: adaptive, label: "Adaptativo" },
              { m: buyHold1x, label: "B&H 1x" },
              { m: buyHold2x, label: "B&H 2x" },
              { m: sp500, label: "S&P 500" },
            ]
              .filter((x) => x.m)
              .sort((a, b) => (b.m?.cagr_pct || 0) - (a.m?.cagr_pct || 0))
              .map((x, i) => (
                <div
                  key={x.label}
                  className={cn(
                    "flex items-center justify-between p-2 rounded",
                    i === 0 ? "bg-white/10 font-bold" : ""
                  )}
                >
                  <span className="text-sm">{x.label}</span>
                  <span className="font-mono font-semibold">
                    {x.m?.cagr_pct.toFixed(1)}%
                  </span>
                </div>
              ))}
          </div>
        </div>

        {/* Calmar Ratio — survival-first metric */}
        <div className={cn("card border p-4", STRATEGY_COLORS[winners.calmar || ""])}>
          <p className="text-xs font-semibold text-text-muted mb-3 uppercase">
            🛡️ Melhor Calmar — Sobrevivência
          </p>
          <p className="text-[10px] text-text-muted mb-2 leading-tight">
            CAGR ÷ |MaxDrawdown| — métrica principal para horizonte previdenciário (sobreviver = tudo)
          </p>
          <div className="space-y-2">
            {[
              { m: adaptive, label: "Adaptativo" },
              { m: buyHold1x, label: "B&H 1x" },
              { m: buyHold2x, label: "B&H 2x" },
              { m: sp500, label: "S&P 500" },
            ]
              .filter((x) => x.m)
              .sort((a, b) => (b.m?.calmar_ratio || 0) - (a.m?.calmar_ratio || 0))
              .map((x, i) => (
                <div
                  key={x.label}
                  className={cn(
                    "flex items-center justify-between p-2 rounded",
                    i === 0 ? "bg-white/10 font-bold" : ""
                  )}
                >
                  <span className="text-sm">{x.label}</span>
                  <span className="font-mono font-semibold">
                    {x.m?.calmar_ratio.toFixed(2)}
                  </span>
                </div>
              ))}
          </div>
        </div>

        {/* Max Drawdown */}
        <div className={cn("card border p-4", STRATEGY_COLORS[winners.maxDrawdown || ""])}>
          <p className="text-xs font-semibold text-text-muted mb-3 uppercase">
            🛡️ Menor Drawdown
          </p>
          <div className="space-y-2">
            {[
              { m: adaptive, label: "Adaptativo" },
              { m: buyHold1x, label: "B&H 1x" },
              { m: buyHold2x, label: "B&H 2x" },
              { m: sp500, label: "S&P 500" },
            ]
              .filter((x) => x.m)
              .sort((a, b) => (a.m?.max_drawdown_pct || 0) - (b.m?.max_drawdown_pct || 0))
              .map((x, i) => (
                <div
                  key={x.label}
                  className={cn(
                    "flex items-center justify-between p-2 rounded",
                    i === 0 ? "bg-white/10 font-bold" : ""
                  )}
                >
                  <span className="text-sm">{x.label}</span>
                  <span className="font-mono font-semibold text-danger">
                    {x.m?.max_drawdown_pct.toFixed(1)}%
                  </span>
                </div>
              ))}
          </div>
        </div>

        {/* Final Value */}
        <div className={cn("card border p-4", STRATEGY_COLORS[winners.totalReturn || ""])}>
          <p className="text-xs font-semibold text-text-muted mb-3 uppercase">
            💰 Maior Retorno Total
          </p>
          <div className="space-y-2">
            {[
              { m: adaptive, label: "Adaptativo" },
              { m: buyHold1x, label: "B&H 1x" },
              { m: buyHold2x, label: "B&H 2x" },
              { m: sp500, label: "S&P 500" },
            ]
              .filter((x) => x.m)
              .sort((a, b) => (b.m?.total_return_pct || 0) - (a.m?.total_return_pct || 0))
              .map((x, i) => (
                <div
                  key={x.label}
                  className={cn(
                    "flex items-center justify-between p-2 rounded",
                    i === 0 ? "bg-white/10 font-bold" : ""
                  )}
                >
                  <span className="text-sm">{x.label}</span>
                  <span className={cn("font-mono font-semibold", (x.m?.total_return_pct || 0) > 0 ? "text-success" : "text-danger")}>
                    {formatPercent(x.m?.total_return_pct || 0)}
                  </span>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Key Insights */}
      <div className="card border border-primary/20 bg-primary/5">
        <p className="text-xs font-bold text-primary uppercase mb-3">💡 Insights Principais</p>
        <div className="space-y-2 text-xs text-text-secondary">
          <p>
            <strong>CAGR:</strong> O modelo Adaptativo alcançou{" "}
            <span className="text-primary font-semibold">{adaptive.cagr_pct.toFixed(1)}%</span>
            {" "}vs{" "}
            <span className="font-semibold">{buyHold1x?.cagr_pct.toFixed(1)}%</span>
            {" "}em B&H 1x (
            <span className={cn(
              "font-semibold",
              adaptive.cagr_pct > (buyHold1x?.cagr_pct || 0) ? "text-success" : "text-warning"
            )}>
              {((adaptive.cagr_pct - (buyHold1x?.cagr_pct || 0)) / (buyHold1x?.cagr_pct || 1) * 100).toFixed(0)}%
            </span>
            {" "}melhor)
          </p>
          <p>
            <strong>Sobrevivência (Calmar):</strong>{" "}
            <span className="text-primary font-semibold">{adaptive.calmar_ratio.toFixed(2)}</span>
            {" "}vs{" "}
            <span className="font-semibold">{buyHold1x?.calmar_ratio.toFixed(2)}</span>
            {" em B&H 1x — "}
            {adaptive.calmar_ratio > (buyHold2x?.calmar_ratio || 0)
              ? "Adaptativo entrega mais CAGR por unidade de drawdown na simulação"
              : "trade-off: mais CAGR vem com maior drawdown proporcional"}
          </p>
          <p>
            <strong>MaxDrawdown:</strong> Pior queda histórica foi{" "}
            <span className="font-semibold text-danger">{adaptive.max_drawdown_pct.toFixed(1)}%</span>
            {" "}
            {adaptive.max_drawdown_pct > (buyHold2x?.max_drawdown_pct || 0)
              ? "(esperado com mais leverage — regra: suportar sem liquidar)"
              : "(abaixo do B&H 2x — proteção adaptativa funcionou)"}
          </p>
        </div>
      </div>

      {/* Síntese técnica do modelo */}
      <div className="bg-success/10 border border-success/20 rounded-lg p-4">
        <p className="text-xs font-bold text-success uppercase mb-2">Síntese do modelo</p>
        <p className="text-sm text-text-secondary">
          {adaptiveWins === totalCategories
            ? "No backtest simulado, a estratégia Adaptativa apresentou desempenho superior em todos os critérios analisados."
            : adaptiveWins >= totalCategories * 0.75
              ? "No backtest simulado, a estratégia Adaptativa apresentou desempenho consistente na maioria dos critérios."
              : adaptiveWins >= totalCategories * 0.5
                ? "No backtest simulado, observa-se trade-off entre estratégias. Resultados passados não garantem resultados futuros."
                : "No backtest simulado, outras estratégias apresentaram desempenho superior em vários critérios. Resultados passados não garantem resultados futuros."}
        </p>
        <p className="text-[10px] text-text-muted/70 mt-2 leading-tight">
          Análise quantitativa do modelo. Não constitui recomendação de investimento. CVM Of-Circ 04/2023.
        </p>
      </div>
    </div>
  );
}
