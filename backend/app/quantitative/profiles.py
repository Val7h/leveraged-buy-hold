"""
Camada de PERFIL DE INVESTIDOR (produto multi-assinante).

PRINCÍPIO (memória project_lbh_produto_vs_pessoal): a estratégia do dono é PESSOAL
(perfil "agressivo", previdenciário). O APP tem assinantes com horizontes/apetites
diferentes — então o motor NÃO pode cravar a doutrina dele como lei universal. Esta
camada traduz um dos 3 PRESETS escolhidos pelo assinante em PARÂMETROS concretos que
o motor de alavancagem lê (teto duro, tabela de regime, piso de σ, política de stop da
semente, reserva). O perfil do dono = preset "agressivo" = os valores que já existem
no código → ZERO regressão pra ele.

IMPORTANTE p/ não-regressão: quando NENHUM perfil é resolvido (chamada interna sem
profile), o motor mantém EXATAMENTE o comportamento atual (agressivo). O DEFAULT de um
ASSINANTE NOVO é "moderado" — mas isso é aplicado na borda (API/BFF), não no núcleo.
"""

from typing import Dict, Optional

# Preset → parâmetros que o motor lê.
#   leverage_cap        : teto DURO de alavancagem por-fluxo (MIN com σ/gap/beta/regime).
#   sigma_floor_min_pct : a partir de qual σ% o teto de σ começa a morder (None = só extremos
#                         ≥35%, comportamento agressivo atual). Conservador morde antes.
#   regime_mult         : multiplicador do FLUXO novo por regime de mercado.
#   seed_price_stop     : semente tem stop de PREÇO? (False = só stop de TESE, doutrina do dono).
#   reserve_pct         : alvo de reserva SHY (fração do fluxo) — munição de ataque.
PRESETS: Dict[str, dict] = {
    "conservador": {
        "label": "Conservador",
        "descricao": "Capital protegido. Alavancagem baixa, trava ações voláteis, semente com stop.",
        "leverage_cap": 2.0,
        "sigma_floor_min_pct": 25.0,   # σ≥25% já começa a capar (trava ação volátil cedo)
        "regime_mult": {"TOPO": 1, "NEUTRO": 1, "CAPITULACAO": 2, "CAPIT.EXTREMA": 2},
        "seed_price_stop": True,
        "reserve_pct": 0.30,
    },
    "moderado": {
        "label": "Moderado",
        "descricao": "Equilíbrio. Alavancagem média, piso de σ leve.",
        "leverage_cap": 3.0,
        "sigma_floor_min_pct": 30.0,   # piso leve (entre o conservador 25 e o agressivo 35)
        "regime_mult": {"TOPO": 2, "NEUTRO": 2, "CAPITULACAO": 3, "CAPIT.EXTREMA": 3},
        "seed_price_stop": False,
        "reserve_pct": 0.20,
    },
    "agressivo": {
        "label": "Agressivo",
        "descricao": "Doutrina do dono (previdenciário 10-15a). Regime governa, sem piso de σ, semente só tese.",
        "leverage_cap": 5.0,
        "sigma_floor_min_pct": None,   # só extremos (≥35%) → comportamento ATUAL (zero regressão)
        "regime_mult": {"TOPO": 2, "NEUTRO": 3, "CAPITULACAO": 4, "CAPIT.EXTREMA": 5},
        "seed_price_stop": False,
        "reserve_pct": 0.15,
    },
}

# Assinante NOVO entra como moderado (seguro). NÃO confundir com o default do NÚCLEO
# (sem perfil resolvido = agressivo = comportamento atual, p/ não regredir chamadas internas).
DEFAULT_PROFILE = "moderado"

# Quando uma chamada interna não passa perfil, o motor usa estes parâmetros = os de hoje.
# (agressivo). Isso garante que tudo que já roda continue idêntico até a borda resolver o perfil.
_LEGACY_AGGRESSIVE = PRESETS["agressivo"]

# aliases tolerantes (campo antigo do usuário era conservador/moderado/agressivo em PT,
# e o backend legado usava conservative/balanced/aggressive em EN).
_ALIASES = {
    "conservative": "conservador", "balanced": "moderado", "aggressive": "agressivo",
    "conservador": "conservador", "moderado": "moderado", "agressivo": "agressivo",
}


def normalize_profile(name: Optional[str]) -> str:
    """Resolve qualquer rótulo (PT/EN/None) para uma das 3 chaves canônicas."""
    if not name:
        return DEFAULT_PROFILE
    return _ALIASES.get(str(name).strip().lower(), DEFAULT_PROFILE)


def resolve_profile(name: Optional[str]) -> dict:
    """Preset completo a partir do nome. None/desconhecido → DEFAULT_PROFILE (moderado)."""
    return PRESETS[normalize_profile(name)]


def profile_leverage_params(name: Optional[str]) -> dict:
    """Subconjunto que o motor de alavancagem consome diretamente.
    Chamada SEM nome (None) → DEFAULT (moderado). Para preservar o comportamento ATUAL de uma
    chamada interna, passe explicitamente 'agressivo' OU use os defaults None das funções do motor.
    """
    p = resolve_profile(name)
    return {
        "leverage_cap": p["leverage_cap"],
        "sigma_floor_min_pct": p["sigma_floor_min_pct"],
        "regime_mult": dict(p["regime_mult"]),
        "seed_price_stop": p["seed_price_stop"],
        "reserve_pct": p["reserve_pct"],
    }


def regime_multiplier(name: Optional[str], regime: str) -> int:
    """Multiplicador do fluxo novo por regime, conforme o perfil."""
    rm = resolve_profile(name)["regime_mult"]
    return int(rm.get(regime, rm.get("NEUTRO", 3)))
