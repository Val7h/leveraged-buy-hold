"""
cvm_fundamentals — ETL da CVM DADOS ABERTOS para fundamentos de ações B3.

PROBLEMA que isto resolve:
    O brapi free entrega ≤1 pilar real por ticker B3 e achata o score de
    Qualidade BR (sem ROIC histórico, sem FCF, sem crescimento). A CVM publica
    as DFs (DFP anual + ITR trimestral) de TODAS as cias abertas em CSV grátis.
    Aqui montamos um ETL local que vira a FONTE PRIMÁRIA dos pilares
    fundamentalistas BR, deixando o brapi só p/ preço/DY corrente.

ARQUITETURA (separação I/O × cálculo — CRÍTICO p/ testabilidade offline):
    • Funções PURAS (parse de CSV-em-memória, cálculo de pilares por empresa)
      — testáveis com LINHAS SINTÉTICAS no formato CVM, SEM rede. É aqui que
      mora toda a lógica de negócio.
    • Funções de I/O (download dos ZIPs, escrita/leitura do cache em disco)
      — finas, blindadas, validadas AO VIVO no Render (o Bash local não tem rede).

    refresh_cvm_cache()  → baixa ZIPs (1×), calcula pilares por CD_CVM, grava
                           1 JSON por empresa no cache de RUNTIME. Roda no boot
                           (background) + semanal (start.sh). Blindado: falha de
                           rede/parse loga e segue, nunca quebra o app.
    get_cvm_fundamentals(ticker) → lê o cache (rápido, sem download). None se ausente.

CONTRATO DE UNIDADES (igual a fundamentals_provider._empty + roic_history):
    roe/roic/roic_history em FRAÇÃO (0.18 = 18%); debt_to_equity múltiplo;
    payout_ratio fração; *_growth_* em %; fcf absoluto + fcf_over_assets proxy.
    Campo sem dado → None (NUNCA fabrica).
"""

from __future__ import annotations

import io
import os
import csv
import json
import time
import logging
import zipfile
import tempfile
import ssl as _ssl
import urllib.request as _urlreq

logger = logging.getLogger(__name__)

# ───────────────────────────── constantes / config ──────────────────────────────
CVM_BASE = "https://dados.cvm.gov.br/dados/CIA_ABERTA/DOC"
TAX_RATE = 0.34                      # IR+CSLL p/ NOPAT = EBIT × (1 − 0.34)
DFP_YEARS = 5                        # janela DFP p/ ROIC histórico / CAGR 5a
CURRENT_YEAR = time.gmtime().tm_year

# Diretório do mapa ticker→cd_cvm (gerado por OUTRO agente; pode faltar → no-op).
_DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
CVM_TICKER_MAP_PATH = os.path.join(_DATA_DIR, "cvm_ticker_map.json")

# Cache de RUNTIME (mesmo padrão de fundamentals_provider / market_data) — NÃO
# backend/app/cache/ (gitignored p/ FONTES). Aqui é dado coletado de runtime.
CVM_CACHE_DIR = os.environ.get(
    "CVM_CACHE_DIR",
    os.path.join(
        os.environ.get("FUNDAMENTALS_CACHE_DIR",
                       os.path.join(tempfile.gettempdir(), "lbh_fundamentals_cache")),
        "cvm"))

_HTTP_TIMEOUT = 60                    # ZIPs da CVM são grandes (dezenas de MB)

# CD_CONTA padronizados (consolidado) — ver doc CVM.
CD_RECEITA = "3.01"                   # Receita líquida
CD_EBIT = "3.05"                      # Resultado antes do result. financeiro e tributos
CD_LUCRO = "3.11"                     # Lucro/Prejuízo do período
CD_ATIVO = "1"                        # Ativo total
CD_PL = "2.03"                        # Patrimônio líquido consolidado
CD_OCF = "6.01"                       # Caixa líquido atividades operacionais

# SSL (mesmo padrão dos outros módulos: tenta certifi, fallback default).
try:
    import certifi as _certifi
    _CTX = _ssl.create_default_context(cafile=_certifi.where())
except Exception:
    _CTX = _ssl.create_default_context()

_ALLOW_INSECURE = os.environ.get("ALLOW_INSECURE_SSL", "1").strip() == "1"
_CTX_NOVERIFY = _ssl.create_default_context()
_CTX_NOVERIFY.check_hostname = False
_CTX_NOVERIFY.verify_mode = _ssl.CERT_NONE


# ═══════════════════════════════════════════════════════════════════════════════
#  FUNÇÕES PURAS  (sem I/O — testáveis offline com dados sintéticos)
# ═══════════════════════════════════════════════════════════════════════════════

def _to_float(v):
    """'1.234,56' / '1234.56' / número → float. Vazio/erro → None."""
    if v is None:
        return None
    if isinstance(v, (int, float)):
        f = float(v)
        return None if (f != f) else f
    s = str(v).strip()
    if not s or s in ("-", "ND", "nan"):
        return None
    # Formato CVM usa ponto decimal (ex "1234.56"); mas blindamos p/ vírgula BR.
    if "," in s and "." in s:
        s = s.replace(".", "").replace(",", ".")
    elif "," in s:
        s = s.replace(",", ".")
    try:
        f = float(s)
        return None if (f != f) else f
    except Exception:
        return None


def _scale_factor(escala: str) -> float:
    """ESCALA_MOEDA → multiplicador p/ trazer VL_CONTA a unidades (reais)."""
    e = (escala or "").strip().upper()
    if e in ("MILHARES", "MIL"):
        return 1_000.0
    if e in ("MILHOES", "MILHÕES", "MILHAO", "MILHÃO"):
        return 1_000_000.0
    return 1.0


def parse_cvm_csv(text: str, wanted_cd: set | None = None) -> list[dict]:
    """Parse PURO de um CSV da CVM (já decodificado p/ str).

    Retorna lista de linhas-dict NORMALIZADAS, contendo só ORDEM_EXERC == 'ÚLTIMO':
        {cd_cvm, cnpj, dt_refer, dt_fim, cd_conta, ds_conta, valor(float já
         escalado p/ unidades), year(int do exercício)}

    wanted_cd: se passado (conjunto de CD_CVM já normalizados sem zeros à
        esquerda), descarta DURANTE o parse toda linha de empresa fora do
        conjunto. CRÍTICO p/ memória no Render: o CSV bruto tem ~150k linhas;
        filtrando p/ as ~72 empresas do mapa, o pico de RAM despenca (evita OOM).
    Blindado: linha malformada é pulada. NÃO faz I/O.
    """
    return _parse_cvm_reader(csv.DictReader(io.StringIO(text), delimiter=";"), wanted_cd)


def _parse_cvm_reader(reader, wanted_cd: set | None = None) -> list[dict]:
    """Núcleo do parse a partir de um csv.DictReader (str-source OU streaming do
    ZIP). Mesma lógica/contrato de parse_cvm_csv. Streaming evita materializar o
    CSV decodificado inteiro (memória-safe no Render)."""
    out: list[dict] = []
    for row in reader:
        try:
            if (row.get("ORDEM_EXERC") or "").strip().upper() != "ÚLTIMO":
                continue
            cd_cvm = (row.get("CD_CVM") or "").strip()
            if wanted_cd is not None and (cd_cvm.lstrip("0") or "0") not in wanted_cd:
                continue
            valor = _to_float(row.get("VL_CONTA"))
            if valor is None:
                continue
            valor *= _scale_factor(row.get("ESCALA_MOEDA"))
            dt_fim = (row.get("DT_FIM_EXERC") or row.get("DT_REFER") or "").strip()
            year = None
            if len(dt_fim) >= 4 and dt_fim[:4].isdigit():
                year = int(dt_fim[:4])
            out.append({
                "cd_cvm": cd_cvm,
                "cnpj": (row.get("CNPJ_CIA") or "").strip(),
                "dt_refer": (row.get("DT_REFER") or "").strip(),
                "dt_fim": dt_fim,
                "cd_conta": (row.get("CD_CONTA") or "").strip(),
                "ds_conta": (row.get("DS_CONTA") or "").strip(),
                "valor": valor,
                "year": year,
            })
        except Exception:
            continue
    return out


def _val(rows: list[dict], cd_conta: str, year: int | None = None):
    """Valor exato de uma CD_CONTA (opcionalmente p/ um ano). None se ausente."""
    for r in rows:
        if r["cd_conta"] == cd_conta and (year is None or r["year"] == year):
            return r["valor"]
    return None


def _gross_debt(rows: list[dict], year: int | None = None):
    """Dívida bruta = soma das contas de passivo (2.01.x circulante + 2.02.x
    não-circ.) cujo DS_CONTA menciona Empréstimos/Financiamentos/Debêntures.
    None se nada achado (não fabrica)."""
    KW = ("emprestimo", "empréstimo", "financiamento", "debentur", "debêntur")
    total = None
    for r in rows:
        if year is not None and r["year"] != year:
            continue
        cc = r["cd_conta"]
        if not (cc.startswith("2.01") or cc.startswith("2.02")):
            continue
        ds = r["ds_conta"].lower()
        if any(k in ds for k in KW):
            total = (total or 0.0) + r["valor"]
    return total


def _capex(rows: list[dict], year: int | None = None):
    """CAPEX ≈ contas de investimento (6.02.x) cujo DS_CONTA menciona
    Imobilizado/Intangível. Valores tipicamente NEGATIVOS na DFC. Retorna a
    soma (negativa) ou None se não achável."""
    KW = ("imobilizado", "intangivel", "intangível")
    total = None
    for r in rows:
        if year is not None and r["year"] != year:
            continue
        if not r["cd_conta"].startswith("6.02"):
            continue
        ds = r["ds_conta"].lower()
        if any(k in ds for k in KW):
            total = (total or 0.0) + r["valor"]
    return total


def _dividends_paid(rows: list[dict], year: int | None = None):
    """Dividendos/JCP pagos: contas de financiamento (6.03.x) cujo DS_CONTA
    menciona Dividendos/JCP/Juros sobre capital. Retorna magnitude POSITIVA
    (paga sai negativo na DFC → abs) ou None."""
    KW = ("dividendo", "jcp", "juros sobre capital", "juros sobre o capital")
    total = None
    for r in rows:
        if year is not None and r["year"] != year:
            continue
        if not r["cd_conta"].startswith("6.03"):
            continue
        ds = r["ds_conta"].lower()
        if any(k in ds for k in KW):
            total = (total or 0.0) + r["valor"]
    return abs(total) if total is not None else None


def compute_roic(ebit, pl, gross_debt):
    """ROIC = NOPAT / Capital investido (FRAÇÃO).
        NOPAT = EBIT × (1 − TAX_RATE)
        Capital investido = PL + dívida bruta
    None se EBIT/PL ausentes ou capital ≤ 0."""
    if ebit is None or pl is None:
        return None
    capital = pl + (gross_debt or 0.0)
    if capital <= 0:
        return None
    nopat = ebit * (1.0 - TAX_RATE)
    return nopat / capital


def _cagr(first, last, periods):
    """CAGR em % (ex 12.5). None se inválido (não-positivos, sem períodos)."""
    if first is None or last is None or periods <= 0:
        return None
    if first <= 0 or last <= 0:
        return None
    return ((last / first) ** (1.0 / periods) - 1.0) * 100.0


def compute_company_pillars(dfp_rows: list[dict], itr_rows: list[dict] | None = None) -> dict:
    """NÚCLEO PURO: dado o conjunto de linhas DFP (multi-ano) + ITR de UMA
    empresa, calcula todos os pilares. Retorna dict no shape do provider.

    dfp_rows / itr_rows: já filtrados p/ a empresa e ORDEM_EXERC='ÚLTIMO'
    (saída de parse_cvm_csv). NÃO faz I/O.
    """
    out = _empty_cvm()
    itr_rows = itr_rows or []

    years = sorted({r["year"] for r in dfp_rows if r["year"] is not None})
    if not years:
        return out
    last_year = years[-1]

    # ── pilares do ano corrente (mais recente) ──
    ebit = _val(dfp_rows, CD_EBIT, last_year)
    pl = _val(dfp_rows, CD_PL, last_year)
    lucro = _val(dfp_rows, CD_LUCRO, last_year)
    receita = _val(dfp_rows, CD_RECEITA, last_year)
    ativo = _val(dfp_rows, CD_ATIVO, last_year)
    gdebt = _gross_debt(dfp_rows, last_year)
    ocf = _val(dfp_rows, CD_OCF, last_year)
    capex = _capex(dfp_rows, last_year)

    out["roic"] = compute_roic(ebit, pl, gdebt)

    if lucro is not None and pl not in (None, 0):
        out["roe"] = lucro / pl

    if gdebt is not None and pl not in (None, 0):
        out["debt_to_equity"] = gdebt / pl

    # FCF = OCF − |capex|. Se capex não achável → FCF ≈ OCF (com flag).
    if ocf is not None:
        if capex is not None:
            out["fcf"] = ocf - abs(capex)
            out["fcf_capex_found"] = True
        else:
            out["fcf"] = ocf
            out["fcf_capex_found"] = False
        if ativo not in (None, 0):
            out["fcf_over_assets"] = out["fcf"] / ativo

    # payout = dividendos pagos / lucro líquido
    div = _dividends_paid(dfp_rows, last_year)
    if div is not None and lucro not in (None, 0) and lucro > 0:
        out["payout_ratio"] = div / lucro

    # ── ROIC histórico ano-a-ano (persistência/moat) — fração ──
    hist = []
    for y in years[-DFP_YEARS:]:
        r = compute_roic(_val(dfp_rows, CD_EBIT, y), _val(dfp_rows, CD_PL, y),
                         _gross_debt(dfp_rows, y))
        if r is not None:
            hist.append(r)
    out["roic_history"] = hist if hist else None

    # ── CAGR 5a de receita (3.01) e lucro (3.11) ──
    rev_series = [(y, _val(dfp_rows, CD_RECEITA, y)) for y in years[-DFP_YEARS:]]
    rev_series = [(y, v) for y, v in rev_series if v is not None]
    if len(rev_series) >= 2:
        out["rev_growth_5y"] = _cagr(rev_series[0][1], rev_series[-1][1],
                                     rev_series[-1][0] - rev_series[0][0])
    eps_series = [(y, _val(dfp_rows, CD_LUCRO, y)) for y in years[-DFP_YEARS:]]
    eps_series = [(y, v) for y, v in eps_series if v is not None]
    if len(eps_series) >= 2:
        out["eps_growth_5y"] = _cagr(eps_series[0][1], eps_series[-1][1],
                                     eps_series[-1][0] - eps_series[0][0])

    # ── TTM YoY via ITR: soma 4 trimestres mais recentes vs 4 anteriores ──
    out["rev_growth_ttm"] = _ttm_yoy(itr_rows, CD_RECEITA)
    out["eps_growth_ttm"] = _ttm_yoy(itr_rows, CD_LUCRO)

    return out


def _ttm_yoy(itr_rows: list[dict], cd_conta: str):
    """YoY (%) somando os 4 ITRs mais recentes vs os 4 anteriores de uma conta.
    None se não houver 8 trimestres. Em %."""
    pts = [(r["dt_fim"], r["valor"]) for r in itr_rows if r["cd_conta"] == cd_conta]
    # dedup por dt_fim (mantém último), ordena cronologicamente
    seen = {}
    for dt, v in pts:
        if dt:
            seen[dt] = v
    ordered = [seen[k] for k in sorted(seen.keys())]
    if len(ordered) < 8:
        return None
    recent4 = sum(ordered[-4:])
    prev4 = sum(ordered[-8:-4])
    if prev4 == 0:
        return None
    return (recent4 - prev4) / abs(prev4) * 100.0


def _empty_cvm() -> dict:
    """Shape estável (= fundamentals_provider._empty + extras CVM). Tudo None."""
    return {
        "roe": None,
        "roic": None,
        "payout_ratio": None,
        "debt_to_equity": None,
        "dividend_yield": None,       # CVM não dá DY corrente (precisa preço) → None
        "fcf_yield": None,            # idem (precisa market cap) → None; pipeline calcula
        "fcf": None,                  # ABSOLUTO (reais) — exposto p/ o pipeline
        "fcf_over_assets": None,      # proxy FCF/Ativo
        "fcf_capex_found": None,      # flag: FCF é OCF−capex (True) ou só OCF (False)
        "rev_growth_5y": None,
        "eps_growth_5y": None,
        "rev_growth_ttm": None,
        "eps_growth_ttm": None,
        "roic_history": None,
        "source": "cvm",
        "data_origin": "cvm",
    }


# ═══════════════════════════════════════════════════════════════════════════════
#  I/O  (download + cache em disco — validado AO VIVO no Render)
# ═══════════════════════════════════════════════════════════════════════════════

def _http_get_bytes(url: str) -> bytes | None:
    """GET → bytes, com fallback de SSL. None em falha. Nunca lança."""
    try:
        req = _urlreq.Request(url, headers={"User-Agent": "Mozilla/5.0 (LBH-CVM-ETL)"})
        try:
            r = _urlreq.urlopen(req, timeout=_HTTP_TIMEOUT, context=_CTX)
        except Exception:
            if not _ALLOW_INSECURE:
                raise
            logger.error(f"[CVM][SSL-INSEGURO] TLS falhou; CERT_NONE p/ {url}")
            r = _urlreq.urlopen(req, timeout=_HTTP_TIMEOUT, context=_CTX_NOVERIFY)
        with r:
            return r.read()
    except Exception as e:
        logger.warning(f"[CVM] download falhou {url}: {e}")
        return None


def _read_consolidated_csvs(zip_bytes: bytes, prefix: str, year: int,
                            wanted_cd: set | None = None) -> list[dict]:
    """Extrai e faz parse dos CSVs consolidados (DRE/BPA/BPP/DFC_MI/DVA) de um
    ZIP em memória. prefix = 'dfp_cia_aberta' | 'itr_cia_aberta'. PURO exceto a
    abertura do ZIP. Decodifica latin-1. Junta as linhas de todas as demonstrações.

    wanted_cd: repassado a parse_cvm_csv p/ filtrar empresas DURANTE o parse
        (memória-safe: evita materializar ~150k linhas/CSV no Render).
    """
    rows: list[dict] = []
    DEMOS = ("DRE", "BPA", "BPP", "DFC_MI", "DVA")
    try:
        zf = zipfile.ZipFile(io.BytesIO(zip_bytes))
    except Exception as e:
        logger.warning(f"[CVM] ZIP inválido {prefix}_{year}: {e}")
        return rows
    names = set(zf.namelist())
    with zf:
        for demo in DEMOS:
            name = f"{prefix}_{demo}_con_{year}.csv"
            if name not in names:
                continue
            try:
                # Streaming: zf.open + TextIOWrapper → o CSV é lido em pedaços,
                # nunca materializado inteiro em memória (anti-OOM no Render).
                with zf.open(name) as fh:
                    tw = io.TextIOWrapper(fh, encoding="latin-1", errors="replace",
                                          newline="")
                    rows.extend(_parse_cvm_reader(csv.DictReader(tw, delimiter=";"),
                                                  wanted_cd))
            except Exception as e:
                logger.warning(f"[CVM] parse {name}: {e}")
    return rows


def load_ticker_map() -> dict:
    """Lê cvm_ticker_map.json (ticker→{cd_cvm,cnpj}). {} se ausente/inválido."""
    try:
        if not os.path.exists(CVM_TICKER_MAP_PATH):
            logger.info("[CVM] cvm_ticker_map.json ausente — refresh é no-op")
            return {}
        with open(CVM_TICKER_MAP_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
        return data if isinstance(data, dict) else {}
    except Exception as e:
        logger.warning(f"[CVM] load ticker map falhou: {e}")
        return {}


def _cd_cvm_of(entry) -> str | None:
    """Extrai cd_cvm de uma entrada do mapa (aceita str, int ou dict)."""
    if isinstance(entry, dict):
        v = entry.get("cd_cvm") or entry.get("CD_CVM") or entry.get("codigo_cvm")
        return str(v).strip() if v is not None else None
    if isinstance(entry, (str, int)):
        return str(entry).strip()
    return None


def _cache_path(cd_cvm: str) -> str:
    safe = "".join(c if c.isalnum() else "_" for c in str(cd_cvm))
    return os.path.join(CVM_CACHE_DIR, f"{safe}.json")


def refresh_cvm_cache() -> dict:
    """JOB: baixa ZIPs DFP (5 anos) + ITR (último ano) UMA vez, filtra pelas
    CD_CVM do mapa, calcula pilares por empresa e grava 1 JSON por CD_CVM.

    Retorna stats {empresas, escritas, anos_dfp, ...} p/ log. BLINDADO: qualquer
    falha de rede/parse é logada e o job segue (nunca quebra o app).
    """
    stats = {"empresas_mapa": 0, "escritas": 0, "erros": 0}
    try:
        tmap = load_ticker_map()
        # cd_cvm desejados (normalizados, sem zeros à esquerda inconsistentes)
        wanted: set[str] = set()
        for entry in tmap.values():
            cd = _cd_cvm_of(entry)
            if cd:
                wanted.add(cd.lstrip("0") or "0")
        stats["empresas_mapa"] = len(wanted)
        if not wanted:
            logger.info("[CVM] mapa vazio — refresh no-op (sem erro)")
            return stats

        years = list(range(CURRENT_YEAR - DFP_YEARS + 1, CURRENT_YEAR + 1))

        import gc as _gc

        # ── DFP (anual, 5 anos): junta linhas por cd_cvm. Filtra DURANTE o parse
        #    (wanted) e libera o blob a cada ano → pico de RAM minúsculo (anti-OOM). ──
        dfp_by_cd: dict[str, list[dict]] = {}
        for y in years:
            url = f"{CVM_BASE}/DFP/DADOS/dfp_cia_aberta_{y}.zip"
            blob = _http_get_bytes(url)
            if blob is None:
                continue
            for r in _read_consolidated_csvs(blob, "dfp_cia_aberta", y, wanted_cd=wanted):
                dfp_by_cd.setdefault((r["cd_cvm"].lstrip("0") or "0"), []).append(r)
            del blob
            _gc.collect()

        # ── ITR (último ano + anterior) p/ TTM YoY ──
        itr_by_cd: dict[str, list[dict]] = {}
        for iy in (CURRENT_YEAR, CURRENT_YEAR - 1):
            itr_blob = _http_get_bytes(f"{CVM_BASE}/ITR/DADOS/itr_cia_aberta_{iy}.zip")
            if itr_blob is None:
                continue
            for r in _read_consolidated_csvs(itr_blob, "itr_cia_aberta", iy, wanted_cd=wanted):
                itr_by_cd.setdefault((r["cd_cvm"].lstrip("0") or "0"), []).append(r)
            del itr_blob
            _gc.collect()

        os.makedirs(CVM_CACHE_DIR, exist_ok=True)
        for cd, dfp_rows in dfp_by_cd.items():
            try:
                pillars = compute_company_pillars(dfp_rows, itr_by_cd.get(cd))
                pillars["_cd_cvm"] = cd
                pillars["_refreshed_at"] = time.time()
                tmp = _cache_path(cd) + ".tmp"
                with open(tmp, "w", encoding="utf-8") as f:
                    json.dump(pillars, f)
                os.replace(tmp, _cache_path(cd))
                stats["escritas"] += 1
            except Exception as e:
                stats["erros"] += 1
                logger.warning(f"[CVM] escrita cache cd={cd}: {e}")

        # Invalida o cache em memória do provider: entradas FINAS (brapi-só)
        # cacheadas ANTES do CVM popular sombreariam o dado fresco por até 6h.
        try:
            from app.services import fundamentals_provider as _FP
            stats["provider_cache_limpo"] = _FP.clear_cache()
        except Exception as e:
            logger.warning(f"[CVM] clear_cache do provider falhou (seguindo): {e}")

        logger.info(f"[CVM] refresh OK: {stats}")
        return stats
    except Exception as e:
        logger.warning(f"[CVM] refresh_cvm_cache falhou (seguindo): {e}")
        return stats


def get_cvm_fundamentals(ticker: str) -> dict | None:
    """Lê o cache em disco p/ um ticker .SA (rápido, SEM download).
    None se sem mapa/cache. Nunca lança."""
    try:
        if not ticker or not isinstance(ticker, str):
            return None
        key = ticker.strip().upper()
        base = key[:-3] if key.endswith(".SA") else key
        tmap = load_ticker_map()
        entry = tmap.get(key) or tmap.get(base) or tmap.get(base + ".SA")
        if entry is None:
            return None
        cd = _cd_cvm_of(entry)
        if not cd:
            return None
        cd = cd.lstrip("0") or "0"
        path = _cache_path(cd)
        if not os.path.exists(path):
            return None
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return data if isinstance(data, dict) else None
    except Exception as e:
        logger.warning(f"[CVM] get_cvm_fundamentals({ticker!r}) falhou: {e}")
        return None


# ═══════════════════════════════════════════════════════════════════════════════
#  DIAGNÓSTICO (observabilidade do ETL ao vivo — Render não expõe logs p/ mim)
# ═══════════════════════════════════════════════════════════════════════════════

def cvm_status() -> dict:
    """Estado do cache CVM (sem download): nº de empresas cacheadas, amostra, mapa."""
    out = {"cache_dir": CVM_CACHE_DIR, "n_cached": 0, "map_size": 0,
           "sample": None, "allow_insecure_ssl": _ALLOW_INSECURE,
           "years": list(range(CURRENT_YEAR - DFP_YEARS + 1, CURRENT_YEAR + 1))}
    try:
        out["map_size"] = len(load_ticker_map())
    except Exception as e:
        out["map_error"] = str(e)
    try:
        if os.path.isdir(CVM_CACHE_DIR):
            files = [f for f in os.listdir(CVM_CACHE_DIR) if f.endswith(".json")]
            out["n_cached"] = len(files)
        out["sample_petr4"] = get_cvm_fundamentals("PETR4.SA")
    except Exception as e:
        out["cache_error"] = str(e)
    return out


def probe_cvm(year: int = 2024) -> dict:
    """Sonda LEVE ao vivo: baixa 1 ZIP DFP (ano publicado), reporta tamanho, lista de
    arquivos, e o parse p/ PETR4 (cd_cvm 9512). Surfaceia EXATAMENTE onde quebra
    (download? nome do CSV? parse de conta?). Síncrono — usar com ano já publicado."""
    import zipfile as _zf, io as _io
    res = {"year": year}
    try:
        url = f"{CVM_BASE}/DFP/DADOS/dfp_cia_aberta_{year}.zip"
        res["url"] = url
        blob = _http_get_bytes(url)
        res["download_ok"] = blob is not None
        res["blob_bytes"] = (len(blob) if blob else 0)
        if not blob:
            res["erro"] = "download retornou None (rede/SSL/timeout)"
            return res
        z = _zf.ZipFile(_io.BytesIO(blob))
        names = z.namelist()
        res["namelist_sample"] = names[:12]
        res["names_esperados"] = [f"dfp_cia_aberta_{d}_con_{year}.csv"
                                  for d in ("DRE", "BPA", "BPP", "DFC_MI", "DVA")]
        res["nomes_batem"] = {n: (n in names) for n in res["names_esperados"]}
        # parse p/ PETR4 (cd_cvm 9512)
        rows = _read_consolidated_csvs(blob, "dfp_cia_aberta", year)
        res["total_rows_parsed"] = len(rows)
        petr = [r for r in rows if (r.get("cd_cvm", "").lstrip("0") == "9512")]
        res["petr4_rows"] = len(petr)
        if petr:
            res["petr4_pillars"] = compute_company_pillars(petr, None)
            res["petr4_sample_rows"] = petr[:3]
    except Exception as e:
        import traceback as _tb
        res["exception"] = str(e)
        res["traceback"] = _tb.format_exc()[-1500:]
    return res


def start_refresh_async() -> dict:
    """Dispara refresh_cvm_cache numa THREAD (não bloqueia o request) + grava status."""
    import threading as _th
    status_path = os.path.join(CVM_CACHE_DIR, "_refresh_status.json")

    def _job():
        import traceback as _tb
        st = {"started_at": time.time(), "finished": False}
        try:
            os.makedirs(CVM_CACHE_DIR, exist_ok=True)
            with open(status_path, "w") as f:
                json.dump(st, f)
            stats = refresh_cvm_cache()
            st.update({"finished": True, "finished_at": time.time(), "stats": stats})
        except Exception as e:
            st.update({"finished": True, "error": str(e), "traceback": _tb.format_exc()[-1500:]})
        try:
            with open(status_path, "w") as f:
                json.dump(st, f)
        except Exception:
            pass

    _th.Thread(target=_job, daemon=True).start()
    return {"started": True}


def refresh_status() -> dict:
    """Lê o status do último refresh_async (started/finished/stats/error)."""
    p = os.path.join(CVM_CACHE_DIR, "_refresh_status.json")
    try:
        if os.path.exists(p):
            with open(p) as f:
                return json.load(f)
    except Exception as e:
        return {"read_error": str(e)}
    return {"status": "nenhum refresh disparado ainda"}


__all__ = [
    "refresh_cvm_cache",
    "get_cvm_fundamentals",
    "compute_company_pillars",
    "compute_roic",
    "parse_cvm_csv",
    "cvm_status",
    "probe_cvm",
    "start_refresh_async",
    "refresh_status",
]
