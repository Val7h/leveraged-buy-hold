from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime


class AssetFilter(BaseModel):
    tickers: Optional[List[str]] = None
    min_score: float = 0.0
    max_beta: float = 2.0
    min_dividend_yield: float = 0.0
    sectors: Optional[List[str]] = None


class TechnicalIndicators(BaseModel):
    ticker: str
    timestamp: Optional[str] = None
    price: Optional[float] = None
    rsi_14: Optional[float] = None
    rsi_14_weekly: Optional[float] = None   # RSI semanal — critério primário de entrada
    stoch_k: Optional[float] = None
    stoch_d: Optional[float] = None
    ma_200: Optional[float] = None
    distance_from_ma200: Optional[float] = None
    atr_14: Optional[float] = None
    bb_upper: Optional[float] = None
    bb_middle: Optional[float] = None
    bb_lower: Optional[float] = None
    bb_position: Optional[float] = None
    realized_vol_30d: Optional[float] = None


class FundamentalData(BaseModel):
    ticker: str
    company_name: Optional[str] = None
    sector: Optional[str] = None
    industry: Optional[str] = None
    market_cap: Optional[float] = None
    beta: Optional[float] = None
    dividend_yield: Optional[float] = None
    dividend_growth_5y: Optional[float] = None
    payout_ratio: Optional[float] = None
    pe_ratio: Optional[float] = None
    debt_to_equity: Optional[float] = None
    free_cash_flow: Optional[float] = None
    roe: Optional[float] = None
    current_price: Optional[float] = None


class MarketStateSignals(BaseModel):
    rsi_semanal_spy: Optional[float] = None
    distancia_ma200_pct: Optional[float] = None
    distancia_topo_52s_pct: Optional[float] = None


class MarketStateData(BaseModel):
    state: str                        # TOPO | NORMAL | CAPITULAÇÃO
    multiplier: int                   # 2 | 3 | 4
    score: float
    description: str
    color: str                        # red | yellow | green
    signals: MarketStateSignals
    last_updated: Optional[str] = None


class AssetScore(BaseModel):
    ticker: str
    company_name: Optional[str] = None
    sector: Optional[str] = None
    current_price: float
    quality_score: float
    opportunity_score: float
    composite_score: float
    leverage_score: float
    max_recommended_leverage: float
    recommended_leverage: float
    conservative_leverage: float
    risk_rating: str
    opportunity_rating: str
    # Sinal de entrada
    entry_signal: Optional[str] = None         # ENTRAR FORTE | ENTRAR | AGUARDAR | EVITAR
    entry_signal_color: Optional[str] = None   # green | yellow | red | gray
    entry_leverage: Optional[float] = None     # leverage sugerida para entrada
    entry_rationale: Optional[str] = None      # explicação do sinal
    kelly: Optional[Dict[str, Any]] = None     # Kelly Criterion metrics
    technicals: Optional[TechnicalIndicators] = None
    fundamentals: Optional[FundamentalData] = None
    score_breakdown: Dict[str, float]
    # Tokenized assets (Bitget)
    is_tokenized: Optional[bool] = None
    underlying_ticker: Optional[str] = None


class AssetScreenResult(BaseModel):
    assets: List[AssetScore]
    screened_at: datetime
    total_assets: int
    market_state: Optional[Dict[str, Any]] = None
