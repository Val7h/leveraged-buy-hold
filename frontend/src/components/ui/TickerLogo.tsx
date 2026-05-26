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

// ── US ticker → company domain (Clearbit) ────────────────────────────────────
const US_DOMAINS: Record<string, string> = {
  // Utilities
  NEE: "nexteraenergy.com",     SO:  "southerncompany.com",
  D:   "dominionenergy.com",    DUK: "duke-energy.com",
  AEP: "aep.com",              WEC: "wecenergygroup.com",
  ES:  "eversource.com",       EXC: "exeloncorp.com",
  PCG: "pge.com",              ETR: "entergy.com",
  AWK: "amwater.com",          CMS: "cmsenergy.com",
  NI:  "nisource.com",         PNW: "pinnaclewest.com",
  OGE: "oge.com",
  // Healthcare
  JNJ: "jnj.com",              ABT: "abbott.com",
  MDT: "medtronic.com",        BMY: "bms.com",
  PFE: "pfizer.com",           MRK: "merck.com",
  UNH: "unitedhealthgroup.com",CVS: "cvshealth.com",
  CI:  "cigna.com",            ELV: "elevancehealth.com",
  HCA: "hcahealthcare.com",    ABBV:"abbvie.com",
  AMGN:"amgen.com",            GILD:"gilead.com",
  BIIB:"biogen.com",
  // Consumer staples
  PG:  "pg.com",               KO:  "coca-cola.com",
  PEP: "pepsico.com",          MO:  "altria.com",
  CL:  "colgatepalmolive.com", GIS: "generalmills.com",
  K:   "kelloggs.com",         CPB: "campbellsoupcompany.com",
  HRL: "hormel.com",           SJM: "jmsmucker.com",
  CAG: "conagrabrands.com",    MKC: "mccormick.com",
  HSY: "thehersheycompany.com",CLX: "clorox.com",
  CHD: "churchdwight.com",
  // Telecom / Media
  T:   "att.com",              VZ:  "verizon.com",
  NFLX:"netflix.com",          DIS: "disney.com",
  CMCSA:"comcast.com",
  // Dividends / REITs
  O:   "realtyincome.com",     MAIN:"maincapital.com",
  STAG:"stagindustrial.com",   WPC: "wpcarey.com",
  NNN: "nnnreit.com",          ADC: "agreerealty.com",
  GAIN:"gladstoneinvestment.com",
  HTGC:"hercules-capital.com", ARCC:"aresmgmt.com",
  VICI:"viciproperties.com",   AMT: "americantower.com",
  CCI: "crowncastle.com",      EQIX:"equinix.com",
  PLD: "prologis.com",         SPG: "simon.com",
  PSA: "publicstorage.com",    EXR: "extraspace.com",
  MAA: "maacommunities.com",   UDR: "udr.com",
  IIPR:"innovativeindustrialproperties.com",
  // Financials
  AFL: "aflac.com",            BEN: "franklintempleton.com",
  V:   "visa.com",             MA:  "mastercard.com",
  PYPL:"paypal.com",           SQ:  "squareup.com",
  FIS: "fisglobal.com",        FISV:"fiserv.com",
  GPN: "globalpayments.com",   AFRM:"affirm.com",
  SOFI:"sofi.com",             NU:  "nu.com.br",
  // Diversified / Other
  "BRK-B":"berkshirehathaway.com",
  WM:  "wm.com",               MCD: "mcdonalds.com",
  MMM: "3m.com",
  // Big Tech
  AAPL:"apple.com",            MSFT:"microsoft.com",
  GOOGL:"abc.xyz",             GOOG:"abc.xyz",
  AMZN:"amazon.com",           META:"meta.com",
  NVDA:"nvidia.com",           TSLA:"tesla.com",
  ORCL:"oracle.com",           ADBE:"adobe.com",
  IBM: "ibm.com",              INTC:"intel.com",
  CSCO:"cisco.com",            QCOM:"qualcomm.com",
  // Tech Mid
  CRM: "salesforce.com",       NOW: "servicenow.com",
  SNOW:"snowflake.com",        DDOG:"datadoghq.com",
  ZS:  "zscaler.com",          CRWD:"crowdstrike.com",
  NET: "cloudflare.com",       PLTR:"palantir.com",
  ANET:"arista.com",           MRVL:"marvell.com",
  AMD: "amd.com",              TXN: "ti.com",
  AVGO:"broadcom.com",         KLAC:"kla.com",
  // Industrials
  CAT: "caterpillar.com",      DE:  "deere.com",
  HON: "honeywell.com",        GE:  "ge.com",
  RTX: "rtx.com",              LMT: "lockheedmartin.com",
  NOC: "northropgrumman.com",  BA:  "boeing.com",
  UPS: "ups.com",              FDX: "fedex.com",
  CSX: "csx.com",              UNP: "up.com",
  NSC: "nscorp.com",           WAB: "wabtec.com",
  // ETFs (fund managers)
  SPY: "ssga.com",             QQQ: "invesco.com",
  IWM: "blackrock.com",        DIA: "ssga.com",
  VTI: "vanguard.com",         VOO: "vanguard.com",
  IVV: "blackrock.com",        RSP: "invesco.com",
  MDY: "ssga.com",             IJH: "blackrock.com",
  XLK: "ssga.com",             XLF: "ssga.com",
  XLE: "ssga.com",             XLV: "ssga.com",
  XLU: "ssga.com",             XLI: "ssga.com",
  XLB: "ssga.com",             XLP: "ssga.com",
  XLY: "ssga.com",             XLRE:"ssga.com",
  XLC: "ssga.com",             XBI: "ssga.com",
  VEA: "vanguard.com",         VWO: "vanguard.com",
  EEM: "blackrock.com",        EWJ: "blackrock.com",
  EWZ: "blackrock.com",        MCHI:"blackrock.com",
  INDA:"blackrock.com",        IEMG:"blackrock.com",
  VGK: "vanguard.com",         EFA: "blackrock.com",
  AGG: "blackrock.com",        BND: "vanguard.com",
  TLT: "blackrock.com",        GLD: "ssga.com",
  SLV: "blackrock.com",        GDX: "vaneck.com",
  LIT: "globalxetfs.com",      BOTZ:"globalxetfs.com",
  ROBO:"etfmg.com",            ICLN:"blackrock.com",
  QCLN:"firsttrust.com",       DRIV:"globalxetfs.com",
  JETS:"uscfinvestments.com",  BLOK:"amplifyetfs.com",
  METV:"roundhillinvestments.com",ARKK:"ark-invest.com",
  ARKG:"ark-invest.com",       ARKF:"ark-invest.com",
  ARKQ:"ark-invest.com",       ARKW:"ark-invest.com",
  TQQQ:"proshares.com",        UPRO:"proshares.com",
  SPXL:"direxion.com",         TECL:"direxion.com",
  SOXL:"direxion.com",         UDOW:"proshares.com",
  TNA: "direxion.com",         FAS: "direxion.com",
  LABU:"direxion.com",         CURE:"direxion.com",
  // Crypto stocks
  COIN:"coinbase.com",         MSTR:"microstrategy.com",
  RIOT:"riotplatforms.com",    MARA:"marathondh.com",
  CLSK:"cleanspark.com",       HUT: "hutmining.com",
  BTBT:"bit-digital.com",      IREN:"ir.com",
};

// ── B3 ticker prefix → company domain (Clearbit) ─────────────────────────────
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
 * Priority: Clearbit (domain map) → FMP (image-stock) → Parqet → initials fallback.
 */
function getSources(logoTicker: string): string[] {
  const sources: string[] = [];

  if (isBR(logoTicker)) {
    // B3: Clearbit → FMP (with .SA suffix) → Parqet
    const prefix = logoTicker.slice(0, 4);
    const domain = B3_DOMAINS[prefix];
    if (domain) sources.push(`https://logo.clearbit.com/${domain}`);
    sources.push(`https://financialmodelingprep.com/image-stock/${logoTicker}.SA.png`);
    sources.push(`https://assets.parqet.com/logos/symbol/${logoTicker}?format=jpg`);
  } else {
    // US / other: Clearbit → FMP → Parqet
    const domain = US_DOMAINS[logoTicker];
    if (domain) sources.push(`https://logo.clearbit.com/${domain}`);
    sources.push(`https://financialmodelingprep.com/image-stock/${logoTicker}.png`);
    sources.push(`https://assets.parqet.com/logos/symbol/${logoTicker}?format=jpg`);
  }

  return sources;
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
