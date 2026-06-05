# Content Moderation System - Documentação Completa

## Visão Geral

Sistema completo de moderação de conteúdo para FastAPI com detecção automática, relatórios de usuários, gerenciamento administrativo e dashboard integrado.

## Arquitetura

### Arquivos Criados

```
app/
├── models/
│   └── moderation.py              # SQLAlchemy models (ContentReport, ContentModerationLog)
├── schemas/
│   └── moderation.py              # Pydantic schemas para validação/resposta
├── services/
│   └── content_moderation.py       # Lógica de negócio e análise de conteúdo
├── api/v1/
│   ├── moderation.py              # Endpoints REST da API
│   └── moderation_admin_dashboard.py  # Dashboard HTML + suporte
└── main.py                         # Atualizado com rotas

```

## Database Schema

### Tabelas

#### content_reports
```sql
CREATE TABLE content_reports (
  id INTEGER PRIMARY KEY AUTO_INCREMENT,
  message_id VARCHAR(255) NOT NULL,
  reporter_id INTEGER NOT NULL,
  reason VARCHAR(50) NOT NULL,  -- harassment, spam, hate, sexual, violence, misinformation, copyright, other
  description TEXT,
  status VARCHAR(20) DEFAULT 'open',  -- open, reviewed, dismissed, deleted
  reviewed_by INTEGER,
  reviewed_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (reporter_id) REFERENCES users(id),
  FOREIGN KEY (reviewed_by) REFERENCES users(id),
  INDEX idx_message_id (message_id),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
);
```

#### content_moderation_logs
```sql
CREATE TABLE content_moderation_logs (
  id INTEGER PRIMARY KEY AUTO_INCREMENT,
  message_id VARCHAR(255) NOT NULL,
  action VARCHAR(20) NOT NULL,  -- deleted, flagged, approved, warned_user
  moderator_id INTEGER NOT NULL,
  reason TEXT,
  report_id INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (moderator_id) REFERENCES users(id),
  FOREIGN KEY (report_id) REFERENCES content_reports(id),
  INDEX idx_message_id (message_id),
  INDEX idx_created_at (created_at)
);
```

## API Endpoints

### 1. Verificação de Conteúdo (Público)

#### POST `/api/v1/content/check`
Verifica conteúdo para violações (palavras proibidas, padrões).
**Não cria relatório** - apenas análise.

**Query Parameters:**
- `text` (string, required): Conteúdo a verificar (1-5000 caracteres)

**Autenticação:** Requer token válido (usuário autenticado)

**Response:**
```json
{
  "text_length": 150,
  "flagged": true,
  "reason": "banned_word",
  "severity": "high",
  "detected_words": ["palavra1", "palavra2"]
}
```

### 2. Reportar Conteúdo (Público)

#### POST `/api/v1/content/report`
Reporta conteúdo inapropriado.

**Autenticação:** Requer token válido

**Body:**
```json
{
  "message_id": "msg_12345",
  "reason": "harassment",
  "description": "Este usuário está me assediando"
}
```

**Razões Válidas:**
- `harassment` - Assédio
- `spam` - Spam
- `hate` - Discurso de Ódio
- `sexual` - Conteúdo Sexual
- `violence` - Violência
- `misinformation` - Desinformação
- `copyright` - Violação de Direitos Autorais
- `other` - Outro

**Response:**
```json
{
  "id": 1,
  "message_id": "msg_12345",
  "reporter_id": 5,
  "reason": "harassment",
  "description": "Este usuário está me assediando",
  "status": "open",
  "reviewed_by": null,
  "reviewed_at": null,
  "created_at": "2024-06-05T10:30:00Z"
}
```

### 3. Status de Moderação (Público)

#### GET `/api/v1/content/moderation-status/{message_id}`
Verifica status de moderação de uma mensagem.
**Público** - qualquer pessoa pode verificar.

**Response:**
```json
{
  "status": "open",
  "reason": "harassment",
  "reviewed_at": null,
  "report_id": 1
}
```

**Status Possíveis:**
- `not_reported` - Sem relatórios
- `open` - Relatório aberto, aguardando revisão
- `reviewed` - Revisado por moderador
- `dismissed` - Relatório descartado (conteúdo OK)
- `deleted` - Conteúdo deletado

### 4. Admin - Listar Relatórios

#### GET `/api/v1/content/admin/reports`
Lista todos os relatórios com filtros opcionais.
**Admin Only**

**Query Parameters:**
- `status` (optional): `open`, `reviewed`, `dismissed`, `deleted`
- `reason` (optional): `harassment`, `spam`, `hate`, `sexual`, `violence`, `misinformation`, `copyright`, `other`
- `skip` (integer, default: 0): Paginação
- `limit` (integer, default: 50, max: 100): Quantidade por página

**Response:**
```json
[
  {
    "id": 1,
    "message_id": "msg_12345",
    "reporter_id": 5,
    "reporter_email": "user@example.com",
    "reason": "harassment",
    "description": "Texto do relatório...",
    "status": "open",
    "reviewed_by": null,
    "reviewer_email": null,
    "reviewed_at": null,
    "created_at": "2024-06-05T10:30:00Z"
  }
]
```

### 5. Admin - Detalhe de Relatório

#### GET `/api/v1/content/admin/reports/{report_id}`
Obtém informações detalhadas de um relatório específico.
**Admin Only**

**Response:** Mesmo formato do endpoint anterior (relatório único)

### 6. Admin - Tomar Ação

#### PUT `/api/v1/content/admin/reports/{report_id}/action`
Processa uma ação de moderação (deletar, aprovar, avisar).
**Admin Only**

**Body:**
```json
{
  "action": "deleted",
  "reason": "Conteúdo violava nossas políticas de assédio"
}
```

**Actions Válidas:**
- `delete` → Deleta conteúdo
- `approve` → Aprova (revisa e aprova como OK)
- `warn` → Avisa usuário (pode enviar notificação)

**Response:**
```json
{
  "success": true,
  "message": "Action 'deleted' processed successfully",
  "log_id": 42
}
```

### 7. Admin - Descartar Relatório

#### PUT `/api/v1/content/admin/reports/{report_id}/dismiss`
Descarta um relatório (conteúdo OK, sem ação necessária).
**Admin Only**

**Query Parameters:**
- `reason` (string, required): Motivo do descarte (10-500 caracteres)

**Response:**
```json
{
  "success": true,
  "message": "Report dismissed"
}
```

### 8. Admin - Logs de Moderação

#### GET `/api/v1/content/admin/logs`
Lista todas as ações de moderação realizadas.
**Admin Only**

**Query Parameters:**
- `message_id` (optional): Filtrar por ID de mensagem
- `skip` (integer, default: 0): Paginação
- `limit` (integer, default: 50, max: 100): Quantidade

**Response:**
```json
[
  {
    "id": 42,
    "message_id": "msg_12345",
    "action": "deleted",
    "moderator_id": 1,
    "moderator_email": "admin@example.com",
    "reason": "Conteúdo violava nossas políticas",
    "created_at": "2024-06-05T11:00:00Z"
  }
]
```

### 9. Admin - Estatísticas

#### GET `/api/v1/content/admin/statistics`
Obtém estatísticas de moderação.
**Admin Only**

**Response:**
```json
{
  "total_reports": 150,
  "open_reports": 15,
  "reviewed_reports": 100,
  "dismissed_reports": 30,
  "deleted_reports": 5,
  "reports_by_reason": {
    "harassment": 50,
    "spam": 40,
    "hate": 30,
    "other": 30
  },
  "reports_by_status": {
    "open": 15,
    "reviewed": 100,
    "dismissed": 30,
    "deleted": 5
  }
}
```

### 10. Admin - Contagem de Abertos

#### GET `/api/v1/content/admin/open-reports-count`
Quick endpoint para contar relatórios abertos (útil para dashboard).
**Admin Only**

**Response:**
```json
{
  "open_count": 15
}
```

### 11. Admin - Dashboard

#### GET `/api/v1/admin/moderation/dashboard`
HTML do dashboard administrativo.
**Admin Only**

Retorna página HTML interativa com:
- Estatísticas em tempo real
- Tabela de relatórios filtrável
- Controles para deletar, avisar, descartar
- Modal para justificar ações
- Logs de ações

## Detecção Automática de Conteúdo

### Função: `check_content_for_violations(text: str)`

```python
# Detecta automaticamente:
- Palavras proibidas
- Padrões de spam
- Linguagem de ódio
- Conteúdo sexual
- Violência

# Retorna:
{
  'flagged': True,
  'reason': 'banned_word',
  'severity': 'high',  # high, medium, low
  'detected_words': ['palavra1', 'palavra2']
}
```

### Lista de Palavras Proibidas

Localizadas em `app/services/content_moderation.py`:

```python
BANNED_WORDS = {
    "spam": {
        "severity": "low",
        "words": ["viagra", "casino", "lottery", ...]
    },
    "harassment": {
        "severity": "high",
        "words": ["kill_yourself", "go_die", ...]
    },
    "hate": {
        "severity": "high",
        "words": ["slur1", "slur2", ...]
    },
    "sexual": {
        "severity": "high",
        "words": ["explicit_term1", ...]
    }
}
```

**Para adicionar palavras:** Editar dicionário em `BANNED_WORDS`

## Fluxo de Moderação

```
1. Usuário reporta conteúdo
   └─→ POST /api/v1/content/report
       └─→ Cria ContentReport com status='open'
           └─→ Admin é notificado (opcional)

2. Admin revisa na dashboard
   └─→ GET /api/v1/admin/moderation/dashboard
       └─→ Lista todos os 'open' reports

3. Admin toma ação
   └─→ PUT /api/v1/content/admin/reports/{id}/action
       ├─→ action='deleted' → Deleta conteúdo
       ├─→ action='approve' → Marca como revisado
       └─→ action='warn' → Avisa usuário
           └─→ Cria ContentModerationLog

4. Log de auditoria criado
   └─→ ContentModerationLog registra tudo:
       - Quem fez a ação
       - Quando
       - Por quê
       - Qual relatório
```

## Autenticação e Autorização

### Admin Check

```python
def is_admin(current_user: User = Depends(get_current_user)) -> User:
    admin_emails = ["admin@example.com", "mod@example.com"]
    if current_user.email not in admin_emails:
        raise HTTPException(403, "Admin access required")
    return current_user
```

**TODO:** Implementar campo `role` no modelo User para melhor controle.

## Integração com Sistema Existente

### 1. Usar Detecção Automática ao Salvar Mensagens

```python
from app.services.content_moderation import check_content_for_violations

# Antes de salvar mensagem
violations = check_content_for_violations(message_text)
if violations['flagged']:
    # Opções:
    # 1. Rejeitar mensagem
    # 2. Salvar mas marcar como flagged
    # 3. Enviar para revisão manual
    if violations['severity'] == 'high':
        # Rejeitar
        raise HTTPException(400, f"Conteúdo inapropriado detectado: {violations['reason']}")
```

### 2. Verificar Status Antes de Mostrar

```python
from app.services.content_moderation import get_moderation_status

status = get_moderation_status(db, message_id)
if status['status'] == 'deleted':
    # Não mostrar para usuário
    return None
```

### 3. Notificação de Aviso

```python
# Quando action='warn', pode disparar:
from app.services.notifications import send_warning_email

send_warning_email(
    user_email=user.email,
    reason="Seu conteúdo foi reportado por assédio"
)
```

## Configuração

### Admin Emails

Editar em `app/api/v1/moderation.py`:

```python
admin_emails = ["seu_email@example.com", "outro_admin@example.com"]
```

**TODO:** Mover para `settings.py` com variável de ambiente.

### Lista de Palavras Proibidas

Editar em `app/services/content_moderation.py`:

```python
BANNED_WORDS = {
    "seu_categoria": {
        "severity": "high",  # high, medium, low
        "words": ["palavra1", "palavra2", ...]
    }
}
```

## Exemplos de Uso

### Cliente JavaScript

```javascript
// 1. Verificar conteúdo
const check = await fetch('/api/v1/content/check?text=Hello world', {
  headers: { 'Authorization': `Bearer ${token}` }
});

// 2. Reportar
const report = await fetch('/api/v1/content/report', {
  method: 'POST',
  headers: { 
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    message_id: 'msg_123',
    reason: 'harassment',
    description: 'Este usuário está me assediando'
  })
});

// 3. Verificar status
const status = await fetch('/api/v1/content/moderation-status/msg_123');
```

### Admin - Python

```python
from app.services.content_moderation import get_all_reports, process_report_action
from app.core.database import SessionLocal

db = SessionLocal()

# Ver relatórios abertos
open_reports = get_all_reports(db, status='open')
for report in open_reports:
    print(f"ID: {report.id}, Motivo: {report.reason}")

# Tomar ação
result = process_report_action(
    db=db,
    report_id=1,
    action='deleted',
    moderator_id=admin_user_id,
    reason='Conteúdo violava políticas de assédio'
)
print(result['message'])
```

## Testes

### Teste Manual - Check Content

```bash
curl "http://localhost:8000/api/v1/content/check?text=spam+viagra" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Teste Manual - Reportar

```bash
curl -X POST "http://localhost:8000/api/v1/content/report" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message_id": "msg_123",
    "reason": "harassment",
    "description": "Abusing user"
  }'
```

### Teste Manual - Admin Actions

```bash
curl -X PUT "http://localhost:8000/api/v1/content/admin/reports/1/action" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "delete",
    "reason": "Harassment policy violation"
  }'
```

## Próximos Passos

1. **Adicionar campo `role` ao User model** para melhor controle de permissões
2. **Integrar com sistema de notificações** para avisos automáticos
3. **Implementar machine learning** para detecção mais sofisticada
4. **Sistema de appeals** para usuários contestarem deletions
5. **Relatórios de moderação** para análise mensal
6. **Rate limiting** em endpoints de report para evitar abuso
7. **Webhooks** para integrar com sistema externo de moderation (Perspective API, etc)

## Suporte a Múltiplos Idiomas

Lista de palavras deve considerar português (PT-BR):

```python
BANNED_WORDS = {
    "harassment": {
        "severity": "high",
        "words": [
            "se mata", "vai morrer", "morre",  # PT-BR
            "kill yourself", "go die",  # EN
        ]
    }
}
```

## Escalabilidade

Para produção com alto volume:

1. **Cache** de lista de palavras em Redis
2. **Queue assíncrona** para análise de conteúdo (Celery, RQ)
3. **Elasticsearch** para busca rápida de logs
4. **Rate limiting** por usuário para reports
5. **Métricas** em Prometheus para monitoramento

## Segurança

- Validação rigorosa de input
- RBAC (Role-Based Access Control)
- Auditoria completa em `content_moderation_logs`
- Proteção contra mass-reporting (TODO: implementar)
- Sensibilidade de dados (emails não expostos em respostas públicas)

---

**Criado:** 2024-06-05  
**Versão:** 1.0.0  
**Status:** Pronto para integração e testes
