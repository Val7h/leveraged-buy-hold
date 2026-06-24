"""
Testes da categoria EUROPE do universo de aporte.

Objetivo: garantir que os ativos europeus apontem para instrumentos negociáveis
na Quantfury. Tickers de bolsa LOCAL europeia (.PA/.SW/.DE/.AS/.MI/.L) muitas
vezes não estão disponíveis lá; quando há ADR US líquido conhecido, usamos o ADR.

SEM REDE (o sandbox não tem rede): valida apenas a ESTRUTURA da lista — não busca
preço. A validação de preço ao vivo é feita à parte.

Rodar: `pytest tests/test_europe_adr.py` a partir de backend/.
"""
import re

from app.quantitative import universe


LOCAL_EXCHANGE_SUFFIXES = (".PA", ".SW", ".DE", ".AS", ".MI", ".L")

# ADRs US (OTC) que substituíram a bolsa local — devem estar presentes.
EXPECTED_ADRS = {"LVMUY", "NSRGY", "SIEGY"}

# Locais que PODEM permanecer (sem ADR confiável). Hoje: nenhum.
# Se algum nome ficar em bolsa local por falta de ADR, adicione aqui.
ALLOWED_LOCAL_TICKERS: set[str] = set()


def europe():
    return universe.UNIVERSE["EUROPE"]


def test_europe_carrega_sem_erro():
    rows = europe()
    assert isinstance(rows, list)
    assert len(rows) >= 10, "cobertura EUROPE caiu demais"
    for row in rows:
        assert len(row) == 3, f"linha mal formada: {row!r}"
        ticker, bucket, name = row
        assert ticker and isinstance(ticker, str)
        assert bucket in {"ANCORA", "GERADOR", "ACELERADOR", "TATICO", "RESERVA"}
        assert name and isinstance(name, str)


def test_sem_tickers_duplicados():
    tickers = [t for (t, _, _) in europe()]
    dups = {t for t in tickers if tickers.count(t) > 1}
    assert not dups, f"tickers duplicados em EUROPE: {dups}"


def test_sem_bolsa_local_inesperada():
    """Nenhum ticker deve ter sufixo de bolsa local, exceto os explicitamente
    permitidos (sem ADR confiável)."""
    offenders = []
    for ticker, _, _ in europe():
        if ticker in ALLOWED_LOCAL_TICKERS:
            continue
        if any(ticker.upper().endswith(sfx) for sfx in LOCAL_EXCHANGE_SUFFIXES):
            offenders.append(ticker)
    assert not offenders, (
        f"tickers de bolsa local sem ADR mapeado: {offenders}. "
        "Mapeie p/ ADR US líquido ou adicione a ALLOWED_LOCAL_TICKERS."
    )


def test_adrs_esperados_presentes():
    tickers = {t for (t, _, _) in europe()}
    faltando = EXPECTED_ADRS - tickers
    assert not faltando, f"ADRs esperados ausentes: {faltando}"


def test_formato_ticker_valido():
    """ADRs/US tickers: letras maiúsculas, opcionalmente com '-' (ex BRK-B).
    Tickers permitidos em bolsa local podem ter '.'."""
    pat = re.compile(r"^[A-Z]+(?:-[A-Z]+)?$")
    for ticker, _, _ in europe():
        if ticker in ALLOWED_LOCAL_TICKERS:
            continue
        assert pat.match(ticker), f"formato de ticker inesperado: {ticker!r}"
