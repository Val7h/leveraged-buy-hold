"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { useSignalStore } from "@/store/signalStore";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Briefcase, Search, FlaskConical,
  TrendingUp, Bell, LogOut, ChevronRight, Bookmark, History, BarChart3,
} from "lucide-react";

const navItems = [
  { href: "/dashboard",  label: "Dashboard",  icon: LayoutDashboard, badge: null },
  { href: "/watchlist",  label: "Watchlist",  icon: Bookmark,        badge: "opportunities" },
  { href: "/portfolio",  label: "Carteira",   icon: Briefcase,       badge: null },
  { href: "/history",    label: "Histórico",  icon: History,         badge: null },
  { href: "/assets",     label: "Screening",  icon: Search,          badge: null },
  { href: "/backtest",       label: "Backtest",   icon: FlaskConical, badge: null },
  { href: "/sharpe-compare", label: "Sharpe",     icon: BarChart3,    badge: null },
  { href: "/simulator",      label: "Simulador",  icon: TrendingUp,   badge: null },
  { href: "/alerts",         label: "Alertas",    icon: Bell,         badge: null },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const { opportunityCount } = useSignalStore();

  return (
    <aside className="fixed left-0 top-0 h-screen w-60 bg-surface border-r border-border flex flex-col z-40">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center flex-shrink-0">
            <span className="text-primary font-bold text-sm">L</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-text-primary leading-none">LBH System</p>
            <p className="text-xs text-text-muted mt-0.5">Quantfury Pro</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon, badge }) => {
          const active = pathname.startsWith(href);
          const showBadge = badge === "opportunities" && opportunityCount > 0;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group",
                active
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "text-text-secondary hover:text-text-primary hover:bg-surface-2"
              )}
            >
              <Icon size={16} className={cn(active ? "text-primary" : "text-text-muted group-hover:text-text-secondary")} />
              <span>{label}</span>
              {showBadge && (
                <span className="ml-auto flex items-center justify-center w-5 h-5 rounded-full bg-success text-white text-[10px] font-bold leading-none">
                  {opportunityCount > 9 ? "9+" : opportunityCount}
                </span>
              )}
              {active && !showBadge && <ChevronRight size={12} className="ml-auto text-primary opacity-60" />}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="px-3 pb-4 border-t border-border pt-3 space-y-0.5">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
            <span className="text-primary text-xs font-semibold">
              {user?.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "U"}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-text-primary truncate">{user?.full_name || "Usuário"}</p>
            <p className="text-xs text-text-muted truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-text-muted hover:text-danger hover:bg-danger/5 transition-colors w-full"
        >
          <LogOut size={14} />
          <span>Sair</span>
        </button>
      </div>
    </aside>
  );
}
