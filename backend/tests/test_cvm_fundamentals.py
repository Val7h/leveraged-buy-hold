"""
Golden tests do ETL CVM — PUROS, com LINHAS SINTÉTICAS no formato CVM.
SEM rede (o download real é validado ao vivo no Render). Provam:
  - parse + filtro ORDEM_EXERC='ÚLTIMO' + normalização de ESCALA_MOEDA
  - ROIC (NOPAT/capital) calculado certo + histórico
  - debt_to_equity certo (soma de Empréstimos/Financiamentos/Debêntures)
  - CAGR 5a de receita certo
  - FCF = OCF − |capex| (e fallback FCF≈OCF com flag)
  - empresa sem dado → None (não fabrica)
"""

from app.services import cvm_fundamentals as cvm


# ── helper: monta uma linha CSV-CVM sintética (formato com ; e cabeçalho) ──
HEADER = ("CNPJ_CIA;DT_REFER;VERSAO;DENOM_CIA;CD_CVM;GRUPO_DFP;MOEDA;"
          "ESCALA_MOEDA;ORDEM_EXERC;DT_INI_EXERC;DT_FIM_EXERC;CD_CONTA;"
          "DS_CONTA;VL_CONTA")


def _line(cd_conta, ds_conta, vl, *, ordem="ÚLTIMO", escala="UNIDADE",
          dt_fim="2024-12-31", cd_cvm="9512"):
    return (f"00.000.000/0001-00;{dt_fim};1;EMPRESA X;{cd_cvm};DF Consolidado;"
            f"Real;{escala};{ordem};2024-01-01;{dt_fim};{cd_conta};"
            f"{ds_conta};{vl}")


def _csv(*lines):
    return "\n".join([HEADER, *lines])


# ════════════════════════════════════════════════════════════════════════════
def test_parse_filtra_ultimo_e_escala():
    text = _csv(
        _line("3.01", "Receita", "1000", escala="MILHARES", ordem="ÚLTIMO"),
        _line("3.01", "Receita ano ant", "999", escala="MILHARES", ordem="PENÚLTIMO"),
    )
    rows = cvm.parse_cvm_csv(text)
    # só a linha ÚLTIMO entra
    assert len(rows) == 1
    # MILHARES → ×1000: 1000 → 1_000_000
    assert rows[0]["valor"] == 1_000_000.0
    assert rows[0]["year"] == 2024


def test_roic_calculo_numerico():
    # EBIT=300, PL=700, dívida=300 → capital=1000; NOPAT=300×0.66=198 → ROIC=0.198
    roic = cvm.compute_roic(ebit=300.0, pl=700.0, gross_debt=300.0)
    assert abs(roic - 0.198) < 1e-9


def test_debt_to_equity_soma_contas_de_divida():
    text = _csv(
        _line("2.03", "Patrimonio liquido", "700"),
        _line("2.01.04", "Empréstimos e Financiamentos", "120"),
        _line("2.02.01", "Debêntures", "180"),
        _line("2.01.02", "Fornecedores", "50"),   # NÃO é dívida → ignorado
        _line("3.05", "EBIT", "300"),
        _line("3.11", "Lucro", "210"),
    )
    rows = cvm.parse_cvm_csv(text)
    p = cvm.compute_company_pillars(rows)
    # dívida = 120 + 180 = 300; D/E = 300/700
    assert abs(p["debt_to_equity"] - (300.0 / 700.0)) < 1e-9
    # ROIC: capital = 700 + 300 = 1000; NOPAT = 300×0.66 = 198 → 0.198
    assert abs(p["roic"] - 0.198) < 1e-9
    # ROE = lucro/PL = 210/700 = 0.30
    assert abs(p["roe"] - 0.30) < 1e-9


def test_cagr_receita_5a():
    # receita 100 (2020) → 200 (2024): 4 períodos → CAGR = (2)^(1/4)-1 ≈ 18.92%
    rows = []
    for y, rev in [(2020, 100), (2021, 120), (2022, 140), (2023, 170), (2024, 200)]:
        rows.append({"cd_cvm": "1", "cnpj": "", "dt_refer": "", "dt_fim": f"{y}-12-31",
                     "cd_conta": "3.01", "ds_conta": "Receita", "valor": float(rev),
                     "year": y})
    p = cvm.compute_company_pillars(rows)
    expected = ((200.0 / 100.0) ** (1.0 / 4.0) - 1.0) * 100.0
    assert abs(p["rev_growth_5y"] - expected) < 1e-6
    assert abs(expected - 18.920711) < 1e-4


def test_fcf_ocf_menos_capex():
    text = _csv(
        _line("6.01", "Caixa líquido atividades operacionais", "500"),
        _line("6.02.01", "Aquisição de Imobilizado", "-120"),
        _line("6.02.02", "Aquisição de Intangível", "-30"),
        _line("1", "Ativo total", "5000"),
        _line("3.05", "EBIT", "300"),
        _line("2.03", "Patrimonio liquido", "1000"),
    )
    rows = cvm.parse_cvm_csv(text)
    p = cvm.compute_company_pillars(rows)
    # FCF = 500 − |−150| = 350
    assert p["fcf"] == 350.0
    assert p["fcf_capex_found"] is True
    # proxy FCF/Ativo = 350/5000 = 0.07
    assert abs(p["fcf_over_assets"] - 0.07) < 1e-9


def test_fcf_fallback_sem_capex():
    text = _csv(
        _line("6.01", "Caixa líquido atividades operacionais", "500"),
        _line("3.05", "EBIT", "300"),
        _line("2.03", "Patrimonio liquido", "1000"),
    )
    rows = cvm.parse_cvm_csv(text)
    p = cvm.compute_company_pillars(rows)
    # sem capex achável → FCF ≈ OCF, flag False
    assert p["fcf"] == 500.0
    assert p["fcf_capex_found"] is False


def test_empresa_sem_dado_nao_fabrica():
    # sem linhas válidas → tudo None
    p = cvm.compute_company_pillars([])
    for k in ("roe", "roic", "debt_to_equity", "fcf", "payout_ratio",
              "rev_growth_5y", "eps_growth_5y", "roic_history"):
        assert p[k] is None
    assert p["source"] == "cvm"


def test_roic_history_multi_ano():
    rows = []
    for y in (2022, 2023, 2024):
        rows.append({"cd_cvm": "1", "cnpj": "", "dt_refer": "", "dt_fim": f"{y}-12-31",
                     "cd_conta": "3.05", "ds_conta": "EBIT", "valor": 300.0, "year": y})
        rows.append({"cd_cvm": "1", "cnpj": "", "dt_refer": "", "dt_fim": f"{y}-12-31",
                     "cd_conta": "2.03", "ds_conta": "PL", "valor": 1000.0, "year": y})
    p = cvm.compute_company_pillars(rows)
    # cada ano: NOPAT=198, capital=1000 (sem dívida) → 0.198
    assert len(p["roic_history"]) == 3
    assert all(abs(r - 0.198) < 1e-9 for r in p["roic_history"])


def test_payout_ratio():
    text = _csv(
        _line("3.11", "Lucro", "1000"),
        _line("6.03.01", "Dividendos pagos", "-400"),
        _line("3.05", "EBIT", "500"),
        _line("2.03", "PL", "2000"),
    )
    rows = cvm.parse_cvm_csv(text)
    p = cvm.compute_company_pillars(rows)
    # payout = |−400| / 1000 = 0.40
    assert abs(p["payout_ratio"] - 0.40) < 1e-9


def test_ttm_yoy_via_itr():
    # 8 trimestres de receita; soma 4 recentes vs 4 anteriores
    itr = []
    vals = {"2023-03-31": 100, "2023-06-30": 100, "2023-09-30": 100, "2023-12-31": 100,
            "2024-03-31": 110, "2024-06-30": 110, "2024-09-30": 110, "2024-12-31": 110}
    for dt, v in vals.items():
        itr.append({"cd_cvm": "1", "cnpj": "", "dt_refer": "", "dt_fim": dt,
                    "cd_conta": "3.01", "ds_conta": "Receita", "valor": float(v),
                    "year": int(dt[:4])})
    dfp = [{"cd_cvm": "1", "cnpj": "", "dt_refer": "", "dt_fim": "2024-12-31",
            "cd_conta": "3.05", "ds_conta": "EBIT", "valor": 100.0, "year": 2024},
           {"cd_cvm": "1", "cnpj": "", "dt_refer": "", "dt_fim": "2024-12-31",
            "cd_conta": "2.03", "ds_conta": "PL", "valor": 1000.0, "year": 2024}]
    p = cvm.compute_company_pillars(dfp, itr)
    # recente4=440, prev4=400 → +10%
    assert abs(p["rev_growth_ttm"] - 10.0) < 1e-9
