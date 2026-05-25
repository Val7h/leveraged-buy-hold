"use client";
import { useState } from "react";
import { cn } from "@/lib/utils";

const TICKER_COLORS: Record<string, string> = {
  A: "bg-blue-500/20 text-blue-400",    B: "bg-purple-500/20 text-purple-400",
  C: "bg-cyan-500/20 text-cyan-400",    D: "bg-green-500/20 text-green-400",
  E: "bg-yellow-500/20 text-yellow-400",F: "bg-orange-500/20 text-orange-400",
  G: "bg-red-500/20 text-red-400",      H: "bg-pink-500/20 text-pink-400",
  I: "bg-indigo-500/20 text-indigo-400",J: "bg-teal-500/20 text-teal-400",
  K: "bg-lime-500/20 text-lime-400",    L: "bg-amber-500/20 text-amber-400",
  M: "bg-emerald-500/20 text-emerald-400",N: "bg-sky-500/20 text-sky-400",
  O: "bg-violet-500/20 text-violet-400",P: "bg-fuchsia-500/20 text-fuchsia-400",
  Q: "bg-rose-500/20 text-rose-400",    R: "bg-blue-600/20 text-blue-300",
  S: "bg-green-600/20 text-green-300",  T: "bg-purple-600/20 text-purple-300",
  U: "bg-cyan-600/20 text-cyan-300",    V: "bg-orange-600/20 text-orange-300",
  W: "bg-yellow-600/20 text-yellow-300",X: "bg-red-600/20 text-red-300",
  Y: "bg-pink-600/20 text-pink-300",    Z: "bg-indigo-600/20 text-indigo-300",
};

// ── B3 ticker prefix → company website domain (for Clearbit logos) ──────────
const B3_DOMAINS: Record<string, string> = {
  PETR: "petrobras.com.br",    VALE: "vale.com",
  ITUB: "itau.com.br",         ITSA: "itausa.com.br",
  BBDC: "bradesco.com.br",     BBAS: "bb.com.br",
  SANB: "santander.com.br",    BPAC: "btgpactual.com",
  ABEV: "ambev.com.br",        WEGE: "weg.net",
  RENT: "localiza.com",        RDOR: "rededore.com.br",
  RADL: "raiadrogasil.com.br", HAPV: "hapvida.com.br",
  SUZB: "suzano.com.br",       KLBN: "klabin.com.br",
  EGIE: "engieenergia.com.br", TAEE: "taesa.com.br",
  CPFE: "cpfl.com.br",         ENGI: "energisa.com.br",
  TRPL: "isacteep.com.br",     CMIG: "cemig.com.br",
  ELET: "eletrobras.com",      EQTL: "equatorial.com.br",
  NEOE: "neoenergia.com",      CPLE: "copel.com",
  SBSP: "sabesp.com.br",       SAPR: "sanepar.com.br",
  VIVT: "vivo.com.br",         TIMS: "tim.com.br",
  JBSS: "jbs.com.br",          BRFS: "brf.com",
  MRFG: "marfrig.com.br",      BEEF: "minervafoods.com",
  SMTO: "saomartinho.com.br",  FLRY: "fleury.com.br",
  HYPE: "hypera.com.br",       ODPV: "odontoprev.com.br",
  LREN: "lojasrenner.com.br",  ASAI: "atacadao.com.br",
  PCAR: "gpabr.com",           MGLU: "magazineluiza.com.br",
  TOTS: "totvs.com",           INTB: "intelbras.com.br",
  MULT: "multiplan.com.br",    MRVE: "mrv.com.br",
  CYRE: "cyrela.com.br",       EZTC: "eztec.com.br",
  EMBR: "embraer.com",         CSAN: "cosan.com",
  PRIO: "prio.com.br",         BBSE: "bbseguros.com.br",
  GGBR: "gerdau.com",          GOAU: "gerdau.com",
  USIM: "usiminas.com.br",     CSNA: "csn.com.br",
  BRAP: "bradespar.com.br",    BRGE: "bradespar.com.br",
  SLCE: "slcagricola.com.br",  MOVI: "movida.com.br",
  CIEL: "cielo.com.br",        IGTI: "iguatemi.com.br",
  PETZ: "petz.com.br",         ARZZ: "arezzoco.com.br",
  SOMA: "somagrupo.com.br",    ALPA: "alpargatas.com.br",
  DIRR: "direcional.com.br",   CURY: "cury.com.br",
  ALSO: "allogs.com.br",       RAIL: "rumolog.com.br",
  GOLL: "voegol.com.br",       AZUL: "voeazul.com.br",
  SIMH: "simpar.com.br",       UGPA: "ultrapar.com.br",
  VBBR: "vibra.com.br",        RRRP: "3r.com.br",
  RECV: "petroreconcavo.com.br",QUAL: "qualicorp.com.br",
  BLAU: "blau.com.br",         MDIA: "mdiasbranco.com.br",
  DXCO: "dexco.com.br",        CMIN: "csn.com.br",
  FESA: "ferbasa.com.br",      AURE: "auren.com.br",
  AMAR: "lojasamaricas.com.br",POMO: "marcopolo.com.br",
  WIZS: "wizsolucoes.com.br",
};

interface TickerLogoProps {
  ticker: string;
  size?: number;
  className?: string;
}

/** Strip exchange suffixes and tokenized suffixes for logo lookup. */
function getLogoTicker(ticker: string): string {
  const upper = ticker.toUpperCase();
  if (upper.endsWith("ONUSDT")) return upper.replace("ONUSDT", "");
  if (upper.endsWith(".SA"))    return upper.replace(".SA", "");
  return upper;
}

/** Returns true if the ticker looks like a B3 stock (4 letters + 1-2 digits). */
function isBR(ticker: string): boolean {
  return /^[A-Z]{4}\d{1,2}$/.test(ticker);
}

/**
 * Returns ordered list of logo URLs to try.
 * B3 tickers: Clearbit (company domain) first, then Parqet.
 * US/others:  Parqet only.
 */
function getSources(logoTicker: string): string[] {
  if (isBR(logoTicker)) {
    const prefix = logoTicker.slice(0, 4);
    const domain = B3_DOMAINS[prefix];
    const sources: string[] = [];
    if (domain) {
      sources.push(`https://logo.clearbit.com/${domain}`);
    }
    sources.push(`https://assets.parqet.com/logos/symbol/${logoTicker}?format=jpg`);
    return sources;
  }
  return [`https://assets.parqet.com/logos/symbol/${logoTicker}?format=jpg`];
}

export default function TickerLogo({ ticker, size = 28, className }: TickerLogoProps) {
  const logoTicker    = getLogoTicker(ticker);
  const initial       = logoTicker?.[0]?.toUpperCase() ?? "?";
  const fallbackColor = TICKER_COLORS[initial] ?? "bg-primary/20 text-primary";
  const sources       = getSources(logoTicker);

  const [srcIndex, setSrcIndex] = useState(0);
  const [failed,   setFailed]   = useState(false);

  const handleError = () => {
    if (srcIndex < sources.length - 1) {
      setSrcIndex((i) => i + 1);
    } else {
      setFailed(true);
    }
  };

  if (failed) {
    return (
      <div
        className={cn("rounded-full flex items-center justify-center flex-shrink-0 font-bold", fallbackColor, className)}
        style={{ width: size, height: size, fontSize: size * 0.4 }}
      >
        {initial}
      </div>
    );
  }

  return (
    <img
      key={srcIndex}
      src={sources[srcIndex]}
      alt={logoTicker}
      width={size}
      height={size}
      className={cn("rounded-full object-cover flex-shrink-0", className)}
      style={{ width: size, height: size }}
      onError={handleError}
    />
  );
}
