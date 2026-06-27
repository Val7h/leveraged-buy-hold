"""
BUG DE MÉRITO — HOLDING de participações pontuada como empresa operacional.

QA ao vivo: holdings (ITSA4/Itaúsa, BRAP4/Bradespar, CXSE3/Caixa Seguridade) levavam Qualidade
ABSURDA (q3 / q0) porque o ROIC/FCF da CONTROLADORA parecem péssimos — o valor está nas
PARTICIPADAS (equity-method), não em operação própria. Isso afundava a holding no RANK
injustamente. Hoje caía no guardrail (CONF BAIXA — bom, não engana como FORTE), mas a NOTA
Q3/Q0 puxava o ativo pro fundo.

FIX (caso ANÁLOGO ao ETF/COMMODITY, que usa score_etf_vehicle_quality):
  • Detecção por SET curado (_HOLDINGS, análogo a _FINANCEIRAS/_TATICO_US) + setor/indústria.
  • Qualidade holding-aware (score_holding_quality): dividendo consistente + safety da
    controladora + resiliência — leverage-independente, NÃO fabrica.
  • Guardrail por-mercado HOLDING: os pilares do crivo de holding substituem os operacionais →
    holding bem-coberta NÃO é "dado fino"/CONF BAIXA.
  • Holding sem NENHUM dado real → segue honestamente baixa/thin (não inventa nota).
  • ZERO regressão p/ operacional normal (set curado, explícito).

Rodar a partir de backend/:  pytest tests/test_crivo_holding.py
"""
from app.quantitative import scoring_v2 as S
from app.services import ranking_service as R


# ═══════════════════ 1) ANTES × DEPOIS — a Camada 1 operacional afunda a holding ═══════════════════
def test_antes_camada1_operacional_afunda_holding():
    # ITSA4-like visto como EMPRESA OPERACIONAL: ROIC/FCF ~0 (equity-method) → nota absurda baixa.
    q_itsa, _ = S.compute_quality_blend(roic=0.01, fcf_yield=0.0, debt_to_equity=0.4)
    assert q_itsa < 40            # antes do fix a holding levava ~Q3-37 (operacional)
    # BRAP4-like (Bradespar, participação na Vale): ROIC 0 + D/E alto → ~Q0-18.
    q_brap, _ = S.compute_quality_blend(roic=0.0, fcf_yield=0.0, debt_to_equity=2.0)
    assert q_brap < 25


def test_depois_holding_aware_qualidade_razoavel():
    # DEPOIS: a mesma ITSA4 com dividendo+safety REAIS → Qualidade RAZOÁVEL (~55-75), não 3.
    q, bd = S.score_holding_quality(
        dy_avg10=5.0, dy_worst=3.5, dividend_yield=5.0, debt_to_equity=0.6, max_dd_pct=-45)
    assert 55.0 <= q <= 75.0
    assert set(bd.keys()) == {"dividendos", "safety", "resiliencia_queda"}
    # E é MUITO maior que a nota operacional afundada (3-37).
    q_oper, _ = S.compute_quality_blend(roic=0.01, fcf_yield=0.0, debt_to_equity=0.6)
    assert q > q_oper + 20


def test_holding_excelente_no_topo_da_banda_nao_elite():
    # Holding excelente em dividendo+safety: alto da banda razoável, mas NÃO vira compounder de elite.
    q, _ = S.score_holding_quality(
        dy_avg10=6.5, dy_worst=5.0, dividend_yield=6.5, debt_to_equity=0.3, max_dd_pct=-25)
    assert 60.0 <= q <= 75.0       # teto da banda holding (não-elite)


# ═══════════════════ 2) NÃO FABRICAR — holding sem dado segue baixa/thin ═══════════════════
def test_holding_sem_dado_nenhum_nao_fabrica():
    # Holding sem dividendo, sem safety, sem queda → (None, {}): não inventa nota.
    q, bd = S.score_holding_quality()
    assert q is None and bd == {}


def test_holding_fraca_de_verdade_segue_baixa():
    # Holding RUIM de verdade (dividendo magro + D/E alto + queda funda) → nota baixa (sem piso falso).
    q, _ = S.score_holding_quality(
        dy_avg10=2.0, dy_worst=0.5, dividend_yield=2.0, debt_to_equity=2.0, max_dd_pct=-60)
    assert q < 50.0


def test_holding_parcial_so_safety():
    # Só safety real (sem dividendo, sem queda): pontua só pelo que tem (não fabrica os outros).
    q, bd = S.score_holding_quality(debt_to_equity=0.4)
    assert q is not None
    assert set(bd.keys()) == {"safety"}


# ═══════════════════ 3) GUARDRAIL — holding bem-coberta NÃO é dado fino / CONF BAIXA ═══════════════════
def test_guardrail_holding_bem_coberta_nao_thin_nao_baixa():
    # GOLDEN: ITSA4-like com dividendo+safety reais → Q razoável e NÃO CONF BAIXA por pilares operacionais.
    q, bd = S.score_holding_quality(
        dy_avg10=5.0, dy_worst=3.5, dividend_yield=5.0, debt_to_equity=0.6, max_dd_pct=-45)
    # Os 2 pilares-núcleo de holding (dividendo+safety) presentes → comprovada.
    assert S.quality_pilares_reais(bd, market="HOLDING") >= 2
    assert S.quality_data_thin(bd, market="HOLDING") is False
    assert S.quality_data_confidence(bd, q, market="HOLDING") == "ALTA"


def test_guardrail_holding_so_dividendo_ainda_thin():
    # Holding com SÓ dividendo (sem safety) → 1 de 2 núcleo → MEDIA (não ALTA): substitui pilares
    # operacionais mas reconhece cobertura parcial. Não é CONF BAIXA falso, mas não "comprovada".
    q, bd = S.score_holding_quality(dividend_yield=5.0)
    assert set(bd.keys()) == {"dividendos"}
    assert S.quality_data_thin(bd, market="HOLDING") is True       # 1 < piso 2
    assert S.quality_data_confidence(bd, q, market="HOLDING") == "MEDIA"  # piso-1 == MEDIA


def test_guardrail_holding_qb_operacional_magro_segue_thin():
    # Se o crivo de holding NÃO entrou (qb ainda é operacional magro, ex só-ROE) e contássemos sob
    # HOLDING, dividendos/safety NÃO estão no breakdown → 0 núcleo holding → thin (honesto).
    _, bd = S.compute_quality_blend(roe=0.05)        # só-ROE fallback (roic_nivel só)
    assert "dividendos" not in bd and "safety" not in bd
    assert S.quality_data_thin(bd, market="HOLDING") is True


# ═══════════════════ 4) CRIVO POR TIPO — holding ignora ROIC/FCF operacional ═══════════════════
def test_crivo_holding_ignora_roic_fcf_operacional():
    # Crivo tipo 'holding' julga dividendo + D/E; ROIC/FCF ~0 da controladora NÃO derrubam a nota.
    nota_h, n_h = S.score_quality_crivo(
        "holding", roic=0.0, fcf_yield=0.0, debt_to_equity=0.5,
        dy_avg10=5.0, dy_worst=4.0, dividend_yield=5.0)
    assert nota_h is not None and n_h >= 2
    # A MESMA holding pelo crivo 'normal' (ROIC/FCF entram) seria muito mais baixa.
    nota_n, _ = S.score_quality_crivo(
        "normal", roic=0.0, fcf_yield=0.0, debt_to_equity=0.5,
        dy_avg10=5.0, dy_worst=4.0, dividend_yield=5.0)
    assert nota_h > nota_n + 15
    # E passa o piso do crivo (não rebaixa veredito de holding boa).
    assert nota_h >= S.crivo_piso("ALTA")


# ═══════════════════ 5) DETECÇÃO — set curado + setor; zero falso-positivo ═══════════════════
def test_deteccao_set_curado():
    assert R._is_holding("ITSA4.SA", {}) is True
    assert R._is_holding("BRAP4.SA", {}) is True
    assert R._is_holding("CXSE3.SA", {}) is True
    assert R._is_holding("SIMH3.SA", {}) is True
    # Operacional normal NÃO é holding (zero falso-positivo p/ não-holding).
    assert R._is_holding("WEGE3.SA", {}) is False
    assert R._is_holding("PETR4.SA", {}) is False
    assert R._is_holding("AAPL", {}) is False
    assert R._is_holding("ITUB4.SA", {}) is False      # banco operacional, não holding


def test_deteccao_por_setor_quando_disponivel():
    # Detecção secundária por setor/indústria, quando a fonte trouxer (não fabrica se ausente).
    assert R._is_holding("XPTO3.SA", {"sector": "Holding Companies"}) is True
    assert R._is_holding("YYYY3.SA", {"industry": "Participações"}) is True
    assert R._is_holding("ZZZZ3.SA", {"sector": "Technology"}) is False
    assert R._is_holding("WWWW3.SA", {}) is False      # sem dado de setor → só whitelist


# ═══════════════════ 6) ZERO REGRESSÃO — operacional normal idêntico ═══════════════════
def test_zero_regressao_operacional_normal():
    # Empresa operacional normal (não-holding): compute_quality_blend inalterado; guardrail US/BR
    # inalterado (HOLDING só entra quando _is_holding é True, e o set é curado/explícito).
    q, bd = S.compute_quality_blend(roic=0.20, debt_to_equity=0.4, fcf_yield=0.07, growth_5y=12)
    assert set(bd.keys()) == {"roic_nivel", "safety", "fcf", "crescimento"}
    assert S.quality_data_thin(bd, market="US") is False
    assert S.quality_data_confidence(bd, q, market="US") == "ALTA"
    # Sem market (legado) idêntico.
    assert S.quality_data_thin(bd) is False
