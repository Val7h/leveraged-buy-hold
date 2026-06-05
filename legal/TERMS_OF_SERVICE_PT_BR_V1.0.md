# TERMOS DE SERVIÇO - LBH SYSTEM
**Versão:** 1.0  
**Data de Vigência:** 5 de Junho de 2026  
**Última Atualização:** 5 de Junho de 2026

---

## 1. ACEITAÇÃO DOS TERMOS

Ao acessar, registrar-se ou usar a plataforma **LBH System** (doravante "Plataforma", "Serviço" ou "nós"), você concorda em ficar vinculado por estes Termos de Serviço ("ToS"). Se você não concorda com qualquer disposição, não use a Plataforma.

**Vigência:** Estes termos entram em vigor na data acima e continuam enquanto você usar a Plataforma, salvo rescisão por qualquer parte.

**Modificações:** Reservamos o direito de modificar estes termos a qualquer momento. Notificaremos mudanças significativas com **30 dias de antecedência** via email. Seu uso contínuo após as alterações constitui aceitação.

---

## 2. DESCRIÇÃO DOS SERVIÇOS

A Plataforma fornece ferramentas de análise quantitativa para investidores individuais:

### 2.1 Serviços Fornecidos
- **Screening de ações:** Análise de ações cotadas (dados públicos)
- **Scorecard de risco:** Métricas como VaR, Índice de Sharpe, Beta
- **Backtesting:** Simulação histórica (2004-2024)
- **Monte Carlo simulation:** Simulação de cenários possíveis
- **Alertas:** Notificações baseadas em indicadores técnicos (RSI, volatilidade, etc.)
- **Alavancagem opcional:** Cálculo de leverage recomendado (1x-2.5x)

### 2.2 O que NÃO fazemos
- ❌ **Não gerenciamos sua carteira:** Você executa todos os trades pessoalmente
- ❌ **Não somos consultores de investimento:** Não fornecemos consultoria personalizada sobre qual ativo comprar/vender
- ❌ **Não garantimos resultados:** Performance passada ≠ performance futura
- ❌ **Não operamos conta de margem:** Você usa um broker independente (Quantfury, B3, etc.)
- ❌ **Não executamos ordens:** Você controla completamente suas transações

---

## 3. RISCOS E LIMITAÇÕES

**VOCÊ ASSUME 100% DO RISCO DE INVESTIMENTO.**

Entender os riscos abaixo é essencial antes de usar a Plataforma, especialmente se usar leverage:

### 3.1 Risco de Mercado
- Ações podem cair 10%, 20%, 50% ou mais em um ano
- Exemplo: Em 2008, S&P 500 caiu -57%
- Exemplo: Em 2020 (COVID), caiu -34% em 1 mês (depois recuperou)
- **Cenário extremo:** Seu investimento pode desaparecer completamente

### 3.2 Risco de Alavancagem
- **1x leverage:** Se S&P cai 10%, você perde 10%
- **2x leverage:** Se S&P cai 10%, você perde 20%
- **2.5x leverage:** Se S&P cai 10%, você perde 25%
- **Risco matemático:** Com 2.5x leverage em um crash de -40%, seu capital é -100% (ruína total)

### 3.3 Risco de Liquidação Automática
- Se seu capital cair abaixo de um limiar (ex: 50% de margin ratio), sua posição é **liquidada automaticamente**
- Você **NÃO receberá notificação prévia**
- A liquidação ocorre em **segundos ou minutos**
- Você pode perder todo o seu investimento inicial

### 3.4 Risco do Modelo
- VaR 95% = risco de 1 em 20 de perder mais que o previsto
- Nosso modelo de scoring assume correlação histórica (pode mudar)
- Volatilidade pode explodir (aumentar 5x em dias)
- Algoritmo pode underperform em condições de mercado inéditas

### 3.5 Risco de Sistema
- Alertas podem **falhar** (falha de email, notification bloqueada no seu navegador)
- Website pode ficar **offline** (crash de servidor, DDoS, falha de cloud provider)
- Dados podem ser perdidos (falha de backup — improvável mas possível)
- **Resultado:** Você pode não receber aviso crítico quando deveria

### 3.6 Risco de Liquidez
- Vender grande volume de ações pode **mover o preço** (baixa liquidez)
- Mercado pode **abrir em gap** (-20% da noite para o dia)
- Negociação pode ser **interrompida** (circuit breaker)

### 3.7 Risco de Dados
- Dados históricos de preços podem conter **erros ou omissões**
- Splits de ações ou dividendos especiais podem afetar cálculos
- Dados em tempo real podem ter **atrasos** (15-30 minutos)

---

## 4. ELEGIBILIDADE E CONSENTIMENTO

Ao usar a Plataforma, você confirma:

- ✅ Você é **maior de 18 anos** de idade
- ✅ Você é um **investidor sofisticado** (entende leverage, margin calls, liquidação)
- ✅ Você leu e compreende o **Aviso de Risco de Alavancagem** (popup na primeira vez)
- ✅ Você leu esta **Política de Privacidade** (seção 5)
- ✅ Você **NÃO está buscando consultoria de investimento personalizada** (não somos advisors)
- ✅ Você pode perder **TODO o seu investimento** e está preparado para esse cenário
- ✅ Seus dados pessoais podem ser processados conforme descrito na Privacy Policy

---

## 5. PRIVACIDADE E PROTEÇÃO DE DADOS

Sua privacidade é governada pela **Política de Privacidade** anexa (veja arquivo `PRIVACY_POLICY_PT_BR_V1.0.md`).

**Resumo rápido:**
- Coletamos: Nome, email, CPF, preferências de risco, histórico de trades
- Usamos para: Personalizar screening, calcular score, compliance (CVM/LGPD)
- Compartilhamos com: Quantfury (para executar trades), Financial Modeling Prep (dados)
- Retenção: Até 2 anos após você deletar sua conta (LGPD)
- Direitos: Você pode exportar dados ou deletar conta a qualquer momento

---

## 6. DIREITOS DE PROPRIEDADE INTELECTUAL

### 6.1 Nossa Propriedade
- Screener, algoritmo de scoring, modelo de Monte Carlo = propriedade exclusiva de LBH System
- UI/UX, código-fonte, documentação = protegidos por copyright
- Você não pode copiar, modificar, vender ou distribuir sem autorização

### 6.2 Seus Direitos
- Você pode usar a Plataforma para seu **benefício pessoal** apenas
- Você não pode: usar para fins comerciais, revender, fazer scraping de dados
- Você não pode: descompilar, fazer engenharia reversa, tentar hackear

### 6.3 Conteúdo Gerado por Usuário
- Análises, comentários, feedback que você compartilha = permissão para nós usá-los (sem compensação)
- Nós não reivindicamos propriedade, mas temos direito de usar para melhorar Plataforma

---

## 7. LIMITAÇÃO DE RESPONSABILIDADE ⭐ CRÍTICO

### 7.1 Isenção de Garantias
A Plataforma é fornecida **"COMO ESTÁ"** e **"CONFORME DISPONÍVEL"**, SEM GARANTIAS.

Especificamente, **NÃO garantimos:**
- ✗ Acurácia de dados ou modelos
- ✗ Performance passada prediz performance futura
- ✗ Disponibilidade 100% (downtime possível)
- ✗ Ausência de bugs ou erros
- ✗ Conformidade com suas necessidades específicas
- ✗ Que alertas serão entregues em tempo real
- ✗ Que liquidação será executada corretamente

### 7.2 Indenização Limitada
**EM NENHUMA CIRCUNSTÂNCIA SEREMOS RESPONSÁVEIS POR:**

- 💔 **Perda de capital**, seja parcial ou total
- 💔 **Lucros cessantes** (ganhos que você deixou de fazer)
- 💔 **Danos indiretos, incidentais ou punitivos**
- 💔 **Falha de sistema, downtime ou lag**
- 💔 **Atraso ou falha de alertas**
- 💔 **Erro de dados, bugs ou falhas de execução**
- 💔 **Perda de dados (backup failure)**
- 💔 **Qualquer prejuízo financeiro causado por uso da Plataforma**

**Mesmo que tenhamos sido avisados da possibilidade de tal dano.**

### 7.3 Limite de Indenização Máximo
Nossa responsabilidade máxima por qualquer reclamação é **o valor das taxas que você pagou nos últimos 12 meses** (ou R$100, o que for maior).

### 7.4 EXCEÇÃO: Violação de LGPD
Se violarmos a Lei Geral de Proteção de Dados (LGPD) — especificamente, se seus dados pessoais forem expostos por negligência nossa — nossa responsabilidade é **ILIMITADA** (conforme LGPD Art. 42).

---

## 8. RESCISÃO E ENCERRAMENTO

### 8.1 Rescisão por Você
- Você pode **deletar sua conta a qualquer momento** via Settings → Account → Delete
- Após deletar: Seus dados serão anonimizados em 30 dias (ou conforme LGPD)
- Saldo não sacado: Será reembolsado em 5-10 dias úteis

### 8.2 Rescisão por Nós
Podemos suspender ou encerrar sua conta se você:
- Violar estes Termos
- Participar de fraude, hacking ou abuso
- Usar Plataforma para atividades ilegais
- Reiterado abuso de sistema (spam, flood, DDoS)

**Aviso:** Tentaremos dar 7 dias de aviso, mas podemos revogar acesso imediatamente em caso de abuso grave.

### 8.3 Consequências
- Sua conta será desativada
- Seus dados será preservado por 30 dias (em caso você queira exportar)
- Após 30 dias: Dados deletados (conforme LGPD)

---

## 9. LEI APLICÁVEL E FORO

### 9.1 Jurisdição
- Estes Termos são regidos pela **Lei Brasileira**
- Aplicáveis: CVM (investimentos), LGPD (dados), CDC (proteção do consumidor)

### 9.2 Disputa
- Foro: **São Paulo, Brasil**
- Via: Mediação (tentaremos resolver) → Arbitragem (se necessário) → Tribunal (último recurso)

### 9.3 Arbitragem (Opcional)
- Se preferir arbitragem em vez de tribunal: nos avise por email
- Arbitro: Selecionado por ambas as partes
- Local: São Paulo

---

## 10. DISPOSIÇÕES GERAIS

### 10.1 Severabilidade
Se qualquer disposição for inválida, as demais permanecem em vigor.

### 10.2 Acordo Completo
Este ToS, Privacy Policy, e Risk Disclosure constituem o acordo completo entre nós. Não há outros acordos, verbais ou escritos.

### 10.3 Cesión
Você não pode ceder seus direitos sob este ToS. Nós podemos ceder (ex: se vendemos a empresa) com aviso.

### 10.4 Sem Renúncia
Se não exigirmos um direito em um momento, isso não significa que renunciamos a esse direito no futuro.

---

## 11. ATUALIZAR ESTES TERMOS

**Como notificamos:**
- Atualizações significativas: Email 30 dias antes
- Pequenas correções: Atualizadas sem aviso

**Como você aceita:**
- Usar a Plataforma após notificação = aceitação

**Histórico:**
- Versão 1.0 (5 de Junho, 2026): Initial version

---

## 12. CONTATO

**Dúvidas sobre estes Termos?**

📧 **Email:** legal@lbhsystem.com  
📞 **Telefone:** [+55 11 XXXX-XXXX]  
🏢 **Endereço:** [Endereço da empresa no Brasil]

---

## ASSINATURA / ACEITAR

Ao clicar em "Aceitar" abaixo, você confirma que:
- Leu e compreendeu todos os Termos
- Você concorda em ficar vinculado por estes Termos
- Você reconhece os riscos acima e os aceita voluntariamente

**☑️ Aceito os Termos de Serviço (data e IP serão registrados para compliance)**

---

**Versão:** 1.0 | **Efetivo:** 5 de Junho, 2026 | **Próxima Revisão:** Dezembro, 2026
