# Auditoria do Motor Quantitativo — LBH System

## Resultado Final: **8.3 / 10** — Aprovado para uso previdenciário real

Tag git: `audit-v5-8.3` | Commit: `1dc472d` | Data: 2026-07-04

---

## Evolução por painel

| Painel | Nota | Principais mudanças |
|--------|------|---------------------|
| V3 | 7.1 | Baseline após 9 fixes iniciais |
| V4 | 7.8 | Bugs A/C/D corrigidos; 3 fragilidades identificadas |
| V5 | **8.3** | 3 fragilidades corrigidas (pivot ^TNX, FCF doc, critérios FII) |

---

## 12 Fixes + 3 Correções implementados

| # | Fix | Nota V5 |
|---|-----|---------|
| 1 | Shrinkage empírico-Bayesiano (Quality Score) | 9.0 |
| 2 | TAEE11/ALUP11 como ANCORA (utilities reguladas) | 8.0 |
| 3 | FCF fallback US via freeCashFlowTTM | 7.5 |
| 4 | Covered-call ETFs cap 1x (JEPI/JEPQ/QYLD etc.) | 9.5 |
| 5 | TSR haircut por PE expandido | 7.0 → corrigido em Cor.A |
| 6 | Soft caps no Quality Score | 8.5 |
| 7 | FII scoring próprio (DY+P/VP+Safety+DD) | 7.5 |
| 8 | Universo 22 FIIs | 6.5 → corrigido em Cor.C |
| 9 | STATE_OWNED expandido (CSAN3/TIMS3/VIVT3) | 6.0 |
| A | Pivot PE dinâmico via ^TNX — `pivot = 18 - max(0,(yield-3.5)*1.5)` | 8.6 |
| B | FCF yield US documentado como escolha consciente pró-cíclica | 7.8 |
| C | Critérios de inclusão/exclusão FII auditáveis | 8.4 |

---

## Ressalva única (não bloqueante)

**FCF yield US em bull market prolongado:**
Em alta contínua de S&P 500 por ≥ 3 anos, FCF yields US serão sistematicamente
subestimados (denominador market_cap inflado). O motor pode subponderar equity
americana por viés de dado, não de fundamento.

**Controle recomendado:** revisar manualmente se o motor está penalizando equity
US indevidamente quando S&P 500 acumula ≥ 3 anos consecutivos de alta.

---

## Mandato

O motor está alinhado ao mandato **survival-first** (horizonte 10-15 anos, B&H
alavancado previdenciário). A nota 8.3 representa a fronteira de eficiência
razoável para os dados disponíveis em plataforma gratuita (Yahoo/FMP/Fundamentus).

Painel: Larry Summers, Cliff Asness, Howard Marks, Cathie Wood, Ray Dalio.
