"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/layout/AppShell";
import { Bell, Check, Trash2, AlertCircle, Loader2, Zap, TrendingUp, BarChart3, Newspaper, Settings } from "lucide-react";

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  url?: string;
  read: boolean;
  created_at: string;
}

const typeIcon: Record<string, React.ReactNode> = {
  price_alert:  <Zap size={16} className="text-warning" />,
  signal:       <TrendingUp size={16} className="text-success" />,
  portfolio:    <BarChart3 size={16} className="text-primary" />,
  news:         <Newspaper size={16} className="text-text-secondary" />,
  weekly_recap: <BarChart3 size={16} className="text-primary" />,
  system:       <Settings size={16} className="text-text-muted" />,
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "agora";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return d < 30 ? `${d}d` : new Date(iso).toLocaleDateString("pt-BR");
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [deleting, setDeleting] = useState<string | null>(null);

  async function fetchNotifications() {
    try {
      setLoading(true);
      const params = new URLSearchParams({ limit: "100" });
      if (filter === "unread") params.append("unread_only", "true");
      const res = await fetch(`/api/v1/notifications?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error();
      setNotifications(await res.json());
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }

  async function markRead(id: string) {
    await fetch("/api/v1/notifications/mark-read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ ids: [id] }),
    });
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }

  async function deleteNotification(id: string) {
    setDeleting(id);
    await fetch(`/api/v1/notifications/${id}`, { method: "DELETE", credentials: "include" });
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    setDeleting(null);
  }

  async function markAllRead() {
    await fetch("/api/v1/notifications/mark-read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ ids: null }),
    });
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  useEffect(() => { fetchNotifications(); }, [filter]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center">
              <Bell size={20} className="text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-text-primary">Notificações</h1>
              <p className="text-sm text-text-muted mt-0.5">
                {unreadCount > 0 ? `${unreadCount} não lida${unreadCount > 1 ? "s" : ""}` : "Tudo lido"}
              </p>
            </div>
          </div>
          {unreadCount > 0 && (
            <button onClick={markAllRead}
              className="text-xs px-3 py-1.5 font-medium bg-primary/10 text-primary hover:bg-primary/20 rounded-lg transition-colors">
              Marcar todas como lidas
            </button>
          )}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-5">
          {(["all", "unread"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                filter === f ? "bg-primary text-white" : "bg-surface-2 text-text-secondary hover:text-text-primary"
              }`}>
              {f === "all" ? `Todas (${notifications.length})` : `Não lidas (${unreadCount})`}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={28} className="text-primary animate-spin" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="card text-center py-16">
            <Bell size={40} className="mx-auto text-text-muted/30 mb-4" />
            <p className="text-text-secondary text-sm">
              {filter === "unread" ? "Nenhuma notificação não lida" : "Nenhuma notificação"}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((n) => (
              <div key={n.id}
                className={`flex gap-4 p-4 rounded-xl border transition-all ${
                  n.read ? "border-border/30 bg-surface/40" : "border-primary/30 bg-primary/5"
                }`}>
                <div className="w-9 h-9 rounded-lg bg-surface-2 border border-border flex items-center justify-center flex-shrink-0">
                  {typeIcon[n.type] || <Bell size={15} className="text-text-muted" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3 mb-0.5">
                    <h3 className={`text-sm font-semibold ${n.read ? "text-text-secondary" : "text-text-primary"}`}>
                      {n.title}
                    </h3>
                    <span className="text-xs text-text-muted flex-shrink-0">{timeAgo(n.created_at)}</span>
                  </div>
                  <p className="text-xs text-text-muted mb-1">{n.body}</p>
                  {n.url && (
                    <a href={n.url} className="text-xs text-primary hover:underline">Ver detalhes →</a>
                  )}
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  {!n.read && (
                    <button onClick={() => markRead(n.id)}
                      className="p-1.5 rounded-lg hover:bg-success/10 text-text-muted hover:text-success transition-colors"
                      title="Marcar como lida">
                      <Check size={14} />
                    </button>
                  )}
                  <button onClick={() => deleteNotification(n.id)} disabled={deleting === n.id}
                    className="p-1.5 rounded-lg hover:bg-danger/10 text-text-muted hover:text-danger transition-colors disabled:opacity-50"
                    title="Remover">
                    {deleting === n.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
