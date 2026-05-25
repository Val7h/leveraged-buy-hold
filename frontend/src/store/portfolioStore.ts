import { create } from "zustand";
import type { Portfolio, PortfolioMetrics, Position } from "@/types";
import { portfolioApi } from "@/lib/api";

interface PortfolioState {
  portfolios: Portfolio[];
  activePortfolioId: number | null;
  metrics: PortfolioMetrics | null;
  positions: Position[];
  isLoading: boolean;
  error: string | null;
  fetchPortfolios: () => Promise<void>;
  setActivePortfolio: (id: number) => void;
  fetchMetrics: (id: number) => Promise<void>;
  fetchPositions: (id: number) => Promise<void>;
  addPosition: (portfolioId: number, data: { ticker: string; shares: number; avg_price: number; leverage: number }) => Promise<void>;
  updatePosition: (portfolioId: number, positionId: number, data: { ticker: string; shares: number; avg_price: number; leverage: number }) => Promise<void>;
  removePosition: (portfolioId: number, positionId: number) => Promise<void>;
  toggleSeed: (portfolioId: number, positionId: number) => Promise<void>;
  toggleCycle: (portfolioId: number, positionId: number) => Promise<void>;
}

export const usePortfolioStore = create<PortfolioState>((set, get) => ({
  portfolios: [],
  activePortfolioId: null,
  metrics: null,
  positions: [],
  isLoading: false,
  error: null,

  fetchPortfolios: async () => {
    set({ isLoading: true });
    try {
      const res = await portfolioApi.list();
      set({ portfolios: res.data });
      if (res.data.length > 0 && !get().activePortfolioId) {
        set({ activePortfolioId: res.data[0].id });
      }
    } catch (e: unknown) {
      set({ error: "Erro ao carregar carteiras" });
    } finally {
      set({ isLoading: false });
    }
  },

  setActivePortfolio: (id) => {
    set({ activePortfolioId: id, metrics: null, positions: [] });
  },

  fetchMetrics: async (id) => {
    set({ isLoading: true });
    try {
      const res = await portfolioApi.getMetrics(id);
      set({ metrics: res.data });
    } catch {
      set({ error: "Erro ao carregar métricas" });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchPositions: async (id) => {
    set({ isLoading: true });
    try {
      const res = await portfolioApi.getPositions(id);
      set({ positions: res.data });
    } catch {
      set({ error: "Erro ao carregar posições" });
    } finally {
      set({ isLoading: false });
    }
  },

  addPosition: async (portfolioId, data) => {
    await portfolioApi.addPosition(portfolioId, data);
    await get().fetchPositions(portfolioId);
    await get().fetchMetrics(portfolioId);
  },

  updatePosition: async (portfolioId, positionId, data) => {
    await portfolioApi.updatePosition(portfolioId, positionId, data);
    await get().fetchPositions(portfolioId);
    await get().fetchMetrics(portfolioId);
  },

  removePosition: async (portfolioId, positionId) => {
    await portfolioApi.removePosition(portfolioId, positionId);
    await get().fetchPositions(portfolioId);
    await get().fetchMetrics(portfolioId);
  },

  toggleSeed: async (portfolioId, positionId) => {
    await portfolioApi.toggleSeed(portfolioId, positionId);
    await get().fetchPositions(portfolioId);
  },

  toggleCycle: async (portfolioId, positionId) => {
    await portfolioApi.toggleCycle(portfolioId, positionId);
    await get().fetchPositions(portfolioId);
  },
}));
