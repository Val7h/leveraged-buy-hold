"""
TESTE DE RATE LIMITING
======================

Execute este script para testar o rate limiting:

python rate_limiting_test.py

Esperado após 5 requests em 1 minuto:
    HTTP 429 - Too Many Requests
"""

import httpx
import asyncio
from datetime import datetime


async def test_rate_limiting():
    """
    Teste de rate limiting contra um endpoint real.
    Fazer 10 requests rapidamente, esperar ver 429 após o limite.
    """

    # CONFIGURAR AQUI:
    API_URL = "http://localhost:8000/api/health"  # ou qualquer endpoint protegido
    RATE_LIMIT = "5/minute"  # Deve estar configurado para o endpoint

    print(f"Testando Rate Limiting: {RATE_LIMIT}")
    print(f"Endpoint: {API_URL}\n")

    async with httpx.AsyncClient() as client:
        for i in range(10):
            try:
                response = await client.get(API_URL)
                status = response.status_code
                timestamp = datetime.now().strftime("%H:%M:%S")

                if status == 429:
                    print(f"[{timestamp}] Request #{i+1}: ❌ RATE LIMITED (429)")
                    print(f"Response: {response.json()}\n")
                    break
                else:
                    print(f"[{timestamp}] Request #{i+1}: ✅ OK ({status})")

                # Pequeno delay entre requests (não muito grande)
                await asyncio.sleep(0.1)

            except Exception as e:
                print(f"[{datetime.now().strftime('%H:%M:%S')}] Request #{i+1}: ❌ Error: {e}")


def test_rate_limiting_sync():
    """
    Versão síncrona do teste (alternativa se asyncio não funcionar).
    """
    import time
    import requests

    API_URL = "http://localhost:8000/api/health"
    RATE_LIMIT = "5/minute"

    print(f"Testando Rate Limiting (Sync): {RATE_LIMIT}")
    print(f"Endpoint: {API_URL}\n")

    for i in range(10):
        try:
            response = requests.get(API_URL, timeout=5)
            status = response.status_code
            timestamp = datetime.now().strftime("%H:%M:%S")

            if status == 429:
                print(f"[{timestamp}] Request #{i+1}: ❌ RATE LIMITED (429)")
                print(f"Response: {response.json()}\n")
                break
            else:
                print(f"[{timestamp}] Request #{i+1}: ✅ OK ({status})")

            time.sleep(0.1)

        except Exception as e:
            print(f"[{datetime.now().strftime('%H:%M:%S')}] Request #{i+1}: ❌ Error: {e}")


if __name__ == "__main__":
    print("=" * 60)
    print("TESTE DE RATE LIMITING")
    print("=" * 60 + "\n")

    # Tentar async primeiro
    try:
        asyncio.run(test_rate_limiting())
    except Exception as e:
        print(f"Async test failed: {e}")
        print("Tentando versão síncrona...\n")
        test_rate_limiting_sync()

    print("\n" + "=" * 60)
    print("INTERPRETAÇÃO DOS RESULTADOS:")
    print("=" * 60)
    print("""
✅ OK: Request foi aceito (status 200)
❌ RATE LIMITED: Rate limit foi acionado (status 429) — FUNCIONOU!
❌ Error: Problema de conexão (API não está rodando?)

Se você vir vários ✅ seguidos de um ❌ RATE LIMITED,
isso significa que o rate limiting está funcionando corretamente!
    """)
