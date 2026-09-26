"use client";
import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import Sidebar from "./Sidebar";
import MobileBottomNav from "./MobileBottomNav";
import NotificationBell from "./NotificationBell";
import Footer from "./Footer";
import BetaBanner from "@/components/BetaBanner";
import { Menu } from "lucide-react";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, token, fetchMe } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    // Auth real agora usa cookie httpOnly (não localStorage).
    // Limpa tokens legados e checa identidade via /me.
    try {
      localStorage.removeItem("access_token");
      localStorage.removeItem("user");
      localStorage.removeItem("auth-store");
    } catch { /* ignore */ }

    // Kill switch de SW antigo (mesma logica da landing).
    (async () => {
      try {
        if ("serviceWorker" in navigator) {
          const regs = await navigator.serviceWorker.getRegistrations();
          await Promise.all(regs.map((r) => r.unregister()));
        }
        if ("caches" in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map((k) => caches.delete(k)));
        }
      } catch { /* ignore */ }
    })();

    let alive = true;
    let settled = false;

    // Promise.race garante saida do limbo mesmo se fetch nao rejeitar.
    const timeoutPromise = new Promise<null>((resolve) =>
      setTimeout(() => resolve(null), 3500)
    );
    const fetchPromise = fetch("/api/v1/auth/me", {
      credentials: "same-origin",
      cache: "no-store",
    }).catch(() => null);

    Promise.race([fetchPromise, timeoutPromise]).then((res) => {
      if (!alive || settled) return;
      settled = true;
      // SÓ o 401 significa "não logado". Timeout/erro de rede/503 (banco piscando)
      // NÃO podem expulsar usuário logado pro /login — antes qualquer soluço de
      // infra parecia logout (achado da auditoria 24/09). Nesses casos mantém a
      // shell e as páginas mostram seus próprios erros.
      if (res && res.status === 401) {
        router.replace("/login");
        return;
      }
      if (!res || !res.ok) return; // transitório: mantém a sessão visual
      if (!user) fetchMe();
    });

    return () => {
      alive = false;
    };
  }, []);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Content area */}
      <div className="flex-1 flex flex-col lg:ml-60 min-h-screen">
        {/* Mobile top bar */}
        <header className="lg:hidden sticky top-0 z-20 flex items-center justify-between px-4 py-3 bg-surface border-b border-border">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-1.5 rounded-lg hover:bg-surface-2 text-text-secondary transition-colors"
              aria-label="Abrir menu"
            >
              <Menu size={20} />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-primary/15 border border-primary/30 flex items-center justify-center flex-shrink-0">
                <span className="text-primary font-bold text-xs">L</span>
              </div>
              <span className="text-sm font-semibold text-text-primary">LBH System</span>
            </div>
          </div>
          <NotificationBell />
        </header>

        <BetaBanner />
        {/* pb-16 ensures content isn't hidden behind mobile bottom nav */}
        <main className="flex-1 pb-16 lg:pb-0">
          {children}
        </main>
        <Footer />
      </div>

      {/* Mobile bottom navigation bar */}
      <MobileBottomNav />
    </div>
  );
}
