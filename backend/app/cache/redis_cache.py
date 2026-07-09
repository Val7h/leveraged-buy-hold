"""
Upstash Redis REST cache for price-history DataFrames.

Why: the existing requests_cache SQLite lives in /tmp, which is ephemeral and
per-instance on Render — it is wiped on every cold start / spin-down, so the
first backtest after a restart re-fetches 20y of yfinance data (slow, ~60-120s).

Upstash Redis (HTTP REST) is a shared, persistent cache that survives restarts
and is shared across instances. The price history for a long period only changes
once per daily bar, so a 6h TTL is safe and removes the cold-start penalty.

Graceful by design: if the env vars are absent or any call fails, every function
is a silent no-op and the caller falls through to the live yfinance fetch. The
cache can NEVER break a request.

Config (set in Render dashboard — render.yaml already declares them):
  UPSTASH_REDIS_REST_URL    e.g. https://xxx.upstash.io
  UPSTASH_REDIS_REST_TOKEN  the REST token
"""
from __future__ import annotations

import os
import logging
from io import StringIO
from typing import Optional

import json
import requests
import pandas as pd

logger = logging.getLogger(__name__)

_URL = os.environ.get("UPSTASH_REDIS_REST_URL", "").rstrip("/")
_TOKEN = os.environ.get("UPSTASH_REDIS_REST_TOKEN", "")
_TIMEOUT = 5  # seconds — never let the cache stall a request
_ENABLED = bool(_URL and _TOKEN)

if _ENABLED:
    logger.info("[REDIS] Upstash cache habilitado")
else:
    logger.info("[REDIS] Upstash cache desabilitado (env vars ausentes) — usando fetch direto")


def is_enabled() -> bool:
    return _ENABLED


def _headers() -> dict:
    return {"Authorization": f"Bearer {_TOKEN}"}


def cache_get_df(key: str) -> Optional[pd.DataFrame]:
    """Return a cached DataFrame, or None on miss / disabled / any error."""
    if not _ENABLED:
        return None
    try:
        resp = requests.get(f"{_URL}/get/{key}", headers=_headers(), timeout=_TIMEOUT)
        if resp.status_code != 200:
            return None
        payload = resp.json().get("result")
        if not payload:
            return None
        # orient="table" round-trips dtypes including the DatetimeIndex
        df = pd.read_json(StringIO(payload), orient="table")
        logger.debug(f"[REDIS HIT] {key} ({len(df)} rows)")
        return df
    except Exception as e:
        logger.warning(f"[REDIS GET ERROR] {key}: {e}")
        return None


def cache_set_df(key: str, df: pd.DataFrame, ttl_seconds: int = 21600) -> None:
    """Store a DataFrame with TTL. Silent no-op on disabled / any error."""
    if not _ENABLED or df is None or df.empty:
        return
    try:
        body = df.to_json(orient="table")
        # Upstash REST: SET key value EX ttl  → /set/{key}?EX=ttl  with body = value
        requests.post(
            f"{_URL}/set/{key}",
            params={"EX": ttl_seconds},
            data=body.encode("utf-8"),
            headers=_headers(),
            timeout=_TIMEOUT,
        )
        logger.debug(f"[REDIS SET] {key} ({len(df)} rows, ttl={ttl_seconds}s)")
    except Exception as e:
        logger.warning(f"[REDIS SET ERROR] {key}: {e}")


# ── Envelope p/ o _chart_api_df do ranking: df + attrs (adv_dollar, dy_headline)
#    + dy (trailing) + annual ({ano: dy%}). Preserva tudo que o motor de 3 camadas usa.
def cache_get_chart(key: str) -> Optional[dict]:
    """Return {"df", "dy", "annual"} (df com attrs restaurados) ou None em miss/erro."""
    if not _ENABLED:
        return None
    try:
        resp = requests.get(f"{_URL}/get/{key}", headers=_headers(), timeout=_TIMEOUT)
        if resp.status_code != 200:
            return None
        payload = resp.json().get("result")
        if not payload:
            return None
        env = json.loads(payload)
        df = pd.read_json(StringIO(env["df"]), orient="table")
        for k, v in (env.get("attrs") or {}).items():
            df.attrs[k] = v
        # JSON força chaves de dict a string → volta pra int no annual ({ano: dy%})
        annual_raw = env.get("annual") or {}
        annual = {}
        for k, v in annual_raw.items():
            try:
                annual[int(k)] = v
            except Exception:
                annual[k] = v
        return {"df": df, "dy": env.get("dy"), "annual": annual}
    except Exception as e:
        logger.warning(f"[REDIS GET CHART ERROR] {key}: {e}")
        return None


def cache_set_chart(key: str, df: pd.DataFrame, dy, annual, ttl_seconds: int = 21600) -> None:
    """Store the chart envelope (df+attrs+dy+annual). Silent no-op on disabled / erro."""
    if not _ENABLED or df is None or df.empty:
        return
    try:
        env = {
            "df": df.to_json(orient="table"),
            "dy": dy,
            "annual": annual or {},
            "attrs": {k: v for k, v in dict(df.attrs or {}).items()},
        }
        requests.post(
            f"{_URL}/set/{key}",
            params={"EX": ttl_seconds},
            data=json.dumps(env).encode("utf-8"),
            headers=_headers(),
            timeout=_TIMEOUT,
        )
        logger.debug(f"[REDIS SET CHART] {key} ({len(df)} rows)")
    except Exception as e:
        logger.warning(f"[REDIS SET CHART ERROR] {key}: {e}")
