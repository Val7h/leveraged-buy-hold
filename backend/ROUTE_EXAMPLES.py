"""
EXEMPLOS DE COMO USAR RATE LIMITING E CONTENT MODERATION NAS ROTAS
===================================================================

Copie e cole estes exemplos nas suas rotas em app/api/v1/

"""

# ============================================================================
# OPÇÃO 1: Usando decorador RateLimitDecorators
# ============================================================================

from fastapi import APIRouter, Depends, HTTPException, status
from app.core.security import get_current_user
from app.core.rate_limiter import RateLimitDecorators
from app.core.content_filter import moderate_content
from app.models.user import User
from sqlalchemy.orm import Session
from app.core.database import get_db

router = APIRouter(tags=["example"])


@router.post("/api/v1/example/login")
@RateLimitDecorators.auth
async def login_example(username: str, password: str):
    """
    Login com rate limit de 5 requests/minute.
    Após 5 tentativas em 1 minuto, retorna 429 Too Many Requests.
    """
    # seu código aqui
    return {"token": "xyz"}


@router.post("/api/v1/example/message")
@RateLimitDecorators.messages
async def send_message_example(
    message: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Enviar mensagem com rate limit de 100 requests/minute.
    Também valida conteúdo para palavras proibidas.
    """
    # Verificar conteúdo
    moderation = moderate_content(message)

    if moderation['should_block']:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Conteúdo contém palavras proibidas: {moderation['flags']['banned_words']}"
        )

    if moderation['should_warn']:
        print(f"⚠️ Conteúdo com possível spam: {moderation['flags']['spam_patterns']}")

    # seu código aqui para salvar mensagem
    return {
        "status": "sent",
        "message_id": "xyz",
        "moderation_status": moderation['severity']
    }


@router.get("/api/v1/example/search")
@RateLimitDecorators.search
async def search_example(query: str):
    """Search com rate limit de 50 requests/minute"""
    # seu código aqui
    return {"results": []}


@router.post("/api/v1/example/backtest")
@RateLimitDecorators.general
async def backtest_example(
    tickers: str,
    current_user: User = Depends(get_current_user),
):
    """Backtest com rate limit geral de 200 requests/minute"""
    # seu código aqui
    return {"status": "running"}


# ============================================================================
# OPÇÃO 2: Usando decorador direto (importar função)
# ============================================================================

from app.core.rate_limiter import (
    rate_limit_auth,
    rate_limit_messages,
    rate_limit_search,
    rate_limit_general,
    rate_limit_billing,
    rate_limit_moderation,
)


@router.post("/api/v1/example/billing/subscribe")
@rate_limit_billing
async def subscribe_example(
    plan: str,
    current_user: User = Depends(get_current_user),
):
    """Subscribe com rate limit de 50 requests/minute"""
    # seu código aqui para criar subscription
    return {"status": "subscribed"}


@router.post("/api/v1/example/moderation/report")
@rate_limit_moderation
async def report_example(
    message_id: str,
    reason: str,
    current_user: User = Depends(get_current_user),
):
    """Report conteúdo com rate limit de 30 requests/minute"""
    # seu código aqui
    return {"status": "reported"}


# ============================================================================
# OPÇÃO 3: Rate limit customizado
# ============================================================================

from app.core.rate_limiter import RateLimitDecorators


@router.post("/api/v1/example/heavy-compute")
@RateLimitDecorators.custom("10/minute")  # Apenas 10 requests/min
async def heavy_computation(
    current_user: User = Depends(get_current_user),
):
    """Operação pesada com rate limit customizado: 10 requests/minute"""
    # seu código aqui (operação CPU-intensiva)
    return {"status": "done"}


# ============================================================================
# OPÇÃO 4: SEM Rate Limit (não adicione decorator)
# ============================================================================


@router.get("/api/v1/example/health")
async def health_no_limit():
    """
    Health check SEM rate limit.
    (Não precisa de proteção contra abuse)
    """
    return {"status": "ok"}


# ============================================================================
# EXEMPLO COMPLETO: Sistema de Mensagens com Moderação
# ============================================================================

from datetime import datetime


class MessageModeration:
    """Exemplo de como integrar moderação em um sistema de mensagens"""

    @staticmethod
    @router.post("/api/v1/messages/send")
    @RateLimitDecorators.messages
    async def send_message(
        room_id: str,
        content: str,
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db),
    ):
        """
        Enviar mensagem com:
        1. Rate limiting (100/minute)
        2. Content moderation
        3. Salvamento em DB
        """

        # 1. Moderar conteúdo
        moderation_result = moderate_content(content)

        # 2. Bloquear conteúdo proibido
        if moderation_result['should_block']:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "error": "content_blocked",
                    "reason": "Conteúdo contém palavras proibidas",
                    "banned_words": moderation_result['flags']['banned_words']
                }
            )

        # 3. Avisar sobre possível spam
        moderation_status = moderation_result['severity']
        if moderation_result['should_warn']:
            # Log ou notificar mods
            print(f"⚠️ Message from {current_user.id}: possible spam")

        # 4. Salvar mensagem em DB
        # message = Message(
        #     user_id=current_user.id,
        #     room_id=room_id,
        #     content=content,
        #     moderation_status=moderation_status,
        #     created_at=datetime.utcnow()
        # )
        # db.add(message)
        # db.commit()

        return {
            "status": "sent",
            "message_id": "msg_123",
            "moderation_severity": moderation_status,
            "timestamp": datetime.utcnow().isoformat()
        }

    @staticmethod
    @router.get("/api/v1/messages/{room_id}")
    @RateLimitDecorators.messages
    async def get_messages(
        room_id: str,
        current_user: User = Depends(get_current_user),
    ):
        """Listar mensagens de uma sala"""
        # seu código aqui
        return {"messages": []}


# ============================================================================
# CHECKLIST DE IMPLEMENTAÇÃO
# ============================================================================
"""
Para cada rota que você quer proteger:

☐ 1. Importar o decorador:
      from app.core.rate_limiter import RateLimitDecorators

☐ 2. Adicionar decorador antes do async def:
      @RateLimitDecorators.auth  # ou .messages, .search, etc

☐ 3. Se precisa moderar conteúdo:
      from app.core.content_filter import moderate_content

      result = moderate_content(user_input)
      if result['should_block']:
          raise HTTPException(400, ...)

☐ 4. PRONTO! Rate limit e moderação estão ativos

Exemplo:
      @router.post("/path")
      @RateLimitDecorators.messages
      async def my_endpoint(data: str):
          # verificação opcional
          mod = moderate_content(data)
          if mod['should_block']:
              raise HTTPException(400, ...)
          return {"ok": True}
"""
