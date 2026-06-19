import axios, { AxiosInstance } from "axios";

// Em produção: URL relativa (proxy via Next.js rewrites → FastAPI porta 8001)
// Em desenvolvimento: localhost:8001 direto
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || (typeof window !== "undefined" ? "" : "http://localhost:8001");

function createClient(): AxiosInstance {
  // withCredentials garante que o cookie httpOnly lbh_session é enviado.
  // Em same-origin (Next BFF) ele iria mesmo sem isso, mas mantemos explícito
  // para que NEXT_PUBLIC_API_URL apontado para outro host também funcione com CORS.
  const client = axios.create({ baseURL: BASE_URL, withCredentials: true });

  // Auth real: cookie httpOnly viaja sozinho. NÃO injetamos Authorization Bearer
  // (token não está mais em localStorage, e não deve estar acessível ao JS).

  client.interceptors.response.use(
    (r) => r,
    (error) => {
      if (error.response?.status === 401 && typeof window !== "undefined") {
        // Cookie expirado/inválido → manda para login. Não há localStorage a limpar.
        if (!window.location.pathname.startsWith("/login")) {
          window.location.href = "/login";
        }
      }
      return Promise.reject(error);
    }
  );

  return client;
}

const api = createClient();

// Auth — contrato novo: JSON body, cookie httpOnly de sessão (sem token no response).
export const authApi = {
  login: (email: string, password: string) =>
    api.post("/api/v1/auth/login", { email, password }),
  register: (data: {
    email: string;
    password: string;
    fullName?: string;
    riskProfile?: string;
  }) => api.post("/api/v1/auth/register", data),
  me: () => api.get("/api/v1/auth/me"),
  logout: () => api.post("/api/v1/auth/logout"),
};

// Assets
export const assetsApi = {
  screen: (params?: { tickers?: string; min_score?: number }) =>
    api.get("/api/v1/assets/screen", { params }),
  getMarketState: () => api.get("/api/v1/assets/market-state"),
  getPrice: (ticker: string) => api.get(`/api/v1/assets/${ticker}/price`),
  getAsset: (ticker: string) => api.get(`/api/v1/assets/${ticker}`),
  getHistory: (ticker: string, period = "1y") =>
    api.get(`/api/v1/assets/${ticker}/history`, { params: { period } }),
};

// Portfolio
export const portfolioApi = {
  list: () => api.get("/api/v1/portfolio"),
  create: (data: { name: string; initial_equity: number; monthly_contribution: number; currency: string }) =>
    api.post("/api/v1/portfolio", data),
  getMetrics: (id: string) => api.get(`/api/v1/portfolio/${id}/metrics`),
  getPositions: (id: string) => api.get(`/api/v1/portfolio/${id}/positions`),
  setEquity: (id: string, currentEquity: number) =>
    api.patch(`/api/v1/portfolio/${id}`, { current_equity: currentEquity }),
  addPosition: (id: string, data: { ticker: string; shares: number; avg_price: number; opened_at?: string }) =>
    api.post(`/api/v1/portfolio/${id}/positions`, data),
  updatePosition: (portfolioId: string, positionId: string, data: { ticker: string; shares: number; avg_price: number; leverage: number }) =>
    api.put(`/api/v1/portfolio/${portfolioId}/positions/${positionId}`, data),
  removePosition: (portfolioId: string, positionId: string) =>
    api.delete(`/api/v1/portfolio/${portfolioId}/positions/${positionId}`),
  toggleSeed: (portfolioId: string, positionId: string) =>
    api.patch(`/api/v1/portfolio/${portfolioId}/positions/${positionId}/seed`),
  toggleCycle: (portfolioId: string, positionId: string) =>
    api.patch(`/api/v1/portfolio/${portfolioId}/positions/${positionId}/cycle`),
  getAnalytics: (id: string) => api.get(`/api/v1/portfolio/${id}/analytics`),
  getRotation: (id: string) => api.get(`/api/v1/portfolio/${id}/rotation`),
  getSuggestions: (id: string, capital: number) =>
    api.get(`/api/v1/portfolio/${id}/suggestions`, { params: { available_capital: capital } }),
  getHistory: (id: string) =>
    api.get(`/api/v1/portfolio/${id}/history`),
  getEquityCurve: (id: string, startDate?: string) =>
    api.get(`/api/v1/portfolio/${id}/equity-curve`, { params: startDate ? { start_date: startDate } : {} }),
};

// Backtest
export const backtestApi = {
  run: (data: {
    tickers: string[];
    initial_capital: number;
    monthly_contribution: number;
    risk_profile: string;
  }) => api.post("/api/v1/backtest", data),
  sharpeCompare: (data: {
    tickers: string;
    start?: string;
    end?: string;
    leverage?: number;
    capital?: number;
    risk_free?: number;
  }) => api.post("/api/v1/backtest/sharpe-compare", data),
};

// Simulator
export const simulatorApi = {
  run: (data: {
    tickers: string[];
    initial_equity: number;
    monthly_contribution: number;
    horizon_years: number;
    risk_profile: string;
    inflation_rate: number;
    num_simulations: number;
    rebalancing?: string;
    dividend_yield?: number;
    drip?: boolean;
    fx_brl_usd?: number | null;
  }) => api.post("/api/v1/simulator", data),
  getDeleverage: (params: { initial_equity: number; total_exposure: number; monthly_contribution: number }) =>
    api.get("/api/v1/simulator/deleverage", { params }),
};

// Watchlist
export const watchlistApi = {
  list: () => api.get("/api/v1/watchlist"),
  add: (ticker: string) => api.post(`/api/v1/watchlist?ticker=${encodeURIComponent(ticker)}`),
  remove: (id: string) => api.delete(`/api/v1/watchlist/${id}`),
  getSignals: () => api.get("/api/v1/watchlist/signals"),
};

// Alerts
export const alertsApi = {
  list: () => api.get("/api/v1/alerts"),
  create: (data: { ticker: string; alert_type: string; threshold: number; message?: string }) =>
    api.post("/api/v1/alerts", data),
  delete: (id: string) => api.delete(`/api/v1/alerts/${id}`),
  update: (id: string, data: { active?: boolean; threshold?: number; message?: string }) =>
    api.patch(`/api/v1/alerts/${id}`, data),
  check: () => api.get("/api/v1/alerts/check"),
  dismissTriggered: () => api.delete("/api/v1/alerts/triggered"),
};

export default api;
