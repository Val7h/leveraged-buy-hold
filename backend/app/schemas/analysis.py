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
