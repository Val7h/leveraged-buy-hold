# DISCLOSURE DE RISCOS - LBH SYSTEM
## Para Usuários de Alavancagem (Leverage)

**Versão:** 1.0  
**Data de Vigência:** 5 de Junho de 2026  
**Obrigatório ler antes de usar leverage**

---

## RESUMO EXECUTIVO

**ALAVANCAGEM AMPLIFICA GANHOS E PERDAS.**

Se você investe R$100,000 em 1x leverage (sem alavancagem):
- Ganho máximo ilimitado (ações podem subir 100%+)
- Perda máxima: R$100,000 (seu capital inteiro)

Se você investe R$100,000 em 2.5x leverage:
- Ganho máximo: Até R$250,000 de poder de compra
- Perda máxima: R$100,000 (seu capital inteiro) — **EM SEGUNDOS**

---

## 1. RISCO DE ALAVANCAGEM (Amplificação)

### 1.1 Como Leverage Funciona

**Exemplo Simples:**

```
Seu capital:        R$100,000
Leverage escolhido: 2.5x
Poder de compra:    R$250,000 (pode comprar até R$250k em ações)

S&P 500 sobe 10%:
- Seu ganho: R$25,000 (10% de R$250k) = 25% de lucro
- Retorno: 25% no seu capital (ao invés de 10%)

S&P 500 cai 10%:
- Sua perda: R$25,000 (10% de R$250k) = 25% de prejuízo
- Retorno: -25% no seu capital (ao invés de -10%)

S&P 500 cai 40%:
- Sua perda: R$100,000 (40% de R$250k)
- Retorno: -100% no seu capital (RUÍNA TOTAL)
- Posição liquidada automaticamente
```

### 1.2 Tabela de Amplificação

| Movimento S&P | 1x Leverage | 2.0x | 2.5x | 3.0x |
|---|---|---|---|---|
| +10% | +10% | +20% | +25% | +30% |
| -5% | -5% | -10% | -12.5% | -15% |
| -10% | -10% | -20% | -25% | -30% |
| -20% | -20% | -40% | -50% | -60% |
| -25% | -25% | -50% | **-62.5%** | **-75%** |
| -40% | -40% | **-80%** | **-100% (ruin)** | **-120% (margin call)** |

**Nota:** Com 2.5x leverage, -40% = perda de 100% (liquidação automática)

### 1.3 Realidade Histórica

Crashs históricos DO MERCADO (S&P 500):

| Evento | Queda | Período | Com 2.5x Leverage |
|---|---|---|---|
| **2008 Financial Crisis** | -57% | 1 ano | -142% (ruin + debt) |
| **COVID-19 (2020)** | -34% | 1 mês | -85% (ruin) |
| **2022 Inflation Crisis** | -18% | Ano inteiro | -45% (ruin) |
| **1987 Black Monday** | -20% (1 dia!) | 1 dia | -50% (ruin) |

**Pior cenário:** 1929 (-90% em 2 anos) = -225% com 2.5x = Você deve dinheiro

---

## 2. RISCO DE MARGIN CALL E LIQUIDAÇÃO

### 2.1 O que é Margin Call?

**Margin Call = Seu broker decide fechar sua posição automaticamente**

Quando seu capital cai abaixo de um limiar (ex: 50% de margin ratio), o broker:
1. ✗ NÃO avisa você com 24h de antecedência
2. ✗ NÃO espera sua aprovação
3. ✗ APENAS vende sua posição INSTANTANEAMENTE
4. ✗ Você não pode protestar depois

### 2.2 Exemplo de Margin Call

```
Data: 5 de junho, 10:00 AM
Seu capital: R$100,000
Posição: R$250,000 em S&P 500 via 2.5x leverage
Margin ratio: 100% (seguro)

Data: 5 de junho, 2:00 PM (2h depois)
Mercado cai 20%
Sua posição agora vale: R$200,000
Capital restante: R$50,000
Margin ratio: 50% (LIMITE!)

Data: 5 de junho, 2:00:15 PM (15 segundos depois)
LIQUIDAÇÃO AUTOMÁTICA OCORRE
- Seu broker vende toda sua posição
- Sem aviso prévio
- Sem chance de você evitar

Data: 5 de junho, 2:05 PM
Você recebe email: "Posição liquidada. Capital restante: R$50,000"
Seu prejuízo: R$50,000 (50%)
Dor: 🔴 REAL
```

### 2.3 Por Que Acontece Margin Call?

**Você não é o dono da alavancagem.**

Quando você usa leverage:
- Você emprestou dinheiro (você = devedor)
- Broker = credor
- Se posição cai muito, broker está em risco
- Broker fecha posição para proteger a si mesmo (não você)

**Lei de mercado:** Broker não tem obrigação de avisar. Contrato permite liquidação automática.

---

## 3. RISCO DE SISTEMA E FALHA DE ALERTAS

### 3.1 Alertas Podem Falhar

Nossa plataforma envia **alertas técnicos** quando:
- RSI < 30 (possível compra)
- Volatilidade > 2 desvios padrão
- Margin ratio < 60%

**MAS:** Alertas podem falhar por:

| Motivo | Probabilidade | Impacto |
|-------|---|---|
| Email bloqueado por seu spam filter | 5-10% | Você não vê aviso |
| Servidor de email do Gmail/Outlook down | < 1% | Atraso de horas |
| Sua internet cai | Comum | Você offline durante crash |
| Seu celular sem bateria | Comum | Você não vê notificação |
| Notificação do navegador desativada | Comum | Você não vê pop-up |
| Servidor LBH cai durante crisis | 1-5% | Sistema offline QUANDO VOCÊ PRECISA |

**IMPORTANTE:** Não dependa de alertas. Eles são "best effort", não garantidos.

### 3.2 Exemplo: Sistema Offline Durante Crisis

```
Data: [Crash de mercado]
Seu posição: R$250k em leverage, margin ratio 60% (crítico)

Você: "Preciso vender 10% da posição para aumentar margin ratio"
Ação: Clica no botão "Vender"

Servidor LBH: OFFLINE (crash, DDoS, falha de cloud)
Erro: "Cannot connect to server"

Você: Espera 5 minutos, tenta novamente
Servidor: Ainda offline

Você: Espera 30 minutos
Mercado continua caindo
Seu margin ratio agora: 45%

Você: Broker liquidou sua posição enquanto sistema estava down
Seu prejuízo: R$75,000 (você poderia ter evitado com -10% venda)

Resultado: Culpamos "sistema failure" (inevitável), não podemos compensar
```

### 3.3 Realidade de Uptime

- **Promessa:** 99.9% uptime (22 horas de downtime/ano)
- **Realidade:** Às vezes mais, às vezes menos
- **Durante crash:** Quando você MAIS precisa, é quando sistema é mais sobrescrito
- **Garantia:** Nenhuma. ToS limita nossa responsabilidade por downtime

---

## 4. RISCO DE MODELO E VaR (VALUE AT RISK)

### 4.1 O que é VaR?

**VaR 95% = "95% de confiança de não perder mais que X"**

```
Exemplo:
VaR 95% = -10% (em 1 dia)

Significa:
- 95 dias = perda <= 10%
- 5 dias = perda > 10% (ou pode ser -30%, -50%, -90%)
```

**Problema:** VaR assume distribuição normal (bell curve). Mercado não é normal.

### 4.2 Eventos "Cauda Gorda" (Fat Tail)

VaR não prevê:
- Crashes de -50% em 1 dia
- Gaps de abertura de -20%
- Circuit breakers que fecham mercado
- "Black swan" (evento imprevisível)

**Exemplo:**
```
VaR 95% diz: "95% chance de perder <= 10%"
2008 acontece: Perda = -57% (impossível segundo VaR!)
Você: "Seu VaR falhou!"
Nós: "VaR é para 95% dos casos, não 100%"
Você: Arruinado (apenas 1 em 20 chance)
```

### 4.3 Model Risk

Nosso scoring assume:
- Volatilidade (σ) é estável
- Correlação entre ações é estável
- Passado prediz futuro

**Realidade:** Tudo muda em crises
- 2008: Correlação virou 1.0 (tudo caiu junto)
- COVID: Volatilidade 3x normal
- 2022: Inflação inédita em 40 anos

**Resultado:** Modelo pode underperform significativamente.

---

## 5. RISCO DE DADOS E BACKTESTING

### 5.1 Backtest Assumptions

Nosso backtesting **assume:**
- Você consegue comprar no preço de fechamento (nem sempre possível)
- Sem slippage (diferença entre preço esperado e real)
- Sem spreads (diferença bid/ask)
- Liquidez infinita (sempre consegue vender)
- Sem gaps (mercado abre no mesmo preço de fechamento)

**Realidade:** Todos estes acontecem, especialmente em ações pequenas.

### 5.2 Erro de Dados

Fontes de dados podem ter:
- Delays (15-30 min de atraso vs real-time)
- Splits de ações não ajustados
- Dividendos não inclusos
- Dados históricos com falhas

**Exemplo:**
```
Yahoo Finance diz: VALE4 subiu 10%
Realidade: VALE4 teve split 2:1 (pareceu subir)
Seu backtest: "Grande oportunidade!"
Realidade: Falso positivo
```

---

## 6. RISCO DE LIQUIDEZ

### 6.1 Stocks Ilíquidas

Nem toda ação tem liquidez igual.

| Liquidez | Avg Daily Volume | Exemplo | Risco |
|---|---|---|---|
| **Alto** | > 10M shares | PETR4, VALE4 | Baixo |
| **Médio** | 1M-10M | BBDC4, ITUB4 | Médio |
| **Baixo** | < 1M | Small caps | ALTO |

Com leverage, **baixa liquidez = perigo:**
```
Você: Tentar vender 100k shares em 30 minutos
Mercado: Apenas 50k shares/dia de volume
Resultado: Não consegue vender - liquidação forçada
```

### 6.2 Gap Risk

Mercado pode abrir com **gap** de preço:

```
Fechamento (5 PM): PETR4 = R$35
Notícia overnight: Petrobras perdeu licitação
Abertura (9 AM): PETR4 = R$30 (gap -14%)

Com 2.5x leverage:
Sua posição cai -35% INSTANTANEAMENTE
Margin call acontece ANTES você conseguir vender

Seu erro: Não pode evitar gap
```

### 6.3 Circuit Breaker

B3 tem **circuit breaker** que para negociação se mercado cai rápido:

```
Queda > 10% (índice): Trading para 1 hora
Queda > 20%: Trading para 2 horas
Queda > 30%: Trading para o dia

Você: Preso em posição de leverage durante halt
Margin ratio cai enquanto você não pode vender
Liquidação pode ocorrer durante halt
```

---

## 7. RISCO PSICOLÓGICO E OVERLEVERAGE

### 7.1 Comportamento de Investidor

Pesquisa mostra que leverage causa:
- **Overconfidence:** "3x leverage = 3x chances de ganhar"
- **Loss aversion:** "Se perder 10%, vou dobrar aposta para recuperar"
- **Gambler's fallacy:** "Caiu 5 dias, amanhã sobe"

**Resultado:** Usuários de leverage perdem mais (em média) que sem leverage.

### 7.2 Cascata de Liquidações

```
Cenário: Mercado começa a cair
Você: "Vou esperar, vai recuperar"
Cai mais: Margin ratio agora 70%
Você: "Vou vender um pouco"
Tenta vender: Mercado tão caído que preço péssimo
Resultado: Vende por -30% (ao invés de -10%)

Outros usuários: Mesmo cenário
Liquidações em cascata: Mais vendas, preços caem mais
Seu prejuízo final: -50% (ao invés de -20%)
```

### 7.3 Psychological Trap: The Sunk Cost Fallacy

```
Você: Investe R$100k em VALE4 com 2.5x leverage
Cai 15%: Seu capital agora R$87.5k
Você: "Já perdi R$12.5k, se vender agora crystallizo a perda"
Você: "Vou esperar recuperar"

Cai mais 20%: Seu capital agora R$70k
Liquidação automática ocorre: R$70k é seu novo capital

Lição: Sunk cost falacy + leverage = devastador
```

---

## 8. RISCO DE CONCENTRAÇÃO

### 8.1 Você NÃO é obrigado a diversificar

Plataforma permite:
- Comprar 100% em 1 ação
- Comprar 100% em 1 setor
- Concentrar risco completamente

**Resultado:** Uma notícia ruim = você está arruinado.

### 8.2 Exemplo: Single Stock Risk

```
Seu portfólio com 2.5x leverage:
- 100% em VALE4
- R$250,000 de poder de compra
- Seu capital: R$100,000

Notícia: "VALE4 descobre fraude contábil"
VALE4 cai 60%:
- Sua posição: -150% (60% × 2.5)
- Seu capital: -R$50,000 (você DEVE dinheiro)

Resultado: Não apenas perdeu R$100k, deve R$50k mais

Realidade: Broker vai leiloar ações para cobrir debt, pode não alcançar valor suficiente
```

---

## 9. RISCO REGULATÓRIO E MUDANÇA DE REGRAS

### 9.1 CVM Pode Restringir Leverage

**Histórico:**
- 2008: Após crise, CVM aumentou margem requerida
- 2020: Após COVID, CVM monitorou leverage de perto

**Possibilidade:** CVM pode banir leverage ou reduzir máximo para 1.5x

**Seu cenário:**
- Você tem posição com 2.5x leverage
- CVM manda: "Máximo agora é 1.5x"
- Broker força liquidação parcial
- Você vende em momento ruim

### 9.2 Tax Changes

Lei pode mudar:
- Imposto de renda em operações (hj 15% para pessoa física)
- IOF em operações (pode aumentar)
- Taxas de corretagem
- Imposto sobre ganhos (pode ser 25%+ no futuro)

**Seu risco:** Ganhos que você planejou podem ser reduzidos por impostos

---

## 10. RISCO DE NOSSA PLATAFORMA FICAR INSOLVENTE

### 10.1 O que Acontece Se LBH System Fecha?

**Cenário 1: Bom (improvável)**
- Você consegue exportar seus dados
- Continua usando com outro screener
- Sem prejuízo (screener é análise apenas)

**Cenário 2: Ruim (possível)**
- Servidor cai e não conseguem recuperar
- Histórico de backtests / configurações perdido
- Sem compensação (ToS limita responsabilidade)

**Cenário 3: Pior (muito improvável)**
- Se integração com broker vai quebrada
- Você pode perder capacidade de vender
- Broker pode liquidar você para proteger a si mesmo

### 10.2 O que Fazer

- ✅ Não dependa 100% da plataforma
- ✅ Manutenha backup de seus trades
- ✅ Considere múltiplos screeners
- ✅ Não deixe posições abertas indefinidamente

---

## 11. RISCO DE BROKER (Quantfury)

### 11.1 Quantfury Não é um Broker Regulado

**Informação importante:** Quantfury é uma **exchange** (plataforma de trade), não um broker regulado.

**Implicações:**
- ❌ Não tem garantia de proteção de capital (como banco)
- ❌ Não tem segregação de contas (seu dinheiro misturado com deles)
- ❌ Não tem proteção do Fundo Garantidor de Créditos (FGC)
- ✅ Tem tecnologia blockchain (mais transparente, mas menos regulado)

### 11.2 Risk de Quantfury Ficar Insolvente

Se Quantfury fechar:
- Seu dinheiro não é recuperável (não tem seguro)
- Suas posições podem ser liquidadas
- Sem compensação

**Probabilidade:** Baixa (Quantfury é bem-capitalizada), mas não zero.

### 11.3 What You Can Do

- ✅ Use only R$ you can afford to lose completely
- ✅ Não tenha 100% do portfólio em Quantfury
- ✅ Consider traditional broker (B3, Banco do Brasil, XP) for core positions
- ✅ Quantfury only for experimental/high-risk

---

## 12. CENÁRIOS DE STRESS TESTING

### 12.1 Scenario: 2008 Redux

```
Seu setup: R$100k com 2.5x leverage
Mercado: 2008 financial crisis repeats (-57% em 1 ano)

Impacto:
- Ano 1 mês: S&P -10% → você -25% → margin call provável
- Liquidação forçada: Seu capital reduzido a R$75k
- Você: Tenta reinvestir em "bottom"
- Mas: Mercado continua caindo até -57%
- Seu novo capital (R$75k com 2.5x): Também liquidado
- Final: Restam R$30k de R$100k original
- Perda: -70%
```

### 12.2 Scenario: Inflation + Interest Rates

```
Seu setup: R$100k em ações com 2.5x leverage
Cenário: Inflação sobe a 20% (como 2022)
FED / BC sobe taxa para 15% (como 1990s)

Impacto:
- Ações caem porque: Futuro lucros menos valiosos
- Alavancagem: Você fica "short" taxa (emprestou de juro baixo)
- Seu custo de leverage agora: 15% ao ano
- Break-even: Precisa ganhar 15% só para pagar juro
- Mercado cai 30% enquanto você paga 15% de leverage
- Perda total: -75% + juro + liquidação

Final: -R$75,000+
```

### 12.3 Scenario: Fraud / Black Swan

```
Seu setup: R$100k em 1 ação (ex: Petrobras) com 2.5x leverage
Evento: CEO resign + fraude descoberta
Notícia: Ação cai 80% em 1 dia (gap opening)

Impacto:
- Sua posição: -200% (80% × 2.5) = Liquidação instantânea
- Seu capital: -R$100,000
- Você deve ao broker: -R$100,000 mais custos
- Broker coloca você em negative balance
- Você pagará anos para cobrir

Final: -R$100,000 + debt + psychological damage
```

---

## 13. ALTERNATIVAS AO LEVERAGE

### 13.1 Leverage-Free Strategies

**Ao invés de leverage, considere:**

1. **Dollar-cost averaging:** Investir R$10k/mês em 10 meses (ao invés de R$100k hoje)
   - Reduz timing risk
   - Sem liquidação risk
   - Sem margin call
   - Mais psicologicamente seguro

2. **Diversificação:** Ao invés de 1 ação, 20 ações
   - Uma ação caindo -50% = portfólio -2.5% (ao invés de -50%)
   - Muito mais seguro
   - Sem leverage precisa

3. **Stops Loss:** Ao invés de leverage, definir limite de perda
   - "Se VALE4 cair 20%, eu vendo"
   - Perda máxima = 20% (vs 100% com liquidação)
   - Mais controle

4. **Options (futuro):** Ao invés de comprar com leverage, comprar calls
   - Risco limitado (você pagou no prêmio)
   - Sem margin call
   - Sem liquidação
   - Mais caro, mas mais seguro psicologicamente

### 13.2 Leverage é Para Quem?

**Você DEVERIA usar leverage SOMENTE SE:**
- ✅ Você entende 100% os riscos (this document)
- ✅ Você pode perder TODO o capital
- ✅ Você não usa leverage com "deve receber" (freelancer, etc)
- ✅ Você consegue dormir tranquilo em -50% drawdown
- ✅ Você tem experience em inversão (2+ anos)

**Você NÃO deveria usar leverage SE:**
- ❌ Estou lendo isto e fiquei assustado (good sign!)
- ❌ Preciso do dinheiro em < 3 anos
- ❌ Psicologicamente não consigo ver -30% sem entrar em pânico
- ❌ Comecei investindo há < 1 ano
- ❌ Não entendo por que -40% no índice = minha conta zera

---

## 14. CHECKLIST PRÉ-LEVERAGE

Antes de usar leverage, responda:

- [ ] Li este documento todo (não só este capítulo)
- [ ] Entendo que posso perder 100% do capital
- [ ] Tenho 6+ meses de despesas em conta separada (não usando para investir)
- [ ] Meu psicológico aguenta -50% drawdown (testei em 2020 COVID?)
- [ ] Eu já investi por 2+ anos (tenho experiência de 1 bear market)
- [ ] Leverage será <= 2.5x (não vou exagerar)
- [ ] Tenho plano de stop-loss (ex: sair se cair -30%)
- [ ] Não estou usando leverage porque amigo ganhou dinheiro (ótimo jeito de perder)
- [ ] Entendo que alertas podem falhar (não vou depender deles)
- [ ] Meu broker (Quantfury) pode fechar e eu não fico devendo dinheiro

**Se não consegue marcar todas 10:** Não use leverage. Use screener sem leverage.

---

## 15. CONTATO E SUPORTE

**Dúvidas sobre riscos?**

📧 **Email:** legal@lbhsystem.com  
💬 **FAQ:** https://lbhsystem.com/risk-faq  
🎓 **Educação:** https://lbhsystem.com/learning/leverage-101  

**Se você discorda deste disclosure:**
- Não use leverage
- Use screener sem leverage
- Sem problema, sem obrigação

**Se você acha que poderia perder capital:**
- Correto! Você pode.
- Leverage é alto risco
- Use por sua conta e risco

---

## ASSINATURA

Ao clicar "Aceitar", você:
- ✅ Leu este documento
- ✅ Entende os riscos
- ✅ Aceita leverage por sua conta e risco
- ✅ Não culpará LBH System por perdas

**☑️ Aceito este Risk Disclosure**

Data: _____________  
IP Address: _____________  
(registrado para compliance)

---

**Versão:** 1.0 | **Efetivo:** 5 de Junho, 2026

*Este documento é baseado em melhores práticas de disclosure regulatório (CVM, SEC, FINRA). Consulte uma advisor se não entender alguma seção.*
