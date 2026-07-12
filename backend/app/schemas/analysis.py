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
    # ── Credibilidade: camada de custos (toggle) + Monte Carlo de ruína ───────
    apply_costs: bool = True
    slippage_pct: float = 0.004        # 0,4% no preço de execução de stop/liquidação
    tax_pct: float = 0.15              # 15% sobre o ganho realizado nos ⅓ vendidos
    run_monte_carlo: bool = True
    mc_paths: int = 2000
    # ── Dial de risco (decisão Valth): o usuário escolhe DEPOIS de ver o custo ──
    # False (RECOMENDADO) = alavanca só FLUXOS (dívida fixa des-alavanca sozinha,
    # zero risco de liquidação, melhor risco-ajustado). True (AGRESSIVO) = re-margina
    # o PATRIMÔNIO rumo ao teto (capado em 1,8x p/ não liquidar o core) — mais CAGR,
    # drawdown muito mais fundo. A recomendação do app é sempre False.
    lever_equity: bool = False


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
    basket: Optional[Dict[str, Any]] = None
    cost_breakdown: Optional[Dict[str, Any]] = None
    monte_carlo: Optional[Dict[str, Any]] = None
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
    sortino: float = 0.0          # downside-deviation ratio (cauda)
    calmar: float = 0.0           # CAGR / |MaxDD| — critério de ranking nativo do alavancado
    max_drawdown: float
    margin_buffer: Optional[float] = None  # % mín. (low − liq_price)/liq_price ; menor = mais perigoso
    max_leverage: float = 1.0     # leverage máximo sobrevivente no período (busca binária por LOW)
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


# ────────────────────────────────────────────────────────────────────────────────
# Endpoint 16: GET /api/analytics/sector-breakdown
# ────────────────────────────────────────────────────────────────────────────────

class SectorBreakdownItem(BaseModel):
    sector: str
    ticker_count: int
    tickers: List[str]
    total_value: float
    weight_pct: float
    contribution_return_pct: float
    volatility_pct: float
    dividend_yield_pct: Optional[float] = None
    pe_ratio: Optional[float] = None
    growth_estimate_pct: Optional[float] = None


class SectorBreakdownResponse(BaseModel):
    portfolio_id: int
    total_portfolio_value: float
    sectors: List[SectorBreakdownItem]
    sector_count: int
    most_exposed_sector: str
    largest_sector_weight_pct: float
    sector_concentration_index: float  # 0-1, higher = more concentrated
    diversification_score: float  # 0-100
    sector_correlations: Dict[str, Dict[str, float]]
    recommendations: List[str]
    computed_at: datetime


# ────────────────────────────────────────────────────────────────────────────────
# Endpoint 17: GET /api/analytics/geographic-breakdown
# ────────────────────────────────────────────────────────────────────────────────

class GeographicBreakdownItem(BaseModel):
    country: str
    region: str
    ticker_count: int
    tickers: List[str]
    total_value: float
    weight_pct: float
    contribution_return_pct: float
    volatility_pct: float
    currency_exposure: str  # USD, EUR, GBP, etc
    currency_risk_pct: Optional[float] = None
    gdp_growth_estimate_pct: Optional[float] = None
    political_risk_score: Optional[int] = None  # 0-100


class GeographicBreakdownResponse(BaseModel):
    portfolio_id: int
    total_portfolio_value: float
    geographic_breakdown: List[GeographicBreakdownItem]
    country_count: int
    region_distribution: Dict[str, float]
    home_country_bias_pct: float
    international_exposure_pct: float
    currency_diversification: Dict[str, float]
    fx_risk_pct: Optional[float] = None
    recommendations: List[str]
    computed_at: datetime


# ────────────────────────────────────────────────────────────────────────────────
# Endpoint 18: POST /api/analytics/portfolio-rebalancing
# ────────────────────────────────────────────────────────────────────────────────

class RebalancingAction(BaseModel):
    ticker: str
    current_weight_pct: float
    target_weight_pct: float
    current_shares: float
    target_shares: float
    trade_amount: float
    trade_direction: str  # buy, sell
    priority: str  # high, medium, low
    estimated_tax_impact: Optional[float] = None


class RebalancingRecommendation(BaseModel):
    portfolio_id: int
    rebalancing_method: str  # equal_weight, target_allocation, risk_parity, etc
    current_portfolio_value: float
    estimated_portfolio_value_after: float
    total_trades_needed: int
    total_trade_value: float
    estimated_transaction_costs: float
    estimated_tax_cost: float
    total_cost: float
    expected_improvement_pct: float
    estimated_execution_time_hours: float
    actions: List[RebalancingAction]
    summary: str


class PortfolioRebalancingRequest(BaseModel):
    portfolio_id: int
    method: str = "equal_weight"  # equal_weight, target_allocation, risk_parity, momentum
    target_allocations: Optional[Dict[str, float]] = None  # {ticker: weight}
    max_transaction_cost_pct: float = 0.5
    consider_tax_efficiency: bool = True
    only_suggest: bool = True  # True = suggest only, False = execute


class PortfolioRebalancingResponse(BaseModel):
    request: PortfolioRebalancingRequest
    recommendation: RebalancingRecommendation
    execution_status: str  # pending, executed, rejected
    executed_at: Optional[datetime] = None
    computed_at: datetime


# ────────────────────────────────────────────────────────────────────────────────
# Endpoint 19: GET /api/analytics/tax-efficiency
# ────────────────────────────────────────────────────────────────────────────────

class TaxLot(BaseModel):
    ticker: str
    shares: float
    cost_basis: float
    current_value: float
    unrealized_gain_loss: float
    gain_loss_pct: float
    holding_period: str  # long_term or short_term
    days_held: int


class TaxHarvestingOpportunity(BaseModel):
    ticker: str
    unrealized_loss: float
    potential_tax_savings: float
    wash_sale_risk: bool
    replacement_tickers: List[str]
    holding_period_days: int


class TaxEfficiencyAnalysis(BaseModel):
    portfolio_id: int
    total_portfolio_value: float
    total_unrealized_gains: float
    total_unrealized_losses: float
    net_unrealized_gain_loss: float
    long_term_gains: float
    short_term_gains: float
    tax_loss_carryforward: Optional[float] = None
    estimated_annual_tax_liability: float
    estimated_tax_rate_pct: float
    tax_efficiency_score: float  # 0-100, higher = more efficient
    tax_alpha_pct: float  # returns from tax optimization
    tax_lots: List[TaxLot]
    harvesting_opportunities: List[TaxHarvestingOpportunity]
    recommendations: List[str]
    computed_at: datetime


class TaxEfficiencyResponse(BaseModel):
    analysis: TaxEfficiencyAnalysis
    calculated_at: datetime


# ────────────────────────────────────────────────────────────────────────────────
# Endpoint 20: POST /api/analytics/export-report
# ────────────────────────────────────────────────────────────────────────────────

class ReportSection(BaseModel):
    name: str
    include: bool
    data: Optional[Dict[str, Any]] = None


class ExportReportRequest(BaseModel):
    portfolio_id: int
    report_type: str  # comprehensive, performance, risk, tax, holdings
    format: str = "pdf"  # pdf, excel, csv, json
    include_sections: List[str] = []  # ytd_performance, risk_analysis, sector_breakdown, etc
    custom_title: Optional[str] = None
    include_charts: bool = True
    include_recommendations: bool = True
    period: str = "ytd"  # ytd, 1m, 3m, 6m, 1y, all


class ExportReportResponse(BaseModel):
    portfolio_id: int
    report_type: str
    format: str
    file_url: str
    file_size_kb: float
    generated_at: datetime
    expires_at: Optional[datetime] = None
    includes_charts: bool
    sections_included: List[str]
