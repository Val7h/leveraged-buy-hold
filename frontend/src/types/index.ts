export type RiskProfile = "conservative" | "balanced" | "aggressive";

export interface User {
  id: string;
  email: string;
  fullName?: string;
  riskProfile?: RiskProfile;
  is_active?: boolean;
  created_at?: string;
}

export interface TechnicalIndicators {
  ticker: string;
  timestamp: string;
  price: number;
  rsi_14?: number;
  rsi_14_weekly?: number;      // RSI semanal — critério primário de entrada
  rsi_weekly?: number;         // nome retornado pela rota /assets/screen (BFF Node)
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
  /**
   * CAPITULAÇÃO: drawdown >35% + RSI <30 (bear severo, ex: 2000, 2008, 2020).
   * CORREÇÃO: queda 15-35% + RSI <40 (pullback, ocorre 1-2x/ano em SPY).
   * NORMAL: condições neutras.
   * TOPO: RSI overbought + perto do high + acima MM200.
   * Ref: Pagan-Sossounov (2003); Ned Davis Research bear definition.
   */
  state: "TOPO" | "NORMAL" | "CORREÇÃO" | "CAPITULAÇÃO";
  multiplier: 0.5 | 1.5 | 2.0 | 3.0;
  score?: number;
  description: string;
  color?: "red" | "yellow" | "green";
  signals: MarketStateSignals;
  spy_price?: number;
  last_updated?: string;
  last_update?: string;
}

export interface KellyCriterion {
  kelly_full?: number | null;
  kelly_half?: number | null;
  kelly_quarter?: number | null;
  /**
   * @deprecated Use `confidence_score`. O valor exibido NAO e taxa historica
   * de acertos — e score heuristico derivado do composite. Sera removido
   * apos 1 release de transicao.
   */
  win_rate?: number | null;
  /**
   * Score heuristico de confianca (0-100) derivado do composite_score.
   * NAO representa taxa historica de wins/losses. Sempre exibir com
   * disclaimer/badge "heuristica" no UI (compliance CVM/FINRA).
   */
  confidence_score?: number | null;
  payoff_ratio?: number | null;
  /**
   * true = kelly_full/half/quarter foram derivados HEURISTICAMENTE (sem
   * histórico real de trades). Exibir badge "heurística" no UI.
   * Ref: SEC Marketing Rule 206(4)-1 §(d)(1).
   */
  is_heuristic?: boolean;
}

export interface AssetScore {
  ticker: string;
  company_name?: string;
  sector?: string;
  current_price: number;
  currency?: string;
  is_brazilian?: boolean;
  quality_score: number;
  opportunity_score: number;
  composite_score: number;
  leverage_score: number;
  max_recommended_leverage: number;
  recommended_leverage: number;
  conservative_leverage: number;
  risk_rating: string;
  /**
   * true = risk_rating foi calculado SÓ a partir de volatilidade
   * (beta não disponível). UI deve mostrar badge "heurística".
   */
  risk_rating_is_heuristic?: boolean;
  opportunity_rating: string;
  // Sinal técnico do modelo — CVM 04/2023: labels descritivos, não imperativos.
  entry_signal?: string;       // OPORTUNIDADE FORTE | OPORTUNIDADE | NEUTRO | DESFAVORÁVEL
  entry_signal_color?: string; // green | yellow | red | gray
  entry_leverage?: number;     // alavancagem sugerida (cenário, não recomendação)
  entry_rationale?: string;    // explicação do sinal
  kelly?: KellyCriterion;
  technicals?: TechnicalIndicators;
  fundamentals?: FundamentalData;
  dividend_yield?: number;
  beta?: number;
  // Veredito BRUTO do motor (COMPRAR FORTE | COMPRAR | JUSTO | ESTICADO | ESPECULATIVO | RESERVA).
  verdict?: string;
  // Bucket/setor do motor (quando o motor o retorna) — usado p/ filtro de setor no screener.
  bucket?: string;
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
  failed_tickers?: string[];
  attempted_count?: number;
}

export interface PortfolioMetrics {
  // BFF fields (current)
  total_equity?: number;
  total_pnl?: number;
  total_pnl_pct?: number;
  weighted_avg_leverage?: number;
  portfolio_volatility_pct?: number;
  portfolio_sharpe?: number;
  allocation?: Array<{ ticker: string; weight_pct: number; current_value: number }>;
  // Legacy FastAPI fields (fallback)
  equity?: number;
  total_exposure?: number;
  effective_leverage?: number;
  portfolio_beta?: number;
  dividend_yield?: number;
  current_drawdown?: number;
  max_drawdown?: number;
  sharpe_ratio?: number;
  sortino_ratio?: number;
  var_95?: number;
  cvar_95?: number;
  safety_margin?: number;
  projected_cagr?: number;
  deleverage_years?: number;
}

export interface Position {
  id?: string;
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
  id: string;
  ticker: string;
  added_at?: string;
  createdAt?: string;
  // Camada Sentinela — nota/tese + alvo de entrada + cache do último sinal do motor.
  note?: string | null;
  targetPrice?: number | string | null;
  lastVerdict?: string | null;
  lastSignalColor?: string | null;
  lastLeverage?: number | string | null;
  signalAt?: string | null;
}

export interface Portfolio {
  id: string;
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

export type TradeMarkerType =
  | "INICIAL"
  | "APORTE"
  | "REBALANCE_ALTA"
  | "REBALANCE_BAIXA"
  | "MARGIN_CALL";

export interface TradeMarker {
  date: string;
  type: TradeMarkerType;
  price: number;
  leverage: number;
  details: string;
}

export interface BacktestBasket {
  is_basket: boolean;
  tickers: string[];
  label: string;
}

export interface BacktestCostBreakdown {
  applied: boolean;
  slippage_pct: number;
  tax_pct: number;
  total_costs_usd: number;
  cagr_gross_pct: number;
  cagr_net_pct: number;
  final_gross: number;
  final_net: number;
}

export interface MonteCarloResult {
  n_paths: number;
  horizon_years?: number;
  ruin_probability: number;
  max_dd_distribution: {
    p5: number;
    p50: number;
    p95: number;
    worst: number;
    mean: number;
  };
  max_dd_histogram: Array<{ bin_lo: number; bin_hi: number; count: number }>;
  final_value_percentiles: { p5: number; p50: number; p95: number };
  note?: string;
}

export interface BacktestResult {
  equity_curves: Record<string, TimeSeriesPoint[]>;
  drawdown_curves: Record<string, TimeSeriesPoint[]>;
  leverage_curve: Array<{ date: string; leverage: number }>;
  metrics: BacktestMetrics[];
  crisis_analysis: Array<Record<string, unknown>>;
  price_series?: Array<{ date: string; value: number }>;
  trades?: TradeMarker[];
  basket?: BacktestBasket;
  cost_breakdown?: BacktestCostBreakdown;
  monte_carlo?: MonteCarloResult | null;
  completed_at: string;
}

export interface SharpeCompareItem {
  ticker: string;
  retorno_total: number;
  retorno_anualizado: number;
  volatilidade: number;
  sharpe: number;
  sortino: number;
  calmar: number;
  max_drawdown: number;
  margin_buffer: number | null;
  max_leverage: number;
  beta: number;
  final_equity: number;
  margin_call: boolean;
  margin_call_date?: string;
}

export interface SharpeCompareResult {
  items: SharpeCompareItem[];
  benchmark: string;
  leverage: number;
  period: string;
  computed_at: string;
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
  id: string;
  ticker: string;
  action: string;          // COMPRA | VENDA | AJUSTE | SEMENTE | CICLO
  shares: number;
  price: number;
  leverage: number;
  total_value: number;
  realized_pnl?: number | null;  // P&L realizado (só VENDA); null = preço de saída indisponível
  is_cash?: boolean;             // true = movimento de caixa (COMPRA/VENDA); false = classificação
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
