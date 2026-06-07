"use client";
import { useEffect, useState } from "react";
import AppShell from "@/components/layout/AppShell";
import { alertsApi } from "@/lib/api";
import type { Alert } from "@/types";
import { Bell, Plus, Trash2, CheckCircle, Clock } from "lucide-react";
import { formatPercent } from "@/lib/utils";
import TickerLogo from "@/components/ui/TickerLogo";

const ALERT_TYPES = [
  { value: "entry_signal",        label: "Sinal Técnico",             description: "Dispara quando o modelo identifica OPORTUNIDADE ou OPORTUNIDADE FORTE",    noThreshold: true },
  { value: "rsi_weekly_oversold", label: "RSI Semanal Sobrevendido",  description: "Alerta quando RSI semanal cair abaixo do valor" },
  { value: "rsi_oversold",        label: "RSI Diário Sobrevendido",   description: "Alerta quando RSI diário cair abaixo do valor" },
  { value: "stochastic_oversold", label: "Estocástico Sobrevendido",  description: "Alerta quando Stoch %K cair abaixo" },
  { value: "opportunity_score",   label: "Score de Oportunidade",     description: "Alerta quando score subir acima" },
  { value: "drawdown",            label: "Drawdown Relevante",        description: "Alerta quando drawdown atingir o nível" },
  { value: "price_target",        label: "Alvo de Preço",             description: "Alerta quando atingir preço alvo" },
];

const TYPE_DEFAULTS: Record<string, number> = {
  entry_signal:        0,
  rsi_weekly_oversold: 40,
  rsi_oversold:        30,
  stochastic_oversold: 20,
  opportunity_score:   70,
  drawdown:            -20,
  price_target:        0,
};

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ticker: "", alert_type: "rsi_oversold", threshold: "30", message: "" });
  const [loading, setLoading] = useState(false);
  const [checkResult, setCheckResult] = useState<{ triggered: Array<{ ticker: string; type: string; message: string; value: number; threshold: number }> } | null>(null);

  useEffect(() => {
    loadAlerts();
  }, []);

  const loadAlerts = async () => {
    try {
      const res = await alertsApi.list();
      setAlerts(res.data);
    } catch {}
  };

  const handleCreate = async () => {
    if (!form.ticker) return;
    setLoading(true);
    try {
      await alertsApi.create({
        ticker: form.ticker.toUpperCase(),
        alert_type: form.alert_type,
        threshold: parseFloat(form.threshold),
        message: form.message || undefined,
      });
      await loadAlerts();
      setShowForm(false);
      setForm({ ticker: "", alert_type: "rsi_oversold", threshold: "30", message: "" });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    await alertsApi.delete(id);
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  const handleCheck = async () => {
    const tickers = [...new Set(alerts.map((a) => a.ticker))];
    if (!tickers.length) return;
    setLoading(true);
    try {
      const res = await alertsApi.check(tickers);
      setCheckResult(res.data);
      await loadAlerts();
    } finally {
      setLoading(false);
    }
  };

  const handleDismissTriggered = async () => {
    setLoading(true);
    try {
      await alertsApi.dismissTriggered();
      setCheckResult(null);
      await loadAlerts();
    } finally {
      setLoading(false);
    }
  };

  const hasTriggered = alerts.some((a) => a.is_triggered);

  const typeLabel = (type: string) => ALERT_TYPES.find((t) => t.value === type)?.label || type;

  return (
    <AppShell>
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-text-primary">Sistema de Alertas</h1>
            <p className="text-sm text-text-secondary mt-0.5">Monitoramento de RSI, Estocástico, Drawdown e Oportunidades</p>
          </div>
          <div className="flex gap-2">
            {hasTriggered && (
              <button onClick={handleDismissTriggered} disabled={loading} className="btn-ghost text-sm border border-warning/30 text-warning hover:bg-warning/10">
                Limpar Disparados
              </button>
            )}
            <button onClick={handleCheck} disabled={loading || !alerts.length} className="btn-ghost text-sm border border-border">
              {loading ? "Verificando..." : "Verificar Agora"}
            </button>
            <button onClick={() => setShowForm(!showForm)} className="btn-primary text-sm flex items-center gap-2">
              <Plus size={14} />
              Novo Alerta
            </button>
          </div>
        </div>

        {/* Create form */}
        {showForm && (
          <div className="card mb-6 border-primary/20">
            <h3 className="text-sm font-semibold text-text-primary mb-4">Criar Alerta</h3>
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4 mb-4">
              <div>
                <label className="label">Ticker</label>
                <input className="input font-mono uppercase" placeholder="NEE" value={form.ticker} onChange={(e) => setForm({ ...form, ticker: e.target.value })} />
              </div>
              <div>
                <label className="label">Tipo de Alerta</label>
                <select className="input" value={form.alert_type} onChange={(e) => setForm({ ...form, alert_type: e.target.value, threshold: String(TYPE_DEFAULTS[e.target.value] ?? 30) })}>
                  {ALERT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              {form.alert_type !== "entry_signal" && (
              <div>
                <label className="label">Valor Limite</label>
                <input className="input font-mono" type="number" step="0.1" value={form.threshold} onChange={(e) => setForm({ ...form, threshold: e.target.value })} />
              </div>
              )}
              <div>
                <label className="label">Mensagem (opcional)</label>
                <input className="input" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Descrição..." />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={handleCreate} disabled={loading} className="btn-primary text-sm">Criar Alerta</button>
              <button onClick={() => setShowForm(false)} className="btn-ghost text-sm">Cancelar</button>
            </div>
          </div>
        )}

        {/* Triggered alerts */}
        {checkResult && checkResult.triggered && checkResult.triggered.length > 0 && (
          <div className="bg-warning/10 border border-warning/20 rounded-xl p-4 mb-5">
            <h3 className="text-sm font-semibold text-warning mb-2 flex items-center gap-2">
              <Bell size={14} />
              {checkResult.triggered.length} Alerta(s) Disparado(s)
            </h3>
            {checkResult.triggered.map((t, i) => (
              <div key={i} className="text-xs text-text-secondary py-1 border-b border-border/40 last:border-0 flex items-center gap-2">
                <TickerLogo ticker={t.ticker} size={18} />
                <span className="font-mono font-semibold text-warning">{t.ticker}</span>
                {" · "}{typeLabel(t.type)}
                {" · "}{t.message}
                {" · Valor: "}<span className="font-mono">{t.value?.toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}

        {/* Alerts list */}
        {alerts.length > 0 ? (
          <div className="card">
            <div className="space-y-2">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                    alert.is_triggered
                      ? "bg-warning/5 border-warning/20"
                      : "bg-surface-2 border-border/50 hover:border-border"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {alert.is_triggered ? (
                      <CheckCircle size={14} className="text-warning flex-shrink-0" />
                    ) : (
                      <Clock size={14} className="text-text-muted flex-shrink-0" />
                    )}
                    <TickerLogo ticker={alert.ticker} size={28} />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-text-primary text-sm">{alert.ticker}</span>
                        <span className="text-xs text-text-muted">{typeLabel(alert.alert_type)}</span>
                        <span className="badge bg-surface-3 border-border text-text-secondary text-xs">
                          {alert.threshold}
                        </span>
                        {alert.is_triggered && (
                          <span className="badge bg-warning/10 border-warning/20 text-warning text-xs">DISPARADO</span>
                        )}
                      </div>
                      {alert.message && <p className="text-xs text-text-muted mt-0.5">{alert.message}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {alert.current_value != null && (
                      <span className="text-xs font-mono text-text-secondary">Atual: {alert.current_value.toFixed(2)}</span>
                    )}
                    <button onClick={() => handleDelete(alert.id)} className="text-text-muted hover:text-danger transition-colors p-1">
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
            <p className="text-xs text-text-muted mt-1">Crie alertas para RSI, Estocástico ou Scores de Oportunidade</p>
          </div>
        )}

        {/* Alert type reference */}
        <div className="card mt-5">
          <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Referência de Tipos</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {ALERT_TYPES.map((t) => (
              <div key={t.value} className={`bg-surface-2 rounded-lg p-2.5 ${t.value === "entry_signal" || t.value === "rsi_weekly_oversold" ? "border border-primary/20" : ""}`}>
                <p className="text-xs font-medium text-text-primary flex items-center gap-1.5">
                  {(t.value === "entry_signal" || t.value === "rsi_weekly_oversold") && (
                    <span className="badge bg-primary/10 border-primary/20 text-primary text-[10px]">NOVO</span>
                  )}
                  {t.label}
                </p>
                <p className="text-xs text-text-muted">{t.description}{!t.noThreshold ? ` · padrão: ${TYPE_DEFAULTS[t.value]}` : ""}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
