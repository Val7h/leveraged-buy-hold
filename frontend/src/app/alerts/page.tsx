"use client";
import { useEffect, useState } from "react";
import AppShell from "@/components/layout/AppShell";
import { alertsApi } from "@/lib/api";
import { Bell, Plus, Trash2, CheckCircle, Clock, RefreshCw, TrendingUp, TrendingDown, ShieldAlert, AlertTriangle, Info } from "lucide-react";
import TickerLogo from "@/components/ui/TickerLogo";

// Condition display labels
const CONDITION_LABELS: Record<string, string> = {
  above:        "Preço Acima",
  price_above:  "Preço Acima",
  gte:          "Preço ≥",
  below:        "Preço Abaixo",
  price_below:  "Preço Abaixo",
  lte:          "Preço ≤",
  // legacy types from old form
  entry_signal:        "Sinal de Entrada",
  rsi_weekly_oversold: "RSI Semanal Sobrevendido",
  rsi_oversold:        "RSI Diário Sobrevendido",
  stochastic_oversold: "Estocástico Sobrevendido",
  opportunity_score:   "Score de Oportunidade",
  drawdown:            "Drawdown",
  price_target:        "Alvo de Preço",
};

// Enriched alert from GET /alerts/check
type EnrichedAlert = {
  id: string;
  ticker: string;
  condition: string;
  threshold: number;
  message: string | null;
  active: boolean;
  current_price: number | null;
  triggered: boolean;
  distance_pct: number | null;
  context: string | null;
  created_at: string;
};

// Status em tempo real de uma sentinela de sobrevivência (por posição)
type SurvivalPositionStatus = {
  ticker: string;
  price: number | null;
  pm: number;
  leverage?: number;
  isSeed: boolean | null;
  stopStatus: {
    level: number;      // nível de stop já cruzado (0 se nenhum)
    hit: boolean;       // true se algum nível foi cruzado
    dropPct: number;    // queda atual do PM (positivo = abaixo)
    nextLevel: number | null;  // próximo nível a cruzar
  } | null;
  liqStatus: {
    slackPct: number;         // folga restante até liquidação (%)
    nearestBand: number | null;
    critical: boolean;
  } | null;
};

const CONDITION_OPTIONS = [
  { value: "above", label: "Preço Acima do threshold" },
  { value: "below", label: "Preço Abaixo do threshold" },
];

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<EnrichedAlert[]>([]);
  const [survivalStatus, setSurvivalStatus] = useState<SurvivalPositionStatus[]>([]);
  const [checkedAt, setCheckedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState({ ticker: "", condition: "above", threshold: "", message: "" });
  const [creating, setCreating] = useState(false);

  // Load enriched alerts (price + triggered status + survival_status)
  const loadAlerts = async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    try {
      const res = await alertsApi.check();
      setAlerts(res.data?.alerts ?? []);
      setSurvivalStatus(res.data?.survival_status ?? []);
      setCheckedAt(res.data?.checked_at ?? null);
    } catch {
      // fallback to plain list
      try {
        const res = await alertsApi.list();
        setAlerts(
          (res.data ?? []).map((a: any) => ({
            ...a,
            current_price: null,
            triggered: false,
            distance_pct: null,
            context: null,
          }))
        );
      } catch {}
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAlerts(); }, []);

  const handleRefresh = async () => {
    setChecking(true);
    await loadAlerts(false);
    setChecking(false);
  };

  const handleCreate = async () => {
    setFormError(null);
    if (!form.ticker.trim()) { setFormError("Informe o ticker."); return; }
    const thresh = parseFloat(form.threshold);
    if (!form.threshold || isNaN(thresh) || thresh <= 0) {
      setFormError("Preço alvo deve ser um número positivo.");
      return;
    }
    setCreating(true);
    try {
      await alertsApi.create({
        ticker: form.ticker.toUpperCase(),
        alert_type: form.condition,
        threshold: thresh,
        message: form.message || undefined,
      });
      setShowForm(false);
      setForm({ ticker: "", condition: "above", threshold: "", message: "" });
      await loadAlerts(false);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    await alertsApi.delete(id);
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  const handleToggle = async (id: string, active: boolean) => {
    await alertsApi.update(id, { active: !active });
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, active: !active } : a)));
  };

  const handleDismissTriggered = async () => {
    setLoading(true);
    try {
      await alertsApi.dismissTriggered();
      await loadAlerts(false);
    } finally {
      setLoading(false);
    }
  };

  const triggeredAlerts = alerts.filter((a) => a.triggered);
  const condLabel = (c: string) => CONDITION_LABELS[c] ?? c;

  // Ordena alertas: disparados primeiro, depois por proximidade (menor distância absoluta)
  const sortedAlerts = [...alerts].sort((a, b) => {
    if (a.triggered && !b.triggered) return -1;
    if (!a.triggered && b.triggered) return 1;
    const da = a.distance_pct != null ? Math.abs(a.distance_pct) : Infinity;
    const db = b.distance_pct != null ? Math.abs(b.distance_pct) : Infinity;
    return da - db;
  });

  // Formata timestamp relativo legível
  const relativeTime = (iso: string | null): string => {
    if (!iso) return "";
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (diff < 60) return "agora mesmo";
    if (diff < 3600) return `há ${Math.floor(diff / 60)}min`;
    if (diff < 86400) return `há ${Math.floor(diff / 3600)}h`;
    return `há ${Math.floor(diff / 86400)}d`;
  };

  return (
    <AppShell>
      <div className="p-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-text-primary">Sistema de Alertas</h1>
            <p className="text-sm text-text-secondary mt-0.5">
              {alerts.length} alerta{alerts.length !== 1 ? "s" : ""} configurado{alerts.length !== 1 ? "s" : ""}
              {triggeredAlerts.length > 0 && (
                <span className="ml-2 text-warning font-medium">· {triggeredAlerts.length} disparado{triggeredAlerts.length !== 1 ? "s" : ""}</span>
              )}
              {checkedAt && (
                <span className="ml-2 text-text-muted text-xs">· verificado {relativeTime(checkedAt)}</span>
              )}
            </p>
          </div>
          <div className="flex gap-2">
            {triggeredAlerts.length > 0 && (
              <button
                onClick={handleDismissTriggered}
                disabled={loading}
                className="btn-ghost text-sm border border-warning/30 text-warning hover:bg-warning/10"
              >
                Limpar Disparados
              </button>
            )}
            <button
              onClick={handleRefresh}
              disabled={checking}
              className="btn-ghost text-sm border border-border flex items-center gap-1.5"
            >
              <RefreshCw size={13} className={checking ? "animate-spin" : ""} />
              Verificar Agora
            </button>
            <button
              onClick={() => setShowForm(!showForm)}
              className="btn-primary text-sm flex items-center gap-2"
            >
              <Plus size={14} />
              Novo Alerta
            </button>
          </div>
        </div>

        {/* Camada Sentinela — status dinâmico das sentinelas de sobrevivência por posição */}
        <div className="bg-primary/5 border border-primary/15 rounded-xl px-4 py-3 mb-5">
          <div className="flex items-center gap-2 mb-2">
            <ShieldAlert size={14} className="text-primary" />
            <span className="text-xs font-semibold text-primary">Sentinela de sobrevivência</span>
            <span className="text-xs text-text-muted">(automático — vigia todas as posições)</span>
          </div>

          {survivalStatus.length > 0 ? (
            <div className="space-y-2">
              {survivalStatus.map((s) => {
                const hasAlert = s.stopStatus?.hit || s.liqStatus?.critical;
                const borderColor = s.liqStatus?.critical ? "border-danger/30" : s.stopStatus?.hit ? "border-warning/30" : "border-border/30";
                return (
                  <div key={s.ticker} className={`rounded-lg border px-3 py-2 bg-surface-2 ${borderColor}`}>
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <TickerLogo ticker={s.ticker} size={20} />
                        <span className="font-mono font-bold text-text-primary text-xs">{s.ticker}</span>
                        {s.isSeed && <span className="text-xs text-warning">🔒 Semente</span>}
                        {s.price != null && (
                          <span className="text-xs text-text-muted font-mono">${s.price.toFixed(2)}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 flex-wrap">
                        {/* Status stop PM */}
                        {s.stopStatus && (
                          <div className="text-xs">
                            {s.stopStatus.hit ? (
                              <span className={`flex items-center gap-1 font-medium ${s.stopStatus.level >= 20 ? "text-danger" : "text-warning"}`}>
                                <AlertTriangle size={10} />
                                Stop -{s.stopStatus.level}% acionado
                                {s.stopStatus.nextLevel && ` (próx: -${s.stopStatus.nextLevel}%)`}
                              </span>
                            ) : (
                              <span className="text-text-muted flex items-center gap-1">
                                <Info size={10} />
                                {s.stopStatus.dropPct > 0
                                  ? `Caiu ${s.stopStatus.dropPct}% do PM — stop em -${s.stopStatus.nextLevel ?? 10}%`
                                  : `+${Math.abs(s.stopStatus.dropPct)}% acima do PM — ok`
                                }
                              </span>
                            )}
                          </div>
                        )}
                        {/* Status liquidação */}
                        {s.liqStatus && (
                          <div className="text-xs">
                            <span className={`flex items-center gap-1 ${s.liqStatus.critical ? "text-danger font-semibold" : s.liqStatus.slackPct <= 25 ? "text-warning" : "text-text-muted"}`}>
                              {s.liqStatus.critical ? <AlertTriangle size={10} /> : <Info size={10} />}
                              Folga liq: {s.liqStatus.slackPct.toFixed(0)}%
                              {s.liqStatus.critical && " ⚠ crítico"}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-text-secondary leading-relaxed">
              O sistema vigia suas posições e avisa por notificação (e e-mail nos casos críticos) quando:
              o preço cai <span className="font-semibold">-10/-20/-30% do PM real</span> (stop ancorado,
              re-âncora a cada aporte) ou a{" "}
              <span className="font-semibold">folga até a liquidação</span> encolhe (25/15/8%).
              Posições <span className="text-warning font-semibold">🔒 Semente</span> nunca viram alerta de venda.
            </p>
          )}
        </div>

        {/* Create form */}
        {showForm && (
          <div className="card mb-6 border-primary/20">
            <h3 className="text-sm font-semibold text-text-primary mb-4">Criar Alerta de Preço</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <div>
                <label className="label">Ticker</label>
                <input
                  className="input font-mono uppercase"
                  placeholder="AAPL"
                  value={form.ticker}
                  onChange={(e) => setForm({ ...form, ticker: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Condição</label>
                <select
                  className="input"
                  value={form.condition}
                  onChange={(e) => setForm({ ...form, condition: e.target.value })}
                >
                  {CONDITION_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Preço Alvo ($)</label>
                <input
                  className="input font-mono"
                  type="number"
                  step="0.01"
                  placeholder="200.00"
                  value={form.threshold}
                  onChange={(e) => setForm({ ...form, threshold: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Nota (opcional)</label>
                <input
                  className="input"
                  placeholder="Ex: comprar na queda"
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                />
              </div>
            </div>
            {formError && (
              <p className="text-xs text-danger mb-3 flex items-center gap-1">
                <AlertTriangle size={12} />
                {formError}
              </p>
            )}
            <div className="flex gap-2">
              <button onClick={handleCreate} disabled={creating} className="btn-primary text-sm">
                {creating ? "Criando..." : "Criar Alerta"}
              </button>
              <button onClick={() => { setShowForm(false); setFormError(null); }} className="btn-ghost text-sm">Cancelar</button>
            </div>
          </div>
        )}

        {/* Triggered banner */}
        {triggeredAlerts.length > 0 && (
          <div className="bg-warning/10 border border-warning/20 rounded-xl p-4 mb-5">
            <h3 className="text-sm font-semibold text-warning mb-2 flex items-center gap-2">
              <Bell size={14} />
              {triggeredAlerts.length} Alerta{triggeredAlerts.length !== 1 ? "s" : ""} Disparado{triggeredAlerts.length !== 1 ? "s" : ""}
            </h3>
            {triggeredAlerts.map((a) => (
              <div key={a.id} className="text-xs text-text-secondary py-1.5 border-b border-border/40 last:border-0 flex items-center gap-2">
                <TickerLogo ticker={a.ticker} size={18} />
                <span className="font-mono font-semibold text-warning">{a.ticker}</span>
                <span>·</span>
                <span>{condLabel(a.condition)}</span>
                <span className="font-mono">${a.threshold.toFixed(2)}</span>
                {a.current_price != null && (
                  <>
                    <span>·</span>
                    <span>Preço atual: <span className="font-mono text-text-primary">${a.current_price.toFixed(2)}</span></span>
                  </>
                )}
                {a.message && <span className="text-text-muted">· {a.message}</span>}
              </div>
            ))}
          </div>
        )}

        {/* Alerts list */}
        {loading ? (
          <div className="card text-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mb-3" />
            <p className="text-sm text-text-secondary">Verificando preços...</p>
          </div>
        ) : alerts.length > 0 ? (
          <div className="card">
            <div className="space-y-2">
              {sortedAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`flex flex-col p-3 rounded-lg border transition-colors ${
                    alert.triggered
                      ? "bg-warning/5 border-warning/20"
                      : !alert.active
                        ? "bg-surface-2 border-border/30 opacity-50"
                        : "bg-surface-2 border-border/50 hover:border-border"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {alert.triggered ? (
                        <CheckCircle size={14} className="text-warning flex-shrink-0" />
                      ) : (
                        <Clock size={14} className="text-text-muted flex-shrink-0" />
                      )}
                      <TickerLogo ticker={alert.ticker} size={28} />
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold text-text-primary text-sm">{alert.ticker}</span>
                          <span className="text-xs text-text-muted">{condLabel(alert.condition)}</span>
                          <span className="badge bg-surface-3 border-border text-text-secondary text-xs font-mono">
                            ${alert.threshold.toFixed(2)}
                          </span>
                          {!alert.active && (
                            <span className="badge bg-surface-3 border-border text-text-muted text-xs">INATIVO</span>
                          )}
                          {alert.triggered && (
                            <span className="badge bg-warning/10 border-warning/20 text-warning text-xs">DISPARADO</span>
                          )}
                        </div>
                        {alert.message && <p className="text-xs text-text-muted mt-0.5">{alert.message}</p>}
                        {alert.context && (
                          <p className={`text-xs mt-0.5 flex items-center gap-1 ${alert.triggered ? "text-warning" : "text-text-muted"}`}>
                            <Info size={10} />
                            {alert.context}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {alert.current_price != null && (
                        <div className="text-right">
                          <p className="text-xs font-mono text-text-primary">${alert.current_price.toFixed(2)}</p>
                          {alert.distance_pct != null && (
                            <p className={`text-xs font-mono flex items-center gap-0.5 justify-end ${
                              alert.distance_pct > 0 ? "text-success" : "text-danger"
                            }`}>
                              {alert.distance_pct > 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                              {alert.distance_pct > 0 ? "+" : ""}{alert.distance_pct.toFixed(1)}%
                            </p>
                          )}
                        </div>
                      )}
                      <button
                        onClick={() => handleToggle(alert.id, alert.active)}
                        className={`text-xs px-2 py-0.5 rounded border transition-colors ${
                          alert.active
                            ? "text-text-muted border-border hover:border-warning/50 hover:text-warning"
                            : "text-primary border-primary/30 hover:bg-primary/10"
                        }`}
                      >
                        {alert.active ? "Pausar" : "Ativar"}
                      </button>
                      <button
                        onClick={() => handleDelete(alert.id)}
                        className="text-text-muted hover:text-danger transition-colors p-1"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                  {/* Barra de proximidade ao threshold — full width abaixo da row */}
                  {alert.active && !alert.triggered && alert.distance_pct != null && (
                    <div className="mt-2">
                      <div className="flex justify-between text-[10px] text-text-muted mb-1">
                        <span>Proximidade ao gatilho</span>
                        <span className={Math.abs(alert.distance_pct) < 5 ? "text-warning font-semibold" : ""}>
                          {Math.abs(alert.distance_pct).toFixed(1)}% restante
                        </span>
                      </div>
                      <div className="h-1 bg-surface-3 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${Math.abs(alert.distance_pct) < 5 ? "bg-warning" : "bg-primary/50"}`}
                          style={{ width: `${Math.max(2, Math.min(100, 100 - Math.abs(alert.distance_pct)))}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="card text-center py-16">
            <Bell size={36} className="text-text-muted mx-auto mb-3" />
            <p className="text-sm text-text-secondary">Nenhum alerta configurado</p>
            <p className="text-xs text-text-muted mt-1">Crie alertas de preço para monitorar seus ativos automaticamente</p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
