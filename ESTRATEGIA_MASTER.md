# 🎯 ESTRATÉGIA MASTER — Alavancagem Dinâmica Composta

> **Documento canônico.** Toda análise, sugestão de ativo, comparação ou simulação
> deve respeitar integralmente este framework. Ativos/estratégias incompatíveis devem
> ser sinalizados explicitamente como tal. Substitui decisões anteriores em conflito.

---

## Plataforma e vantagens estruturais
- **Corretora: Quantfury** — operação em USD e BRL
- **Zero taxas operacionais** (sem custo de margem / carry)
- **Zero withholding tax sobre dividendos** — inclusive ETFs de Treasuries US (SHY, IEF).
  Vantagem fiscal extraordinária confirmada.

---

## ⭐ PRINCÍPIO CENTRAL — alavancagem sobre FLUXOS, não sobre o equity
**A alavancagem NÃO é rebalanceada sobre o equity crescente.** O equity cresce
organicamente pelo mercado — esse crescimento **NÃO gera dívida nova**.

Só **novos fluxos** entram alavancados:
- Aporte inicial → equity × multiplicador dinâmico
- Dividendos recebidos → reinvestidos × **3x**
- Novos aportes → capital novo × multiplicador dinâmico

**Consequência:** a alavancagem efetiva **CAI naturalmente** ao longo do tempo —
equity composto (exponencial) vs dívida que só cresce linear (fluxo novo). A
alavancagem **pulsa**; a tendência de longo prazo é desalavancagem progressiva.

---

## Multiplicador dinâmico de entrada (aplicado a cada novo fluxo)
| Estado do mercado | Multiplicador | Por quê |
|-------------------|:---:|---------|
| **Topo / euforia / máximas** | **2x** | Valuation esticado, drawdown esperado maior, preservar pólvora |
| **Normal / neutro** | **3x** | Condição padrão — equilíbrio crescimento × segurança |
| **Capitulação / pânico** | **4x** | Valuation comprimido, DY explodiu, desalavancagem futura mais rápida, mais margem até liquidação pelo preço baixo |

> Nota: o 4x é sobre **fluxo novo**, não sobre a posição total → alavancagem efetiva
> total permanece baixa. Por isso o 4x convive com a sobrevivência a quedas profundas.

---

## Regra especial de capitulação — SHY como reserva de ataque
**SHY** (iShares 1-3 Year Treasury, drawdown histórico máx ~3%) é mantido como
**munição remunerada disfarçada de posição defensiva**.
- Rende enquanto espera (e sem withholding na Quantfury)
- Em **capitulação**: vende SHY → reinveste o capital em RV com **multiplicador 4x**
- Quanto mais longa a euforia, mais SHY acumula; quanto mais profunda a capitulação,
  mais violento o deploy.

---

## Sistema de controle de risco — stop escalonado de SOBREVIVÊNCIA
- Qualquer ativo cair **-10% do preço médio de entrada** → vender **1/3** da posição
- Objetivo: reduzir exposição/dívida relativa, afastar liquidação, comprar tempo
- **Não é stop de tese — é stop de sobrevivência de capital**
- Com 3x, liquidação ≈ -33%. A regra -10%/⅓ garante nunca chegar perto disso em
  ativos com drawdown histórico < 30%.

---

## Critérios de seleção de ativos
**Obrigatórios:**
- ✅ Drawdown histórico máx **< 30%** (ideal < 20%)
- ✅ Alta previsibilidade de receita e dividendos
- ✅ Lucro consistente em múltiplos ciclos
- ✅ Forte geração de caixa · baixo risco de falência
- ✅ Líder de setor / posição competitiva defensável
- ✅ Dividendo real (não erosivo de NAV)
- ✅ Atravessa crises sem cortar dividendo

**Desejáveis:** yield relevante/crescente · ROE alto consistente · beta moderado/baixo ·
histórico de crescimento de dividendos · baixa necessidade de dívida · margens resilientes

**🚫 Incompatíveis (nunca como core):**
- Drawdown histórico > 50% (AGNC, NLY, TLT como core)
- Yield alto financiado por erosão de NAV
- Cíclicas de commodities como posição permanente
- Growth com P/L > 40x como posição relevante
- Qualquer ativo cuja tese de recuperação não seja explicável em **30 segundos** numa queda forte

---

## Critérios de entrada técnica
- Preferência por **RSI semanal ≤ 38**
- Correções fortes com fundamentos intactos
- Sinais técnicos iniciais de reversão
- **NUNCA** comprar euforia/máximas/breakouts sem desconto → nesses casos, **máx 2x**

---

## Estrutura da carteira por função
| Função | % | Perfil | Exemplos |
|--------|:--:|--------|----------|
| **Âncoras** | 50–55% | DD < 20%, dividendo estável, sobrevivência máxima | SCHD, TAEE11, PG, KO, **SHY/IEF (reserva de ataque)** |
| **Geradores de Caixa** | 25–30% | Yield alto e real, aceleram desalavancagem via dividendos | JEPI, BBSE3, VIVT3, O |
| **Aceleradores de CAGR** | 15–20% | Crescimento superior, posição menor, entrada só em correção | V, MA, ITSA4, MAIN |

---

## Mecânica de desalavancagem natural
**Alavancagem efetiva CAI quando:** mercado sobe · dividendos chegam · aportes em 2x.
**SOBE quando:** mercado cai · aportes em capitulação 4x (intencional).
> Objetivo não é manter 3x exato — é garantir tendência de longo prazo de desalavancagem.

---

## Horizonte e filosofia
- Horizonte: **décadas**
- **Prioridade #1: sobrevivência** — não destruição permanente de capital
- #2: crescimento composto via reinvestimento
- #3: renda crescente via dividendos
- Tolera **volatilidade**, não tolera **ruína**
- Diversificação real = baixa correlação **em crise**, não só setores diferentes
- Não entra ativo cuja psicologia de manutenção em queda forte seja questionável
