# LBH SYSTEM - AVALIAÇÃO JURÍDICA E REGULATÓRIA
## Sprint 1: Assessment Compliance + Documentos Legais

**Data:** 5 de Junho de 2026  
**Preparado por:** Legal / Compliance Team  
**Status:** ⚠️ CRÍTICO - Requer decisão executiva antes do lançamento  
**Deadline para decisões:** 8 de Junho (D3)

---

## EXECUTIVE SUMMARY

O LBH System é uma plataforma de análise quantitativa de investimentos com alavancagem que **EXIGE conformidade com regulação da CVM (Brasil)**. Nesta análise:

| Item | Achado | Risco |
|------|--------|-------|
| **Licença CVM** | Potencialmente SIM (consultoria de investimentos) | 🔴 CRÍTICO |
| **Alavancagem** | Até 3x permitido por brokers; nosso máximo é 4x | 🟡 ALTO |
| **LGPD** | Sim, aplicável (dados de usuários brasileiros) | 🟡 ALTO |
| **Disclaimers** | Obrigatórios antes de usar leverage | 🔴 CRÍTICO |
| **Termo de Serviço** | Obrigatório + limitações de responsabilidade | 🔴 CRÍTICO |
| **Ready to Launch?** | **NÃO** sem resolver CVM + legal docs | ❌ |

---

# PARTE 1: ANÁLISE REGULATÓRIA

## 1.1 REGULAÇÃO CVM (INSTRUÇÃO 400 + REGULAMENTAÇÃO DE CONSULTORIA)

### Questão Central: Precisa de licença CVM?

**RESPOSTA: Sim, potencialmente SIM.**

#### Por quê?

A CVM classifica atividades de investimento em:

1. **Consultoria de Investimentos** (Instrução CVM 400) → Exige licença
   - Dar recomendação sobre qual ativo comprar/vender
   - Análise de risco específica para o cliente
   - Gerenciamento personalizado de carteira
   
2. **Análise de Investimentos** (Não regulado)
   - Fornecer dados públicos + metodologia
   - Usuário decide sozinho
   - Sem recomendação explícita

**LBH System enquadra-se em: RISCO CINZENTO** ⚠️

- ✅ Não gerencia carteira do usuário (usuário executa trades)
- ✅ Fornece screening baseado em indicadores públicos
- ❌ Recomenda alavancagem por score (próximo a "consultoria")
- ❌ Simula resultado de estratégias (implica recomendação)
- ❌ Alerta RSI abaixo de 30 (gatilho de ação)

#### Risco Legal Se Não Licenciado:
- Multa: **10% a 50% do patrimônio dos usuários prejudicados**
- Bloqueio de operações
- Responsabilidade civil
- Reputação danificada

### Ação Imediata (D1):

```markdown
[ ] Contatar consultoria legal fintech ou CVM
    - Pergunta: "Sistema de screening com score recomendado é consultoria?"
    - Alternativa: Remover "recomendação" e deixar apenas dados
    - Opção B: Buscar licença de consultoria (custos + compliance)
    
Contatos:
- CVM (Brasil): consultapublica@cvm.gov.br
- ANBIMA (se necessário): compliance@anbima.org.br
- Consultoria Fintech: [Indicação futura]
```

---

## 1.2 REGULAÇÃO DE ALAVANCAGEM

### Limite Regulatório x Nossos Modelos

| Broker/Regulador | Alavancagem Máx | Nota |
|---|---|---|
| B3 (Ações) | ~2.5x | Margem requerida |
| Quantfury | ~3x-5x | Precisa validar |
| **Nossas tabelas** | até 4x | 🔴 RISCO |

### Problemas Identificados:

1. **Risco de liquidação instantânea**
   - Em 2008, drawdown foi ~57% (S&P 500)
   - Com 4x leverage: **-228% = ruína total**
   - VaR 95% não protege contra extremos (cauda grossa)

2. **Quantfury pode fechar posições sem aviso**
   - Não é broker regulado (é API de trading)
   - Sem proteção de SLA

3. **Spread e slippage**
   - Backtest usa preço de fechamento
   - Realidade: spread + comissão + slippage = 0.5-2% de custo

### Recomendação:

**Limitar máximo a 2.5x** (padrão B3) até validação de CVM.

```markdown
[ ] Limitar alavancagem máx a 2.5x (não 4.0x)
[ ] Validar Quantfury SLA + liquidação
[ ] Testar drawdown em stress cenários (GFC -57%, COVID -34%, 2022 -19%)
```

---

## 1.3 REGULAÇÃO LGPD (Lei Geral de Proteção de Dados)

### Aplicabilidade: ✅ SIM (OBRIGATÓRIO)

Usuários brasileiros = dados pessoais = LGPD.

| Obrigação | LBH System | Status |
|-----------|-----------|--------|
| **Aviso de coleta** | Coletamos: email, nome, CPF(?), histórico trades | 📝 TODO |
| **Consentimento** | Explícito antes de armazenar | 📝 TODO |
| **Direito de acesso** | Usuário pode baixar seus dados | 📝 TODO |
| **Direito ao esquecimento** | Deletar dados pessoais | 📝 TODO |
| **Data Protection Officer** | Recomendado (opcional se <5000 usuários) | ⚠️ FUTURO |
| **Criptografia dados** | Dados sensíveis devem ser encriptados | 📋 VERIFICAR |
| **Termo de dados** | Necessário (Termo de Serviço + Privacy Policy) | 📝 TODO |

### Multas LGPD:
- 1ª infração: até R$ 50 mil
- Infrações reiteradas: até R$ 50 milhões ou 2% faturamento anual

---

## 1.4 COVENANTS FINTECH BRASIL

Se expandir para múltiplos usuários (100+):

- **Sefazinho Digital** (Receita Federal): Declarar se oferece serviço de investimento
- **COAF** (Conselho de Controle de Atividades Financeiras): Compliance contra lavagem de dinheiro
- **Banco Central**: Se usar qualquer serviço bancário (transferência, depósito)

---

# PARTE 2: DOCUMENTOS LEGAIS OBRIGATÓRIOS

## 2.1 PRIORIDADES E TIMELINE

| Documento | Prioridade | Deadline | Complexidade | Signable? |
|-----------|-----------|----------|--------------|-----------|
| **Risk Disclaimer Modal** | 🔴 CRÍTICA | D7 (12 Jun) | Baixa | Sim (UI) |
| **Terms of Service (ToS)** | 🔴 CRÍTICA | D7 (12 Jun) | Alta | Sim |
| **Privacy Policy (LGPD)** | 🔴 CRÍTICA | D7 (12 Jun) | Alta | Sim |
| **Risk Disclosure** | 🔴 CRÍTICA | D7 (12 Jun) | Média | Sim |
| **Leverage Consent Form** | 🟡 ALTA | D10 (15 Jun) | Média | Sim |
| **Data Processing Agreement** | 🟡 ALTA | D12 (17 Jun) | Alta | Sim |
| **Acceptable Use Policy** | 🟡 ALTA | D14 (19 Jun) | Baixa | Não |

**BLOCKER:** Sem D1-D3 acima, NÃO podemos lançar leverage features.

---

## 2.2 DOCUMENTOS CRÍTICOS (DRAFTS)

### A) RISK DISCLAIMER MODAL (Signable)

**Onde:** Popup antes de qualquer uso de leverage
**Ação:** Checkbox "Entendo os riscos e aceito"
**Log:** Registrar timestamp + IP + consent versão

```markdown
═══════════════════════════════════════════════════════════════
                    ⚠️ AVISO DE RISCO - LEIA COM ATENÇÃO ⚠️
═══════════════════════════════════════════════════════════════

LBH SYSTEM - DISCLAIMER DE RISCO PARA ALAVANCAGEM

Você está prestes a usar ALAVANCAGEM financeira. Leia este aviso completamente.

1. RISCO DE PERDA TOTAL
   - Alavancagem = amplifica GANHOS E PERDAS
   - Com leverage de 2x, uma queda de 50% resulta em PERDA DE 100% (ruína)
   - Você pode perder TODO o seu capital investido e ainda dever dinheiro

2. RISCO DE LIQUIDAÇÃO COMPULSÓRIA
   - Seu broker pode fechar posições SEM AVISO se a margem ficar crítica
   - Preço de venda: pior preço de mercado naquele momento
   - Realizado em cenários de volatilidade extrema

3. RISCO DE MODELO QUANTITATIVO
   - Nossas análises (RSI, score, VaR) baseiam-se em dados históricos
   - Mercado futuro pode NÃO seguir padrões históricos
   - Crises econômicas podem invalidar modelos

4. RISCO DE DERIVAÇÃO DRIFT (Modelo vs. Realidade)
   - Backtests usam preço de fechamento
   - Realidade tem spread, slippage, comissões
   - Retorno real pode ser 1-3% inferior ao simulado

5. RISCO DE LIQUIDEZ
   - Ativos de baixa liquidez podem não ser vendidos rapidamente
   - Spread pode aumentar 5-10x em crises

6. SEM GARANTIA DE RETORNO
   - Nenhuma declaração aqui garante retorno positivo
   - Passado NÃO indica futuro
   - "Simulação Monte Carlo" é cenário possível, não promessa

7. DISCLAIMERS
   ✗ NÃO somos consultor de investimentos registrado na CVM
   ✗ NÃO oferecemos gestão de carteira
   ✗ VOCÊ é responsável por todas as decisões de trading
   ✗ LBH System é fornecido "AS IS" sem garantias

═══════════════════════════════════════════════════════════════
☐ Entendo que alavancagem pode resultar em perda TOTAL do capital
☐ Li e concordo com TODOS os avisos acima
☐ Sou responsável pelos meus trades e aceito os riscos

Versão: 1.0 | Data: 5 Jun 2026 | Aceito em: _______________
═══════════════════════════════════════════════════════════════
```

### B) TERMS OF SERVICE (1-pager outline)

```markdown
═══════════════════════════════════════════════════════════════
LBH SYSTEM - TERMOS DE SERVIÇO (RESUMO JURÍDICO)
═══════════════════════════════════════════════════════════════

1. DEFINIÇÕES
   - "Serviço": plataforma web/app LBH System
   - "Usuário": pessoa que se registra
   - "Conteúdo": dados de mercado, análises, simulações
   - "Leverage": alavancagem financeira

2. LICENÇA E USO
   - LBH System concede licença não-exclusiva para uso pessoal
   - Proibido: revender, modificar, reengineering
   - Uso comercial requer autorização escrita

3. ISENÇÃO DE RESPONSABILIDADE
   ✗ LBH System não é recomendação de investimento
   ✗ Não somos consultor CVM registrado
   ✗ Você é responsável por suas decisões de trading
   ✗ Serviço fornecido "AS IS", sem garantias

4. LIMITAÇÃO DE RESPONSABILIDADE
   - LBH System não é responsável por:
     * Perdas de capital
     * Liquidação compulsória
     * Erro de cálculo em indicadores
     * Indisponibilidade do serviço
     * Falha de broker/Quantfury
   - Responsabilidade máxima: 0 (zero) ou valor pago, o que for menor

5. RISCOS ESPECÍFICOS - LEVERAGE
   - Alavancagem amplifica perdas
   - Você pode perder 100% (ou mais) do investimento
   - Broker pode liquidar sem aviso
   - Modelo é baseado em histórico (não garante futuro)

6. SUSPENSÃO/ENCERRAMENTO
   - Podemos suspender sua conta por:
     * Uso indevido, fraude
     * Violação de ToS
     * Requerimento legal
   - Seus dados serão deletados conforme LGPD

7. LIMITAÇÕES DE TEMPO
   - Seus direitos expiram em 1 ano de inatividade
   - Backups de account deletados após 90 dias de inatividade

8. LIMITAÇÕES TÉCNICAS
   - SLA: Nenhum garantido (best effort)
   - Downtime: até 4h/mês sem penalidade
   - Latência: VaR/Score recalculados 1x/dia

9. DISPUTAS
   - Foro competente: Brasília, DF
   - Lei aplicável: Lei Brasileira
   - Mediação obrigatória antes de arbitragem

10. ALTERAÇÕES
    - Podemos alterar ToS com 30 dias notificação
    - Continuação do uso = aceitar mudanças

═══════════════════════════════════════════════════════════════
Versão 1.0 | Efetiva: 5 Jun 2026 | Última revisão: 5 Jun 2026
═══════════════════════════════════════════════════════════════
```

### C) PRIVACY POLICY (LGPD Compliance)

```markdown
═══════════════════════════════════════════════════════════════
LBH SYSTEM - POLÍTICA DE PRIVACIDADE (LGPD)
═══════════════════════════════════════════════════════════════

1. CONTROLADOR DE DADOS
   - Controlador: [EMPRESA / CPF DO PROPRIETÁRIO]
   - Email: [legal@lbhsystem.com]
   - Endereço: [Brasília, DF]

2. DADOS COLETADOS
   
   a) Essenciais (Registro):
      - Nome completo
      - Email
      - Senha (hash, não plain)
      - Data de nascimento
      - CPF (se houver funcionalidade de transferência)
   
   b) Operacionais:
      - Histórico de trades
      - Carteira simulada
      - Preferências (leverage, alertas)
      - IP, user-agent, timestamp
      - Cookies de sessão
   
   c) Opcionais:
      - Telefone (se 2FA)
      - Documento de identidade (se KYC futuro)

3. BASE LEGAL PARA COLETA
   - Consentimento do usuário (solicitado no registro)
   - Execução de contrato (termos de serviço)
   - Interesse legítimo (segurança, compliance)

4. FINALIDADE DOS DADOS
   ✅ Criar e manter conta
   ✅ Fornecer análises e simulações
   ✅ Enviar alertas (RSI, scores)
   ✅ Segurança e prevenção de fraude
   ✅ Conformidade legal (CVM, COAF)
   ❌ Venda para terceiros
   ❌ Marketing sem consentimento

5. COMPARTILHAMENTO
   - NÃO compartilhamos dados com terceiros, EXCETO:
     * Broker/Quantfury (apenas trades essenciais)
     * Processador de pagamentos (se houver)
     * Autoridades (por obrigação legal)
     * DPO/Consultoria Legal (compliance)

6. RETENÇÃO DE DADOS
   - Enquanto conta ativa: Indefinido
   - Após deleteção: 90 dias (backup)
   - Dados legais (auditoria): 6 anos

7. DIREITOS DO USUÁRIO (LGPD Art. 18)
   
   a) Acesso: Você pode baixar cópia dos seus dados
      - Formato: JSON + CSV
      - Prazo: 15 dias úteis
   
   b) Retificação: Corrigir dados incorretos
      - Solicitar via email
      - Confirmação em 10 dias
   
   c) Deletação: Direito ao esquecimento
      - Deletamos tudo em 30 dias
      - EXCETO registros legais obrigatórios (6 anos)
   
   d) Revogação de consentimento: Parar coleta nova
      - Requerimento: via email a [legal@lbhsystem.com]

8. SEGURANÇA
   - Criptografia: TLS 1.3 (dados em trânsito)
   - Hash: bcrypt/argon2 (senhas)
   - Banco: PostgreSQL (com encriptação de disco)
   - Acesso: Restrito a staff autorizado

9. CONTATO DO DPO (Se nomeado)
   - Email: dpo@lbhsystem.com
   - Hotline: [telefone]

10. ALTERAÇÕES
    - Atualizações: Com 30 dias notificação
    - Data efetiva: [Data]

═══════════════════════════════════════════════════════════════
Versão 1.0 | Efetiva: 5 Jun 2026 | Próxima revisão: 5 Dez 2026
═══════════════════════════════════════════════════════════════
```

### D) RISK DISCLOSURE STATEMENT (Detailed)

```markdown
═══════════════════════════════════════════════════════════════
LBH SYSTEM - DECLARAÇÃO DE RISCOS (DISCLOSURE)
═══════════════════════════════════════════════════════════════

ESTE DOCUMENTO DESCREVE RISCOS MATERIAIS DE USAR LBH SYSTEM.
LEIA ANTES DE USAR QUALQUER RECURSO.

═══════════════════════════════════════════════════════════════
SEÇÃO 1: RISCOS DE MERCADO
═══════════════════════════════════════════════════════════════

1.1 Risco Sistemático (Beta)
    - Beta > 1: Ação sobe/desce mais que mercado
    - Em bear market: ações com beta alto caem mais rápido
    - Exemplo: ação com beta 2.0 cai 20% quando SPY cai 10%

1.2 Risco de Volatilidade
    - Volatilidade alta = preços flutuam muito
    - Mais chances de liquidação (com leverage)
    - Spread de compra/venda aumenta

1.3 Risco de Concentração
    - Se sua carteira tem 50% em 1 ativo: alto risco
    - LBH recomenda diversificação, mas você decide

1.4 Risco de Liquidez
    - Ação de baixa liquidez = difícil sair rápido
    - Spread pode ser 2-5% (vs. 0.01% em ações líquidas)
    - Em crises, até ativos líquidos "congelam"

═══════════════════════════════════════════════════════════════
SEÇÃO 2: RISCOS ESPECÍFICOS DE LEVERAGE
═══════════════════════════════════════════════════════════════

2.1 Risco de Ruína
    - Alavancagem 2x: queda de 50% = perda 100% (você está quebrado)
    - Alavancagem 3x: queda de 33% = ruína total
    - Alavancagem 4x: queda de 25% = perda tudo + dívida
    
    NUNCA aperte leverage ao máximo na mesma ação.

2.2 Risco de Margin Call (Chamada de Margem)
    - Broker: "Seu patrimônio caiu demais, vendo suas posições"
    - Você NÃO escolhe qual vender, nem em que preço
    - Pior cenário: vendidos no pior momento (crash)
    
    Exemplo:
    - Você investe $10k com leverage 2x = $20k de poder de compra
    - Ação cai 40%
    - Seu patrimônio agora é $6k (perda $4k = 40% de $10k)
    - Broker força venda de $10k (perde tudo em 1 dia)

2.3 Risco de Slippage
    - Preço esperado: $100
    - Preço real ao executar: $98-$102
    - Com 100 ações = $200-$400 de perda instantânea
    - Em crises, slippage pode ser 3-5%

2.4 Risco de Comissões/Spreads
    - Quantfury: ~0.1% de spread (estimado)
    - B3: até 0.05% comissão
    - Monte Carlo/Backtest usa preço fechamento
    - Realidade: cada trade custa ~0.15-0.5%
    - 20 trades/ano × 0.5% = 10% drag de retorno

═══════════════════════════════════════════════════════════════
SEÇÃO 3: RISCOS DO MODELO QUANTITATIVO
═══════════════════════════════════════════════════════════════

3.1 Risco de Backtesting (Overfitting)
    - Nossas estratégias foram "testadas" em 20 anos de história
    - Mas: mercado muda, padrões não repetem
    - Exemplo: RSI funcionou em 2000-2020, pode NÃO funcionar em 2026
    - Correlação histórica ≠ Causalidade futura

3.2 Risco de Modelo (Drift)
    - Backtest diz: média de retorno 12% a.a. com volatilidade 15%
    - Realidade em 2026: pode ser 5% com volatilidade 25%
    - "Model drift" = quando realidade diverge do modelo
    
    Cenários:
    - Mudança regulatória (ex: proibir leverage)
    - Mudança tecnológica (ex: AI traders mudam dinâmica)
    - Crise econômica (correlações explodem)

3.3 Risco de "Black Swan" (Evento Raro)
    - VaR 95% = "em 95% dos dias você não perde mais que X"
    - Mas: 5% dos dias, você PODE perder muito mais
    - Exemplo histórico:
      * Março 2020 (COVID): VaR 95% foi violado 15 dias seguidos
      * Valor real de perda: 5-10x pior que esperado
    
    LBH usa "Expected Shortfall" (CVaR) para estimar piores cenários,
    mas NUNCA é 100% acurado.

3.4 Risco de Indicadores (RSI, Stoch, BB)
    - Indicadores técnicos: baseados em padrões históricos
    - Não predizem o futuro, apenas resumem o passado
    - Exemplo: RSI < 30 historicamente = "compra", mas pode cair mais 40%
    - Múltiplas interpretações = conflito de sinais

═══════════════════════════════════════════════════════════════
SEÇÃO 4: RISCOS OPERACIONAIS
═══════════════════════════════════════════════════════════════

4.1 Risco de Plataforma/Downtime
    - LBH não garante 100% uptime
    - Durante downtime: você NÃO pode vender
    - Exemplo: servidor cai às 14h, mercado cai 10% às 14:05
    - Você é liquidado, LBH não tem responsabilidade

4.2 Risco de Broker (Quantfury)
    - Quantfury é API, não broker registrado no Brasil
    - Pode desaparecer, parar serviço, mudar termos
    - Se Quantfury falir: SUA carteira pode desaparecer (sem garantia)
    - Estudar Quantfury antes de usar

4.3 Risco de Dados (Yahoo Finance / Quantfury)
    - Dados podem estar atrasados (5-15 min)
    - Preços podem estar incorretos (bug na API)
    - LBH não verifica 100% acurácia dos dados
    - Decisão baseada em dados ruins = resultado ruim

4.4 Risco Cibernético
    - Sua senha é criptografada, mas "nada é 100% seguro"
    - Recomendação: Use 2FA, senha forte (>16 chars)
    - Se hackeado: você é responsável pelos trades feitos
    - LBH não é responsável por perda por roubo de conta

═══════════════════════════════════════════════════════════════
SEÇÃO 5: RISCOS DE NÃO-CONFORMIDADE
═══════════════════════════════════════════════════════════════

5.1 Risco Regulatório CVM
    - LBH pode NÃO estar em conformidade com CVM
    - CVM pode bloquear a plataforma
    - Seus trades podem ser anulados (cenário extremo)
    - Você pode ter direito a compensação ou reembolso

5.2 Risco Fiscal
    - Ganho de capital em Brasil: 15% IRPF + 0.5% taxa operacional
    - Você é responsável por declarar ganhos ao IR
    - LBH não fornece relatório fiscal automático (TODO)

5.3 Risco de Alavancagem Ilegal
    - Se CVM determinar que 4x leverage é ilegal: você fica exposto
    - Broker pode forçar desvancagem sem aviso
    - Custos de realização podem ser altos

═══════════════════════════════════════════════════════════════
SEÇÃO 6: DECLARAÇÕES DE NÃO-GARANTIA
═══════════════════════════════════════════════════════════════

LBH System NÃO GARANTE:

❌ Retorno positivo (passado ≠ futuro)
❌ Proteção contra todas as perdas
❌ Que indicadores funcionarão em todas as condições
❌ Que simulações são acuradas
❌ Que broker não liquidará sua conta
❌ Que plataforma estará disponível 100% do tempo
❌ Que dados são sempre corretos
❌ Licença CVM ou conformidade total
❌ Que você pode sair da posição quando quiser

═══════════════════════════════════════════════════════════════
SEÇÃO 7: O QUE VOCÊ PODE FAZER
═══════════════════════════════════════════════════════════════

✅ Comece pequeno (exemplo: $500, sem leverage)
✅ Use apenas dinheiro que pode perder
✅ Diversifique (não aposte tudo em 1 ativo)
✅ Estude mercado + análise técnica antes de usar leverage
✅ Configure stop-loss (parada automática de perda)
✅ Use leverage BAIXO (máx 1.5x no início)
✅ Monitore sua carteira diariamente
✅ Entenda cada indicador antes de confiar nele

❌ NÃO use leverage se não entende
❌ NÃO coloque dinheiro que você precisa em 2 anos
❌ NÃO ignore warnings/alerts
❌ NÃO confie 100% em backtests
❌ NÃO trade enquanto emocional

═══════════════════════════════════════════════════════════════
CONFIRMAÇÃO FINAL

Assinando (ou clicando aceitar), você confirma:

☑ Li TODOS os riscos acima
☑ Entendo que posso perder 100% do capital
☑ Entendo que alavancagem é perigosa
☑ Entendo que LBH não é responsável
☑ Sou responsável pelas minhas decisões
☑ Tenho capital que posso perder
☑ Aceito TODOS os riscos descritos

═══════════════════════════════════════════════════════════════
Versão 1.0 | Data: 5 Jun 2026 | Efetiva: 12 Jun 2026
═══════════════════════════════════════════════════════════════
```

---

## 2.3 IMPLEMENTAÇÃO (Frontend)

**Para D7 (12 Junho):**

```typescript
// Modal de Risk Disclaimer (React Component)
// src/components/RiskDisclaimerModal.tsx

interface RiskDisclaimerProps {
  onAccept: () => void;
  onReject: () => void;
}

export const RiskDisclaimerModal: React.FC<RiskDisclaimerProps> = ({
  onAccept,
  onReject,
}) => {
  const [checked, setChecked] = useState(false);
  const [agreedAll, setAgreedAll] = useState(false);

  const handleAccept = async () => {
    if (!agreedAll) return;
    
    // Log consent to database
    const timestamp = new Date().toISOString();
    const ip = await fetch('/api/v1/user/ip').then(r => r.json());
    
    await fetch('/api/v1/legal/consent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'risk_disclaimer',
        version: '1.0',
        accepted: true,
        timestamp,
        ip: ip.ipAddress,
        user_agent: navigator.userAgent,
      }),
    });

    onAccept();
  };

  return (
    <Modal isOpen={true} backdrop="static" keyboard={false}>
      <ModalHeader>
        <h2>⚠️ AVISO DE RISCO - LEIA COM ATENÇÃO</h2>
      </ModalHeader>
      
      <ModalBody style={{ maxHeight: '60vh', overflowY: 'auto' }}>
        {/* Risk disclosure content from section 2.2 above */}
        <div className="risk-content">
          <h3>Você está prestes a usar ALAVANCAGEM financeira.</h3>
          
          <section>
            <h4>1. RISCO DE PERDA TOTAL</h4>
            <p>
              Com leverage 2x, uma queda de 50% resulta em PERDA DE 100%. 
              Você pode perder TODO o seu capital.
            </p>
          </section>

          <section>
            <h4>2. RISCO DE LIQUIDAÇÃO COMPULSÓRIA</h4>
            <p>
              Seu broker pode fechar posições SEM AVISO no pior preço possível.
            </p>
          </section>

          {/* ... more sections */}

          <CheckboxGroup>
            <Checkbox
              label="Entendo que alavancagem pode resultar em perda TOTAL"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
            />
            
            {checked && (
              <>
                <Checkbox
                  label="Li e concordo com todos os avisos"
                  checked={agreedAll}
                  onChange={(e) => setAgreedAll(e.target.checked)}
                />
              </>
            )}
          </CheckboxGroup>
        </div>
      </ModalBody>

      <ModalFooter>
        <Button
          variant="secondary"
          onClick={onReject}
        >
          Rejeitar e sair
        </Button>
        
        <Button
          variant="danger"
          onClick={handleAccept}
          disabled={!agreedAll}
        >
          Aceitar riscos e continuar
        </Button>
      </ModalFooter>
    </Modal>
  );
};
```

---

# PARTE 3: COMPLIANCE CHECKLIST

## 3.1 ANTES DO LANÇAMENTO (MUST-HAVE)

| Item | Responsável | Deadline | Status |
|------|-------------|----------|--------|
| ✅ Risk Disclaimer Modal (implementado + testado) | Frontend | D7 | 📝 TODO |
| ✅ Risk Disclaimer Aceito (banco de dados) | Backend | D7 | 📝 TODO |
| ✅ Terms of Service (draft + legal review) | Legal | D8 | 📝 TODO |
| ✅ Privacy Policy LGPD (draft + legal review) | Legal | D8 | 📝 TODO |
| ✅ Risk Disclosure (full document) | Legal | D8 | 📝 TODO |
| ✅ Leverage limit 2.5x máx (vs. 4x atual) | Product + Backend | D8 | ❌ BLOCKER |
| ✅ Contato CVM (confirmação de jurisdição) | Legal | D5 | 📝 TODO |
| ✅ Consentimento explícito aceitar antes leverage | Backend | D7 | 📝 TODO |
| ✅ Criptografia senhas (bcrypt/argon2) | Backend | D3 | ✅ VERIFICAR |
| ✅ TLS 1.3 em produção | DevOps | D5 | ✅ VERIFICAR |
| ✅ Email de recuperação segura | Backend | D5 | ✅ VERIFICAR |
| ✅ Log de consentimentos (timestamp, IP, UA) | Backend | D7 | 📝 TODO |
| ✅ Termos visíveis na UI antes de registrar | Frontend | D7 | 📝 TODO |
| ✅ Direito de deletação (LGPD) | Backend | D10 | 📝 TODO |
| ✅ Exportação de dados (LGPD) | Backend | D10 | 📝 TODO |

## 3.2 NICE-TO-HAVE (FUTURO)

| Item | Prioridade | Deadline | Complexidade |
|------|-----------|----------|--------------|
| Data Protection Officer (DPO) nomeado | 🟡 Média | D30 | Alta |
| Relatório fiscal automático (IRPF) | 🟡 Média | Q3 2026 | Alta |
| KYC/AML workflow | 🔴 Crítica | Q2 2026 | Muito Alta |
| Integração CVM (se licença solicitada) | 🔴 Crítica | Q3 2026 | Muito Alta |
| Seguro de proteção (cyber) | 🟡 Média | Q3 2026 | Média |
| Auditoria de segurança (3ª parte) | 🟡 Média | Q4 2026 | Média |

---

# PARTE 4: TOP 3 RISCOS LEGAIS + MITIGAÇÃO

## RISCO #1: CVM Determina que Oferecemos "Consultoria" (Regulação)

### Cenário:
- CVM entra em contato: "Seu sistema de score é consultoria, precisa de licença"
- Você não tem licença = operação ilegal
- Multa: 10-50% do patrimônio dos usuários prejudicados
- Bloqueio da plataforma

### Probabilidade: 🟡 MÉDIA (40-60%)
### Impacto: 🔴 CRÍTICO (inviabiliza produto)

### Mitigação (Ordem de Ação):

**Imediato (D1-D2):**
```
1. Contatar consultoria legal fintech especializada em CVM
2. Fazer "regulatory query" à CVM:
   "Nosso sistema de screening com score recomendado é consultoria?"
3. Ter Plano B: Remover score/recomendação, deixar apenas dados
```

**Curto Prazo (D3-D8):**
```
4. Se CVM disser SIM → Solicitar licença ou remover recomendação
5. Se CVM disser NÃO → Documentar resposta (safe harbor legal)
6. Disclaimer claro: "NÃO é consultoria, apenas análise"
```

**Documentação:**
```markdown
- Keep email resposta da CVM
- Adicionar frase ao ToS: "LBH não oferece consultoria registrada na CVM"
- Adicionar ao disclaimer: "Decisões são integralmente do usuário"
```

---

## RISCO #2: Usuário perde tudo por liquidação + CVM abre investigação

### Cenário:
- Usuário deposita $10k
- Usa leverage 3x ($30k de exposição)
- Ação cai 40% em 2 dias (realista em crises)
- Broker liquida em $2k (perda $8k = 80%)
- Usuário processa: "LBH me recomendou leverage sem avisar dos riscos"
- CVM abre investigação se isso virar padrão (múltiplos usuários)

### Probabilidade: 🟡 MÉDIA (30-50%)
### Impacto: 🔴 CRÍTICO (responsabilidade civil + multa)

### Mitigação:

**Legal/Documentation:**
```
✅ Disclaimer OBRIGATÓRIO antes qualquer leverage
✅ Checkbox duplo: "Entendo que posso perder 100%"
✅ Log de consentimento com timestamp + IP
✅ Termos de Serviço com limitação de responsabilidade
✅ Risco Disclosure completo (seção 2.2 acima)
```

**Técnico:**
```
✅ Limitar leverage máx a 2.5x (vs. 4x)
✅ Alertas em real-time: "Você está no 10% de risco de margin call"
✅ VaR/CVaR daily recalc (mostrar piores cenários)
✅ Email automático: "Seus riscos aumentaram, revisar posição"
```

**Operacional:**
```
✅ Contratar seguro cyber + responsabilidade civil
✅ Review legal trimestral de compliance
✅ Documentar que usuário ignorou warnings (se aplicável)
```

---

## RISCO #3: LGPD - Violação de Dados Pessoais

### Cenário:
- Hacker invade LBH, rouba emails + CPF de 5.000 usuários
- Você não had DPO, não tinha criptografia de dados
- ANPD (Autoridade Nacional de Proteção de Dados) investiga
- Multa: até R$ 50 milhões + danos à reputação

### Probabilidade: 🟡 MÉDIA (20-30% para startups)
### Impacto: 🔴 CRÍTICO (destruir confiança)

### Mitigação:

**Imediato (D1-D5):**
```
✅ TLS 1.3 em produção (https:// only)
✅ Senhas com bcrypt/argon2 (não plain)
✅ 2FA obrigatório para operações sensíveis
✅ Limpar dados desnecessários (ex: não armazenar CPF)
```

**Curto Prazo (D8-D30):**
```
✅ Privacy Policy clara (LGPD compliant)
✅ Consentimento explícito na registro
✅ Direito de acesso/deletação implementado
✅ Backup criptografado, isolado
✅ Auditoria de permissões (quem acessa o quê)
```

**Futuro (Q3 2026):**
```
✅ Nomear DPO (Data Protection Officer)
✅ Contrato de Processamento de Dados (se usar sub-processadores)
✅ Plano de resposta a incidente
✅ Seguro cyber (R$ 1-5M cobertura)
```

---

# PARTE 5: LEGAL DOCUMENTS REPOSITORY

## 5.1 Onde Armazenar

```
leveraged-buy-hold/
├── legal/
│   ├── terms-of-service.md          (ou .docx)
│   ├── privacy-policy.md             (ou .docx)
│   ├── risk-disclosure.md            (ou .docx)
│   ├── leverage-consent-form.md      (ou .docx)
│   ├── acceptable-use-policy.md      (ou .docx)
│   ├── data-processing-agreement.md  (ou .docx)
│   ├── compliance-checklist.md       (este documento)
│   ├── regulatory-assessment.md      (este documento)
│   └── VERSIONS.md                   (versioning log)
└── README.md
```

## 5.2 Versionamento de Documentos

Cada documento deve ter:
```markdown
Versão: 1.0 (ou 1.1, 2.0)
Data de Efetividade: 12 Jun 2026
Última Revisão: 5 Jun 2026
Próxima Revisão: 5 Dez 2026 (6 meses)
Mudanças vs. v0.9: ...
```

Ao atualizar:
- Avisar usuários com 30 dias antecedência
- Log em `VERSIONS.md`
- Backup versão antiga

---

# PARTE 6: RECOMENDAÇÕES EXECUTIVAS

## 6.1 GO/NO-GO Decision (D8 - 12 Junho)

### Pré-requisitos para LANÇAR:

| Critério | Status Atual | Necessário para Launch | D8 Estimado |
|----------|-------------|------------------------|-------------|
| Risk Disclaimer Modal | ❌ | ✅ | 70% likely |
| ToS + Privacy (legal review) | ❌ | ✅ | 60% likely |
| CVM confirmação jurisdição | ❌ | ✅ | 40% likely |
| Leverage limitado 2.5x | ⚠️ (4x agora) | ✅ | 80% likely |
| Logs de consentimento | ❌ | ✅ | 75% likely |

**Recomendação:** 
- ✅ Launch com features de análise (sem leverage)
- ⏸️ Delay leverage até D10+ (após legal reviews)

**Risco:** Se lançar com leverage SEM documentos, probabilidade de multa CVM = 60%+.

---

## 6.2 Insurance Recommendations

Contratar:

1. **Seguro Cyber Liability** (R$ 200-500k cobertura)
   - Custo: R$ 5-15k/ano
   - Cobre: Roubo de dados, extorsão
   - Recomendado: Até Q3 2026

2. **Errors & Omissions / Professional Indemnity** (R$ 500k-2M)
   - Custo: R$ 10-30k/ano
   - Cobre: Erro de cálculo, falha de sistema, perda de usuário
   - Recomendado: IMEDIATO (crítico para leverage)

3. **General Liability** (R$ 500k)
   - Custo: R$ 3-8k/ano
   - Cobre: Lesão, dano a propriedade
   - Recomendado: Futuro (não urgente)

**Total investimento:** ~R$ 20-50k/ano (menos que 1 usuário premium)

---

## 6.3 Timeline Executiva (Next 14 Days)

```
SEMANA 1 (5-12 Junho)
─────────────────────
D1 (5 Jun - HOJE)
  ☐ Contatar consultoria legal fintech
  ☐ Enviar email à CVM (regulatory query)
  ☐ Criar /legal folder no repo
  Status: ⏳ Aguardando respostas

D2-D3 (6-7 Jun)
  ☐ Frontend: Começar Risk Disclaimer Modal
  ☐ Legal: Draft ToS (usando templates 2.2B acima)
  ☐ Legal: Draft Privacy Policy (usando template 2.2C acima)
  Status: 📝 Em progresso

D4-D5 (8-9 Jun)
  ☐ Backend: Implementar consent logging (D2.3 acima)
  ☐ Backend: Limitar leverage máx a 2.5x
  ☐ Legal: Review ToS/Privacy (se houver consultoria)
  Status: ✅ Implementando

D6-D7 (10-11 Jun)
  ☐ Frontend: Risk Modal pronto + testado
  ☐ Backend: Consent API pronto
  ☐ Product: Decisão GO/NO-GO
  Status: 🎯 Final sprint

D8 (12 Jun - SEXTA)
  ☐ Legal: Finalize all 3 documentos (ToS, Privacy, Disclosure)
  ☐ Finance: Decisão pricing (separado, mas afeta legal)
  ☐ EXECUTIVO: GO/NO-GO meeting
  Status: 🏁 Decisão

SEMANA 2 (13-19 Junho)
──────────────────────
D9-D10 (13-14 Jun)
  ☐ Deploy Risk Modal + Consent em staging
  ☐ QA: Testar compliance (checkboxes, logs, etc)
  ☐ Legal: Leverage Consent Form (se leverage liberado)
  Status: 🧪 Testing

D11-D12 (16-17 Jun)
  ☐ Deploy para PRODUÇÃO (se GO)
  ☐ Email all users: "Novo Disclaimer" + link
  ☐ Monitor: Consentimento rate (target >90% em 48h)
  Status: 📊 Monitorando

D13-D14 (18-19 Jun)
  ☐ Sprint review + Retro
  ☐ Documentar learnings (legal gaps, etc)
  ☐ Planejar Q3: KYC, DPO, seguros
  Status: 📈 Retrospectiva
```

---

## 6.4 Próximas Etapas (After Sprint 1)

### Q2 2026 (Junho+)
- ✅ Sprint 1 completo (este document + implementação)
- 📋 LGPD full compliance (acesso, deletação, etc)
- 🚨 CVM response esperada (30-45 dias)

### Q3 2026 (Julho-Setembro)
- Nomeação de DPO (se crescimento confirma)
- KYC/AML workflow (se oferecer depósito direto)
- Integração CVM (se licença solicitada)
- Contratos com broker (SLA + compliance)

### Q4 2026 (Outubro-Dezembro)
- Auditoria de segurança externa (penetration test)
- Relatório fiscal automático
- Seguro cyber + E&O completo

---

# APÊNDICES

## Apêndice A: Checklist de Implementação Frontend

```markdown
### Risk Disclaimer Modal (React Component)

- [ ] Component criado: `src/components/RiskDisclaimerModal.tsx`
- [ ] Estilos: TailwindCSS + dark mode
- [ ] Checkboxes duplos (1º entendo perda, 2º concordo)
- [ ] Botão "Rejeitar" sai do app (logged)
- [ ] Botão "Aceitar" envia consent para backend
- [ ] Modal aparece APENAS na 1ª vez (localStorage flag)
- [ ] Modal re-aparece se user entrar em leverage settings
- [ ] Teste: Marcar checkboxes → botão ativa
- [ ] Teste: Desmarcar 1º checkbox → botão desativa
- [ ] Accessibility: ARIA labels, keyboard navigation

### UI/UX Melhorias

- [ ] Adicionar ⚠️ ícone (aviso) em tudo que é leverage
- [ ] "Leverage risk score" na dashboard (1-10)
- [ ] Tooltip: Passar mouse em "Leverage" = explica
- [ ] Email daily: "Seu risco aumentou/diminuiu X%"
- [ ] Cor de fundo muda (amarelo/vermelho) se risco > threshold
```

## Apêndice B: Checklist de Implementação Backend

```markdown
### API Endpoints para Compliance

POST /api/v1/legal/consent
- Body: { type, version, accepted, user_agent }
- Resposta: { id, timestamp, logged: true }
- DB: consent_logs table

GET /api/v1/legal/status
- Resposta: { has_accepted_risk: bool, accepted_date, version }

GET /api/v1/user/data (LGPD Export)
- Resposta: JSON com todos dados do usuário
- Arquivo: Download automático

POST /api/v1/user/delete
- Soft delete: marca como deletado
- Hard delete: 30 dias depois (GDPR compliant)
- Resposta: { deleted: true, data_retention_until: date }

### Database Schema

```sql
CREATE TABLE consent_logs (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  consent_type VARCHAR (risk_disclaimer, privacy_policy, etc),
  version VARCHAR,
  accepted BOOLEAN,
  timestamp TIMESTAMP,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_consent_user ON consent_logs(user_id);
CREATE INDEX idx_consent_type ON consent_logs(consent_type, accepted);
```

### Leverage Limiter

- [ ] Max leverage: 2.5x (não 4x)
- [ ] VaR daily: Recalcular às 16h (fechamento B3)
- [ ] Email alert: Se VaR > 10% do patrimônio
- [ ] Forced deleveraging: Se margem < 5%
```

## Apêndice C: Contatos CVM + Consultoria

```markdown
# Contatos Recomendados (Next 24h)

## CVM Brasil
- Site: www.cvm.gov.br
- Email: consultapublica@cvm.gov.br
- Telefone: +55 21 3131-8000
- Assunto: "Regulatory query: Platform for investment screening with leverage"

## ANBIMA (Associação Brasileira de Entidades de Mercados)
- Site: www.anbima.org.br
- Email: compliance@anbima.org.br
- Telefone: +55 11 3879-7000
- Assunto: "Compliance questionnaire for leverage platform"

## Consultoria Legal Fintech (Procurar)
- Recomendação: Buscar firmas em São Paulo / Brasília
- Critério: Experiência com CVM + LGPD
- Custo estimado: R$ 5-15k para regulatory assessment
- Tempo: 2-4 semanas

Exemplos (pesquisar):
- Bechara & Associados (São Paulo)
- Mannheimer Gestão de Processos (Rio)
- Veirano Advogados (Brasília)
```

---

# RESUMO EXECUTIVO (1-pager)

## Situação Atual

| Aspecto | Status | Risco |
|--------|--------|-------|
| Documentos legais | ❌ Não existe | 🔴 Crítico |
| CVM licensing | ❓ Incerto | 🔴 Crítico |
| Leverage regulação | ⚠️ 4x (acima de B3 2.5x) | 🟡 Alto |
| LGPD compliance | ⚠️ Parcial | 🟡 Alto |
| Disclaimers | ❌ Não tem | 🔴 Crítico |
| **Launch readiness** | **❌ NOT READY** | **🔴 BLOCKER** |

## Ações Imediatas (D1-D5)

1. **LEGAL:** Contatar CVM + consultoria fintech
2. **PRODUCT:** Reduzir leverage máx de 4x → 2.5x
3. **FRONTEND:** Implementar Risk Disclaimer Modal
4. **BACKEND:** Logging consentimentos + LGPD endpoints

## Timeline de Compliance

- **D7 (12 Jun):** Documentos finalizados + reviewed
- **D8-D10 (12-15 Jun):** Deploy modal + backend pronto
- **D12 (17 Jun):** Launch com disclaimer + consent obrigatório
- **Q3 2026:** Full compliance (KYC, DPO, seguros)

## Custo Estimado

- Consultoria legal: R$ 10-20k (one-time)
- Seguro E&O: R$ 15-30k/ano
- Desenvolvimento compliance: ~40h engineer time (included in sprint)
- **Total first year:** R$ 30-50k (affordable para SaaS)

## Recomendação Final

✅ **PROCEDER com Sprint 1**, MAS com delay de leverage até D12.

❌ **NÃO LANÇAR** leverage sem documentos legais (risk 60% CVM shutdown).

---

**Documento criado:** 5 Jun 2026  
**Próxima revisão:** 12 Jun 2026 (após D8 reviews)  
**Proprietário:** Legal/Compliance Team  
**Status:** DRAFT (aguardando aprovação executiva)
