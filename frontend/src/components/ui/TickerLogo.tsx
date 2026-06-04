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
// Expanded: S&P 500 (200+) + major US stocks
const US_DOMAINS: Record<string, string> = {
  // Big Tech (FAANG+)
  AAPL:"apple.com",            MSFT:"microsoft.com",
  GOOGL:"abc.xyz",             GOOG:"abc.xyz",
  AMZN:"amazon.com",           META:"meta.com",
  NVDA:"nvidia.com",           TSLA:"tesla.com",
  ORCL:"oracle.com",           ADBE:"adobe.com",
  IBM: "ibm.com",              INTC:"intel.com",
  CSCO:"cisco.com",            QCOM:"qualcomm.com",
  // Tech (continued)
  CRM: "salesforce.com",       NOW: "servicenow.com",
  SNOW:"snowflake.com",        DDOG:"datadoghq.com",
  ZS:  "zscaler.com",          CRWD:"crowdstrike.com",
  NET: "cloudflare.com",       PLTR:"palantir.com",
  ANET:"arista.com",           MRVL:"marvell.com",
  AMD: "amd.com",              TXN: "ti.com",
  AVGO:"broadcom.com",         KLAC:"kla.com",
  LRCX:"lrcx.com",             ASML:"asml.com",
  CDNS:"cadence.com",          SNPS:"synopsys.com",
  WDAY:"workday.com",          VEEV:"veeva.com",
  CCI: "crowncastle.com",      EQIX:"equinix.com",
  SPLK:"splunk.com",           OKTA:"okta.com",
  CYBR:"cyberark.com",         CHKP:"checkpoint.com",
  PANW:"paloaltonetworks.com", SENTIENT:"sentientai.com",
  TTD: "thetradedesk.com",     ADBE:"adobe.com",
  // Semiconductors
  MU:  "micron.com",           SK:  "sk.com",
  NXPI:"nxp.com",              MCHP:"microchip.com",
  STM: "st.com",               ALTR:"altera.com",
  // Consumer (Discretionary)
  MCD: "mcdonalds.com",        SBUX:"starbucks.com",
  NKE: "nike.com",             LULU:"lululemon.com",
  HD:  "homedepot.com",        LOW: "lowes.com",
  TJX: "tjx.com",              AMZN:"amazon.com",
  EBAY:"ebay.com",             NCLH:"ncl.com",
  RCL: "rci.com",              CCL: "carnival.com",
  MAR: "marriott.com",         HLT: "hilton.com",
  EXPE:"expedia.com",          ORLY:"oreilly.com",
  AZO: "autozone.com",         RVLV:"revolv.com",
  CPRT:"copart.com",           IAC: "iac.com",
  ULTA:"ulta.com",             WMT: "walmart.com",
  TGT: "target.com",           ROST:"ross.com",
  FIVE:"fivebelow.com",        BJ:  "bj.com",
  DG:  "dollargeneral.com",    DLTR:"dollartree.com",
  // Consumer (Staples)
  PG:  "pg.com",               KO:  "coca-cola.com",
  PEP: "pepsico.com",          MO:  "altria.com",
  CL:  "colgatepalmolive.com", GIS: "generalmills.com",
  K:   "kelloggs.com",         CPB: "campbellsoupcompany.com",
  HRL: "hormel.com",           SJM: "jmsmucker.com",
  CAG: "conagrabrands.com",    MKC: "mccormick.com",
  HSY: "thehersheycompany.com",CLX: "clorox.com",
  CHD: "churchdwight.com",     SFP: "santarus.com",
  // Healthcare
  JNJ: "jnj.com",              ABT: "abbott.com",
  MDT: "medtronic.com",        BMY: "bms.com",
  PFE: "pfizer.com",           MRK: "merck.com",
  UNH: "unitedhealthgroup.com",CVS: "cvshealth.com",
  CI:  "cigna.com",            ELV: "elevancehealth.com",
  HCA: "hcahealthcare.com",    ABBV:"abbvie.com",
  AMGN:"amgen.com",            GILD:"gilead.com",
  BIIB:"biogen.com",           CELG:"celgene.com",
  VRTX:"vertex.com",           REGN:"regeneron.com",
  ILMN:"illumina.com",         SRPT:"sarepta.com",
  SYK: "stryker.com",          ZBH: "zimmer.com",
  PODD:"insuletcorp.com",      DXCM:"dexcom.com",
  INCY:"incyte.com",           JAZZ:"jazzpharma.com",
  LGND:"legend.com",           RGEN:"repligen.com",
  // Financials
  AFL: "aflac.com",            BEN: "franklintempleton.com",
  V:   "visa.com",             MA:  "mastercard.com",
  PYPL:"paypal.com",           SQ:  "squareup.com",
  FIS: "fisglobal.com",        FISV:"fiserv.com",
  GPN: "globalpayments.com",   AFRM:"affirm.com",
  SOFI:"sofi.com",             NU:  "nu.com.br",
  JPM: "jpmorganchase.com",    BAC: "bankofamerica.com",
  WFC: "wellsfargo.com",       GS:  "goldmansachs.com",
  MS:  "morganstanley.com",    BLK: "blackrock.com",
  ICE: "ice.com",              CBOE:"cboe.com",
  CME: "cmegroup.com",         NDAQ:"nasdaq.com",
  BX:  "blackstone.com",       KKR: "kkr.com",
  APO: "apolloglobal.com",     OWL: "owlrockcp.com",
  // Utilities
  NEE: "nexteraenergy.com",     SO:  "southerncompany.com",
  D:   "dominionenergy.com",    DUK: "duke-energy.com",
  AEP: "aep.com",              WEC: "wecenergygroup.com",
  ES:  "eversource.com",       EXC: "exeloncorp.com",
  PCG: "pge.com",              ETR: "entergy.com",
  AWK: "amwater.com",          CMS: "cmsenergy.com",
  NI:  "nisource.com",         PNW: "pinnaclewest.com",
  OGE: "oge.com",              ED:  "coned.com",
  XEL: "xcelenergy.com",
  // Industrials
  CAT: "caterpillar.com",      DE:  "deere.com",
  HON: "honeywell.com",        GE:  "ge.com",
  RTX: "rtx.com",              LMT: "lockheedmartin.com",
  NOC: "northropgrumman.com",  BA:  "boeing.com",
  UPS: "ups.com",              FDX: "fedex.com",
  CSX: "csx.com",              UNP: "up.com",
  NSC: "nscorp.com",           WAB: "wabtec.com",
  GD:  "generaldy.com",        ETN: "eaton.com",
  EMR: "emerson.com",          ITT: "itt.com",
  OTIS:"otis.com",             ROL: "rollins.com",
  // Energy
  CVX: "chevron.com",          COP: "conocophillips.com",
  MPC: "marathonpetro.com",    VLO: "valero.com",
  PSX: "psxenergy.com",        FANG:"diamondbk.com",
  EQT: "eqt.com",              MHO: "m-hor.com",
  // Materials
  NUE: "nucor.com",            X:   "us.steel.com",
  FCX: "freeportmcmoran.com",  TECK:"teck.com",
  RIO: "riotinto.com",         VALE:"vale.com",
  BHP: "bhp.com",              ALB: "albemarle.com",
  LIN: "linde.com",            APD: "airproducts.com",
  // REITs & Real Estate
  O:   "realtyincome.com",     MAIN:"maincapital.com",
  STAG:"stagindustrial.com",   WPC: "wpcarey.com",
  NNN: "nnnreit.com",          ADC: "agreerealty.com",
  GAIN:"gladstoneinvestment.com",
  HTGC:"hercules-capital.com", ARCC:"aresmgmt.com",
  VICI:"viciproperties.com",   AMT: "americantower.com",
  PLD: "prologis.com",         SPG: "simon.com",
  PSA: "publicstorage.com",    EXR: "extraspace.com",
  MAA: "maacommunities.com",   UDR: "udr.com",
  IIPR:"innovativeindustrialproperties.com",
  // Media & Entertainment
  NFLX:"netflix.com",          DIS: "disney.com",
  CMCSA:"comcast.com",         T:   "att.com",
  VZ:  "verizon.com",          WTNY:"whitney.com",
  FOXA:"foxcorp.com",          FOX: "foxcorp.com",
  // Diversified / Other
  "BRK-B":"berkshirehathaway.com",
  WM:  "wm.com",               MMM: "3m.com",
  DKNG:"draftkings.com",       PENN:"pennentertn.com",
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

// ── Asian ticker → company domain (Clearbit) ──────────────────────────────────
// Hong Kong (HKEX), Singapore (SGX), India (NSE/BSE)
const ASIAN_DOMAINS: Record<string, string> = {
  // Hong Kong (HKEX)
  "0700": "tencent.com",         "0939": "citic.com",
  "0883": "chinaso.com",         "0175": "geely.com",
  "1299": "aig.com",             "1398": "icbcltd.com",
  "0941": "chinamobile.com",     "0016": "sfc.hk",
  "2333": "baic.com.cn",         "2382": "spreadtrum.com",
  "1088": "sinopectrade.com",    "3988": "chinaelements.com",
  // Singapore (SGX)
  "C6L": "capitaland.com",       "D05": "dbs.com.sg",
  "O39": "oversea-chinese.com",  "BN4": "bankneys.com.sg",
  "U96": "unitedtech.com",       "N2IU": "northstar.com.sg",
  // India (NSE)
  "RELIANCE": "reliance.com",    "WIPRO": "wipro.com",
  "TCS": "tcs.com",              "INFY": "infosys.com",
  "HCLTECH": "hcl.com",          "ICICIBANK": "icicibank.com",
  "HDFC": "hdfc.com",            "SBIN": "sbi.co.in",
  "LT": "larsentoubro.com",      "MARUTI": "maruti.co.in",
};

// ── Canadian ticker → company domain (Clearbit) ──────────────────────────────
// TSX (Toronto Stock Exchange)
const CANADIAN_DOMAINS: Record<string, string> = {
  RY:   "rbc.com",             TD:   "td.com",
  BNS:  "bns.com",             CM:   "cibc.com",
  BMO:  "bmo.com",             BCE:  "bce.ca",
  T:    "telus.com",           ENB:  "enbridge.com",
  CNQ:  "cnooc.com",           CVE:  "cenovus.com",
  IMV:  "imvglobal.com",       SU:   "suncor.com",
  MG:   "macquarie.com",       AQN:  "aequi.ca",
  FTS:  "fortisbc.com",        REI:  "riocanomall.com",
  NWC:  "northwest.com",       NTR:  "nutritional.com",
  TRP:  "transcanada.com",     WN:   "westjet.com",
  AC:   "aircanada.com",       CNR:  "cn.ca",
  CP:   "cpr.ca",              WPK:  "weston.com",
  TTH:  "toromont.com",        SKX:  "skechers.com",
};

// ── European ticker → company domain (Clearbit) ─────────────────────────────
// DAX (Germany), CAC 40 (France), FTSE (UK), SIX (Switzerland), etc.
const EUROPEAN_DOMAINS: Record<string, string> = {
  // DAX (Germany)
  SAP: "sap.com",              SIE: "siemens.com",
  VOW: "volkswagen.com",       BMW: "bmwgroup.com",
  MBG: "mercedes-benz.com",    IFX: "infineon.com",
  ALV: "allianz.de",           MUV2:"muenchreriskenversicherung.de",
  ZAL: "zalando.com",          ADS: "adidas.com",
  BAY: "bayer.com",            BASF:"basf.com",
  DTG: "deutschetelekom.com",  DBX: "deutschebank.com",
  // CAC 40 (France)
  TTE: "totalenergies.com",    MC:  "lvmh.com",
  HER: "hermes.com",           OR:  "loreal.com",
  DANOY:"danone.com",          KER: "kering.com",
  AIR: "airfrance-klm.com",    VIE: "vivendi.com",
  EOAN:"eoan.com",             SAN: "sanofi.com",
  ENGI:"engie.com",
  // FTSE (UK / London Stock Exchange)
  SHEL:"shell.com",            HSBA:"hsbc.com",
  AZN: "astrazeneca.com",      ULVR:"unilever.com",
  GSK: "gsk.com",              RYA: "ryanair.com",
  BARC:"barclays.com",         LLOY:"lloydsbanking.com",
  BP:  "bp.com",               RDSB:"shell.com",
  LSE: "lseg.com",             PRU: "prudential.com",
  IMB: "imb.com",              EXPN:"experian.com",
  // SIX (Switzerland)
  NSRGY:"nestle.com",          NOVN:"novartis.com",
  RHHBY:"roche.com",           ASML:"asml.com",
  ROG: "roche.com",            CSGN:"credit-suisse.com",
  UBS: "ubs.com",              GEBN:"geberit.com",
  // Ibex 35 (Spain)
  BBVA:"bbva.com",             RENO:"repsol.com",
  SAN: "santander.com",        IBE: "iberia.com",
  // AEX (Netherlands) & Other
  ASML:"asml.com",             PHIA:"philips.com",
  ABD: "asml.com",
  // Nordic & Other EU
  NOKIA:"nokia.com",           INTC:"intel.com",
  SAB: "sabsoftware.com",
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
  if (upper.endsWith(".SA"))    return upper.replace(".SA", "");   // B3 (Brazil)
  if (upper.endsWith(".TO"))    return upper.replace(".TO", "");   // TSX (Canada)
  if (upper.endsWith(".CN"))    return upper.replace(".CN", "");   // Canadian NYSE
  // European suffixes
  if (upper.endsWith(".DE"))    return upper.replace(".DE", "");   // DAX (Germany)
  if (upper.endsWith(".PA"))    return upper.replace(".PA", "");   // CAC (France)
  if (upper.endsWith(".L"))     return upper.replace(".L", "");    // LSE (UK)
  if (upper.endsWith(".AS"))    return upper.replace(".AS", "");   // AEX (Netherlands)
  if (upper.endsWith(".MI"))    return upper.replace(".MI", "");   // MTA (Italy)
  if (upper.endsWith(".SX"))    return upper.replace(".SX", "");   // SIX (Switzerland)
  if (upper.endsWith(".MC"))    return upper.replace(".MC", "");   // BME (Spain)
  // Asian suffixes
  if (upper.endsWith(".HK"))    return upper.replace(".HK", "");   // HKEX (Hong Kong)
  if (upper.endsWith(".SI"))    return upper.replace(".SI", "");   // SGX (Singapore)
  return upper;
}

/** Returns true if the ticker looks like a B3 stock (4 letters + 1-2 digits). */
function isBR(ticker: string): boolean {
  return /^[A-Z]{4}\d{1,2}$/.test(ticker);
}

/** Returns true if ticker looks like Canadian (TSX suffix or in CANADIAN_DOMAINS). */
function isCA(ticker: string): boolean {
  const upper = ticker.toUpperCase();
  return /\.(TO|CN)$/.test(upper) ||
         (Object.keys(CANADIAN_DOMAINS).some(k => k === ticker.toUpperCase()));
}

/** Returns true if ticker looks like European (has European suffix or is in EUROPEAN_DOMAINS). */
function isEU(ticker: string): boolean {
  const upper = ticker.toUpperCase();
  return /\.(DE|PA|L|AS|MI|SX|MC|VX|SW|LS|UK)$/.test(upper) ||
         (Object.keys(EUROPEAN_DOMAINS).some(k => k === ticker.toUpperCase()));
}

/** Returns true if ticker looks like Asian (Hong Kong, Singapore, India). */
function isAsia(ticker: string): boolean {
  const upper = ticker.toUpperCase();
  return /\.(HK|SI)$/.test(upper) ||
         /^\d{4,5}$/.test(upper) ||
         /^[A-Z]+$/.test(upper) && upper.length >= 3 &&
         (Object.keys(ASIAN_DOMAINS).some(k => k === upper));
}

/**
 * Returns ordered list of logo URLs to try.
 * Priority: Clearbit → FMP (image-stock) → Parqet → Backend API → FMP Search API → initials fallback.
 * Supports: US (NYSE/NASDAQ), Canada (TSX), Brazil (B3), Europe (DAX/CAC/FTSE/SIX),
 *           Asia (HKEX/SGX/NSE), Crypto, ETFs
 */
function getSources(logoTicker: string): string[] {
  const sources: string[] = [];
  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";

  if (isBR(logoTicker)) {
    // B3 (Brazil): Clearbit → FMP (.SA) → Parqet
    const prefix = logoTicker.slice(0, 4);
    const domain = B3_DOMAINS[prefix];
    if (domain) sources.push(`https://logo.clearbit.com/${domain}`);
    sources.push(`https://financialmodelingprep.com/image-stock/${logoTicker}.SA.png`);
    sources.push(`https://assets.parqet.com/logos/symbol/${logoTicker}?format=jpg`);
  } else if (isCA(logoTicker)) {
    // Canadian (TSX): Clearbit → FMP → Parqet
    const domain = CANADIAN_DOMAINS[logoTicker];
    if (domain) sources.push(`https://logo.clearbit.com/${domain}`);
    sources.push(`https://financialmodelingprep.com/image-stock/${logoTicker}.png`);
    sources.push(`https://assets.parqet.com/logos/symbol/${logoTicker}?format=jpg`);
  } else if (isEU(logoTicker)) {
    // European (DAX/CAC/FTSE/SIX): Clearbit → FMP → Parqet
    const domain = EUROPEAN_DOMAINS[logoTicker];
    if (domain) sources.push(`https://logo.clearbit.com/${domain}`);
    sources.push(`https://financialmodelingprep.com/image-stock/${logoTicker}.png`);
    sources.push(`https://assets.parqet.com/logos/symbol/${logoTicker}?format=jpg`);
  } else if (isAsia(logoTicker)) {
    // Asian (HKEX/SGX/NSE): Clearbit → FMP → Parqet
    const domain = ASIAN_DOMAINS[logoTicker];
    if (domain) sources.push(`https://logo.clearbit.com/${domain}`);
    sources.push(`https://financialmodelingprep.com/image-stock/${logoTicker}.png`);
    sources.push(`https://assets.parqet.com/logos/symbol/${logoTicker}?format=jpg`);
  } else {
    // US & others (NYSE/NASDAQ/Crypto/ETFs): Clearbit → FMP → Parqet
    const domain = US_DOMAINS[logoTicker];
    if (domain) sources.push(`https://logo.clearbit.com/${domain}`);
    sources.push(`https://financialmodelingprep.com/image-stock/${logoTicker}.png`);
    sources.push(`https://assets.parqet.com/logos/symbol/${logoTicker}?format=jpg`);
  }

  // Backend API endpoint (secure, with API key)
  sources.push(`${apiBase}/api/v1/logos/search/${logoTicker}`);

  // FMP Search API as final fallback (free tier)
  const fmpKey = process.env.NEXT_PUBLIC_FMP_API_KEY;
  const fmpSearch = fmpKey
    ? `https://financialmodelingprep.com/api/v3/search?query=${logoTicker}&limit=1&apikey=${fmpKey}`
    : `https://financialmodelingprep.com/api/v3/search?query=${logoTicker}&limit=1`;
  sources.push(fmpSearch);

  return sources;
}

/** Logo cache version (increment when structure changes). */
const CACHE_VERSION = "v2";

/** Get cached failed tickers with version checking. */
function getFailedLogos(): Set<string> {
  if (typeof window === "undefined") return new Set();
  const key = `logo_cache_failed_${CACHE_VERSION}`;
  const cached = localStorage.getItem(key);
  return cached ? new Set(JSON.parse(cached)) : new Set();
}

/** Cache a ticker as failed to avoid retrying. */
function cacheFailedLogo(ticker: string): void {
  if (typeof window === "undefined") return;
  const key = `logo_cache_failed_${CACHE_VERSION}`;
  const failed = getFailedLogos();
  failed.add(ticker);
  localStorage.setItem(key, JSON.stringify([...failed]));
}

/** Clean up old cache versions. */
function cleanupOldCache(): void {
  if (typeof window === "undefined") return;
  const keys = Object.keys(localStorage);
  keys.forEach(k => {
    if (k.startsWith("logo_cache_") && !k.includes(CACHE_VERSION)) {
      localStorage.removeItem(k);
    }
  });
}

/** Preload popular logos to improve perceived performance. */
function preloadPopularLogos(): void {
  if (typeof window === "undefined") return;
  const popular = ["AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "JPM", "SPY"];
  popular.forEach(ticker => {
    const img = new Image();
    img.src = `https://logo.clearbit.com/apple.com`;
  });
}

export default function TickerLogo({ ticker, size = 28, className }: TickerLogoProps) {
  const logoTicker    = getLogoTicker(ticker);
  const initial       = logoTicker?.[0]?.toUpperCase() ?? "?";
  const fallbackColor = TICKER_COLORS[initial] ?? "bg-primary/20 text-primary";
  const sources       = getSources(logoTicker);

  const [srcIndex, setSrcIndex] = useState(0);
  const [failed,   setFailed]   = useState(false);

  // Check cache on mount
  const isInCache = getFailedLogos().has(logoTicker);

  // Cleanup old cache and preload popular logos on first mount
  useState(() => {
    if (typeof window !== "undefined") {
      cleanupOldCache();
      preloadPopularLogos();
    }
  });

  const handleError = () => {
    if (srcIndex < sources.length - 1) {
      setSrcIndex((i) => i + 1);
    } else {
      // Cache this failed ticker
      cacheFailedLogo(logoTicker);
      setFailed(true);
    }
  };

  // Use fallback immediately if cached
  if (failed || isInCache) {
    return (
      <div
        className={cn("rounded-full flex items-center justify-center flex-shrink-0 font-bold", fallbackColor, className)}
        style={{ width: size, height: size, fontSize: size * 0.4 }}
        title={`${logoTicker} (cached fallback)`}
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
