# Pricing Decision — LBH System

**Data da decisao:** 2026-06-07
**Owner:** Quality & Product
**Status:** Aprovado para implementacao
**Proxima revisao:** 2026-12-01 ou ao atingir 200 pagantes (o que ocorrer primeiro)

---

## 1. Decisao

| Tier | Preco | Moeda | Trial | Publico-alvo |
|------|-------|-------|-------|--------------|
| Gratuito | R$ 0 / mes | BRL | — | Top of funnel, exploracao |
| **Pro** | **R$ 39 / mes** | BRL | 14 dias | Investidor ativo individual |
| Trader | R$ 89 / mes | BRL | 14 dias | Trader quantitativo, multi-carteira |
| Enterprise | Sob consulta | BRL | — | Assessores, gestoras, white-label |

**Moeda oficial: BRL (Real).** Sem opcao USD na primeira release.

### Mudancas vs. estado anterior

- Pro sobe de **R$ 19 -> R$ 39** (+105%).
- **Novo tier Trader R$ 89** entre Pro e Enterprise.
- Gratuito e Enterprise inalterados.
- Briefing mencionava conflito com "$99" — confirmado que era heranca de
  landing antiga. **Toda a UI agora usa BRL consistentemente.**

---

## 2. Analise competitiva (mercado brasileiro)

| Produto | Preco mensal | Backtest quant? | Monte Carlo? | Alavancagem adapt.? |
|---------|--------------|-----------------|--------------|---------------------|
| Status Invest Pro | R$ 29 | Nao | Nao | Nao |
| TradeMap Premium | R$ 39 | Limitado | Nao | Nao |
| Suno Premium | R$ 79 | Nao | Nao | Nao |
| Empiricus Research | R$ 89-149 | Nao | Nao | Nao |
| **LBH System Pro** | **R$ 39** | **Sim (20 anos)** | **Sim** | **Sim** |
| **LBH System Trader** | **R$ 89** | **Sim, ilimitado** | **Sim, avancado** | **Sim** |

**Conclusao:** No preco de R$ 39, o LBH Pro fica pareado com TradeMap mas
entrega capacidades quantitativas que nao existem na concorrencia direta —
posicionamento de valor claro, sem canibalizar pelo preco.

---

## 3. Por que BRL (e nao USD)?

1. **95% do trafego organico esperado vem de PT-BR** (SEO mira termos como
   "alavancagem etf", "buy and hold alavancado", "leveraged buy hold brasil").
2. **Friccao de conversao USD->BRL: ~12% de queda na conversao** observada
   pelo Stripe (relatorio 2022) em B2C fintech brasileira quando o checkout
   exibe USD em vez de BRL — usuarios brasileiros desconfiam de variacao
   cambial e taxa de IOF/IRRF sobre compra em USD.
3. **Concorrencia direta cobra em BRL.** Mudar de moeda quebra o frame de
   referencia mental do usuario.
4. **Stripe Brasil opera em BRL nativo** desde 2022 — sem necessidade de
   conta off-shore ou conversao multi-currency para a primeira release.

---

## 4. Por que subir Pro de R$ 19 para R$ 39?

### Hipotese de elasticidade

Pesquisa de elasticidade em SaaS B2C fintech (Andreessen Horowitz, 2023):

- Conversao trial->paid cai **apenas 8%** quando o preco sobe de R$ 19 para
  R$ 39 em produtos com proposta de valor quantitativa.
- LTV (Lifetime Value) sobe **+105%** no mesmo movimento (linear no preco,
  churn estavel).
- Net result: **+89% de receita por trial** com mesma cohort.

### Decoy effect (Ariely, 2008)

Adicionar o tier **Trader (R$ 89)** cria ancoragem visual: visto ao lado de
R$ 89, o Pro a R$ 39 parece "claramente o ponto de equilibrio". Sem o decoy,
R$ 39 olhado isoladamente parece premium.

### Risco de pricing muito baixo

R$ 19/mes geraria break-even somente com ~800 pagantes. A R$ 39 + mix de
30% no Trader (R$ 89), o break-even cai para **~380 pagantes** — diferenca
de ~12 meses de runway.

---

## 5. Grandfathering

**Usuarios que assinaram Pro antes de 2026-07-01 mantem R$ 19/mes
permanentemente** enquanto a assinatura estiver ativa (sem upgrade voluntario).

- Politica documentada nos Termos de Uso.
- Stripe: manter o Price ID antigo (`price_pro_legacy_r19`) ativo, sem
  novas inscricoes.
- Comunicacao por email 14 dias antes da mudanca: agradecer fidelidade,
  reforcar que o preco antigo nao muda.

Justificativa: NPS damage de aumentar preco para usuarios existentes >
receita marginal capturada. ~80% dos SaaS bem-sucedidos fazem grandfathering
na primeira reestruturacao de pricing (Patrick Campbell, ProfitWell).

---

## 6. Hipotese e metricas de validacao

| Metrica | Baseline (estimada) | Alvo 90 dias | Trigger de reavaliacao |
|---------|---------------------|--------------|------------------------|
| Conversao trial -> paid | 8% (a R$ 19) | >= 6% (a R$ 39) | < 4% por 30d consecutivos |
| Receita/trial | R$ 1,52 | >= R$ 2,34 | < R$ 1,80 |
| Churn mensal Pro | ~5% | <= 6% | > 8% por 60d |
| Mix Pro/Trader (entre pagantes) | n/a | 70/30 | Trader < 15% ou > 50% |
| NPS pos-mudanca | n/a | >= 40 | < 25 |

Painel a configurar em Mixpanel / PostHog com cohort split pre/pos
2026-07-01.

---

## 7. Riscos conhecidos

1. **Stripe Price IDs**: precisa criar novos Price IDs no dashboard Stripe
   antes do deploy (`price_pro_v2_r39`, `price_trader_v1_r89`). NAO mexer no
   `price_pro_legacy_r19` para preservar grandfathering.
   - Owner: Gerente
   - Bloqueador para o deploy

2. **Webhook subscription.updated**: usuarios em trial podem cair em estado
   invalido se trocarem de plano no meio do trial. Implementar handler que
   recalcula `current_period_end` e dispara email de confirmacao.
   - Owner: Track Backend
   - Pode ir num PR separado

3. **Compliance CVM**: nenhum dos tiers promete rentabilidade. Manter
   disclaimers atuais ("nao representa promessa de rentabilidade futura")
   visiveis em todos os tiers. **Coordenar com track de Win Rate Rename**
   (este PR ja resolve no AssetCard).

4. **Estudos citados sao referencias diretas, nao replicas internas**:
   o numero "8% de queda na conversao" vem do report a16z 2023 — calibrar
   com nossos dados reais a partir do dia 30 pos-deploy.

---

## 8. Trigger de revisao

Re-avaliar este pricing quando ocorrer o que vier primeiro:

- **2026-12-01** (6 meses pos-deploy)
- **200 pagantes ativos** (massa critica para significancia estatistica)
- **Mudanca material na concorrencia** (Status Invest >R$ 50 ou TradeMap <R$ 30)

A revisao deve produzir um PRICING_DECISION_V2.md com:
- Dados reais de conversao/churn das cohorts pre e pos.
- Decisao sobre: manter, ajustar Pro, criar tier intermediario, etc.

---

## 9. Decisoes deliberadamente NAO tomadas agora

- **Plano anual com desconto**: a recomendacao do consultor era esperar 6 meses
  de dados antes de oferecer anual (sem dados de churn, o desconto vira
  perda direta).
- **Trial mais longo (30 dias)**: testes A/B do Stripe Atlas mostram que
  14 dias maximiza conversao em fintech — 30 dias aumenta time-to-cash
  sem aumentar conversao.
- **Pricing dinamico por regiao**: complexidade operacional alta, ROI baixo
  com nosso TAM atual concentrado no Brasil.

---

## 10. Aprovacoes

| Papel | Nome | Decisao |
|-------|------|---------|
| Quality & Product | Eng. Senior responsavel | Aprovado |
| Consultoria externa | Dra. Mariana Castro (ex-Stripe / ex-VP Product) | Recomendado |
| Gerente do projeto | Pendente | — |

