from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class PortfolioCreate(BaseModel):
    name: str = "Carteira Principal"
    initial_equity: float = 10000.0
    monthly_contribution: float = 0.0
    currency: str = "USD"


class PortfolioUpdate(BaseModel):
    name: Optional[str] = None
    monthly_contribution: Optional[float] = None


class PositionCreate(BaseModel):
    ticker: str
    shares: float
    avg_price: float
    leverage: float = 1.0


class PositionResponse(BaseModel):
    id: int
    ticker: str
    company_name: Optional[str]
    sector: Optional[str]
    shares: float
    avg_price: float
    leverage: float
    current_price: Optional[float]
    current_value: Optional[float]
    notional_value: Optional[float]
    pnl: Optional[float]
    pnl_pct: Optional[float]
    weight: Optional[float]

    class Config:
        from_attributes = True


class PortfolioMetrics(BaseModel):
    equity: float
    total_exposure: float
    effective_leverage: float
    portfolio_beta: float
    dividend_yield: float
    current_drawdown: float
    max_drawdown: float
    sharpe_ratio: Optional[float]
    sortino_ratio: Optional[float]
    var_95: float
    cvar_95: float
    safety_margin: float
    projected_cagr: float
    deleverage_years: float


class PortfolioResponse(BaseModel):
    id: int
    name: str
    initial_equity: float
    monthly_contribution: float
    currency: str
    positions: List[PositionResponse]
    metrics: Optional[PortfolioMetrics]
    created_at: datetime

    class Config:
        from_attributes = True


class ContributionSuggestion(BaseModel):
    ticker: str
    company_name: Optional[str]
    suggested_amount: float
    suggested_leverage: float
    rationale: str
    opportunity_score: float
    composite_score: float
