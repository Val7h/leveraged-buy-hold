# 📐 Modelo Mestre — Ranking de Alavancagem (LBH)

> **Estratégia:** Buy & Hold **alavancado** via Quantfury (sem custo de carry).
> Comprar ativos de qualidade no momento certo, alavancado, e segurar por muito tempo —
> com stop dependendo da ocasião e do ativo. Preservação de capital acima de tudo.
>
> *Documento de design — fruto de discussão com perspectivas de Buffett, Dalio,
> Druckenmiller e Barsi. Última peça pendente: **Score de Crypto** (framework separado).*

---

## 🗺️ Visão geral do fluxo

```
                 ┌─────────────────────────────────────────────┐
                 │  1. PORTÃO DE QUALIDADE  (elimina, não pesa) │
                 │     Qualidade < 70  →  ativo NEM ENTRA       │
                 └───────────────────────┬─────────────────────┘
                                         │ elegíveis (≥70)
                                         ▼
                 ┌─────────────────────────────────────────────┐
                 │  2. RANKING = 100% OPORTUNIDADE + ASSIMETRIA │
                 │     (entre os elegíveis, qualidade não pesa) │
                 └───────────────────────┬─────────────────────┘
                                         │
              ┌──────────────────────────┼──────────────────────────┐
              ▼                          ▼                          ▼
    ┌───────────────────┐    ┌───────────────────┐    ┌───────────────────┐
    │ 3. FATOR BETA      │    │ 4. REGIME LIQUIDEZ │    │ 5. SELO DIVIDENDO  │
    │  amplifica sinal   │    │  vento, não muro:  │    │  BLINDADO 🏆       │
    │  (↑ ou ↓)          │    │  hostil = stop     │    │  bônus de tamanho  │
    │                    │    │  curto, NÃO corta  │    │  + desalavancagem  │
    │                    │    │  alavancagem       │    │  em vez de venda   │
    └─────────┬──────────┘    └─────────┬──────────┘    └─────────┬──────────┘
              └──────────────────────────┼──────────────────────────┘
                                         ▼
                 ┌─────────────────────────────────────────────┐
                 │  6. SIZING por ASSIMETRIA (R:R até o stop)   │
                 │     Trava de ferro: perda×lev ≤ 40% posição  │
                 │                     e ≤ 6% do patrimônio      │
                 └───────────────────────┬─────────────────────┘
                                         ▼
                 ┌─────────────────────────────────────────────┐
                 │  7. STOPS — preço (mecânico) + tese          │
                 └─────────────────────────────────────────────┘
```

---

## 1️⃣ PORTÃO DE QUALIDADE (eliminação, não peso)

Qualidade **não é um peso no ranking** — é um filtro de entrada. (Consenso Buffett/Druckenmiller.)

| Corte | Efeito |
|-------|--------|
| Qualidade **< 70** | Ativo **eliminado** — não aparece no ranking |
| Qualidade **70–84** | Elegível, alavancagem **máxima 3x** |
| Qualidade **≥ 85** | Elegível, libera alavancagem **até 4x** |

### Composição do Quality Score (0–100)

| Componente | Peso | Observação |
|-----------|------|-----------|
| **Sharpe Ratio** | 30% | O principal — está sendo pago pelo risco? |
| **Max Drawdown + Tempo de Recuperação** | 25% | Sobrevive a crises E volta rápido? |
| **Saúde Fundamental (TENDÊNCIA)** | 20% | ROIC, FCF Yield, estabilidade de lucros — **melhorando**, não só alto (Buffett) |
| **Consistência de retorno anual** | 15% | Retorno previsível ou caótico? |

**Removidos do Quality Score:**
- **Beta** → virou fator amplificador externo (item 3)
- **Volatilidade** → já está no denominador do Sharpe (redundante)
- **Dividend Yield isolado** → virou Selo Dividendo Blindado (item 5)

---

## 2️⃣ OPPORTUNITY SCORE — o ranking entre elegíveis

Entre os ativos que passaram no portão, o ranking é **100% timing + assimetria**. (Druckenmiller: "qualidade já fez o trabalho na porta.")

> ⚠️ **Emenda Greenblatt:** os 4 indicadores abaixo são quase todos *mean-reversion* —
> "1 fator medido de 4 jeitos" (falsa diversificação). Colapsados em **2 eixos ortogonais**:

| Eixo | Componente | Peso | Observação |
|------|-----------|------|-----------|
| **VALOR / DISTÂNCIA** | Distância da MM200 | 35% | Desconto de médio prazo |
| | Desconto do Topo × Portão de Reversão | 25% | Só pontua APÓS a faca parar de cair |
| **MOMENTUM** | Stochastic Lento %K | 30% | Timing de entrada (um oscilador só, não dois) |
| **CONFIRMAÇÃO** | RSI Semanal | 10% | Peso reduzido — redundante com Stochastic |

*Stochastic e RSI medem quase a mesma coisa → RSI vira confirmação leve, não fator independente.*

### 🔪 Portão de Reversão (anti-faca-caindo)

"Caiu do topo" **sozinho não pontua**. Só vale multiplicado pela confirmação de que o preço virou:

```
Desconto do Topo = (quanto caiu do topo) × (Confirmação de Reversão 0→1)
```

Sinais de confirmação (do mais rápido ao mais confiável):

| Sinal | Confiança |
|-------|-----------|
| Higher low (fundo mais alto que o anterior) | Alta |
| Inclinação da MM200 deixou de cair | Alta |
| **Fechamento semanal acima da máxima da semana anterior** | Alta (gatilho-chave) |
| Preço recupera a MM20/MM50 | Média-alta |
| Divergência de momentum (preço ↓, RSI ↑) | Média |
| Clímax de volume + secagem | Média |

> Preço ainda fazendo fundos mais baixos → Confirmação ≈ 0 → desconto não pontua (é faca).
> Higher low + MM200 aplainou + reclaim MM50 → Confirmação ≈ 0.8 → desconto pontua forte.

### ⭐ Sinal especial
`Qualidade ≥ 75` **+** `Reversão confirmada` **+** `Desconto do topo ≥ 40%`
→ **"DESCONTO HISTÓRICO COM QUALIDADE"** → libera alavancagem máxima do perfil.

---

## 3️⃣ FATOR BETA (amplificador externo, não penalidade)

Beta saiu do Quality Score. Beta amplifica o movimento — pra cima E pra baixo:

| Situação | Beta alto (≥1.2) significa |
|----------|----------------------------|
| Opportunity alto (oversold, reversão confirmada) | ✅ **Oportunidade amplificada** — "ALTA CONVICÇÃO" |
| Opportunity baixo (sobrecomprado) | ⚠️ **Risco amplificado** — "ALTO RISCO / EVITAR" |
| Beta baixo (<1.2) | Neutro — não muda muito o sinal |

---

## 4️⃣ REGIME DE LIQUIDEZ (vento, não muro)

**Comprovado:** a direção do Fed sozinha NÃO prevê nada.
- 2023: aperto do Fed + NVDA **+240%** (cortar alavancagem teria feito perder)
- 2008: corte de juros + mercado **-50%** (alavancar teria destruído)

Conclusão: o price action que você já usa **já contém a liquidez digerida**. Regime não é botão de liga/desliga — é o tamanho da coleira.

### Termômetros (direção apenas — barato, público)

| Termômetro | Hostil quando |
|-----------|---------------|
| **DXY** (dólar global) | Subindo forte (aperto de liquidez) |
| **Spread de crédito** (HYG/IEI) | Abrindo (risco subindo) |
| **Índice vs sua MM200** | Abaixo da MM200 |

**Regra:** 2 de 3 hostis → **modo stop-curto** (mantém alavancagem cheia, encurta o stop).

> Em regime hostil você **não desiste do trade** — só paga **menos** pra descobrir se está errado.
> Captura a NVDA de 2023; se virar faca, sai com -8% em vez de -25%.

---

## 5️⃣ SELO DIVIDENDO BLINDADO 🏆

Para B&H alavancado **sem carry**, DY alto sustentável é o ativo dos sonhos: você segura anos, o preço se recompõe, e o fluxo de 20–30% pinga sobre a posição cheia.

### ⚠️ A verdade que o entusiasmo esconde
- Na **data-ex** a cotação cai o valor do provento — e isso também é amplificado pela alavancagem.
- O edge real só aparece **segurando através da recuperação** (longo prazo) — não no curto.
- Se bater o stop **antes da data-com**, você perde o provento E leva prejuízo amplificado.

### ✅ Checklist Barsi — DY ouro vs cilada (mercado BR)

| Sinal | Ouro ✅ | Cilada ❌ |
|-------|---------|-----------|
| Payout / lucro recorrente | < 90% | > 100% (paga do caixa/dívida) |
| Origem do lucro | Operacional recorrente | Venda de ativo, reversão de provisão, ganho fiscal |
| DY de evento único | Recorrente | Extraordinário anualizado |
| Dívida Líquida / EBITDA | < 3x | > 3x distribuindo muito |
| Consistência | 5–10 anos crescente/estável | Um ano bom isolado |
| Setor | Regulado/concessão (energia, saneamento) ou banco bom | Cíclica de commodity no topo do ciclo |
| JCP recorrente | Sim (gestão madura) | — |

**Ouro real (BR):** TAESA, ENGIE, SAPR, BBAS3 — regulado/banco, consistente, via JCP.
**Cilada (BR):** Petrobras DY 30%+ (2022/23, extraordinário + político), frigoríficos/mineradoras no pico.

### Score "Qualidade do Dividendo"
```
Sustentabilidade do payout (sobre lucro recorrente)   ▲ peso alto
Consistência histórica (anos consecutivos)            ▲ peso alto
Recorrência (penaliza evento único)
Bônus setor regulado / penalidade cíclica
Saúde financeira (Dív/EBITDA, cobertura de juros)
Bônus JCP recorrente
× Multiplicador de risco de stop (penaliza volátil + perto de data-com)
```

### 🔑 Como o Selo interage com stop e sizing (síntese Barsi × Druckenmiller)

**O Selo recompensa no TAMANHO, nunca afrouxando a corda:**
1. **Stop por ATR/volatilidade** → blindado de baixa vol nasce com stop apertado → carrega **mais alavancagem** na mesma trava 40%/6%.
2. **DY projetado entra no numerador do R:R** → assimetria melhor → posição maior.
3. **Selo = bônus de ranking + destaque visual** 🏆.

**Stop de preço no blindado = DESALAVANCAGEM, não venda total:**

| Evento | Ativo normal | Dividendo Blindado |
|--------|-------------|--------------------|
| Bate stop de preço | Sai 100% | **Desalavanca** (ex: 3x→1x), mantém núcleo recebendo dividendo |
| Sai de vez (stop de TESE) | — | Corte de dividendo • quebra de concessão • lucro recorrente cai • intervenção política/regulatória |

> *"Disciplina na alavancagem, paciência na tese. O stop protege o jogador; o dividendo ganha o jogo."*

---

## 6️⃣ SIZING por ASSIMETRIA (não por faixa de score)

Alavancagem amarrada na razão **Risco:Retorno até o stop** — não no score. (Druckenmiller)

| Razão R:R | Alavancagem |
|-----------|-------------|
| < 2:1 | **Não opera** — não vale a corda |
| 2:1 a 3:1 | 1x a 2x |
| 3:1 a 5:1 | 2x a 3x |
| 5:1+ | 3x a 4x (4x só se Qualidade ≥ 85) |

### 🔒 Trava de ferro (protege a conta)
```
perda máxima até o stop  ×  alavancagem  ≤  40% da posição individual
                                          E  ≤  6% do patrimônio total por tese
```

> *"O tamanho é decidido pela perda, nunca pelo sonho."*

### ⚠️ Emenda Pabrai — R:R deve medir o downside FUNDAMENTAL, não só o preço
O stop de preço mede risco de **volatilidade**. A assimetria de verdade (Dhandho) mede o
**precipício**: quanto perco se a TESE estiver errada (vira metade do book? vira zero?).
→ Dimensionar pelo **downside fundamental**; o stop de preço serve só à sobrevivência.

### 🏦 Camada de PORTFÓLIO (emenda Pabrai + Miller) — fora do score do ativo
> O investidor tirou correlação do *score do ativo* (decisão mantida). Estas travas vivem
> na camada de **portfólio** — que é justamente o domínio do gestor.

| Trava | Regra |
|-------|-------|
| **Exposição bruta agregada** | Teto da SOMA de todas as alavancagens (3 teses a 6% correlacionadas ≠ 18% seguros) |
| **Correlação agregada** | Limite de exposição a ativos que se movem juntos (correlação → 1 na crise) |
| **Gatilho de choque de crédito** | Iliquidez/crédito abrindo → **desalavanca TUDO de uma vez**, não tese por tese |

> Miller: *"O portão de qualidade não pega quebra de regime de crédito. Fundamentos são retrovisor — em 2008 pareciam 'melhorando' até 2 trimestres antes do buraco."*

### ⏱️ Trava de DURAÇÃO — OPCIONAL (corrigida)
> ⚠️ **Correção:** a Quantfury **NÃO cobra taxa de manutenção de alavancagem**. Sem carry,
> o tempo **não sangra** a posição — a ruína-pelo-tempo do Miller (pensada para carry) NÃO
> se aplica aqui. O único risco de segurar é o **preço**, já coberto pelo stop de preço.
>
> Portanto a trava de duração **não é regra de sobrevivência** — vira uma regra **opcional de
> custo de oportunidade**: capital travado numa tese que não anda há X meses poderia estar
> rendendo em outra. Usar só se houver fila de oportunidades melhores competindo pelo capital.

---

## 7️⃣ STOPS — duas camadas

### Stop de PREÇO (mecânico, não-negociável)

| Classe | Regime favorável | Regime hostil (curto) |
|--------|------------------|------------------------|
| Ação EUA large cap | -15% | -8% |
| Ação BR | -18% | -10% |
| Crypto | -25% | -15% |

> Referência alternativa: abaixo do último higher low, ou stop por ATR — o que for mais apertado.
> Blindado: stop de preço dispara **desalavancagem**, não venda.

### Stop de TESE (operacionalizado — emenda Greenblatt)
> *"Stop de tese discricionário é a porta dos fundos por onde a emoção volta."*
> → Vira **gatilho objetivo**, não sentimento. Discricionário só 1–2×/ano, auditado.

Sai mesmo no lucro quando dispara um gatilho objetivo:
- **ROIC caiu por 2 trimestres seguidos** (tese de qualidade quebrou)
- **FCF ficou negativo**
- Dividendo cortado (para blindados)
- Quebra de concessão / intervenção regulatória ou política
- Ativo não recupera após X meses (ver Trava de Duração)

**Regra absoluta:** nunca fazer average down em posição alavancada perdedora.
*(Miller: average down é estratégia de solvência; alavancagem mata a solvência. -33% a 3x já zera.)*

---

## 8️⃣ Ajustes de mercado BR

- **Taxa livre de risco no Kelly:** ativo `.SA` → usa **SELIC** (não 4,5% americano). Ativo EUA → Treasury 4,5%. Crypto → 0%.
- **Câmbio:** ação EUA para investidor BR é aposta dupla (ativo + USD/BRL) — sinalizar exposição cambial.
- **Liquidez mínima:** volume médio diário mínimo antes de entrar no ranking (evita small cap sem liquidez para margem).

---

## ⚖️ Regras gravadas em pedra (topo do sistema)

1. **"Não arrisco pra ter razão. Arrisco pra ganhar muito quando acerto e perder pouco quando erro — e o tamanho é decidido pela perda, nunca pelo sonho."** (Druckenmiller)
2. **Qualidade é portão, não peso.** Lixo não ranqueia.
3. **Nunca pegue faca caindo** — desconto só pontua após reversão confirmada.
4. **Regime hostil encurta o stop, não corta a alavancagem.**
5. **Selo Blindado recompensa no tamanho, jamais na corda.**
6. **Nunca average down alavancado.**
7. **Capital preservado é munição.** Sobreviver vem antes de prosperar.
8. **Choque de crédito desalavanca tudo de uma vez** — não tese por tese.
9. *(Sem carry na Quantfury: tempo não sangra — trava de duração é só custo de oportunidade, opcional.)*

---

---

## ✅ RATIFICAÇÃO (gestores de B&H alavancado / convicção concentrada)

| Gestor | Nota | Pilar ratificado | Emenda |
|--------|------|------------------|--------|
| **Bill Miller** | 8,5 | Alavancagem + segurar na queda | Trava de duração + gatilho de crédito |
| **Mohnish Pabrai** | 7,5 | Sizing + assimetria (Kelly) | Exposição agregada + R:R fundamental |
| **Joel Greenblatt** | 7,0 | Arquitetura de ranking | Colapsar timing redundante + stop de tese objetivo |

**Veredito unânime: aprovado para produção com emendas. Nenhuma falha fatal.**

> **Validação obrigatória antes de operar real (Greenblatt):** backtest com
> **walk-forward / out-of-sample** e vigilância de **turnover** (4 indicadores de timing
> giram a carteira; atrito alavancado come o retorno). *"Backtest sem isso é ficção
> científica com gráfico bonito."*

---

## 🪙 SCORE DE CRYPTO (framework separado — ratificado por Pal, Hayes, Woo)

> Notas: Raoul Pal 7 · Arthur Hayes 6,5 · Willy Woo 7 — todos "ajustar". Versão abaixo já
> incorpora as correções. Crypto NÃO usa fundamentos, dividendo, Beta vs SPY ou SELIC.

### Por que é separado
- Vol 60–120% e drawdown -80% são **ciclo normal** → curvas recalibradas.
- Sem fundamentos → substituídos por **on-chain**. Liquidez global em dólar é o **driver-mor**.

### 1️⃣ Portão de Sobrevivência (probabilidade de não ir a zero)
| Componente | Peso |
|-----------|------|
| Liquidez real (volume + profundidade de book) | 30% |
| Market cap rank / Dominância | 25% |
| Saúde on-chain (z-score adaptativo por consenso: endereços ativos↑, NVT signal, Gini/distribuição, hash rate PoW ou valor staked PoS) | 25% |
| Efeito Lindy (idade + ciclos de bear sobrevividos) | 20% |

> **Woo:** alt **sem on-chain confiável** → zera o componente on-chain, re-normaliza, e leva
> **penalidade no portão** (teto de score menor). Não exclui — penaliza. Tier-1/2 com liquidez passa.

### 2️⃣ REGIME DE LIQUIDEZ — domina (≈60% do composto, Pal)
> *"A liquidez é o oceano. Não lute contra o banco central."* Crypto segue a **2ª derivada** da liquidez.

| Termômetro | Medida |
|-----------|--------|
| **Liquidez líquida global** | Soma balanços top-5 BCs em USD − RRP − TGA, **taxa YoY** |
| **Carry do iene (USD/JPY)** | Desmonte do carry derruba crypto (ago/2024) |
| **Impulso de crédito China** | Liderança de risco |
| **Crédito HY (spreads OAS)** | Risco sistêmico |
| **DXY** | Proxy inverso de liquidez |
| **Dominância BTC** | Rotação BTC ↔ alts |
| **Ciclo de halving** | Peso baixo (5–10%) — é a liquidez que coincide |

→ Alavancagem **dinâmica**: máximo só em liquidez expansiva + drawdown contido; 1x/spot em regime hostil.

### 3️⃣ TIMING (≈40% — on-chain estrutural + tático, Woo)
| Componente | Peso | Papel |
|-----------|------|-------|
| **MVRV-Z Score** | 30% | Carro-chefe (substitui MVRV+NUPL, que são redundantes) |
| **Reserve Risk** | 20% | Convicção do holder LP — piso = oportunidade geracional |
| **Funding rate** (contrarian) | 20% | Negativo = capitulação/compra |
| **Puell Multiple** | 15% | Lado da oferta (capitulação de mineradores) |
| **SOPR / LTH-SOPR** | 15% | Gatilho tático (reset em 1) |

> MM200 semanal + Desconto do ATH×Reversão = **confirmação tática leve** (peso reduzido —
> sobrepõem MVRV, que já mede preço vs custo-base). On-chain = estrutural; técnico = gatilho.

**Sinais de ciclo:**
- 🟢 **FUNDO (comprar alavancado):** MVRV-Z < 0 + Reserve Risk no piso + Puell < 0,5
- 🔴 **TOPO (desalavancar):** MVRV-Z em percentil extremo + NUPL > 0,75 (euforia) + SOPR alto persistente. *Sair MUITO antes do topo absoluto.*

### 4️⃣ ⚡ CIRCUIT BREAKER de liquidação em cascata (Hayes — binário, não ponderado)
```
OI > p90 histórico  E  funding > p90  →  flag "SOBREALAVANCADO"
→ TRAVA novas entradas alavancadas + força sizing 1x
```
> *"Funding alto não é bom, é o cheiro de gasolina antes do fósforo."*

### 5️⃣ SIZING & STOPS (mais conservador — corrige o erro do stop intraday)
| Ativo | Alavancagem máx |
|-------|-----------------|
| BTC | 2x |
| ETH | 1,75x |
| Top-10 | 1,25x |
| Resto / sem on-chain | 1x (ou fora) |

> 🔴 **Hayes — stop NÃO é intraday.** Pavios de -30/-40% revertem em minutos e te liquidam no
> fundo. Stop **estrutural por FECHAMENTO SEMANAL**, longe da zona de liquidação E do ruído de wick.
> Aguenta o pavio; só sai em quebra confirmada no fechamento.

- Risk-free no Kelly = **0%** (sem ativo livre de risco crypto). Sem Selo Dividendo.
- Atenção ao **preço de liquidação real** (sem carry, mas liquidação existe).

---

## ✅ MODELO COMPLETO — todas as peças fechadas e ratificadas por 9 perspectivas.
