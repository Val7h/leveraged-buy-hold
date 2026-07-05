/**
 * navStore — lightweight Zustand store for sidebar status badges.
 * Pages write into it after loading data; Sidebar reads it.
 * Zero network calls from the sidebar itself.
 */
import { create } from "zustand";

interface NavState {
  /** Number of triggered alerts (active + triggered). Red badge on Alertas. */
  alertTriggeredCount: number;
  /** True if any portfolio position has critical liquidation risk (<15% slack). */
  portfolioCritical: boolean;
  /** Number of watchlist items in ZONA ATIVA (RSI ≤ 40 or green signal). */
  watchlistZonaAtivaCount: number;

  setAlertTriggeredCount: (n: number) => void;
  setPortfolioCritical: (v: boolean) => void;
  setWatchlistZonaAtivaCount: (n: number) => void;
}

export const useNavStore = create<NavState>((set) => ({
  alertTriggeredCount: 0,
  portfolioCritical: false,
  watchlistZonaAtivaCount: 0,

  setAlertTriggeredCount: (n) => set({ alertTriggeredCount: n }),
  setPortfolioCritical: (v) => set({ portfolioCritical: v }),
  setWatchlistZonaAtivaCount: (n) => set({ watchlistZonaAtivaCount: n }),
}));
