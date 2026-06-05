# Guia de Integração - Content Moderation System

## Checklist de Integração

- [x] Database models criados
- [x] API endpoints implementados
- [x] Dashboard admin criado
- [x] Serviço de detecção criado
- [ ] Atualizar User model com campo `role`
- [ ] Conectar com endpoints existentes
- [ ] Configurar admin emails
- [ ] Adicionar palavras proibidas para seu idioma
- [ ] Testes de integração
- [ ] Deploy em produção

## 1. Atualizar User Model (Recomendado)

Editar `app/models/user.py`:

```python
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.core.database import Base


class RiskProfile(str, enum.Enum):
    conservative = "conservative"
    balanced = "balanced"
    aggressive = "aggressive"


class UserRole(str, enum.Enum):
    user = "user"
    moderator = "moderator"
    admin = "admin"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String)
    is_active = Column(Boolean, default=True)
    role = Column(Enum(UserRole, native_enum=False), default=UserRole.user)  # NOVO
    risk_profile = Column(Enum(RiskProfile, native_enum=False), default=RiskProfile.balanced)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    portfolios = relationship("Portfolio", back_populates="owner")
    alerts = relationship("Alert", back_populates="user")
```

Se usar este modelo, atualizar `is_admin()` em `moderation.py`:

```python
def is_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role not in [UserRole.admin, UserRole.moderator]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return current_user
```

## 2. Integrar com Endpoints de Mensagem Existentes

Se seu sistema tem endpoints para criar/enviar mensagens:

### Opção A: Rejeitar conteúdo inapropriado

```python
from app.services.content_moderation import check_content_for_violations

@router.post("/messages")
def create_message(msg: MessageCreate, db: Session = Depends(get_db)):
    # Verificar conteúdo ANTES de salvar
    violations = check_content_for_violations(msg.text)
    
    if violations['flagged']:
        if violations['severity'] == 'high':
            # Rejeitar imediatamente
            raise HTTPException(
                status_code=400,
                detail=f"Conteúdo inapropriado detectado: {violations['reason']}"
            )
        else:
            # Avisar mas permitir
            pass
    
    # Salvar mensagem normalmente
    message = Message(text=msg.text, user_id=current_user.id)
    db.add(message)
    db.commit()
    return message
```

### Opção B: Marcar como flagged para revisão

```python
class Message(Base):
    __tablename__ = "messages"
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    text = Column(Text)
    is_flagged = Column(Boolean, default=False)  # NOVO
    created_at = Column(DateTime, default=func.now())

# Ao criar:
violations = check_content_for_violations(msg.text)
message = Message(
    text=msg.text,
    user_id=current_user.id,
    is_flagged=violations['flagged']
)
db.add(message)
db.commit()
```

### Opção C: Enviar para fila de revisão

```python
from app.services.content_moderation import create_content_report

violations = check_content_for_violations(msg.text)
if violations['flagged']:
    # Criar report automático para sistema revisar
    create_content_report(
        db=db,
        message_id=str(message.id),
        reporter_id=SYSTEM_USER_ID,  # Identificador do sistema
        reason="automated_detection",
        description=f"Detectado: {violations['detected_words']}"
    )
```

## 3. Ao Buscar/Listar Mensagens

```python
from app.services.content_moderation import get_moderation_status

@router.get("/messages/{message_id}")
def get_message(message_id: int, db: Session = Depends(get_db)):
    message = db.query(Message).filter(Message.id == message_id).first()
    if not message:
        raise HTTPException(404)
    
    # Verificar se foi deletado por moderação
    mod_status = get_moderation_status(db, str(message_id))
    if mod_status['status'] == 'deleted':
        raise HTTPException(404, "Conteúdo removido por violação de políticas")
    
    return message
```

## 4. Configurar Admin Emails

Editar `app/api/v1/moderation.py`:

```python
def is_admin(current_user: User = Depends(get_current_user)) -> User:
    admin_emails = [
        "seu_email@example.com",
        "outro_admin@example.com",
        "moderador@example.com"
    ]
    if current_user.email not in admin_emails:
        raise HTTPException(403, "Admin access required")
    return current_user
```

**Melhor prática:** Usar variável de ambiente

```python
from app.core.config import settings

def is_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.email not in settings.ADMIN_EMAILS:
        raise HTTPException(403, "Admin access required")
    return current_user
```

Adicionar em `app/core/config.py`:

```python
from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    # ... outras settings ...
    ADMIN_EMAILS: List[str] = ["admin@example.com"]
    
    class Config:
        env_file = ".env"
```

Adicionar em `.env`:

```
ADMIN_EMAILS=admin@example.com,mod@example.com
```

## 5. Adicionar Palavras Proibidas (PT-BR)

Editar `app/services/content_moderation.py`:

```python
BANNED_WORDS = {
    "harassment": {
        "severity": "high",
        "words": [
            # Português
            "se mata", "vai morrer", "morre",
            "seu lixo", "desgraçado",
            # English
            "kill yourself", "go die",
        ]
    },
    "spam": {
        "severity": "low",
        "words": [
            "viagra", "casino", "loteria",
            "clique aqui", "compre agora",
        ]
    },
    "sexual": {
        "severity": "high",
        "words": [
            # Adicionar termos em PT-BR
            "pornô", "sexo",
        ]
    },
    "hate": {
        "severity": "high",
        "words": [
            # Palavrões relacionados a grupos
            # (cuidado ao adicionar - contexto importa)
        ]
    }
}
```

## 6. Dashboard Admin - Acessar

### URL de Acesso

```
http://localhost:8000/api/v1/admin/moderation/dashboard
```

**Requisitos:**
- Login como admin (email em `ADMIN_EMAILS`)
- Token JWT válido (salvo em localStorage automaticamente)

### Recursos do Dashboard

- [x] Visualizar estatísticas em tempo real
- [x] Filtrar por status e motivo
- [x] Buscar por ID de mensagem
- [x] Deletar conteúdo
- [x] Avisar usuário
- [x] Descartar relatório
- [x] Log completo de ações

## 7. Notificações (Opcional)

Quando admin toma ação "warn", pode enviar email:

```python
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig

# Em moderation.py - na função process_report_action

if action == "warned_user":
    # Enviar email para usuário
    user = db.query(User).filter(User.id == report.user_id).first()
    
    message = MessageSchema(
        subject="Conteúdo Removido - Aviso",
        recipients=[user.email],
        body=f"""
        Seu conteúdo foi removido por violar nossas políticas:
        Motivo: {report.reason}
        
        Mais detalhes: {reason}
        
        Se acha que foi um erro, contate suporte.
        """,
        subtype="html"
    )
    
    fm = FastMail(conf)
    await fm.send_message(message)
```

## 8. Testes de Integração

### Setup

```bash
cd backend
pip install pytest pytest-asyncio httpx
```

### Teste de Criação de Report

`tests/test_moderation.py`:

```python
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_report_content(db_session):
    response = client.post(
        "/api/v1/content/report",
        json={
            "message_id": "msg_123",
            "reason": "harassment",
            "description": "Teste de report"
        },
        headers={"Authorization": f"Bearer {valid_token}"}
    )
    assert response.status_code == 201
    assert response.json()["status"] == "open"

def test_check_content():
    response = client.get(
        "/api/v1/content/check",
        params={"text": "viagra casino"},
        headers={"Authorization": f"Bearer {valid_token}"}
    )
    assert response.json()["flagged"] == True
    assert response.json()["severity"] == "low"

def test_admin_list_reports(admin_token):
    response = client.get(
        "/api/v1/content/admin/reports",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert response.status_code == 200
    assert isinstance(response.json(), list)
```

### Rodar Testes

```bash
pytest tests/test_moderation.py -v
```

## 9. Monitoramento

### Logs Importantes

```python
import logging

logger = logging.getLogger(__name__)

# Em content_moderation.py, adicionar:
logger.info(f"Report created: {report.id} for message {message_id}")
logger.warning(f"Content flagged: {violations['reason']}")
logger.info(f"Moderation action: {action} by admin {moderator_id}")
```

### Métricas (Prometheus)

```python
from prometheus_client import Counter, Gauge

reports_created = Counter('moderation_reports_created', 'Total reports')
open_reports = Gauge('moderation_open_reports', 'Open reports count')
content_flagged = Counter('moderation_content_flagged', 'Flagged content')

# Ao criar report:
reports_created.inc()
```

## 10. Deployment Checklist

Antes de ir para produção:

- [ ] Testado localmente com dados realistas
- [ ] Admin emails configurados corretamente
- [ ] Lista de palavras em PT-BR atualizada
- [ ] Database migrations rodadas
- [ ] Backups configurados
- [ ] Logs agregados e monitorados
- [ ] Rate limiting em `/report` endpoint
- [ ] HTTPS habilitado
- [ ] CORS configurado corretamente
- [ ] Testes de carga passaram

## Troubleshooting

### "Admin access required" mesmo sendo admin

1. Verificar se email está em `ADMIN_EMAILS`
2. Fazer logout e login novamente
3. Verificar em DevTools → Application → localStorage

### Dashboard não carrega

1. Abrir browser console (F12)
2. Verificar erro de network
3. Verificar se token está em localStorage
4. Fazer logout e login novamente

### Reports não aparecem

1. Verificar se foram criados no banco:
```sql
SELECT COUNT(*) FROM content_reports WHERE status='open';
```
2. Verificar se admin está com permissão correta
3. Verificar logs do servidor

### Detecção automática não funciona

1. Verificar `BANNED_WORDS` em `content_moderation.py`
2. Testar endpoint `/content/check` manualmente
3. Verificar se texto exato está na lista

## Suporte

Para dúvidas sobre integração, verifique:
1. `/backend/CONTENT_MODERATION_SYSTEM.md` - Documentação completa
2. Exemplos em docstrings dos endpoints
3. Tests em `tests/test_moderation.py`

---

**Última atualização:** 2024-06-05  
**Versão:** 1.0.0
