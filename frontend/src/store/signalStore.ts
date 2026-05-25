import { create } from "zustand";

export interface WatchlistSignal {
  ticker: string;
  company_name?: string;
  sector?: string;
  current_price?: number;
  composite_score?: number;
  entry_signal?: string;
  entry_signal_color?: string;
  entry_leverage?: number;
  entry_rationale?: string;
  rsi_weekly?: number;
  rsi?: number;
  is_tokenized?: boolean;
  underlying_ticker?: string;
}

interface SignalStore {
  signals: WatchlistSignal[];
  opportunities: WatchlistSignal[];
  awaiting: WatchlistSignal[];
  avoid: WatchlistSignal[];
  opportunityCount: number;
  checkedAt: string | null;
  loading: boolean;
  setSignals: (data: {
    signals: WatchlistSignal[];
    opportunities: WatchlistSignal[];
    awaiting: WatchlistSignal[];
    avoid: WatchlistSignal[];
    opportunity_count: number;
    checked_at: string;
  }) => void;
  setLoading: (v: boolean) => void;
}

export const useSignalStore = create<SignalStore>((set) => ({
  signals: [],
  opportunities: [],
  awaiting: [],
  avoid: [],
  opportunityCount: 0,
  checkedAt: null,
  loading: false,
  setSignals: (data) =>
    set({
      signals: data.signals,
      opportunities: data.opportunities,
      awaiting: data.awaiting,
      avoid: data.avoid,
      opportunityCount: data.opportunity_count,
      checkedAt: data.checked_at,
    }),
  setLoading: (v) => set({ loading: v }),
}));
