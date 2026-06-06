"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { useSignalStore } from "@/store/signalStore";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Briefcase, Search, FlaskConical,
  TrendingUp, Bell, LogOut, ChevronRight, Bookmark, History, BarChart3, X,
} from "lucide-react";

const navItems = [
  // Principais
  { href: "/dashboard",      label: "Dashboard",  icon: LayoutDashboard, badge: null, section: "PRINCIPAIS" },
  { href: "/assets",         label: "Screening",  icon: Search,          badge: null, section: "PRINCIPAIS" },
  { href: "/portfolio",      label: "Carteira",   icon: Briefcase,       badge: null, section: "PRINCIPAIS" },
  // Análise
  { href: "/backtest",       label: "Backtest",   icon: FlaskConical,    badge: null, section: "ANÁLISE" },
  { href: "/simulator",      label: "Simulador",  icon: TrendingUp,      badge: null, section: "ANÁLISE" },
  { href: "/watchlist",      label: "Watchlist",  icon: Bookmark,        badge: "opportunities", section: "ANÁLISE" },
  // Informações
  { href: "/alerts",         label: "Alertas",    icon: Bell,            badge: null, section: "INFORMAÇÕES" },
  { href: "/history",        label: "Histórico",  icon: History,         badge: null, section: "INFORMAÇÕES" },
  { href: "/sharpe-compare", label: "Sharpe",     icon: BarChart3,       badge: null, section: "INFORMAÇÕES" },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const { opportunityCount } = useSignalStore();

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 h-screen w-60 bg-surface border-r border-border flex flex-col z-40",
        "transition-transform duration-200 ease-in-out",
        "lg:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
      )}
    >
      {/* Logo */}
      <div className="px-6 py-6 border-b border-border/40 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-primary flex items-center justify-center flex-shrink-0 shadow-glow">
            <span className="text-white font-bold text-base">L</span>
          </div>
          <div>
            <p className="text-sm font-bold text-text-primary leading-none">LBH SYSTEM</p>
            <p className="text-xs text-text-muted/70 mt-0.5">Quantitativo</p>
          </div>
        </div>
        {/* Close button — mobile only */}
        <button
          onClick={onClose}
          className="lg:hidden p-1.5 rounded-lg hover:bg-surface-2 text-text-muted hover:text-text-primary transition-colors"
          aria-label="Fechar menu"
        >
          <X size={16} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-4 py-5 space-y-6 overflow-y-auto">
        {["PRINCIPAIS", "ANÁLISE", "INFORMAÇÕES"].map((section) => (
          <div key={section}>
            <h3 className="text-xs font-bold text-text-muted/60 px-2 mb-2.5 tracking-widest">{section}</h3>
            <div className="space-y-1">
              {navItems
                .filter((item) => item.section === section)
                .map(({ href, label, icon: Icon, badge }) => {
                  const active = pathname.startsWith(href);
                  const showBadge = badge === "opportunities" && opportunityCount > 0;
                  return (
                    <Link
                      key={href}
                      href={href}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group",
                        active
                          ? "bg-primary/15 text-primary border border-primary/30 shadow-glow"
                          : "text-text-secondary hover:text-text-primary hover:bg-surface-2/50"
                      )}
                    >
                      <Icon size={18} className={cn(active ? "text-primary" : "text-text-muted group-hover:text-text-secondary")} />
                      <span className="flex-1">{label}</span>
                      {showBadge && (
                        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-success text-white text-[9px] font-bold leading-none">
                          {opportunityCount > 9 ? "9+" : opportunityCount}
                        </span>
                      )}
                      {active && !showBadge && <ChevronRight size={14} className="text-primary opacity-50" />}
                    </Link>
                  );
                })}
            </div>
          </div>
        ))}
      </nav>

      {/* User */}
      <div className="px-4 pb-5 border-t border-border/40 pt-4 space-y-2">
        <div className="flex items-center gap-3 px-3 py-3 rounded-lg bg-surface-2/40 border border-border/30">
          <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center flex-shrink-0 shadow-glow-success">
            <span className="text-white text-xs font-bold">
              {user?.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "D"}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-text-primary truncate">{user?.full_name || "Demo User"}</p>
            <p className="text-xs text-text-muted/70 truncate">{user?.email || "demo@example.com"}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-text-muted hover:text-danger hover:bg-danger/10 transition-all w-full duration-200"
        >
          <LogOut size={14} />
          Sair
          <span>Sair</span>
        </button>
      </div>
    </aside>
  );
}
