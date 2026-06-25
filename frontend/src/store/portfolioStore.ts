import { create } from "zustand";
import type { Portfolio, PortfolioMetrics, Position } from "@/types";
import { portfolioApi } from "@/lib/api";

interface PortfolioState {
  portfolios: Portfolio[];
  activePortfolioId: string | null;
  metrics: PortfolioMetrics | null;
  positions: Position[];
  analytics: any | null;
  analyticsLoading: boolean;
  analyticsError: string | null;
  isLoading: boolean;
  error: string | null;
  fetchPortfolios: () => Promise<void>;
  setActivePortfolio: (id: string) => void;
  fetchMetrics: (id: string) => Promise<void>;
  fetchPositions: (id: string) => Promise<void>;
  fetchAnalytics: (id: string) => Promise<void>;
  addPosition: (portfolioId: string, data: { ticker: string; shares: number; avg_price: number; opened_at?: string }) => Promise<void>;
  updatePosition: (portfolioId: string, positionId: string, data: { ticker: string; shares: number; avg_price: number; leverage: number }) => Promise<void>;
  removePosition: (portfolioId: string, positionId: string) => Promise<void>;
  toggleSeed: (portfolioId: string, positionId: string) => Promise<void>;
  toggleCycle: (portfolioId: string, positionId: string) => Promise<void>;
}

export const usePortfolioStore = create<PortfolioState>((set, get) => ({
  portfolios: [],
  activePortfolioId: null,
  metrics: null,
  positions: [],
  analytics: null,
  analyticsLoading: false,
  analyticsError: null,
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
    } catch {
      set({ error: "Erro ao carregar carteiras" });
    } finally {
      set({ isLoading: false });
    }
  },

  setActivePortfolio: (id) => {
    set({ activePortfolioId: id, metrics: null, positions: [], analytics: null, analyticsError: null });
  },

  fetchAnalytics: async (id) => {
    set({ analyticsLoading: true, analyticsError: null });
    try {
      const res = await portfolioApi.getAnalytics(id);
      // A inteligência (rotação, risco, agregado) é pesada: ranking de 228 ativos + correlação.
      // Se vier vazio/erro, não some em silêncio — sinaliza pra UI mostrar "carregando/erro + retry".
      if (res?.data && (res.data.assets || res.data.rotation || res.data.totals)) {
        set({ analytics: res.data, analyticsError: null });
      } else {
        set({ analytics: null, analyticsError: "A inteligência da carteira voltou vazia. Tente recarregar." });
      }
    } catch (e: any) {
      const st = e?.response?.status;
      set({
        analytics: null,
        analyticsError: st === 502 || st === 504
          ? "A inteligência da carteira demorou demais (ranking pesado esquentando). Tente de novo em alguns segundos."
          : "Não foi possível carregar a inteligência da carteira (rotação, risco). Tente de novo.",
      });
    } finally {
      set({ analyticsLoading: false });
    }
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
    await get().fetchAnalytics(portfolioId);
  },

  updatePosition: async (portfolioId, positionId, data) => {
    await portfolioApi.updatePosition(portfolioId, positionId, data);
    await get().fetchPositions(portfolioId);
    await get().fetchMetrics(portfolioId);
    await get().fetchAnalytics(portfolioId);  // shares/avg_price mudam rotação/risco/stress
  },

  removePosition: async (portfolioId, positionId) => {
    await portfolioApi.removePosition(portfolioId, positionId);
    await get().fetchPositions(portfolioId);
    await get().fetchMetrics(portfolioId);
    await get().fetchAnalytics(portfolioId);
  },

  toggleSeed: async (portfolioId, positionId) => {
    await portfolioApi.toggleSeed(portfolioId, positionId);
    await get().fetchPositions(portfolioId);
    await get().fetchAnalytics(portfolioId);  // is_seed muda rotação/venda
  },

  toggleCycle: async (portfolioId, positionId) => {
    await portfolioApi.toggleCycle(portfolioId, positionId);
    await get().fetchPositions(portfolioId);
    await get().fetchAnalytics(portfolioId);  // is_cycle muda rotação/venda
  },
}));
