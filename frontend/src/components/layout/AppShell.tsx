"use client";
import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import Sidebar from "./Sidebar";
import NotificationBell from "./NotificationBell";
import BetaBanner from "@/components/BetaBanner";
import { Menu } from "lucide-react";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, token, fetchMe } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("access_token");
    const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

    if (!stored) {
      if (demoMode) {
        // Demo mode: create a fake token to bypass auth
        const fakeToken = "demo_token_" + Date.now();
        localStorage.setItem("access_token", fakeToken);
        // Set a demo user in auth store
        if (!user) {
          // Don't fetch from API, just continue with UI
        }
      } else {
        // Production: require login
        router.replace("/login");
        return;
      }
    }

    if (!user && !demoMode) {
      fetchMe();
    }
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
      </div>
    </div>
  );
}
