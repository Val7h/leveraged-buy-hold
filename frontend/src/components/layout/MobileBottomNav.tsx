"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Briefcase, Bell, Trophy, Bookmark } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavStore } from "@/store/navStore";

const BOTTOM_NAV = [
  { href: "/portfolio", label: "Carteira",  icon: Briefcase, badge: "portfolio_critical" },
  { href: "/alerts",    label: "Alertas",   icon: Bell,      badge: "alerts" },
  { href: "/ranking",   label: "Ranking",   icon: Trophy,    badge: null },
  { href: "/watchlist", label: "Watchlist", icon: Bookmark,  badge: "watchlist" },
];

export default function MobileBottomNav() {
  const pathname = usePathname();
  const { alertTriggeredCount, portfolioCritical, watchlistZonaAtivaCount } = useNavStore();

  function getBadge(badge: string | null) {
    if (badge === "alerts" && alertTriggeredCount > 0) {
      return (
        <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[14px] h-[14px] px-0.5 rounded-full bg-danger text-white text-[8px] font-bold leading-none">
          {alertTriggeredCount > 9 ? "9+" : alertTriggeredCount}
        </span>
      );
    }
    if (badge === "portfolio_critical" && portfolioCritical) {
      return (
        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-danger shadow-[0_0_4px_1px_rgba(239,68,68,0.6)]" />
      );
    }
    if (badge === "watchlist" && watchlistZonaAtivaCount > 0) {
      return (
        <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[14px] h-[14px] px-0.5 rounded-full bg-success text-white text-[8px] font-bold leading-none">
          {watchlistZonaAtivaCount > 9 ? "9+" : watchlistZonaAtivaCount}
        </span>
      );
    }
    return null;
  }

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface border-t border-border flex items-stretch h-16 safe-area-bottom">
      {BOTTOM_NAV.map(({ href, label, icon: Icon, badge }) => {
        const active = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-1 relative transition-colors",
              active ? "text-primary" : "text-text-muted"
            )}
          >
            <div className="relative">
              <Icon size={20} className={active ? "text-primary" : "text-text-muted"} />
              {getBadge(badge)}
            </div>
            <span className={cn("text-[10px] font-medium leading-none", active ? "text-primary" : "text-text-muted")}>
              {label}
            </span>
            {active && (
              <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-primary" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
