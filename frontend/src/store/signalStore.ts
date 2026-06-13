import { create } from "zustand";

export interface WatchlistSignal {
  id?: string;
  ticker: string;
  company_name?: string | null;
  name?: string | null;
  sector?: string;
  current_price?: number | null;
  change_pct?: number | null;
  composite_score?: number;
  signal?: "buy" | "sell" | "hold" | "unknown";
  entry_signal?: string;
  entry_signal_color?: string;
  entry_leverage?: number | null;
  entry_rationale?: string | null;
  rsi_weekly?: number | null;
  rsi?: number | null;
  is_tokenized?: boolean;
  underlying_ticker?: string | null;
}

interface MarketStateLight {
  state: string;
  multiplier: number;
  color?: string | null;
}

interface SignalStore {
  signals: WatchlistSignal[];
  opportunities: WatchlistSignal[];
  awaiting: WatchlistSignal[];
  avoid: WatchlistSignal[];
  opportunityCount: number;
  checkedAt: string | null;
  loading: boolean;
  market_state: MarketStateLight | null;
  // Accepts raw BFF response: { signals: [...], market_state: {...} }
  setSignals: (data: { signals: any[]; market_state?: MarketStateLight | null }) => void;
  setLoading: (v: boolean) => void;
}

function signalToEntry(signal: string): string {
  switch (signal) {
    case "buy":  return "OPORTUNIDADE";
    case "sell": return "DESFAVORÁVEL";
    default:     return "NEUTRO";
  }
}

function mapRaw(raw: any): WatchlistSignal {
  const changePct: number | null = raw.change_pct ?? null;
  return {
    id: String(raw.id ?? raw.ticker),
    ticker: raw.ticker,
    name: raw.name ?? null,
    company_name: raw.name ?? raw.company_name ?? null,
    current_price: raw.price ?? raw.current_price ?? null,
    change_pct: changePct,
    signal: raw.signal ?? "unknown",
    entry_signal: raw.entry_signal ?? signalToEntry(raw.signal ?? "unknown"),
    entry_leverage: raw.entry_leverage ?? null,
    entry_rationale:
      raw.entry_rationale ??
      (changePct != null
        ? `Variação hoje: ${changePct > 0 ? "+" : ""}${changePct.toFixed(2)}%`
        : null),
    is_tokenized: raw.is_tokenized ?? false,
    underlying_ticker: raw.underlying_ticker ?? null,
    rsi_weekly: raw.rsi_weekly ?? raw.rsi ?? null,
    rsi: raw.rsi ?? raw.rsi_weekly ?? null,
  };
}

export const useSignalStore = create<SignalStore>((set) => ({
  signals: [],
  opportunities: [],
  awaiting: [],
  avoid: [],
  opportunityCount: 0,
  checkedAt: null,
  loading: false,
  market_state: null,

  setSignals: (data) => {
    const items = (data?.signals ?? []).map(mapRaw);
    const opportunities = items.filter((s) => s.signal === "buy");
    const avoid         = items.filter((s) => s.signal === "sell");
    const awaiting      = items.filter((s) => s.signal === "hold" || s.signal === "unknown");
    set({
      signals: items,
      opportunities,
      avoid,
      awaiting,
      opportunityCount: opportunities.length,
      checkedAt: new Date().toISOString(),
      market_state: data?.market_state ?? null,
    });
  },

  setLoading: (v) => set({ loading: v }),
}));
