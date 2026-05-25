export type RiskProfile = "conservative" | "balanced" | "aggressive";

export interface User {
  id: number;
  email: string;
  full_name?: string;
  risk_profile: RiskProfile;
  is_active: boolean;
  created_at: string;
}

export interface TechnicalIndicators {
  ticker: string;
  timestamp: string;
  price: number;
  rsi_14?: number;
  rsi_14_weekly?: number;      // RSI semanal — critério primário de entrada
  stoch_k?: number;
  stoch_d?: number;
  ma_200?: number;
  distance_from_ma200?: number;
  atr_14?: number;
  bb_upper?: number;
  bb_middle?: number;
  bb_lower?: number;
  bb_position?: number;
  realized_vol_30d?: number;
}

export interface FundamentalData {
  ticker: string;
  company_name?: string;
  sector?: string;
  industry?: string;
  market_cap?: number;
  beta?: number;
  dividend_yield?: number;
  payout_ratio?: number;
  pe_ratio?: number;
  debt_to_equity?: number;
  free_cash_flow?: number;
  roe?: number;
  current_price?: number;
}

export interface MarketStateSignals {
  rsi_semanal_spy?: number;
  distancia_ma200_pct?: number;
  distancia_topo_52s_pct?: number;
}

export interface MarketState {
  state: "TOPO" | "NORMAL" | "CAPITULAÇÃO";
  multiplier: 2 | 3 | 4;
  score: number;
  description: string;
  color: "red" | "yellow" | "green";
  signals: MarketStateSignals;
  last_updated?: string;
}

export interface KellyCriterion {
  kelly_full?: number | null;
  kelly_half?: number | null;
  kelly_quarter?: number | null;
  win_rate?: number | null;
  payoff_ratio?: number | null;
}

export interface AssetScore {
  ticker: string;
  company_name?: string;
  sector?: string;
  current_price: number;
  quality_score: number;
  opportunity_score: number;
  composite_score: number;
  leverage_score: number;
  max_recommended_leverage: number;
  recommended_leverage: number;
  conservative_leverage: number;
  risk_rating: string;
  opportunity_rating: string;
  // Sinal de entrada
  entry_signal?: string;       // ENTRAR FORTE | ENTRAR | AGUARDAR | EVITAR
  entry_signal_color?: string; // green | yellow | red | gray
  entry_leverage?: number;     // leverage sugerida para entrada
  entry_rationale?: string;    // explicação do sinal
  kelly?: KellyCriterion;
  technicals?: TechnicalIndicators;
  fundamentals?: FundamentalData;
  score_breakdown: Record<string, number>;
  // Tokenized assets (Bitget)
  is_tokenized?: boolean;
  underlying_ticker?: string;
}

export interface AssetScreenResult {
  assets: AssetScore[];
  screened_at: string;
  total_assets: number;
  market_state?: MarketState;
}

export interface PortfolioMetrics {
  equity: number;
  total_exposure: number;
  effective_leverage: number;
  portfolio_beta: number;
  dividend_yield: number;
  current_drawdown: number;
  max_drawdown: number;
  sharpe_ratio?: number;
  sortino_ratio?: number;
  var_95: number;
  cvar_95: number;
  safety_margin: number;
  projected_cagr: number;
  deleverage_years: number;
}

export interface Position {
  id?: number;
  ticker: string;
  company_name?: string;
  sector?: string;
  shares: number;
  avg_price: number;
  leverage: number;
  current_price?: number;
  current_value?: number;
  notional_value?: number;
  pnl?: number;
  pnl_pct?: number;
  weight?: number;
  dy?: number;
  is_seed?: boolean;
  is_cycle?: boolean;
}

export interface WatchlistItem {
  id: number;
  ticker: string;
  added_at: string;
}

export interface Portfolio {
  id: number;
  name: string;
  initial_equity: number;
  monthly_contribution: number;
  currency: string;
  positions: Position[];
  metrics?: PortfolioMetrics;
  created_at: string;
}

export interface TimeSeriesPoint {
  date: string;
  value: number;
}

export interface BacktestMetrics {
  strategy: string;
  start_date: string;
  end_date: string;
  total_return_pct: number;
  cagr_pct: number;
  max_drawdown_pct: number;
  sharpe_ratio: number;
  sortino_ratio: number;
  calmar_ratio: number;
  annualized_vol_pct: number;
  win_rate_pct: number;
  final_value: number;
  initial_value: number;
}

export interface BacktestResult {
  equity_curves: Record<string, TimeSeriesPoint[]>;
  drawdown_curves: Record<string, TimeSeriesPoint[]>;
  leverage_curve: Array<{ date: string; leverage: number }>;
  metrics: BacktestMetrics[];
  crisis_analysis: Array<Record<string, unknown>>;
  completed_at: string;
}

export interface SimulationScenario {
  name: string;
  percentile?: number;
  equity_curve: Array<{ month: number; year: number; value: number }>;
  final_value: number;
  cagr: number;
  max_drawdown: number;
  ruin_probability: number;
}

export interface StressScenario {
  key: string;
  name: string;
  period: string;
  color: string;
  description: string;
  initial: number;
  final: number;
  trough: number;
  max_drawdown_pct: number;
  months_to_trough: number;
  total_months: number;
  total_return_pct: number;
  path: Array<{ month: number; value: number }>;
}

export interface TradeHistoryItem {
  id: number;
  ticker: string;
  action: string;          // COMPRA | VENDA | AJUSTE | SEMENTE | CICLO
  shares: number;
  price: number;
  leverage: number;
  total_value: number;
  notes?: string;
  executed_at: string;
}

export interface SimulationResult {
  scenarios: SimulationScenario[];
  leverage_evolution: Array<{ month: number; year: number; leverage: number }>;
  dividend_accumulation: Array<{
    month: number; year: number;
    cumulative_dividends: number;
    monthly_income: number;
    annual_income: number;
  }>;
  contribution_breakdown: Array<{ year: number; contributions: number; returns: number; total: number }>;
  percentiles: Record<string, number>;
  ruin_probability: number;
  stress_test: StressScenario[];
  completed_at: string;
}

export interface Alert {
  id: number;
  ticker: string;
  alert_type: string;
  threshold: number;
  current_value?: number;
  message?: string;
  is_active: boolean;
  is_triggered: boolean;
  triggered_at?: string;
  created_at: string;
}

export interface ContributionSuggestion {
  ticker: string;
  company_name?: string;
  suggested_amount: number;
  suggested_leverage: number;
  rationale: string;
  opportunity_score: number;
  composite_score: number;
}
