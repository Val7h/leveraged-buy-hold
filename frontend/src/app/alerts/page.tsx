"use client";
import { useEffect, useState } from "react";
import AppShell from "@/components/layout/AppShell";
import { alertsApi } from "@/lib/api";
import { Bell, Plus, Trash2, CheckCircle, Clock, RefreshCw, TrendingUp, TrendingDown } from "lucide-react";
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
  created_at: string;
};

const CONDITION_OPTIONS = [
  { value: "above", label: "Preço Acima do threshold" },
  { value: "below", label: "Preço Abaixo do threshold" },
];

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<EnrichedAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ticker: "", condition: "above", threshold: "", message: "" });
  const [creating, setCreating] = useState(false);

  // Load enriched alerts (price + triggered status)
  const loadAlerts = async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    try {
      const res = await alertsApi.check();
      setAlerts(res.data?.alerts ?? []);
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
    if (!form.ticker || !form.threshold) return;
    setCreating(true);
    try {
      await alertsApi.create({
        ticker: form.ticker.toUpperCase(),
        alert_type: form.condition,
        threshold: parseFloat(form.threshold),
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
            <div className="flex gap-2">
              <button onClick={handleCreate} disabled={creating} className="btn-primary text-sm">
                {creating ? "Criando..." : "Criar Alerta"}
              </button>
              <button onClick={() => setShowForm(false)} className="btn-ghost text-sm">Cancelar</button>
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
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                    alert.triggered
                      ? "bg-warning/5 border-warning/20"
                      : !alert.active
                        ? "bg-surface-2 border-border/30 opacity-50"
                        : "bg-surface-2 border-border/50 hover:border-border"
                  }`}
                >
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
