# BRIEFING EXECUTIVO - SPRINT 1 (2 semanas)
## LBH System - Próximas prioridades críticas

**Data:** 5 de Junho de 2026  
**Duração:** 2 semanas (Junho 5-19)  
**Tema:** Compliance + Monetização + Performance

---

## EM 1 LINHA POR ESPECIALISTA

| Especialista | O que fazer | Quando | Sucesso |
|---|---|---|---|
| **Legal** | ToS/Privacy/Disclaimer legal | D7, D5 | Assinável em <2min |
| **Risk** | Risk matrix + model validation | D3, D8 | <5% drift vs. live |
| **Finance** | Decidir pricing (3 opções) | D7 | Break-even claro |
| **Quant** | Validar backtest vs. realidade | D10 | Scoring explica 60%+ variance |
| **Backend** | Backtest queries <2s, VaR daily | D8 | p90 latency <2s |
| **Frontend** | Disclaimer modal + mobile UX | D7, D10 | Lighthouse >85 mobile |
| **Growth** | Growth playbook + CAC/LTV | D7, D9 | LTV:CAC > 3:1 |
| **DevOps** | Production readiness + cost audit | D6, D8 | 99.5% uptime, -20% costs |
| **PM (Você)** | Decisões críticas + síntese | D1, D8, D10, D12 | Roadmap H2 locked |

---

## TAREFAS CRÍTICAS (BLOCKERS)

### 1. LEGAL → Disclaimer Modal (Dia 5)
- Frontend precisa integrar popup de aceitar riscos
- **Sem isso:** Não podemos lançar features de leverage

### 2. FINANCE → Pricing Decision (Dia 8)
- Growth, Backend, Frontend todos esperam disso
- **Sem isso:** Impossível medir CAC/LTV ou planejar infra

### 3. BACKEND → Performance (Dia 8)
- Se backtest queries >3s, produto é inutilizável
- **Mitigação:** Cache, índices DB, lazy loading

### 4. PRODUCT → Decisão Leverage Model (Dia 12)
- Quant entrega recomendação D10
- **Impacto:** Toda estratégia muda se ajustarmos Kelly/RSI

---

## DEPENDÊNCIAS VISUALIZADAS

```
LEGAL                 RISK                 QUANT
(ToS D7)              (Matrix D3)          (Backtest D10)
     ↓                    ↓                     ↓
   Legal              Product ← ← ← ← ← ← Quant
   review D8          DECIDES              validates
     ↓                D12 on               drift
DEPLOY D9            leverage
                        ↓
FINANCE           BACKEND              FRONTEND
(Pricing D7)  →  (Perf D8)    →      (Export D8)
    ↓               ↓                    ↓
Product         Backend            Growth
decides        implements          implements
D8             analytics           tracking
    ↓               ↓                    ↓
GROWTH ← ← ← ← GROWTH
CAC/LTV           channels
D7-9              D9-10
```

---

## CRONOGRAMA RESUMIDO

### SEMANA 1 (5-12 Junho)

| Dia | Evento | Dono | Status |
|-----|--------|------|--------|
| **Mon 5** | Sprint kickoff (90 min) + Product: jurisdição | PM | 📋 |
| **Tue 6** | Risk matrix v1 + Quant: comece backtest | Risk, Quant | 📊 |
| **Wed 7** | Disclaimer pronto | Legal | 📝 |
| **Thu 8** | Pricing recommendation pronto | Finance | 💰 |
| **Fri 12** | Fin de semana checks | All | ✅ |

### SEMANA 2 (13-19 Junho)

| Dia | Evento | Dono | Status |
|-----|--------|------|--------|
| **Mon 13** | Product DECIDE pricing | PM | 🎯 |
| **Wed 15** | Growth: channels decision | PM, Growth | 📈 |
| **Thu 17** | Backend perf validation | PM, Backend | ⚡ |
| **Fri 19** | **Sprint Review + Retro** | PM | 🏁 |

---

## 5 RISCOS + MITIGAÇÕES

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|--------|-----------|
| CVM (Brasil) bloqueia pricing de leverage | Alta | Crítico | Contatar CVM D1; ter Opção B (SaaS puro) |
| Quantfury API tem latência > esperado | Média | Alto | Cache local de dados; fallback yfinance |
| Backtest queries não otimizam < 2s | Média | Alto | Índices DB Day 4; Redis caching Day 6 |
| Drift model vs. live > 10% | Baixa | Alto | Recalibrar RSI/Stoch; usar bootstrap |
| Equipe não completa sprint | Baixa | Médio | Daily standups; escalate D7 |

---

## RECURSOS NECESSÁRIOS

### Contatos Externos (Schedule agora)
- [ ] **CVM** (Brasil) - Clarificar regulação de leverage
- [ ] **Quantfury Compliance** - Verificar solvência + liquidação
- [ ] Consultoria legal fintech (se houver)

### Ferramentas/Serviços
- [ ] Sentry (error tracking) - configure D7
- [ ] Datadog ou similar (monitoring) - Trial D6
- [ ] Redis cache (se não temos) - Decision D5

### Tempo Product Manager
- Sprint kickoff: 90 min (D1)
- Daily async: 15 min (cada dia)
- Decisão sync: 30 min (D8, D10, D12)
- Sprint review: 120 min (D14)
- **Total: ~15h (3 horas/semana)**

---

## OUTPUTS ESPERADOS (FIM DA SPRINT)

### Entregáveis

**Legal**
- ✅ ToS + Privacy Policy (signable)
- ✅ Risk Disclaimer Modal (live)
- ✅ Data privacy checklist LGPD/GDPR

**Finance**
- ✅ Pricing model escolhido + rationale
- ✅ P&L 12 meses (3 cenários)
- ✅ Break-even analysis (X users)

**Growth**
- ✅ Growth playbook 1-pager
- ✅ CAC/LTV modelo
- ✅ Top 2 acquisition channels

**Product**
- ✅ Roadmap H2 2026 (5 sprints)
- ✅ Risk matrix (top 20 riscos)
- ✅ Leverage model decision (simulator ou ajuste?)

**Engineering**
- ✅ Backtest queries <2s p90
- ✅ VaR computed daily
- ✅ 99.5% uptime SLA

---

## COMUNICAÇÃO DO TIME

**Kanban:** GitHub Projects (criando agora)
**Daily Updates:** Slack #lbh-sprint-updates
- 9 AM: "Yesterday ✓, Today 🎯, Blockers 🚧"
- 6 PM: Checkpoint rápido

**Meetings:**
- Mon 6/5: Kickoff (90 min)
- Daily: Async Slack
- Mid-sprint: As needed
- Fri 6/19: Review + Retro (120 min)

---

## PRÓXIMOS PASSOS (TODAY - June 5)

**IMEDIATAMENTE (antes das 5 PM):**
1. PM: Enviar este briefing para todos 9
2. PM: Chamar especialistas (15 min each) → confirm understanding
3. Legal: Contatar consultoria fintech
4. Finance: Validar 3 opções de pricing
5. Product: Verificar se temos Sentry account

**SEGUNDA (June 6):**
- Sprint kickoff meeting 9 AM (90 min)
- Risk: Entregar matriz v1

---

## DEFINIÇÕES

- **D1, D2...D14:** Dias 1-14 do sprint
- **p90:** 90º percentil (90% das requisições são mais rápidas que X)
- **CAC:** Customer Acquisition Cost (quanto custa adquirir 1 usuário)
- **LTV:** Lifetime Value (quanto um usuário vale ao longo da vida)
- **VaR:** Value at Risk (maior perda esperada em 95% dos cenários)
- **Disclaimer:** Aviso legal de risco
- **Drift:** Diferença entre modelo backtest vs. realidade

---

*Documento: Briefing Executivo Sprint 1*  
*Criado: 5 Junho 2026*  
*Revisão: 19 Junho 2026 (fim sprint)*
