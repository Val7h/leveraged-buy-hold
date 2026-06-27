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
  // Travas Fase 2:
  thesis_stops?: any[];
  duration_warnings?: any[];
  credit_shock?: any;
  exposure_caps?: any;
  // C.3 — cap agregado de alavancagem:
  leverage_agregado?: any;
  // C.2 — disjuntor de fluxos consecutivos:
  disjuntor_fluxos?: any;
  // Cockpit de sobrevivência (6 blocos):
  liquidation_watch?: any;
  aporte_vs_agregado?: any;
  structure_targets?: any;
  equity_stale?: any;
  coverage?: any;
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
  // Travas Fase 2:
  const thesisStops = analytics.thesis_stops || [];
  const durationWarnings = analytics.duration_warnings || [];
  const creditShock = analytics.credit_shock || null;
  const exposureCaps = analytics.exposure_caps || null;
  const exposureAlerts = (exposureCaps && exposureCaps.alerts) || [];
  // C.3 — cap agregado de alavancagem (survival-crítico):
  const levAgg = analytics.leverage_agregado || null;
  const levRegime = analytics.aporte_regime?.multiplier ?? analytics.aporte_regime?.multiplier_regime ?? null;
  // C.2 — disjuntor de fluxos consecutivos (averaging-down alavancado):
  const disj = analytics.disjuntor_fluxos || null;
  const disjAfetados = (disj && disj.afetados) || [];

  // ── Cockpit de sobrevivência ────────────────────────────────
  // 1. Vigília de liquidação (survival-crítico nº1)
  const liqWatch = analytics.liquidation_watch || null;
  const liqAgg = liqWatch?.aggregate || null;
  const liqPos = (liqWatch?.por_posicao || []) as any[];
  const liqStatus: string = liqWatch?.status || "indisponivel";
  const liqStatusCls =
    liqStatus === "critico" ? "text-danger"
    : liqStatus === "alerta" ? "text-amber-400"
    : liqStatus === "indisponivel" ? "text-text-muted"
    : "text-success";
  const liqSectionCls =
    liqStatus === "critico" ? "bg-danger/5 border-danger/40"
    : liqStatus === "alerta" ? "bg-amber-500/5 border-amber-500/40"
    : "bg-surface border-border";
  const liqPosStatusCls = (st: string) =>
    st === "critico" ? "text-danger"
    : st === "alerta" ? "text-amber-400"
    : "text-success";

  // 4. CVaR (cauda) ao lado do VaR
  const cvarEquity = risk.cvar95_equity_daily ?? t.cvar95_equity_daily ?? null;

  // 5. Equity manual desatualizado — todo o painel de sobrevivência depende dele
  const equityStale = analytics.equity_stale || null;
  const isStale = equityStale?.stale === true;

  // 6. Cobertura das médias (beta/CAGR/correlação calculados sobre N/M ativos)
  const coverage = analytics.coverage || null;
  const coveredPct = coverage?.pct_notional_coberto ?? null;
  const coverageIncomplete =
    coverage != null && coveredPct != null && Number(coveredPct) < 100;

  // 3. Estrutura alvo por perfil (label do perfil + reserva)
  const structTargets = analytics.structure_targets || null;

  const levStatus: string = levAgg?.status || "ok";
  const levStatusCls =
    levStatus === "estourado" ? "text-danger"
    : levStatus === "alerta" ? "text-amber-400"
    : "text-success";
  const levSectionCls =
    levStatus === "estourado" ? "bg-danger/5 border-danger/40"
    : levStatus === "alerta" ? "bg-amber-500/5 border-amber-500/40"
    : "bg-surface border-border";
  const levCapLimiting = levAgg && levRegime != null && levAgg.max_lev_novo_fluxo != null
    && Number(levAgg.max_lev_novo_fluxo) < Number(levRegime);

  return (
    <div className="space-y-4">
      {/* EQUITY DESATUALIZADO — todo o painel de sobrevivência depende do equity real */}
      {isStale && (
        <div className="bg-amber-500/10 rounded-xl border border-amber-500/40 px-4 py-3 flex items-start gap-2">
          <span className="text-amber-400 text-sm shrink-0">⚠</span>
          <div className="text-[12px] text-amber-300">
            <b>Equity manual pode estar desatualizado</b> — atualize o equity da Quantfury na aba Portfólio.
            Toda a vigília de sobrevivência (liquidação, alavancagem efetiva, cap de aporte) depende dele.
            {equityStale?.motivo && <span className="text-amber-400/80"> ({equityStale.motivo})</span>}
          </div>
        </div>
      )}

      {/* VIGÍLIA DE LIQUIDAÇÃO (pilar nº1 da doutrina — survival-crítico, topo) */}
      {liqWatch && (
        <section className={`rounded-xl border p-4 ${liqSectionCls}`}>
          <h3 className="text-sm font-semibold text-text-primary mb-1">Vigília de liquidação</h3>
          <p className="text-[11px] text-text-muted mb-3">
            Distância de queda da cesta até a liquidação forçada. O item nº1: sobreviver 10-15 anos é tudo.
          </p>

          {liqStatus === "indisponivel" ? (
            <div className="text-[12px] text-text-muted">
              {liqWatch?.nota || "Indisponível — informe o equity da Quantfury para calcular a distância até a liquidação."}
            </div>
          ) : (
            <>
              {/* Distância agregada — número grande, cor por status */}
              {liqAgg && (
                <div className="flex items-end gap-4 mb-3">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-text-muted">Distância até liquidar (carteira)</div>
                    <div className={`text-3xl font-bold leading-none ${liqStatusCls}`}>
                      {liqAgg.distance_pct != null ? `-${fmt(liqAgg.distance_pct, "%", 0)}` : "—"}
                    </div>
                  </div>
                  <div className="pb-1">
                    <div className="text-[10px] text-text-muted">alav. {fmt(liqAgg.leverage, "x", 2)}</div>
                    <div className={`text-xs font-semibold ${liqStatusCls}`}>
                      {liqAgg.status === "critico" ? "Crítico" : liqAgg.status === "alerta" ? "Alerta" : "OK"}
                    </div>
                  </div>
                </div>
              )}

              {/* Por posição alavancada */}
              {liqPos.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-[10px] uppercase tracking-wider text-text-muted">Por posição alavancada</div>
                  {liqPos.map((p: any) => (
                    <div key={p.ticker} className="flex items-center gap-2 text-xs">
                      <span className="font-semibold text-text-primary w-20 shrink-0">{p.ticker}</span>
                      <span className="text-text-muted font-mono w-14 shrink-0">{fmt(p.leverage, "x", 2)}</span>
                      <div className="flex-1 h-2 bg-surface-2 rounded overflow-hidden">
                        <div
                          className={`h-full ${p.status === "critico" ? "bg-danger/70" : p.status === "alerta" ? "bg-amber-500/70" : "bg-success/70"}`}
                          style={{ width: `${Math.min(Math.max(Number(p.distance_pct) || 0, 0), 100)}%` }}
                        />
                      </div>
                      <span className={`font-mono shrink-0 w-16 text-right ${liqPosStatusCls(p.status)}`}>
                        {p.distance_pct != null ? `-${fmt(p.distance_pct, "%", 0)}` : "—"}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {liqStatus === "critico" && (
                <div className="mt-2 text-[11px] text-danger">
                  ⚠ Distância crítica até a liquidação — reduza exposição ou suba o equity. Não tolerar ruína (princípio nº1).
                </div>
              )}
              {liqWatch?.nota && liqStatus !== "critico" && (
                <div className="mt-2 text-[10px] text-text-muted italic">{liqWatch.nota}</div>
              )}
            </>
          )}
        </section>
      )}

      {/* C.3 — CAP AGREGADO DE ALAVANCAGEM (survival-crítico) */}
      {levAgg && (
        <section className={`rounded-xl border p-4 ${levSectionCls}`}>
          <h3 className="text-sm font-semibold text-text-primary mb-1">Cap agregado de alavancagem</h3>
          <p className="text-[11px] text-text-muted mb-3">
            Teto da alavancagem efetiva da carteira inteira (notional de risco ÷ equity). Clusters colados contam mais — controla o risco que a soma das posições esconde.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="bg-surface-2 rounded-lg px-3 py-2 border border-border/50">
              <div className="text-[10px] uppercase tracking-wider text-text-muted">Alav. efetiva</div>
              <div className={`text-base font-bold leading-tight ${levStatusCls}`}>{fmt(levAgg.effective_leverage, "x", 2)}</div>
              {levAgg.effective_leverage_corr != null && (
                <div className="text-[10px] text-text-secondary">{fmt(levAgg.effective_leverage_corr, "x", 2)} ajustada por correlação</div>
              )}
            </div>
            <Stat
              label="Teto"
              value={fmt(levAgg.cap, "x", 1)}
              hint={`alerta em ${fmt(levAgg.alerta, "x", 1)}`}
            />
            <div className="bg-surface-2 rounded-lg px-3 py-2 border border-primary/40">
              <div className="text-[10px] uppercase tracking-wider text-text-muted">Próximo aporte até</div>
              <div className="text-base font-bold text-primary leading-tight">{fmt(levAgg.max_lev_novo_fluxo, "x", 2)}</div>
              <div className="text-[10px] text-text-secondary">alav. máx. sem furar o cap</div>
            </div>
            <Stat
              label="Status"
              value={levStatus === "estourado" ? "Estourado" : levStatus === "alerta" ? "Alerta" : "OK"}
            />
          </div>

          {/* Barra: efetiva vs teto */}
          {levAgg.cap != null && levAgg.effective_leverage != null && (
            <div className="mt-3 flex items-center gap-3">
              <div className="flex-1 h-2.5 bg-surface-2 rounded relative overflow-hidden">
                <div
                  className={`absolute inset-y-0 left-0 ${levStatus === "estourado" ? "bg-danger/70" : levStatus === "alerta" ? "bg-amber-500/70" : "bg-success/70"}`}
                  style={{ width: `${Math.min((Number(levAgg.effective_leverage) / Number(levAgg.cap)) * 100, 100)}%` }}
                />
                {levAgg.alerta != null && (
                  <div className="absolute inset-y-0 w-0.5 bg-text-primary/70" style={{ left: `${Math.min((Number(levAgg.alerta) / Number(levAgg.cap)) * 100, 100)}%` }} title={`alerta ${fmt(levAgg.alerta, "x", 1)}`} />
                )}
              </div>
              <div className="text-[10px] text-text-muted shrink-0 font-mono">teto {fmt(levAgg.cap, "x", 1)}</div>
            </div>
          )}

          {/* Aviso de estourado */}
          {levStatus === "estourado" && (
            <div className="mt-2 text-[11px] text-danger">
              ⚠ Carteira acima do teto de segurança — novos aportes forçados a 1x até desalavancar.
            </div>
          )}

          {/* Cap limitando o próximo aporte */}
          {levStatus !== "estourado" && levCapLimiting && (
            <div className="mt-2 text-[11px] text-amber-400">
              ⚠ O cap agregado está limitando seu próximo aporte ({fmt(levAgg.max_lev_novo_fluxo, "x", 2)} &lt; {fmt(levRegime, "x", 1)} do regime).
            </div>
          )}

          {/* Qual teto mordeu (discreto) */}
          {(levAgg.caps_aplicados || levAgg.headroom_notional != null) && (
            <div className="mt-2 text-[10px] text-text-muted italic">
              {levAgg.caps_aplicados && Object.keys(levAgg.caps_aplicados).length > 0 && (
                <span>
                  Teto que mordeu: {Object.entries(levAgg.caps_aplicados).map(([k, v]: any, i: number) => (
                    <span key={k} className="font-mono">{i > 0 ? " · " : ""}{k}: {typeof v === "number" ? fmt(v, "", 2) : String(v)}</span>
                  ))}
                </span>
              )}
              {levAgg.headroom_notional != null && (
                <span>{levAgg.caps_aplicados ? " · " : ""}folga de notional: US$ {fmt(levAgg.headroom_notional, "", 0)}</span>
              )}
            </div>
          )}
        </section>
      )}

      {/* C.2 — DISJUNTOR DE FLUXOS CONSECUTIVOS (averaging-down alavancado) */}
      {disjAfetados.length > 0 && (
        <section className="bg-amber-500/5 rounded-xl border border-amber-500/40 p-4">
          <h3 className="text-sm font-semibold text-amber-400 mb-1">Disjuntor de fluxos consecutivos</h3>
          <p className="text-[11px] text-text-muted mb-3">
            Você aportou seguidas vezes no mesmo ativo enquanto ele cai — empilhar dívida num ativo em queda (averaging-down alavancado) liquida antes da recuperação. A alavancagem do próximo aporte foi <b>degradada</b> automaticamente.
          </p>
          <div className="space-y-1.5">
            {disjAfetados.map((d: any) => (
              <div key={d.ticker} className="flex items-start gap-2 text-xs">
                <span className="px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/40 text-amber-400 font-semibold text-[10px] shrink-0 font-mono">
                  {fmt(d.mult_original, "x", 0)}→{fmt(d.mult_degradado, "x", 0)}
                </span>
                <span className="font-semibold text-text-primary shrink-0">{d.ticker}</span>
                <span className="text-text-muted">
                  — {d.aportes_recentes} aporte(s) consecutivo(s) em queda{d.motivo ? `: ${d.motivo}` : ""}
                </span>
                {d.is_seed && <span className="text-[9px] text-emerald-400 shrink-0">(semente — não imune)</span>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* TRAVA 3. Choque de crédito — desalavanca TUDO (vermelho quando triggered) */}
      {creditShock && creditShock.triggered && (
        <section className="bg-danger/5 rounded-xl border border-danger/40 p-4">
          <h3 className="text-sm font-semibold text-danger mb-1">⚠ Choque de crédito — desalavancar</h3>
          <p className="text-[11px] text-text-muted mb-2">{creditShock.recommendation}</p>
          <div className="text-xs font-mono text-danger mb-1">Sinal: {creditShock.signal}</div>
          <div className="text-[10px] text-text-muted italic">{creditShock.proxy_note}</div>
        </section>
      )}

      {/* TRAVA 1. Stop de TESE objetivo — fundamento quebrou (vermelho) */}
      {thesisStops.length > 0 && (
        <section className="bg-danger/5 rounded-xl border border-danger/40 p-4">
          <h3 className="text-sm font-semibold text-danger mb-1">⚠ Stop de tese (fundamento quebrou)</h3>
          <p className="text-[11px] text-text-muted mb-3">
            Sair quando o <b>fundamento</b> quebra (FCF negativo, ROIC desabou, dividendo cortado) — independente do preço.
            Diferente do stop de sobrevivência (-10%) e do stop de preço.
          </p>
          <div className="space-y-1.5">
            {thesisStops.map((s: any) => (
              <div key={s.ticker} className="flex items-start gap-2 text-xs">
                <span className="px-1.5 py-0.5 rounded bg-danger/20 border border-danger/50 text-danger font-semibold text-[10px] shrink-0">TESE</span>
                <span className="font-semibold text-text-primary shrink-0">{s.ticker}</span>
                <span className="text-text-muted">— {s.reason}</span>
                {s.is_seed && <span className="text-[9px] text-emerald-400 shrink-0">(semente — não imune; você decide)</span>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* TRAVA 2. Duração — tempo mata, não preço (âmbar) */}
      {durationWarnings.length > 0 && (
        <section className="bg-amber-500/5 rounded-xl border border-amber-500/40 p-4">
          <h3 className="text-sm font-semibold text-amber-400 mb-1">⏳ Duração longa sem tese se realizando</h3>
          <p className="text-[11px] text-text-muted mb-3">
            Posições paradas há muito tempo e sem upside (esticado/justo). Tempo mata o capital alavancado — só alerta, considere girar.
          </p>
          <div className="space-y-1.5">
            {durationWarnings.map((d: any) => (
              <div key={d.ticker} className="flex items-center gap-2 text-xs">
                <span className="px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/40 text-amber-400 font-semibold text-[10px]">
                  {(d.months_held / 12).toFixed(1)}a
                </span>
                <span className="font-semibold text-text-primary">{d.ticker}</span>
                <span className="text-text-muted">— {d.verdict?.toLowerCase()} há {Number(d.months_held).toFixed(0)} meses, considerar girar capital</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* TRAVA 4. Exposição agregada & concentração (âmbar) */}
      {exposureAlerts.length > 0 && (
        <section className="bg-amber-500/5 rounded-xl border border-amber-500/40 p-4">
          <h3 className="text-sm font-semibold text-amber-400 mb-1">Trava de exposição agregada</h3>
          <p className="text-[11px] text-text-muted mb-3">
            Concentração de ativo (&gt; {fmt(exposureCaps?.concentration_limit_pct, "%", 0)} do risco), de bucket, ou cluster de ativos colados (corr ≥ 0,8) que esconde risco real.
          </p>
          <div className="space-y-1.5">
            {exposureAlerts.map((a: any, i: number) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                <span className="px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/40 text-amber-400 font-semibold text-[10px] shrink-0">
                  {a.type === "concentracao_ativo" ? "ATIVO" : a.type === "concentracao_bucket" ? "BUCKET" : "CLUSTER"}
                </span>
                <span className="text-text-muted">{a.message}</span>
              </div>
            ))}
          </div>
        </section>
      )}

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
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2">
            <Stat label="Alavancagem" value={fmt(risk.leverage, "x", 2)} />
            <Stat label="VaR 95% (dia, equity)" value={fmt(risk.var95_equity_daily, "%", 1)} hint="perda diária provável" />
            {cvarEquity != null && (
              <Stat label="CVaR 95% (dia, equity)" value={fmt(cvarEquity, "%", 1)} hint="perda média na cauda (além do VaR)" />
            )}
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
        {coverageIncomplete && (
          <div className="mt-2 text-[10px] text-text-muted italic">
            Médias (beta/CAGR/correlação) calculadas sobre {coverage.beta || coverage.cagr || `${coverage.n_ativos ?? "?"}`} ativos
            {coveredPct != null && <> ({fmt(coveredPct, "%", 0)} do notional)</>} — faltam dados em alguns ativos.
          </div>
        )}
      </section>

      {/* 2. Estrutura ALVO × REAL (alvos por perfil, vindos do backend) */}
      <section className="bg-surface rounded-xl border border-border p-4">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-semibold text-text-primary">Estrutura — alvo × real</h3>
          {structTargets?.profile && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 border border-primary/30 text-primary font-semibold uppercase tracking-wider">
              perfil {structTargets.profile}
            </span>
          )}
        </div>
        <p className="text-[11px] text-text-muted mb-3">
          {structTargets?.targets ? (
            <>
              {Object.entries(structTargets.targets).map(([k, v]: any, i: number) => (
                <span key={k}>{i > 0 ? " · " : ""}{BUCKET_LABEL[k] || k} {fmt(v, "%", 0)}</span>
              ))}
              {structTargets.reserve_pct != null && <> · reserva {fmt(structTargets.reserve_pct, "%", 0)}</>}
              {" "}(banda ±5%). Desvio &gt; 5% sugere rebalanceamento.
            </>
          ) : (
            <>Âncoras 55% · Geradores 30% · Aceleradores 15% (banda ±5%). Desvio &gt; 5% sugere rebalanceamento.</>
          )}
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
