# Leveraged Buy & Hold System
### Sistema Quantitativo de Buy & Hold Alavancado Adaptativo

> Plataforma profissional para investimentos defensivos de longo prazo com alavancagem dinâmica via **Quantfury**.

---

## Filosofia Central

O sistema **NÃO usa alavancagem fixa**. A alavancagem aumenta apenas quando:
- RSI e Estocástico indicam sobrevenda
- Ativo está abaixo da Média Móvel de 200 períodos
- Score composto (qualidade × oportunidade) justifica o risco

Enquanto dividendos, aportes mensais e crescimento do patrimônio reduzem a alavancagem relativa ao longo do tempo — **desalavancagem natural**.

---

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | Next.js 14, TypeScript, TailwindCSS, Recharts, Zustand |
| Backend | Python FastAPI, SQLAlchemy |
| Banco | PostgreSQL 15 |
| Dados | yfinance (Yahoo Finance) |
| Deploy | Docker, Vercel (frontend), Railway/Render (backend) |

---

## Funcionalidades

### 1. Dashboard Principal
- Equity, exposição total, alavancagem efetiva
- Dividend yield da carteira, drawdown atual
- VaR 95%, margem de segurança, CAGR projetado
- Estimativa de desalavancagem natural

### 2. Screening de Ativos (Score 0–100)
**Qualidade (fundamental):**
- Beta (20%), Drawdown histórico (25%), Dividend Yield (10%)
- Sharpe Ratio (15%), Volatilidade (15%), Saúde fundamental (15%)

**Oportunidade (técnico):**
- RSI (25%), Estocástico Lento (25%)
- Distância da MM200 (30%), Posição nas Bandas de Bollinger (20%)

**Score Composto:** 60% qualidade + 40% oportunidade

### 3. Indicadores Técnicos
- RSI 14 períodos
- Estocástico Lento (%K, %D)
- Média Móvel 200 períodos + distância (%)
- ATR 14 períodos
- Bandas de Bollinger (20p, 2σ)
- Volatilidade realizada 30 dias

### 4. Motor de Alavancagem
| Score | Conservador | Balanceado | Agressivo |
|-------|-------------|------------|-----------|
| ≥ 90  | 2.0x        | 3.0x       | 4.0x      |
| 80–90 | 1.5x        | 2.0x       | 3.0x      |
| 70–80 | 1.25x       | 1.5x       | 2.0x      |
| < 60  | 1.0x        | 1.0x       | 1.0x      |

- Half Kelly / Quarter Kelly
- VaR histórico (95%, 99%)
- Expected Shortfall (CVaR 95%)
- Preço de liquidação hipotético

### 5. Backtest
Compara 4 estratégias em dados históricos de até 20 anos:
- **Adaptativo** (nossa estratégia)
- Buy & Hold Normal (1x)
- Buy & Hold Fixo (2x)
- S&P 500 (SPY benchmark)

Análise em crises: GFC 2008, COVID 2020, Bear Market 2022

### 6. Simulador Monte Carlo
- 1.000 trajetórias (bootstrap + GBM)
- Horizonte: 10, 15, 20, 25, 30 anos
- Dividendos reinvestidos
- Inflação ajustada
- Percentis P5, P25, P50, P75, P95
- Probabilidade de ruína

### 7. Sistema de Alertas
- RSI abaixo de 30
- Estocástico abaixo de 20
- Score de oportunidade acima de limiar
- Drawdown relevante

### 8. Ativos Prioritários
Utilities, Healthcare defensivo, Consumer Staples, Telecom,
Financeiros sólidos, Dividend Aristocrats, REITs de qualidade

---

## Início Rápido (Docker)

```bash
# 1. Clone e configure
git clone <repo>
cd leveraged-buy-hold
cp .env.example .env

# 2. Inicie tudo com Docker
docker-compose up --build -d

# 3. Acesse
# Frontend:  http://localhost:3000
# API docs:  http://localhost:8000/api/docs
```

---

## Desenvolvimento Local

### Backend

```bash
cd backend

# Crie e ative virtualenv
python -m venv .venv
.venv\Scripts\activate          # Windows
source .venv/bin/activate       # Linux/Mac

# Instale dependências
pip install -r requirements.txt

# Configure .env
cp .env.example .env
# Edite DATABASE_URL, SECRET_KEY

# Inicie
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend

# Instale dependências
npm install --legacy-peer-deps

# Configure
cp .env.example .env.local
# Edite NEXT_PUBLIC_API_URL=http://localhost:8000

# Inicie
npm run dev
```

### Banco de Dados (local)

```bash
# PostgreSQL via Docker (standalone)
docker run -d \
  --name lbh_db \
  -e POSTGRES_DB=leveraged_bh \
  -e POSTGRES_PASSWORD=lbh_secure_2024 \
  -p 5432:5432 \
  postgres:15-alpine

# As tabelas são criadas automaticamente na primeira inicialização do backend
```

---

## API Reference

Documentação interativa disponível em `http://localhost:8000/api/docs` (Swagger UI).

### Endpoints principais

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/api/v1/auth/register` | Criar conta |
| POST | `/api/v1/auth/login` | Login (JWT) |
| GET | `/api/v1/assets/screen` | Screening de ativos |
| GET | `/api/v1/assets/{ticker}` | Análise de ativo individual |
| GET | `/api/v1/portfolio/{id}/metrics` | Métricas da carteira |
| POST | `/api/v1/backtest` | Executar backtest |
| POST | `/api/v1/simulator` | Simulação Monte Carlo |
| GET/POST | `/api/v1/alerts` | Gestão de alertas |

---

## Deploy em Produção

### Backend → Railway / Render

```bash
# Railway
railway up

# Render: configure como Web Service Python
# Start command: uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

### Frontend → Vercel

```bash
vercel --prod
# Configure NEXT_PUBLIC_API_URL para a URL do backend em produção
```

---

## Arquitetura

```
leveraged-buy-hold/
├── backend/
│   └── app/
│       ├── api/v1/          # Endpoints REST
│       ├── core/            # Config, Auth, Database
│       ├── models/          # SQLAlchemy ORM
│       ├── schemas/         # Pydantic validation
│       ├── services/        # Market data, Portfolio
│       └── quantitative/    # ⭐ Motor quantitativo
│           ├── indicators.py    # RSI, Stoch, BB, ATR, MA200
│           ├── scoring.py       # Algoritmo de score 0-100
│           ├── leverage.py      # Kelly, VaR, CVaR, liquidação
│           ├── backtest.py      # Motor de backtest
│           └── monte_carlo.py   # Simulação Monte Carlo
├── frontend/
│   └── src/
│       ├── app/             # Next.js App Router (pages)
│       ├── components/      # Charts, UI, Layout
│       ├── lib/             # API client, utils
│       ├── store/           # Zustand state management
│       └── types/           # TypeScript types
├── database/
│   └── init.sql             # Schema PostgreSQL
└── docker-compose.yml
```

---

## Aviso Legal

Este sistema é uma ferramenta de análise quantitativa para uso pessoal. **Não constitui recomendação de investimento**. Investimentos alavancados envolvem riscos elevados, incluindo perda total do capital. Estude os riscos antes de utilizar alavancagem.

---

*Desenvolvido com FastAPI + Next.js + Python Quant Stack*
