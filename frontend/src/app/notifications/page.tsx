"use client";

import { useEffect, useState } from "react";
import { Bell, Check, Trash2, AlertCircle, Loader2, Zap, TrendingUp, BarChart3, Newspaper, Settings } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";

interface Notification {
  id: number;
  type: string;
  title: string;
  body: string;
  url?: string;
  read: boolean;
  created_at: string;
}

const typeIcon: Record<string, React.ReactNode> = {
  price_alert: <Zap size={16} className="text-warning" />,
  signal: <TrendingUp size={16} className="text-success" />,
  portfolio: <BarChart3 size={16} className="text-primary" />,
  news: <Newspaper size={16} className="text-text-secondary" />,
  weekly_recap: <BarChart3 size={16} className="text-primary" />,
  system: <Settings size={16} className="text-text-muted" />,
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
  const [deleting, setDeleting] = useState<number | null>(null);

  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") || "" : "";

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  async function fetchNotifications() {
    try {
      setLoading(true);
      const url = new URL(`${API_URL}/api/v1/notifications`);
      url.searchParams.append("limit", "100");
      if (filter === "unread") {
        url.searchParams.append("unread_only", "true");
      }
      const res = await fetch(url.toString(), { headers });
      if (!res.ok) throw new Error("Falha ao carregar notificações");
      const data = await res.json();
      setNotifications(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function markRead(id: number) {
    try {
      await fetch(`${API_URL}/api/v1/notifications/mark-read`, {
        method: "POST",
        headers,
        body: JSON.stringify({ ids: [id] }),
      });
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    } catch (err) {
      console.error(err);
    }
  }

  async function deleteNotification(id: number) {
    try {
      setDeleting(id);
      await fetch(`${API_URL}/api/v1/notifications/${id}`, {
        method: "DELETE",
        headers,
      });
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      console.error(err);
    } finally {
      setDeleting(null);
    }
  }

  async function markAllRead() {
    try {
      await fetch(`${API_URL}/api/v1/notifications/mark-read`, {
        method: "POST",
        headers,
        body: JSON.stringify({ ids: null }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    fetchNotifications();
  }, [filter]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-surface/40 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center">
                <Bell size={20} className="text-primary" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-text-primary">Notificações</h1>
                <p className="text-sm text-text-muted mt-1">
                  {unreadCount > 0 ? `${unreadCount} não lidas` : "Tudo lido"}
                </p>
              </div>
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="px-4 py-2 text-sm font-medium bg-primary/10 text-primary hover:bg-primary/20 rounded-lg transition-colors"
              >
                Marcar todas como lidas
              </button>
            )}
          </div>

          {/* Filter tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setFilter("all")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filter === "all"
                  ? "bg-primary text-white"
                  : "bg-surface-2 text-text-secondary hover:bg-surface-3 hover:text-text-primary"
              }`}
            >
              Todas ({notifications.length})
            </button>
            <button
              onClick={() => setFilter("unread")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filter === "unread"
                  ? "bg-primary text-white"
                  : "bg-surface-2 text-text-secondary hover:bg-surface-3 hover:text-text-primary"
              }`}
            >
              Não lidas ({unreadCount})
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={32} className="text-primary animate-spin" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-12">
            <Bell size={48} className="mx-auto text-text-muted/30 mb-4" />
            <p className="text-text-secondary">
              {filter === "unread" ? "Nenhuma notificação não lida" : "Nenhuma notificação"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((n) => (
              <div
                key={n.id}
                className={`flex gap-4 p-4 rounded-lg border transition-all ${
                  n.read
                    ? "border-border/30 bg-surface/40 hover:bg-surface/60"
                    : "border-primary/30 bg-primary/5 hover:bg-primary/10"
                }`}
              >
                {/* Icon */}
                <div className="w-10 h-10 rounded-lg bg-surface-2 border border-border flex items-center justify-center flex-shrink-0">
                  {typeIcon[n.type] || <Bell size={16} className="text-text-muted" />}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <h3
                      className={`text-sm font-semibold ${
                        n.read ? "text-text-secondary" : "text-text-primary"
                      }`}
                    >
                      {n.title}
                    </h3>
                    <span className="text-xs text-text-muted flex-shrink-0 whitespace-nowrap">
                      {timeAgo(n.created_at)}
                    </span>
                  </div>
                  <p className="text-sm text-text-muted mb-2">{n.body}</p>
                  {n.url && (
                    <a
                      href={n.url}
                      className="text-xs text-primary hover:underline"
                    >
                      Ver detalhes →
                    </a>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 flex-shrink-0">
                  {!n.read && (
                    <button
                      onClick={() => markRead(n.id)}
                      className="p-2 rounded-lg hover:bg-success/10 text-text-muted hover:text-success transition-colors"
                      title="Marcar como lida"
                    >
                      <Check size={16} />
                    </button>
                  )}
                  <button
                    onClick={() => deleteNotification(n.id)}
                    disabled={deleting === n.id}
                    className="p-2 rounded-lg hover:bg-danger/10 text-text-muted hover:text-danger transition-colors disabled:opacity-50"
                    title="Remover"
                  >
                    {deleting === n.id ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Trash2 size={16} />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
