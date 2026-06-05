# Content Moderation System - Quick Reference

## Files Created

| File | Purpose |
|------|---------|
| `app/models/moderation.py` | SQLAlchemy models: ContentReport, ContentModerationLog |
| `app/schemas/moderation.py` | Pydantic schemas for validation & responses |
| `app/services/content_moderation.py` | Business logic & content detection |
| `app/api/v1/moderation.py` | REST API endpoints |
| `app/api/v1/moderation_admin_dashboard.py` | Admin dashboard HTML UI |
| `migrations/001_add_moderation_tables.sql` | Database migration |
| `migrations/002_add_role_to_users.sql` | Optional role migration |
| `tests/test_moderation.py` | Complete test suite |

## Quick Start (5 minutes)

### 1. Database Setup

```bash
# Option A: Run migration manually
mysql -u root -p your_database < backend/migrations/001_add_moderation_tables.sql

# Option B: SQLAlchemy auto-creates on first run
# Just start the app, tables will be created
```

### 2. Configure Admin

Edit `app/api/v1/moderation.py`, line ~22:

```python
admin_emails = ["seu_email@example.com"]
```

### 3. Add Banned Words

Edit `app/services/content_moderation.py`, line ~11:

```python
BANNED_WORDS = {
    "spam": {
        "severity": "low",
        "words": ["palavra1", "palavra2"]
    }
}
```

### 4. Test It

```bash
# Start server
uvicorn app.main:app --reload

# Test endpoint (in another terminal)
curl "http://localhost:8000/api/v1/content/check?text=teste" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 5. Access Dashboard

```
http://localhost:8000/api/v1/admin/moderation/dashboard
```

Login with admin email.

## API Cheat Sheet

### Check Content
```bash
GET /api/v1/content/check?text=hello
```

### Report Content
```bash
POST /api/v1/content/report
{
  "message_id": "msg_123",
  "reason": "harassment",
  "description": "User is harassing me"
}
```

### Check Moderation Status
```bash
GET /api/v1/content/moderation-status/msg_123
```

### Admin: List Reports
```bash
GET /api/v1/content/admin/reports?status=open
```

### Admin: Take Action
```bash
PUT /api/v1/content/admin/reports/1/action
{
  "action": "delete",
  "reason": "Harassment violation"
}
```

### Admin: Dismiss Report
```bash
PUT /api/v1/content/admin/reports/1/dismiss?reason=No+violation+found
```

### Admin: View Logs
```bash
GET /api/v1/content/admin/logs
```

### Admin: Get Stats
```bash
GET /api/v1/content/admin/statistics
```

## Reasons

- `harassment` - Assédio/Abuso
- `spam` - Spam
- `hate` - Discurso de ódio
- `sexual` - Conteúdo sexual
- `violence` - Violência
- `misinformation` - Desinformação
- `copyright` - Direitos autorais
- `other` - Outro

## Actions

- `delete` - Remove conteúdo
- `approve` - Aprova (sem ação)
- `warn` - Avisa usuário

## Statuses

- `open` - Esperando revisão
- `reviewed` - Revisado
- `dismissed` - Descartado
- `deleted` - Conteúdo deletado

## Integration Examples

### Rejeitar conteúdo ao salvar mensagem

```python
from app.services.content_moderation import check_content_for_violations

violations = check_content_for_violations(message_text)
if violations['severity'] == 'high':
    raise HTTPException(400, "Conteúdo inapropriado")
```

### Verificar antes de exibir

```python
from app.services.content_moderation import get_moderation_status

status = get_moderation_status(db, message_id)
if status['status'] == 'deleted':
    return None  # Não exibir
```

## Tests

```bash
# Run all tests
pytest tests/test_moderation.py -v

# Run specific test class
pytest tests/test_moderation.py::TestContentReporting -v

# Run with coverage
pytest tests/test_moderation.py --cov=app.services.content_moderation
```

## Dashboard Features

- ✓ Estatísticas em tempo real
- ✓ Tabela de relatórios filtrávelr
- ✓ Ações: Deletar, Avisar, Descartar
- ✓ Modal com justificativa obrigatória
- ✓ Log completo de moderadores
- ✓ Busca por ID de mensagem
- ✓ Filtro por status e motivo
- ✓ Atualização automática a cada 30s

## Common Issues

### Erro: "Admin access required"
- Verificar email em `admin_emails`
- Fazer logout/login novamente

### Reports não aparecem na dashboard
- Verificar database:
  ```sql
  SELECT * FROM content_reports;
  ```
- Verificar se token está válido

### Detecção não funciona
- Verificar `BANNED_WORDS` tem a palavra
- Testar endpoint `/content/check`

### Migration fails
- Verificar database connection
- MySQL user tem permissão de CREATE TABLE

## Monitoring

```python
# Quick check - count open reports
GET /api/v1/content/admin/open-reports-count

# Full stats
GET /api/v1/content/admin/statistics
```

## Environment Variables (Recommended)

Add to `.env`:

```
ADMIN_EMAILS=admin@example.com,mod@example.com
```

Update `settings.py`:

```python
ADMIN_EMAILS: list = os.getenv("ADMIN_EMAILS", "admin@example.com").split(",")
```

## Database Queries

### Total reports
```sql
SELECT COUNT(*) FROM content_reports;
```

### Open reports by reason
```sql
SELECT reason, COUNT(*) FROM content_reports 
WHERE status='open' GROUP BY reason;
```

### Moderator actions
```sql
SELECT moderator_id, action, COUNT(*) 
FROM content_moderation_logs 
GROUP BY moderator_id, action;
```

### Recent reports
```sql
SELECT * FROM content_reports 
ORDER BY created_at DESC LIMIT 10;
```

## Rate Limiting (TODO)

Add to report endpoint:

```python
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

@router.post("/report")
@limiter.limit("5/minute")
def report_content(...):
    # Max 5 reports per minute per user
```

## Next Steps

1. ✓ Deploy migrations
2. ✓ Configure admin emails
3. ✓ Add PT-BR banned words
4. ✓ Test locally
5. ⬜ Integrate with message endpoints
6. ⬜ Setup notifications
7. ⬜ Configure rate limiting
8. ⬜ Deploy to production
9. ⬜ Monitor metrics

## Support Resources

- Full docs: `CONTENT_MODERATION_SYSTEM.md`
- Integration guide: `MODERATION_INTEGRATION_GUIDE.md`
- Tests: `tests/test_moderation.py`
- Endpoints: `app/api/v1/moderation.py`

---

**Status:** Production Ready ✓  
**Last Updated:** 2024-06-05  
**Version:** 1.0.0
