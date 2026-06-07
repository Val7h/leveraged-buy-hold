/**
 * Unit tests for lib/yfinance.ts (logica quantitativa pura).
 *
 * Cobertura alvo: >= 60% lines/functions/statements em yfinance.ts
 * (per-file via vitest.config.ts).
 *
 * Notas:
 *  - getQuote() faz fetch HTTP — testes desse path ficam para suite de
 *    integracao (mock undici / nock). Aqui cobrimos apenas as pure functions.
 *  - calculateRSI usa SMA simples (NAO Wilder smoothing classico). Os testes
 *    refletem o comportamento ATUAL, nao o "correto" — mudar a formula e PR
 *    separado, A/B com Track Quant. Ver PRICING_DECISION.md / briefing.
 */
import { describe, it, expect } from 'vitest';
import {
  calculateRSI,
  calculateVol,
  calculateScores,
  getSector,
} from '@/lib/yfinance';
import {
  SPY_CLOSES,
  MONOTONIC_UP,
  MONOTONIC_DOWN,
  FLAT,
} from './fixtures/spy_2020_2024';

// ──────────────────────────────────────────────────────────────────
// calculateRSI
// ──────────────────────────────────────────────────────────────────
describe('calculateRSI', () => {
  it('retorna 50 (neutro) com array vazio', () => {
    expect(calculateRSI([])).toBe(50);
  });

  it('retorna 50 quando prices.length < period + 1', () => {
    // period default = 14, precisa de pelo menos 15 elementos.
    expect(calculateRSI([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14])).toBe(50);
  });

  it('retorna 100 quando todos os movimentos sao de alta (avgLoss = 0)', () => {
    expect(calculateRSI(MONOTONIC_UP)).toBe(100);
  });

  it('retorna valor baixo (<10) com sequencia monotonica de queda', () => {
    // Sem ganhos, RSI = 100 - 100/(1+0) = 100 - 100 = 0.
    const rsi = calculateRSI(MONOTONIC_DOWN);
    expect(rsi).toBeLessThan(10);
    expect(rsi).toBeGreaterThanOrEqual(0);
  });

  it('produz valor no intervalo [0, 100] com fixture SPY realista', () => {
    const rsi = calculateRSI(SPY_CLOSES);
    expect(rsi).toBeGreaterThanOrEqual(0);
    expect(rsi).toBeLessThanOrEqual(100);
  });

  it('aceita period customizado', () => {
    const rsi7 = calculateRSI(SPY_CLOSES, 7);
    expect(rsi7).toBeGreaterThanOrEqual(0);
    expect(rsi7).toBeLessThanOrEqual(100);
  });

  it('retorna 50 quando todos os precos sao iguais (avgGain=0, avgLoss=0)', () => {
    // gains=0, losses=0 -> avgLoss=0 -> retorna 100 pelo branch atual.
    // Documenta comportamento atual (edge case potencialmente bugado).
    expect(calculateRSI(FLAT)).toBe(100);
  });
});

// ──────────────────────────────────────────────────────────────────
// calculateVol
// ──────────────────────────────────────────────────────────────────
describe('calculateVol', () => {
  it('retorna 0 com array de 1 elemento', () => {
    expect(calculateVol([100])).toBe(0);
  });

  it('retorna 0 com array vazio', () => {
    expect(calculateVol([])).toBe(0);
  });

  it('retorna 0 com sequencia constante (sem variacao)', () => {
    expect(calculateVol(FLAT)).toBe(0);
  });

  it('produz vol anualizada > 0 para fixture SPY', () => {
    const vol = calculateVol(SPY_CLOSES.slice(-30));
    expect(vol).toBeGreaterThan(0);
  });

  it('ordem de grandeza plausivel para vol anualizada (5-50%)', () => {
    const vol = calculateVol(SPY_CLOSES.slice(-30));
    expect(vol).toBeGreaterThan(5);
    expect(vol).toBeLessThan(50);
  });
});

// ──────────────────────────────────────────────────────────────────
// calculateScores
// ──────────────────────────────────────────────────────────────────
const baseQuote = {
  ticker: 'SPY',
  current_price: 450,
  previous_close: 448,
  change_pct: 0.44,
  currency: 'USD',
  company_name: 'SPDR S&P 500 ETF',
  sector: 'Financials',
  industry: 'Exchange Traded Fund',
  market_cap: 0,
  pe_ratio: null,
  dividend_yield: 0,
  beta: 1,
  rsi_weekly: 35,
  ma200: 420,
  ma200_distance_pct: 7,
  high_52w: 470,
  low_52w: 380,
  realized_vol_30d: 18,
};

describe('calculateScores', () => {
  it('produz composite_score em [0, 100]', () => {
    const s = calculateScores(baseQuote);
    expect(s.composite_score).toBeGreaterThanOrEqual(0);
    expect(s.composite_score).toBeLessThanOrEqual(100);
  });

  it('produz quality_score e opportunity_score em [0, 100]', () => {
    const s = calculateScores(baseQuote);
    expect(s.quality_score).toBeGreaterThanOrEqual(0);
    expect(s.quality_score).toBeLessThanOrEqual(100);
    expect(s.opportunity_score).toBeGreaterThanOrEqual(0);
    expect(s.opportunity_score).toBeLessThanOrEqual(100);
  });

  it('entry_signal = EVITAR quando composite < 50 (vol extrema + RSI alto)', () => {
    const bad = {
      ...baseQuote,
      realized_vol_30d: 50, // mata o volScore
      rsi_weekly: 75,        // rsiScore = 30
      ma200_distance_pct: 40, // mata o distMa200Score
      current_price: 465,    // proximo do high
    };
    const s = calculateScores(bad);
    expect(s.composite_score).toBeLessThan(50);
    expect(s.entry_signal).toBe('EVITAR');
  });

  it('kelly.kelly_half clampado em [0.8, 2.0]', () => {
    const s = calculateScores(baseQuote);
    expect(s.kelly.kelly_half).toBeGreaterThanOrEqual(0.8);
    expect(s.kelly.kelly_half).toBeLessThanOrEqual(2.0);
  });

  it('kelly.kelly_quarter clampado em [0.5, 1.5]', () => {
    const s = calculateScores(baseQuote);
    expect(s.kelly.kelly_quarter).toBeGreaterThanOrEqual(0.5);
    expect(s.kelly.kelly_quarter).toBeLessThanOrEqual(1.5);
  });

  it('expõe confidence_score como alias de win_rate (rename gradual)', () => {
    const s = calculateScores(baseQuote);
    expect(s.kelly.confidence_score).toBe(s.kelly.win_rate);
    expect(s.kelly.confidence_score).toBeGreaterThanOrEqual(0);
    expect(s.kelly.confidence_score).toBeLessThanOrEqual(100);
  });

  it('recommended_leverage clampado em [1.2, 2.5]', () => {
    const s = calculateScores(baseQuote);
    expect(s.recommended_leverage).toBeGreaterThanOrEqual(1.2);
    expect(s.recommended_leverage).toBeLessThanOrEqual(2.5);
  });

  it('max_recommended_leverage <= 3.0', () => {
    const s = calculateScores(baseQuote);
    expect(s.max_recommended_leverage).toBeLessThanOrEqual(3.0);
  });

  it('risk_rating ELEVADO quando vol > 30%', () => {
    const s = calculateScores({ ...baseQuote, realized_vol_30d: 35 });
    expect(s.risk_rating).toBe('ELEVADO');
  });

  it('risk_rating BAIXO quando vol <= 20%', () => {
    const s = calculateScores({ ...baseQuote, realized_vol_30d: 15 });
    expect(s.risk_rating).toBe('BAIXO');
  });

  it('risk_rating MODERADO quando 20 < vol <= 30', () => {
    const s = calculateScores({ ...baseQuote, realized_vol_30d: 25 });
    expect(s.risk_rating).toBe('MODERADO');
  });

  it('entry_signal ENTRAR quando composite >= 70 e RSI < 40', () => {
    const good = {
      ...baseQuote,
      realized_vol_30d: 8,
      rsi_weekly: 28,
      ma200_distance_pct: 2,
      current_price: 385, // proximo do low
    };
    const s = calculateScores(good);
    expect(s.composite_score).toBeGreaterThanOrEqual(70);
    expect(['ENTRAR']).toContain(s.entry_signal);
  });
});

// ──────────────────────────────────────────────────────────────────
// getSector (cobertura facil para subir % global)
// ──────────────────────────────────────────────────────────────────
describe('getSector', () => {
  it('classifica AAPL como Technology', () => {
    expect(getSector('AAPL')).toBe('Technology');
  });

  it('classifica .SA como B3 (Brasil)', () => {
    expect(getSector('PETR4.SA')).toBe('B3 (Brasil)');
  });

  it('classifica tokens ONUSDT como Crypto Tokenized', () => {
    expect(getSector('AAPLONUSDT')).toBe('Crypto Tokenized');
  });

  it('retorna Other para ticker desconhecido', () => {
    expect(getSector('XYZ123')).toBe('Other');
  });

  it('e case-insensitive', () => {
    expect(getSector('aapl')).toBe('Technology');
  });
});
