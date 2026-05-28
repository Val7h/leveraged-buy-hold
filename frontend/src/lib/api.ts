import axios, { AxiosInstance } from "axios";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";

function createClient(): AxiosInstance {
  const client = axios.create({ baseURL: BASE_URL });

  client.interceptors.request.use((config) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("access_token");
      if (token) config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  client.interceptors.response.use(
    (r) => r,
    (error) => {
      if (error.response?.status === 401 && typeof window !== "undefined") {
        localStorage.removeItem("access_token");
        window.location.href = "/login";
      }
      return Promise.reject(error);
    }
  );

  return client;
}

const api = createClient();

// Auth
export const authApi = {
  login: (email: string, password: string) =>
    api.post("/api/v1/auth/login", new URLSearchParams({ username: email, password }), {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    }),
  register: (data: { email: string; password: string; full_name?: string; risk_profile?: string }) =>
    api.post("/api/v1/auth/register", data),
  me: () => api.get("/api/v1/auth/me"),
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
  getMetrics: (id: number) => api.get(`/api/v1/portfolio/${id}/metrics`),
  getPositions: (id: number) => api.get(`/api/v1/portfolio/${id}/positions`),
  addPosition: (id: number, data: { ticker: string; shares: number; avg_price: number; leverage: number }) =>
    api.post(`/api/v1/portfolio/${id}/positions`, data),
  updatePosition: (portfolioId: number, positionId: number, data: { ticker: string; shares: number; avg_price: number; leverage: number }) =>
    api.put(`/api/v1/portfolio/${portfolioId}/positions/${positionId}`, data),
  removePosition: (portfolioId: number, positionId: number) =>
    api.delete(`/api/v1/portfolio/${portfolioId}/positions/${positionId}`),
  toggleSeed: (portfolioId: number, positionId: number) =>
    api.patch(`/api/v1/portfolio/${portfolioId}/positions/${positionId}/seed`),
  toggleCycle: (portfolioId: number, positionId: number) =>
    api.patch(`/api/v1/portfolio/${portfolioId}/positions/${positionId}/cycle`),
  getSuggestions: (id: number, capital: number) =>
    api.get(`/api/v1/portfolio/${id}/suggestions`, { params: { available_capital: capital } }),
  getHistory: (id: number) =>
    api.get(`/api/v1/portfolio/${id}/history`),
  getEquityCurve: (id: number, days = 730) =>
    api.get(`/api/v1/portfolio/${id}/equity-curve`, { params: { days } }),
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
  remove: (id: number) => api.delete(`/api/v1/watchlist/${id}`),
  getSignals: () => api.get("/api/v1/watchlist/signals"),
};

// Alerts
export const alertsApi = {
  list: () => api.get("/api/v1/alerts"),
  create: (data: { ticker: string; alert_type: string; threshold: number; message?: string }) =>
    api.post("/api/v1/alerts", data),
  delete: (id: number) => api.delete(`/api/v1/alerts/${id}`),
  check: (tickers: string[]) => api.post("/api/v1/alerts/check", tickers),
};

export default api;
