from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime


class BacktestRequest(BaseModel):
    tickers: List[str]
    start_date: str = "2003-01-01"
    end_date: Optional[str] = None
    initial_capital: float = 100000.0
    monthly_contribution: float = 1000.0
    risk_profile: str = "balanced"
    strategies: List[str] = ["adaptive", "buy_hold", "leveraged_2x", "sp500"]


class BacktestPeriodMetrics(BaseModel):
    strategy: str
    period: Optional[str] = "full"
    start_date: str
    end_date: str
    total_return: Optional[float] = None
    total_return_pct: Optional[float] = None
    cagr: Optional[float] = None
    cagr_pct: Optional[float] = None
    max_drawdown: Optional[float] = None
    max_drawdown_pct: Optional[float] = None
    sharpe_ratio: float
    sortino_ratio: float
    calmar_ratio: float
    win_rate: Optional[float] = None
    win_rate_pct: Optional[float] = None
    annualized_vol_pct: Optional[float] = None
    avg_leverage: Optional[float] = None
    final_value: float
    initial_value: Optional[float] = None


class BacktestResult(BaseModel):
    request: BacktestRequest
    equity_curves: Dict[str, List[Dict[str, Any]]]
    drawdown_curves: Dict[str, List[Dict[str, Any]]]
    leverage_curve: List[Dict[str, Any]]
    metrics: List[BacktestPeriodMetrics]
    crisis_analysis: List[Dict[str, Any]]
    price_series: List[Dict[str, Any]] = []
    trades: List[Dict[str, Any]] = []
    completed_at: datetime


class SharpeCompareRequest(BaseModel):
    tickers: str                  # comma-separated, e.g. "NEE,SO,JNJ"
    start: str = "2015-01-01"
    end: Optional[str] = None
    leverage: float = 3.0
    capital: float = 10_000.0
    risk_free: float = 0.05       # annual, e.g. 0.05 = 5%


class SharpeCompareItem(BaseModel):
    ticker: str
    retorno_total: float
    retorno_anualizado: float
    volatilidade: float
    sharpe: float
    max_drawdown: float
    beta: float
    final_equity: float
    margin_call: bool
    margin_call_date: Optional[str] = None


class SharpeCompareResult(BaseModel):
    items: List[SharpeCompareItem]
    benchmark: str
    leverage: float
    period: str
    computed_at: str


class SimulationRequest(BaseModel):
    tickers: List[str]
    initial_equity: float = 50000.0
    monthly_contribution: float = 1000.0
    horizon_years: int = 20
    risk_profile: str = "balanced"
    dividend_reinvestment: bool = True
    inflation_rate: float = 0.03
    num_simulations: int = 1000
    rebalancing: str = "none"       # none | monthly | quarterly | annual
    dividend_yield: float = 0.04    # yield anual da carteira (0.04 = 4%)
    drip: bool = True               # reinvestir dividendos automaticamente
    fx_brl_usd: Optional[float] = None  # taxa BRL/USD para mostrar em reais (ex: 5.7)


class SimulationScenario(BaseModel):
    name: str
    percentile: Optional[float]
    equity_curve: List[Dict[str, Any]]
    final_value: float
    cagr: float
    max_drawdown: float
    ruin_probability: float


class StressScenario(BaseModel):
    key: str
    name: str
    period: str
    color: str
    description: str
    initial: float
    final: float
    trough: float
    max_drawdown_pct: float
    months_to_trough: int
    total_months: int
    total_return_pct: float
    path: List[Dict[str, Any]]


class SimulationResult(BaseModel):
    request: SimulationRequest
    scenarios: List[SimulationScenario]
    leverage_evolution: List[Dict[str, Any]]
    dividend_accumulation: List[Dict[str, Any]]
    contribution_breakdown: List[Dict[str, Any]]
    percentiles: Dict[str, float]
    ruin_probability: float
    stress_test: List[StressScenario]
    completed_at: datetime


class AlertCreate(BaseModel):
    ticker: str
    alert_type: str
    threshold: float
    message: Optional[str] = None


class AlertResponse(BaseModel):
    id: int
    ticker: str
    alert_type: str
    threshold: float
    current_value: Optional[float]
    message: Optional[str]
    is_active: bool
    is_triggered: bool
    triggered_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


# ────────────────────────────────────────────────────────────────────────────────
# Endpoint 11: GET /api/portfolio/{portfolio_id}/ytd-performance
# ────────────────────────────────────────────────────────────────────────────────

class YTDPerformancePoint(BaseModel):
    date: str
    equity: float
    daily_return: float
    cumulative_return: float
    benchmark_price: float
    benchmark_return: float
    alpha: float
    beta: float
    tracking_error: float


class YTDPerformanceResponse(BaseModel):
    portfolio_id: int
    ytd_start: str
    ytd_end: str
    ytd_return_pct: float
    ytd_volatility_pct: float
    ytd_sharpe_ratio: float
    ytd_max_drawdown_pct: float
    benchmark_return_pct: float
    alpha_pct: float
    beta: float
    information_ratio: float
    win_days: int
    loss_days: int
    win_rate_pct: float
    daily_points: List[YTDPerformancePoint]
    computed_at: datetime


# ────────────────────────────────────────────────────────────────────────────────
# Endpoint 12: GET /api/metrics/volatility
# ────────────────────────────────────────────────────────────────────────────────

class VolatilityMetric(BaseModel):
    period: str  # 1m, 3m, 6m, 1y, 2y, 5y
    volatility_pct: float
    daily_avg_vol: float
    realized_vol: float
    implied_vol: Optional[float] = None
    vol_of_vol: Optional[float] = None
    percentile_rank: float


class VolatilityResponse(BaseModel):
    tickers: List[str]
    start_date: str
    end_date: str
    metrics: Dict[str, List[VolatilityMetric]]
    portfolio_volatility_pct: float
    min_volatility: float
    max_volatility: float
    correlation_matrix: Dict[str, Dict[str, float]]
    computed_at: datetime


# ────────────────────────────────────────────────────────────────────────────────
# Endpoint 13: GET /api/metrics/sharpe-ratio
# ────────────────────────────────────────────────────────────────────────────────

class SharpeRatioPoint(BaseModel):
    ticker: str
    sharpe_ratio: float
    sortino_ratio: float
    calmar_ratio: float
    excess_return_pct: float
    volatility_pct: float
    max_drawdown_pct: float
    win_rate_pct: float
    recovery_factor: float


class SharpeRatioResponse(BaseModel):
    period: str
    risk_free_rate: float
    start_date: str
    end_date: str
    metrics: List[SharpeRatioPoint]
    portfolio_sharpe: float
    benchmark_sharpe: float
    portfolio_sortino: float
    portfolio_calmar: float
    best_performer: str
    worst_performer: str
    computed_at: datetime


# ────────────────────────────────────────────────────────────────────────────────
# Endpoint 14: POST /api/analytics/backtest-results
# ────────────────────────────────────────────────────────────────────────────────

class BacktestResultsRequest(BaseModel):
    portfolio_id: int
    tickers: List[str]
    start_date: str = "2020-01-01"
    end_date: Optional[str] = None
    initial_capital: float = 100000.0
    monthly_contribution: float = 1000.0
    rebalancing: str = "none"  # none, monthly, quarterly, annual
    include_dividends: bool = True


class BacktestResultsMetric(BaseModel):
    metric_name: str
    value: float
    unit: str
    benchmark_value: Optional[float] = None
    outperformance: Optional[float] = None


class BacktestResultsData(BaseModel):
    portfolio_id: int
    final_equity: float
    total_return_pct: float
    cagr_pct: float
    annualized_volatility_pct: float
    sharpe_ratio: float
    max_drawdown_pct: float
    calmar_ratio: float
    win_rate_pct: float
    best_month_return_pct: float
    worst_month_return_pct: float
    best_year_return_pct: float
    worst_year_return_pct: float
    avg_monthly_return_pct: float
    recovery_factor: float
    ulcer_index: float
    metrics: List[BacktestResultsMetric]
    equity_curve: List[Dict[str, Any]]
    monthly_returns: List[Dict[str, Any]]
    yearly_returns: List[Dict[str, Any]]
    drawdown_periods: List[Dict[str, Any]]


class BacktestResultsResponse(BaseModel):
    request: BacktestResultsRequest
    results: BacktestResultsData
    execution_time_seconds: float
    computed_at: datetime


# ────────────────────────────────────────────────────────────────────────────────
# Endpoint 15: GET /api/analytics/risk-analysis
# ────────────────────────────────────────────────────────────────────────────────

class RiskMetric(BaseModel):
    name: str
    value: float
    unit: str
    status: str  # low, moderate, high, critical
    threshold: float
    distance_to_threshold: float


class RiskScenario(BaseModel):
    name: str
    description: str
    market_move: str
    portfolio_impact_pct: float
    equity_loss: float
    time_to_recovery_days: Optional[int] = None
    probability_pct: float


class RiskAnalysisResponse(BaseModel):
    portfolio_id: int
    risk_level: str  # low, moderate, high, critical
    risk_score: float  # 0-100
    metrics: List[RiskMetric]
    scenarios: List[RiskScenario]
    leverage_utilization_pct: float
    margin_requirement_pct: float
    margin_cushion_pct: float
    liquidity_coverage_days: float
    concentration_risk_pct: float
    largest_position_weight: float
    recommendations: List[str]
    computed_at: datetime
