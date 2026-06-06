"use client";

import { useEffect, useState, useRef } from "react";
import { Bell, Check, CheckCheck, Trash2, ExternalLink, Zap, TrendingUp, BarChart3, Newspaper, Settings } from "lucide-react";
import { useRouter } from "next/navigation";
import { registerServiceWorker, requestPushPermission, subscribePush } from "@/lib/push";

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
  price_alert: <Zap size={13} className="text-warning" />,
  signal: <TrendingUp size={13} className="text-success" />,
  portfolio: <BarChart3 size={13} className="text-primary" />,
  news: <Newspaper size={13} className="text-text-secondary" />,
  weekly_recap: <BarChart3 size={13} className="text-primary" />,
  system: <Settings size={13} className="text-text-muted" />,
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "agora";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export default function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [pushEnabled, setPushEnabled] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const token = () => typeof window !== "undefined" ? localStorage.getItem("access_token") || "" : "";

  const headers = () => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${token()}`,
  });

  async function fetchCount() {
    try {
      const r = await fetch(`${API_URL}/api/v1/notifications/unread-count`, { headers: headers() });
      if (r.ok) setUnread((await r.json()).count);
    } catch {}
  }

  async function fetchNotifications() {
    try {
      const r = await fetch(`${API_URL}/api/v1/notifications?limit=20`, { headers: headers() });
      if (r.ok) setNotifications(await r.json());
    } catch {}
  }

  async function markAllRead() {
    await fetch(`${API_URL}/api/v1/notifications/mark-read`, {
      method: "POST", headers: headers(),
      body: JSON.stringify({ ids: null }),
    });
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnread(0);
  }

  async function markRead(id: number) {
    await fetch(`${API_URL}/api/v1/notifications/mark-read`, {
      method: "POST", headers: headers(),
      body: JSON.stringify({ ids: [id] }),
    });
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
    setUnread((c) => Math.max(0, c - 1));
  }

  async function deleteNotification(id: number) {
    await fetch(`${API_URL}/api/v1/notifications/${id}`, { method: "DELETE", headers: headers() });
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }

  async function enablePush() {
    const reg = await registerServiceWorker();
    if (!reg) return;
    const granted = await requestPushPermission();
    if (granted) {
      await subscribePush(reg);
      setPushEnabled(true);
    }
  }

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Poll unread count every 60s
  useEffect(() => {
    fetchCount();
    const id = setInterval(fetchCount, 60000);
    return () => clearInterval(id);
  }, []);

  // Check push status
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistration("/sw.js").then(async (reg) => {
        if (reg) {
          const sub = await reg.pushManager.getSubscription();
          setPushEnabled(!!sub);
        }
      });
    }
  }, []);

  function handleOpen() {
    setOpen((v) => !v);
    if (!open) fetchNotifications();
  }

  return (
    <div ref={ref} className="relative">
      {/* Bell button */}
      <button
        onClick={handleOpen}
        className="relative p-2 rounded-lg hover:bg-surface-2 text-text-muted hover:text-text-primary transition-colors"
        aria-label="Notificações"
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 rounded-full bg-danger text-white text-[9px] font-bold flex items-center justify-center px-0.5">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-10 w-80 sm:w-96 bg-surface border border-border rounded-xl shadow-2xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h3 className="text-sm font-semibold text-text-primary">Notificações</h3>
            <div className="flex items-center gap-1">
              {!pushEnabled && (
                <button
                  onClick={enablePush}
                  className="text-[11px] text-primary hover:underline px-2 py-1 rounded hover:bg-primary/5 transition-colors"
                  title="Ativar notificações push"
                >
                  Ativar push
                </button>
              )}
              {unread > 0 && (
                <button
                  onClick={markAllRead}
                  className="p-1.5 rounded-lg hover:bg-surface-2 text-text-muted hover:text-success transition-colors"
                  title="Marcar todas como lidas"
                >
                  <CheckCheck size={14} />
                </button>
              )}
              <button
                onClick={() => { setOpen(false); router.push("/notifications"); }}
                className="text-[11px] text-text-muted hover:text-text-secondary px-2 py-1 rounded hover:bg-surface-2 transition-colors"
              >
                Ver todas
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-10 text-center text-text-muted text-sm">
                <Bell size={24} className="mx-auto mb-2 opacity-30" />
                Nenhuma notificação
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`group flex items-start gap-3 px-4 py-3 hover:bg-surface-2 transition-colors cursor-pointer border-b border-border/50 ${!n.read ? "bg-primary/3" : ""}`}
                  onClick={() => { markRead(n.id); if (n.url) router.push(n.url); }}
                >
                  {/* Type icon */}
                  <div className="w-7 h-7 rounded-lg bg-surface-2 border border-border flex items-center justify-center flex-shrink-0 mt-0.5">
                    {typeIcon[n.type] || <Bell size={13} className="text-text-muted" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-xs font-medium leading-snug ${!n.read ? "text-text-primary" : "text-text-secondary"}`}>
                        {n.title}
                      </p>
                      <span className="text-[10px] text-text-muted flex-shrink-0">{timeAgo(n.created_at)}</span>
                    </div>
                    <p className="text-[11px] text-text-muted mt-0.5 leading-snug line-clamp-2">{n.body}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex-shrink-0 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!n.read && (
                      <button
                        onClick={(e) => { e.stopPropagation(); markRead(n.id); }}
                        className="p-1 rounded hover:bg-success/10 text-text-muted hover:text-success"
                        title="Marcar como lida"
                      >
                        <Check size={11} />
                      </button>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteNotification(n.id); }}
                      className="p-1 rounded hover:bg-danger/10 text-text-muted hover:text-danger"
                      title="Remover"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>

                  {!n.read && (
                    <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                  )}
                </div>
              ))
            )}
          </div>

          {/* Push CTA */}
          {!pushEnabled && (
            <div className="px-4 py-3 bg-primary/5 border-t border-primary/10">
              <p className="text-[11px] text-text-muted mb-2">
                Receba alertas de preço e sinais direto no navegador.
              </p>
              <button
                onClick={enablePush}
                className="w-full py-2 text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/20 rounded-lg transition-colors"
              >
                Ativar notificações push →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
