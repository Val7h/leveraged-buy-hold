"use client";

/**
 * Inteligência da carteira (método adotado: Dalio/Swensen/Core-Satellite × ESTRATÉGIA MASTER).
 * 4 painéis: totais ponderados · estrutura ALVO×REAL · contribuição de risco · correlação.
 * Recebe o objeto `analytics` de GET /api/v1/portfolio/[id]/analytics.
 */

type Analytics = {
  assets?: any[];
  totals?: any;
  buckets?: any[];
  correlation?: any;
  rotation?: any;
  survival_stops?: any[];
  risk?: any;
  aporte?: any[];
  aporte_regime?: any;
  stress?: any[];
  deleverage?: any[];
};

const BUCKET_LABEL: Record<string, string> = {
  ANCORA: "Âncoras (core)",
  GERADOR: "Geradores (renda)",
  ACELERADOR: "Aceleradores (satélite)",
  TATICO: "Táticos",
  RESERVA: "Reserva",
};

function fmt(v: any, suffix = "", dec = 1) {
  if (v === null || v === undefined || Number.isNaN(Number(v))) return "—";
  return `${Number(v).toFixed(dec)}${suffix}`;
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="bg-surface-2 rounded-lg px-3 py-2 border border-border/50">
      <div className="text-[10px] uppercase tracking-wider text-text-muted">{label}</div>
      <div className="text-base font-bold text-text-primary leading-tight">{value}</div>
      {hint && <div className="text-[10px] text-text-secondary">{hint}</div>}
    </div>
  );
}

export default function PortfolioIntelligence({ analytics }: { analytics: Analytics | null }) {
  if (!analytics || !analytics.assets || analytics.assets.length === 0) return null;
  const t = analytics.totals || {};
  const buckets = analytics.buckets || [];
  const assets = [...(analytics.assets || [])].sort(
    (a, b) => (b.risk_contribution ?? 0) - (a.risk_contribution ?? 0)
  );
  const corr = analytics.correlation || {};
  const rotation = analytics.rotation || {};
  const sells = (rotation.signals || []).filter((s: any) => s.action === "VENDER");
  const rotateInto = rotation.rotate_into || [];
  const rotateIntoMode: string = rotation.rotate_into_mode || (sells.length > 0 ? "sell" : "opportunity");
  const esticadoObservar = (rotation.signals || [])
    .filter((s: any) => s.action === "MANTER" && s.verdict === "ESTICADO" && (s.weeks_esticado ?? 0) > 0)
    .slice(0, 2);
  const stops = analytics.survival_stops || [];
  const risk = analytics.risk || {};
  const aporte = analytics.aporte || [];
  const stress = analytics.stress || [];
  const deleverage = analytics.deleverage || [];

  return (
    <div className="space-y-4">
      {/* 0y. Stress test — replay de crashes na carteira atual */}
      {stress.length > 0 && (
        <section className="bg-surface rounded-xl border border-border p-4">
          <h3 className="text-sm font-semibold text-text-primary mb-1">Stress test — se o crash acontecesse hoje</h3>
          <p className="text-[11px] text-text-muted mb-3">
            Replay de crises reais na carteira ATUAL com a alavancagem de hoje. <b>Pior caso</b> = entrada no topo;
            <b> ajustado</b> = considerando que você compra descontado (cai menos).
          </p>
          <div className="space-y-1.5">
            {stress.map((s: any) => (
              <div key={s.scenario} className="flex items-center gap-2 text-xs">
                {s.liquidated_adj
                  ? <span className="px-1.5 py-0.5 rounded bg-danger/20 border border-danger/50 text-danger font-semibold text-[10px]">LIQUIDARIA</span>
                  : <span className="px-1.5 py-0.5 rounded bg-surface-2 border border-border text-text-secondary text-[10px]">sobrevive</span>}
                <span className="font-semibold text-text-primary w-36 shrink-0">{s.scenario}</span>
                <span className="font-mono text-text-secondary">
                  equity: ajustado <span className={s.equity_pct_adj <= -50 ? "text-danger" : "text-amber-400"}>{fmt(s.equity_pct_adj, "%", 0)}</span>
                  <span className="text-text-muted"> (pior caso {fmt(s.equity_pct, "%", 0)})</span>
                </span>
                <span className="text-[10px] text-text-muted ml-auto">cobre {s.coverage}</span>
              </div>
            ))}
          </div>
        </section>
      )}
      {/* 0z. Risco alavancado + distância até liquidação (sobrevivência) */}
      {risk.liquidation_distance_pct != null && (
        <section className={`rounded-xl border p-4 ${risk.liquidated_in_worst ? "bg-danger/5 border-danger/40" : "bg-surface border-border"}`}>
          <h3 className="text-sm font-semibold text-text-primary mb-3">Risco alavancado & liquidação</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Stat label="Alavancagem" value={fmt(risk.leverage, "x", 2)} />
            <Stat label="VaR 95% (dia, equity)" value={fmt(risk.var95_equity_daily, "%", 1)} hint="perda diária provável" />
            <Stat label="Liquida a" value={`-${fmt(risk.liquidation_distance_pct, "%", 0)}`} hint="queda da cesta até a margem (~-85% do equity)" />
            <Stat label="Pior tombo (cesta)" value={fmt(risk.maxdd_basket, "%", 0)} hint={`no equity ≈ ${fmt(risk.maxdd_equity, "%", 0)}`} />
          </div>
          {risk.liquidated_in_worst && (
            <div className="mt-2 text-[11px] text-danger">
              ⚠ No pior tombo histórico da cesta ({fmt(risk.maxdd_basket, "%", 0)}) você teria sido <b>liquidado</b> nessa alavancagem ({fmt(risk.leverage, "x", 1)}). Reduza exposição ou suba o equity.
            </div>
          )}
          {deleverage.length > 0 && (
            <div className="mt-2 text-[11px] text-text-muted">
              Desalavancagem natural (dívida fixa, equity compõe):{" "}
              {deleverage.map((d: any, i: number) => (
                <span key={i} className="font-mono text-text-secondary">
                  {i > 0 ? " · " : ""}{d.years}a → {fmt(d.leverage, "x", 1)}
                </span>
              ))}
              <span className="text-text-muted"> · cenário: sem novos aportes alavancados, sem choque no caminho, carry zero (Quantfury)</span>
            </div>
          )}
        </section>
      )}
      {/* 0a. STOP DE SOBREVIVÊNCIA — pilar nº1 (anti-ruína) */}
      {stops.length > 0 && (
        <section className="bg-danger/5 rounded-xl border border-danger/40 p-4">
          <h3 className="text-sm font-semibold text-danger mb-1">⚠ Stop de sobrevivência (anti-ruína)</h3>
          <p className="text-[11px] text-text-muted mb-3">
            Caiu ≥10% do preço médio → vende fração (escalonado, a cada -10%). Princípio nº1: não tolerar ruína.
          </p>
          <div className="space-y-1.5">
            {stops.map((s: any) => (
              <div key={s.ticker} className="flex items-center gap-2 text-xs">
                <span className="px-1.5 py-0.5 rounded bg-danger/20 border border-danger/50 text-danger font-semibold text-[10px]">
                  {s.acao}
                </span>
                <span className="font-semibold text-text-primary">{s.ticker}</span>
                <span className="text-danger font-mono">{fmt(s.pnl_pct, "%", 1)} do PM</span>
                {s.is_seed && <span className="text-[9px] text-emerald-400">(semente — sua regra é não vender; atenção ao risco)</span>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 0b. Sinal de venda / rotação */}
      <section className="bg-surface rounded-xl border border-border p-4">
        <h3 className="text-sm font-semibold text-text-primary mb-1">Sinal de venda / rotação</h3>
        <p className="text-[11px] text-text-muted mb-3">
          Semente nunca vende. Posição de ciclo que ficou <b>ESTICADO</b> → realizar e girar pro melhor do ranking que você ainda não tem.
        </p>

        {/* Chips de VENDER */}
        {sells.length === 0 ? (
          <div className="text-[12px] text-success mb-2">Nenhuma venda sugerida agora — nenhuma posição de ciclo esticada. 🟢</div>
        ) : (
          <div className="space-y-1.5 mb-3">
            {sells.map((s: any) => (
              <div key={s.ticker} className="flex items-center gap-2 text-xs">
                <span className="px-1.5 py-0.5 rounded bg-danger/15 border border-danger/40 text-danger font-semibold text-[10px]">VENDER</span>
                <span className="font-semibold text-text-primary">{s.ticker}</span>
                <span className="text-text-muted">— {s.reason}</span>
              </div>
            ))}
          </div>
        )}

        {/* Em observação: MANTER mas ESTICADO com histerese */}
        {esticadoObservar.length > 0 && (
          <div className="mb-3">
            <div className="text-[10px] uppercase tracking-wider text-text-muted mb-1.5">Em observação</div>
            <div className="space-y-1.5">
              {esticadoObservar.map((s: any) => {
                const progress = Math.min((s.weeks_esticado ?? 0) / 2, 1) * 100;
                return (
                  <div key={s.ticker} className="flex items-center gap-2 text-xs">
                    <span className="px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/40 text-amber-400 font-semibold text-[10px]">ESTICADO</span>
                    <span className="font-semibold text-text-primary">{s.ticker}</span>
                    <span className="text-text-muted">há {Number(s.weeks_esticado).toFixed(1)} sem.</span>
                    <div className="flex-1 max-w-[80px] h-1.5 bg-surface-2 rounded overflow-hidden">
                      <div className="h-full bg-amber-500/70 rounded" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* rotate_into — sempre visível se houver candidatos */}
        {rotateInto.length > 0 && (
          <div>
            {sells.length > 0 || rotateIntoMode === "sell" ? (
              <div className="text-[11px] text-text-secondary mb-1">Girar para:</div>
            ) : (
              <div className="mb-1">
                <div className="text-[11px] text-text-secondary font-medium">Melhores oportunidades agora</div>
                <div className="text-[10px] text-text-muted">nenhuma venda sugerida, mas estas lideram o ranking</div>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {rotateInto.map((t: any) => (
                <div key={t.ticker} className="text-[11px] bg-success/10 border border-success/30 rounded px-2 py-1 flex items-center gap-1">
                  <span className="font-semibold text-text-primary">{t.ticker}</span>
                  {t.verdict === "COMPRAR FORTE" && (
                    <span className="px-1 py-0 rounded bg-success/20 border border-success/50 text-success font-semibold text-[9px]">FORTE</span>
                  )}
                  {t.verdict === "COMPRAR" && (
                    <span className="px-1 py-0 rounded bg-primary/20 border border-primary/50 text-primary font-semibold text-[9px]">COMPRAR</span>
                  )}
                  <span className="text-text-muted ml-0.5">rank {fmt(t.rank, "", 0)}</span>
                  {t.max_corr_held != null && <span className="text-text-muted">· corr {fmt(t.max_corr_held, "", 2)}</span>}
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* 1. Totais ponderados */}
      <section className="bg-surface rounded-xl border border-border p-4">
        <h3 className="text-sm font-semibold text-text-primary mb-3">Carteira — números reais</h3>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          <Stat label="CAGR (ativos)" value={fmt(t.cagr, "%/ano", 1)} />
          <Stat label="TSR esperado" value={fmt(t.tsr_expected, "%", 1)} />
          <Stat label="DY ponderado" value={fmt(t.dividend_yield, "%", 2)} />
          <Stat label="Beta carteira" value={fmt(t.beta, "", 2)} />
          <Stat
            label="Alav. de risco"
            value={t.effective_leverage != null ? fmt(t.effective_leverage, "x", 2) : "—"}
            hint={t.effective_leverage == null ? "informe o equity" : "notional s/ SHY ÷ equity"}
          />
        </div>
        {(t.shy_notional ?? 0) > 0 && (
          <div className={`mt-2 text-[11px] ${t.shy_over_limit ? "text-amber-400" : "text-text-muted"}`}>
            Reserva SHY: <span className="font-mono">US$ {fmt(t.shy_notional, "", 0)}</span> (fora da alavancagem)
            {t.shy_over_limit && <> ⚠ acima do limite de US$ {fmt(t.shy_limit, "", 0)} da Quantfury</>}
          </div>
        )}
      </section>

      {/* 2. Estrutura ALVO × REAL */}
      <section className="bg-surface rounded-xl border border-border p-4">
        <h3 className="text-sm font-semibold text-text-primary mb-1">Estrutura — alvo × real</h3>
        <p className="text-[11px] text-text-muted mb-3">
          Âncoras 55% · Geradores 30% · Aceleradores 15% (banda ±5%). Desvio &gt; 5% sugere rebalanceamento.
        </p>
        <div className="space-y-2">
          {buckets.map((b: any) => {
            const real = b.real ?? 0;
            const target = b.target;
            const statusCls =
              b.status === "ok" ? "text-success"
              : b.status === "extra" ? "text-text-muted"
              : "text-amber-400";
            return (
              <div key={b.bucket} className="flex items-center gap-3">
                <div className="w-40 shrink-0 text-xs text-text-secondary truncate">
                  {BUCKET_LABEL[b.bucket] || b.bucket}
                </div>
                <div className="flex-1 h-3 bg-surface-2 rounded relative overflow-hidden">
                  <div className="absolute inset-y-0 left-0 bg-primary/60" style={{ width: `${Math.min(real, 100)}%` }} />
                  {target != null && (
                    <div className="absolute inset-y-0 w-0.5 bg-text-primary/70" style={{ left: `${Math.min(target, 100)}%` }} title={`alvo ${target}%`} />
                  )}
                </div>
                <div className="w-44 shrink-0 text-right text-xs">
                  <span className="font-mono text-text-primary">{fmt(real, "%", 0)}</span>
                  {target != null && <span className="text-text-muted"> / {fmt(target, "%", 0)}</span>}
                  {b.drift != null && (
                    <span className={`ml-1 ${statusCls}`}>({b.drift > 0 ? "+" : ""}{fmt(b.drift, "", 0)})</span>
                  )}
                  {b.risk_pct != null && <span className="text-amber-400/80 ml-1">· risco {fmt(b.risk_pct, "%", 0)}</span>}
                </div>
              </div>
            );
          })}
        </div>
        {(aporte.length > 0 || analytics.aporte_regime) && (
          <div className="mt-3 pt-3 border-t border-border/50">
            <div className="text-[11px] text-text-secondary mb-1">
              💰 Aporte / reinvestimento de dividendos
              {analytics.aporte_regime && (
                <span className={`ml-1 font-semibold ${analytics.aporte_regime.deploy_shy ? "text-danger" : "text-primary"}`}>
                  — {analytics.aporte_regime.nota}
                </span>
              )}
            </div>
            {aporte.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {aporte.map((a: any, i: number) => (
                  <div key={i} className="text-[11px] bg-primary/10 border border-primary/30 rounded px-2 py-1" title={a.rationale}>
                    <span className="font-semibold text-text-primary">{a.ticker}</span>
                    <span className="text-primary ml-1">{a.verdict}</span>
                    <span className="text-text-muted ml-1">→ {BUCKET_LABEL[a.bucket] || a.bucket}</span>
                    {a.leverage_sugg && <span className="text-amber-400 ml-1">{a.leverage_sugg}x</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* 3. Contribuição de risco (Dalio) */}
      <section className="bg-surface rounded-xl border border-border p-4">
        <h3 className="text-sm font-semibold text-text-primary mb-1">Contribuição de risco</h3>
        <p className="text-[11px] text-text-muted mb-3">
          Quanto cada ativo pesa no RISCO da carteira — não só em $. Método: <b>{t.risk_method || "—"}</b> (considera volatilidade e correlação entre os ativos; hedge reduz risco).
        </p>
        <div className="space-y-1.5">
          {assets.map((a: any) => (
            <div key={a.ticker} className="flex items-center gap-3 text-xs">
              <div className="w-24 shrink-0 font-semibold text-text-primary truncate">
                {a.ticker}
                {a.is_seed && <span className="ml-1 text-[9px] text-emerald-400">semente</span>}
              </div>
              <div className="flex-1 h-2.5 bg-surface-2 rounded overflow-hidden">
                <div className="h-full bg-amber-500/70" style={{ width: `${Math.min(Math.max(a.risk_contribution ?? 0, 0), 100)}%` }} />
              </div>
              <div className="w-40 shrink-0 text-right font-mono text-text-secondary">
                risco {fmt(a.risk_contribution, "%", 0)} · peso {fmt(a.weight, "%", 0)}
                {a.vol != null && <> · vol {fmt(a.vol, "%", 0)}</>}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 4. Correlação / descorrelação */}
      <section className="bg-surface rounded-xl border border-border p-4">
        <h3 className="text-sm font-semibold text-text-primary mb-1">Diversificação — correlação</h3>
        <p className="text-[11px] text-text-muted mb-3">
          Correlação média dos ativos (≈3 anos). Quanto MENOR, melhor a diversificação — sua regra: baixa correlação na crise.
        </p>
        <div className="flex items-center gap-2 mb-3">
          <Stat
            label="Correlação normal"
            value={fmt(corr.avg_correlation, "", 2)}
            hint={corr.avg_correlation == null ? "" : corr.avg_correlation < 0.4 ? "diversificada" : corr.avg_correlation < 0.7 ? "moderada" : "concentrada"}
          />
          {corr.avg_correlation_crisis != null && (
            <Stat
              label="Correlação NA CRISE"
              value={fmt(corr.avg_correlation_crisis, "", 2)}
              hint={corr.avg_correlation_crisis >= 0.7 ? "⚠ tudo cai junto no crash" : "segura na queda"}
            />
          )}
        </div>
        {corr.avg_correlation_crisis != null && corr.avg_correlation != null &&
         corr.avg_correlation_crisis - corr.avg_correlation >= 0.2 && (
          <div className="text-[11px] text-amber-400 mb-2">
            ⚠ A correlação SOBE na crise ({fmt(corr.avg_correlation, "", 2)} → {fmt(corr.avg_correlation_crisis, "", 2)}) — diversificação engana nos dias normais e some no crash (sua regra de ouro).
          </div>
        )}
        {corr.redundant_pairs && corr.redundant_pairs.length > 0 ? (
          <div>
            <div className="text-[11px] text-amber-400 mb-1">⚠ Pares redundantes (corr ≥ 0,8 — andam juntos):</div>
            <div className="flex flex-wrap gap-1.5">
              {corr.redundant_pairs.map((p: any, i: number) => (
                <span key={i} className="text-[10px] font-mono bg-amber-500/10 border border-amber-500/30 rounded px-1.5 py-0.5 text-amber-300">
                  {p.a} ↔ {p.b}: {fmt(p.corr, "", 2)}
                </span>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-[11px] text-success">Sem pares altamente correlacionados — boa descorrelação.</div>
        )}
      </section>
    </div>
  );
}
