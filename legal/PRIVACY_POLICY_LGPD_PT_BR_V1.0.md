# POLÍTICA DE PRIVACIDADE - LBH SYSTEM
## Lei Geral de Proteção de Dados (LGPD) - Lei nº 13.709/2018

**Versão:** 1.0  
**Data de Vigência:** 5 de Junho de 2026  
**Última Atualização:** 5 de Junho de 2026

---

## 1. TITULAR E RESPONSÁVEL PELOS DADOS

**Controlador (empresa responsável):**
- **Nome Legal:** LBH System [razão social completa]
- **CNPJ:** [XXXX.XXXX/XXXX-XX]
- **Endereço:** [Endereço registrado no Brasil]
- **Email:** legal@lbhsystem.com
- **Telefone:** +55 11 XXXX-XXXX
- **Encarregado de Dados (DPO):** [Nome, email] *(se aplicável)*

**Localização:** Brasil (São Paulo)

---

## 2. DADOS PESSOAIS COLETADOS

Coletamos os seguintes dados pessoais para operar a Plataforma:

### 2.1 Dados de Identificação (Essencial)

| Dado | Fonte | Propósito | Retenção |
|------|-------|----------|----------|
| Nome completo | Cadastro do usuário | Identificação, comunicação | 2 anos após delete |
| Email | Cadastro do usuário | Login, notificações, suporte | 2 anos após delete |
| CPF | Documento de KYC | Anti-fraude, compliance CVM/BC | 5 anos (obrigação legal) |
| Data de nascimento | Cadastro do usuário | Verificar 18+ anos | 2 anos após delete |
| Endereço | Formulário de risco | Compliance, contato | 2 anos após delete |
| Telefone | Formulário de risco | Contato emergencial | 2 anos após delete |

### 2.2 Dados de Comportamento e Risco (Funcional)

| Dado | Fonte | Propósito | Retenção |
|------|-------|----------|----------|
| Perfil de risco | Risk questionnaire | Personalizar scoring | 2 anos após delete |
| Histórico de trades (simulado) | User actions | Analytics, performance | 2 anos após delete |
| Backtests realizados | Plataforma | Estudar preferências | 2 anos após delete |
| Stocks favoritos/watched | User interactions | Melhorar UX | 2 anos após delete |
| Alertas recebidos | Log de sistema | Compliance, auditoria | 6 meses |

### 2.3 Dados Técnicos (Segurança)

| Dado | Fonte | Propósito | Retenção |
|------|-------|----------|----------|
| Endereço IP | Server logs | Segurança, prevenção de fraude | 90 dias |
| User-Agent (browser/device) | Server logs | Detectar acesso anômalo | 90 dias |
| Timestamp de login | Server logs | Auditoria, compliance | 2 anos |
| Cookies de sessão | Browser | Login/autenticação | Session only |

### 2.4 Dados de Compliance (Legal)

| Dado | Fonte | Propósito | Retenção |
|------|-------|----------|----------|
| Aceitação de ToS | Checkbox no signup | Prova de consentimento | 5 anos (legal hold) |
| Aceitação de Privacy Policy | Checkbox | Prova de consentimento | 5 anos (legal hold) |
| Aceitação de Risk Disclaimer | Modal popup | Prova de consentimento | 5 anos (legal hold) |
| Aceitação de leverage | Consent form | Prova de consentimento | 5 anos (legal hold) |
| IP + timestamp de aceitação | Backend log | Prova de identidade | 5 anos (legal hold) |

### 2.5 Dados Derivados (Análise)

**Não coletamos,** mas geramos internamente:
- Score de investimento (0-100)
- Recomendação de leverage (1x-2.5x)
- VaR estimado
- Índice de Sharpe calculado

Estes são **derivados** de dados públicos + seu perfil, **não** vendidos ou compartilhados com 3º.

---

## 3. BASE LEGAL PARA COLETA (LGPD Art. 7)

Processamos seus dados sob uma das seguintes bases legais:

### 3.1 Consentimento (LGPD Art. 7, I)
- **Quando:** Você faz signup e aceita Privacy Policy
- **O que:** Coleta de nome, email, perfil de risco
- **Direito:** Você pode revogar consentimento a qualquer momento
- **Como revogar:** Email legal@lbhsystem.com com assunto "Revogar Consentimento"

### 3.2 Contrato (LGPD Art. 7, V)
- **Quando:** Você aceita Termos de Serviço
- **O que:** Processamento necessário para operar a Plataforma (login, scoring, alertas)
- **Cessação:** Se deletar conta, processamento cessa

### 3.3 Obrigação Legal (LGPD Art. 7, II)
- **Quando:** Sempre que processamos CPF
- **Por quê:** Lei Anti-Fraude (Lei nº 9.613/1998), CVM, Banco Central do Brasil
- **O que:** CPF não pode ser deletado (retenção obrigatória 5 anos)
- **Penalidade:** Se não retemos CPF, somos responsáveis por fraude

### 3.4 Interesse Legítimo (LGPD Art. 7, IX)
- **Quando:** Processamos logs de IP, user-agent
- **Por quê:** Detectar fraude, prevenir hacking, segurança de conta
- **Teste de balanceamento:** Interesse de segurança > interesse de privacidade do usuário
- **Retenção:** 90 dias apenas (minimizamos retenção)

---

## 4. COMPARTILHAMENTO DE DADOS (LGPD Art. 7, §2º)

### 4.1 Nunca Compartilhamos

❌ **Com quem NÃO compartilhamos:**
- Empresas de publicidade
- Data brokers / vendedores de dados
- Redes sociais
- Bancos (exceto Banco Central em investigação)
- Operadoras de telecom
- Governo (exceto ordem judicial)

❌ **Nunca vendemos dados pessoais** (é ilegal sob LGPD)

### 4.2 Compartilhamos Apenas Para Operar Serviço

| 3º Party | Dados Compartilhados | Propósito | Base Legal |
|----------|-----------------|---------|-----------|
| **Quantfury** | user_id (hash), quantity, symbol | Executar trades | Contrato (necessário) |
| **Financial Modeling Prep** | Nenhum (API read-only) | Obter preços históricos | Contrato |
| **Stripe/Pagar.me** | Email, amount, payment_method | Processar pagamento | Contrato |
| **Vercel/Railway** (hosting) | Dados anônimos (agregados) | Rodar servidor | Contrato |
| **Google Analytics** | Anonymous session IDs | Analytics de uso | Contrato |
| **Banco Central** | CPF, endereço, transações | Investigação AML | Obrigação legal |
| **CVM** | User profile, trades | Investigação compliance | Obrigação legal |
| **ANPD** | Todos (se breach) | Data breach notification | Obrigação legal |

### 4.3 Data Processing Agreements (DPA)

Para cada compartilhamento, temos um **Acordo de Processamento de Dados** que:
- Obriga 3º a usar dados apenas para propósito especificado
- Restringe subcontratação
- Exige segurança de dados
- Permite auditoria

---

## 5. DIREITOS DO USUÁRIO (LGPD Art. 18)

Você tem **7 direitos fundamentais** sob LGPD:

### 5.1 Direito de Acesso (Art. 18, I)
**O que:** Ver TODOS os dados que temos sobre você
- **Como:** `GET /api/user/data/export` (endpoint disponível no Settings)
- **Formato:** JSON (portável, legível)
- **Timeline:** Resposta em até 15 dias
- **Custo:** Grátis

**Exemplo:**
```json
{
  "user_id": "uuid-xxx",
  "name": "João Silva",
  "email": "joao@example.com",
  "cpf": "XXX.XXX.XXX-XX",
  "risk_profile": "moderate",
  "trades_history": [...],
  "acceptances": [
    {
      "type": "tos",
      "accepted_at": "2026-06-05T10:00:00Z",
      "ip": "192.168.1.1"
    }
  ]
}
```

### 5.2 Direito de Retificação (Art. 18, II)
**O que:** Corrigir dados incorretos
- **Como:** Settings → Edit Profile → Save
- **Exemplo:** Mudar endereço, atualizar telefone
- **Limitação:** Não pode mudar CPF (imutável legalmente)

### 5.3 Direito ao Esquecimento (Art. 18, III)
**O que:** Deletar seus dados (exceto obrigações legais)
- **Como:** Settings → Account → Delete Account
- **Timeline:** Processamento em 30 dias
- **Permanente:** Não pode ser recuperado
- **Limitação:** CPF + aceitações de risco retidos por 5 anos (CVM)

**Processo de Deleção:**
```
Day 1: Você clica "Delete Account"
       → Email de confirmação enviado
       
Day 2: Você confirma via link no email
       → Account marcada como "pending_deletion"
       
Day 7: Dados anônimizados (nome → hash, email removido)
       
Day 30: Dados deletados de backups
        → Compliance: CPF + acceptance logs arquivados (5 anos)
```

### 5.4 Direito à Portabilidade (Art. 18, IV)
**O que:** Receber dados em formato aberto + transferir para outro serviço
- **Como:** `GET /api/user/data/export` (mesmo endpoint que acesso)
- **Formato:** JSON (portável)
- **Incluído:** Todos os dados, histórico, preferências
- **Exclusão:** CPF + compliance logs (por lei)

### 5.5 Direito de Oposição (Art. 18, V)
**O que:** Parar de processar seus dados (exceto contrato/lei)
- **Como:** Email legal@lbhsystem.com com assunto "Exercer Direito de Oposição"
- **Exemplo:** "Não quero que meu perfil de risco seja usado para alerts"
- **Resultado:** Alerts desativados, dados ainda retidos (contrato)

### 5.6 Direito de Remoção de Consentimento (Art. 18, VI)
**O que:** Revogar permissão que você deu antes
- **Diferente de:** Direito ao esquecimento (este = revogar consentimento específico)
- **Como:** Settings → Consent Management
- **Opções:**
  - Revogar email marketing
  - Revogar cookies de analytics
  - Revogar processamento de dados comportamentais
- **Resultado:** Cessa processamento para aquela finalidade

### 5.7 Direito de Contestação (Art. 18, VII)
**O que:** Questionar decisão automatizada (ex: seu score foi errado)
- **Como:** Email legal@lbhsystem.com com evidência
- **Exemplo:** "Meu score disse 50, mas deveria ser 80 porque [razão]"
- **Revisão:** Analisaremos em 15 dias
- **Resultado:** Corrigiremos se erro confirmado

---

## 6. COMO EXERCER SEUS DIREITOS

### 6.1 Via Self-Service (Fácil)
- Acesso: Settings → Data & Privacy → View/Export Data
- Corrigir: Settings → Edit Profile → Save
- Revogar consentimento: Settings → Consent Management
- Deletar: Settings → Account → Delete Account

### 6.2 Via Email (Legal)
Se não conseguir via app, envie para: **legal@lbhsystem.com**

**Template de email:**
```
Assunto: Solicitar Direito de Acesso [Art. 18, I LGPD]

Corpo:
Prezados,

Solicito acesso a TODOS os dados pessoais que possuem sobre mim:
- Nome: [seu nome]
- Email: [seu email]
- CPF: [XXX.XXX.XXX-XX]

Solicito resposta em JSON portável em até 15 dias.

Obrigado,
[Seu nome]
```

**Prazo de resposta:** 15 dias (conforme LGPD Art. 18, §1º)

---

## 7. RETENÇÃO DE DADOS (Quanto tempo mantemos)

| Dados | Retenção | Justificativa |
|------|----------|---|
| **Conta ativa** | Enquanto ativo | Prestação de serviço |
| **Após delete** | 30 dias | Janela de confirmação |
| **Logs de IP/user-agent** | 90 dias | Segurança, detecção de fraude |
| **Aceitação de ToS/Privacy** | 5 anos | CVM exige (compliance) |
| **CPF** | 5 anos | Banco Central exige (AML) |
| **Histórico de trades** | 2 anos | ANPD compliance |
| **Backup & arquivos** | 2 anos | Recuperação de desastre |
| **Investigação legal** | Indefinido | Obrigação legal (enquanto investigação) |

### 7.1 Depois de Deletar Conta

Se você deletar conta em 5 de Junho de 2026:

```
Junho 5 - Julho 5:     Dados em "graceful period" (pode recuperar)
Julho 5 - Julho 8:     Anônimização (nome → hash, email removido)
Julho 8 - 2031:        CPF + aceitações arquivados (legal hold)
2031:                  Destruição final (se sem investigação pendente)
```

---

## 8. SEGURANÇA DE DADOS (LGPD Art. 32)

Implementamos medidas técnicas e organizacionais para proteger seus dados:

### 8.1 Criptografia (Em Trânsito)
- ✅ **TLS 1.3:** Toda comunicação cliente-servidor
- ✅ **Certificado SSL:** Válido, assinado por CA confiável
- ✅ **Força:** 256-bit (padrão militar)
- ✅ **Verificação:** `curl -I https://api.lbhsystem.com` → TLS 1.3 confirmado

### 8.2 Criptografia (Em Repouso)
- ✅ **Senhas:** bcrypt com salt (não reversível)
- ✅ **Database:** Encriptado (se provider suporta)
- ✅ **Backups:** Também encriptados

### 8.3 Controle de Acesso
- ✅ **Role-based:** Apenas certos admins veem dados pessoais
- ✅ **Zero-knowledge:** Arquitetura que limita até nós de ver dados
- ✅ **Auditoria:** Log de quem acessou qual dado, quando

### 8.4 Proteção Contra Ataques
- ✅ **Rate limiting:** Bloqueia força bruta de login
- ✅ **SQL injection:** Queries parametrizadas (ORM)
- ✅ **XSS:** Input validation, Content Security Policy
- ✅ **DDoS:** Proteção via Cloudflare/Vercel
- ✅ **CORS:** Restrições de origem

### 8.5 Resposta a Incidentes
Se acontecer breach:
1. **Detecção:** Monitoramento contínuo de acessos anômalo
2. **Resposta:** Isolamento imediato (24h max)
3. **Investigação:** Entender o que foi exposto
4. **Notificação:** ANPD em até 48h (LGPD Art. 16)
5. **Usuários:** Email explicando o que aconteceu

---

## 9. COOKIES E RASTREAMENTO

### 9.1 Cookies Técnicos (Obrigatórios)
- `session_id`: Login / manter sessão (Session-only)
- `csrf_token`: Segurança contra CSRF (Session-only)
- `dark_mode_preference`: Tema (1 ano)

**Você não pode optar por sair:** Necessários para funcionamento

### 9.2 Cookies de Analytics (Opcional)
- **Provider:** Google Analytics 4
- **O que rastreia:** Páginas visitadas, tempo gasto, cliques
- **Dados:** ANONIMIZADOS (sem IP completo, sem cookies de identidade)
- **Retenção:** 14 meses
- **Seu controle:** Optar por sair em Settings → Privacy

**Aviso:** Mesmo anonimizado, Google pode identificar você via Google Account

### 9.3 Sem Cookies de Publicidade
- ❌ Não usamos Facebook Pixel
- ❌ Não usamos Google Ads tracking
- ❌ Não compartilhamos dados com ad networks

---

## 10. MODIFICAÇÕES NESTA POLÍTICA

### 10.1 Notificação
- **Mudanças significativas:** Email 30 dias antes
- **Pequenas correções:** Sem aviso
- **Mudança de base legal:** Re-agreement obrigatório

### 10.2 Exemplos de "Mudança Significativa"
- ✅ Novo compartilhamento com 3º (ex: novo broker)
- ✅ Novo propósito para dados existentes
- ✅ Aumento de retenção
- ❌ Correção de typos
- ❌ Adição de medidas de segurança

### 10.3 Sua Aceitação
- Aceitar = continuar usando plataforma após notificação
- Não aceitar = deletar conta e solicitar remoção de dados

### 10.4 Histórico de Versões
- **v1.0 (5 Junho 2026):** Política inicial
- *Futuras versões serão rastreadas aqui*

---

## 11. CONTATO E DENÚNCIA

### 11.1 Dúvidas Sobre Privacidade
📧 **Email:** legal@lbhsystem.com  
🏢 **Endereço:** [Endereço da empresa]  
📞 **Telefone:** +55 11 XXXX-XXXX  
⏱️ **Resposta:** Em até 10 dias úteis

### 11.2 Reclamação junto à ANPD
Se não resolver nossa disputa, você pode denunciar à:

**Autoridade Nacional de Proteção de Dados (ANPD)**
- Website: www.gov.br/cidadania/pt-br/acesso-a-informacao/lgpd
- Email: [verificar site da ANPD]
- Process: Online (formulário)
- Custo: Grátis

---

## 12. DISPOSIÇÕES ESPECIAIS

### 12.1 Dados de Menores de Idade
- ❌ **Não aceitamos usuários < 18 anos**
- Caso encontremos: Deletaremos dados imediatamente
- Se você é responsável: Notifique legal@lbhsystem.com

### 12.2 Dados Sensíveis
- ❌ **Não coletamos:** Origem étnica, religião, saúde, biometria
- ✅ **Coletamos:** Preferência de risco (considerado "normal", não "sensível" sob LGPD)

### 12.3 Transferência Internacional
- ❌ **Não transferimos dados para fora do Brasil** (exceto de acordo com LGPD §5º)
- Se usar cloud US-based (Vercel, etc): Certificados em Data Protection Addendum

### 12.4 Consentimento Explícito
- Ao fazer signup: Você recebe checkbox "Li e aceito a Política de Privacidade"
- Você DEVE clicar para continuar
- Sem consentimento: Não pode usar plataforma

---

## ASSINATURA / ACEITAR

Ao clicar em "Aceitar" abaixo, você:
- ✅ Leu esta Política de Privacidade
- ✅ Entende como seus dados são coletados, usados e protegidos
- ✅ Reconhece seus direitos LGPD
- ✅ Consente com o processamento de dados descrito

**☑️ Aceito a Política de Privacidade (data e IP registrados para compliance)**

---

**Versão:** 1.0 | **Efetivo:** 5 de Junho, 2026 | **Próxima Revisão:** Dezembro, 2026

*Esta política está em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018)*
