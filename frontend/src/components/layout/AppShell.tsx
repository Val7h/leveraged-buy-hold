"use client";
import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import Sidebar from "./Sidebar";
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
    localStorage.removeItem("access_token");

    let cancelled = false;
    fetch("/api/v1/auth/me", { credentials: "include" })
      .then((r) => {
        if (cancelled) return;
        if (!r.ok) {
          router.replace("/login");
          return;
        }
        // Atualiza o store local com os dados do user autenticado.
        if (!user) fetchMe();
      })
      .catch(() => {
        if (!cancelled) router.replace("/login");
      });

    return () => {
      cancelled = true;
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
      <div className="flex-1 flex flex-col lg:ml-60 min-h-screen overflow-x-hidden">
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
        <main className="flex-1">
          {children}
        </main>
        <Footer />
      </div>
    </div>
  );
}
