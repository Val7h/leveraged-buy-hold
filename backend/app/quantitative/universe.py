"""
Universo CURADO para o Ranking de aporte — blue chips (disponíveis na Quantfury).
Separado por categoria. bucket = função na carteira (ESTRATEGIA_MASTER).
NOTA: lista curada por reputação/liquidez; confirmar/ajustar disponibilidade real
na conta Quantfury. Símbolos compatíveis com Yahoo (para o ranking ao vivo).
"""
# bucket: ANCORA | GERADOR | ACELERADOR | TATICO | RESERVA

UNIVERSE = {
    "BR": [
        # Financeiro / seguros
        ("ITUB4.SA","ANCORA","Itaú"), ("BBDC4.SA","ANCORA","Bradesco"),
        ("BBDC3.SA","ANCORA","Bradesco ON"),
        ("BBAS3.SA","ANCORA","Banco do Brasil"), ("BPAC11.SA","ACELERADOR","BTG Pactual"),
        ("SANB11.SA","GERADOR","Santander BR"), ("ITSA4.SA","ACELERADOR","Itaúsa"),
        ("B3SA3.SA","ACELERADOR","B3"), ("BBSE3.SA","GERADOR","BB Seguridade"),
        ("PSSA3.SA","GERADOR","Porto Seguro"), ("CXSE3.SA","GERADOR","Caixa Seguridade"),
        ("ABCB4.SA","GERADOR","ABC Brasil"), ("BRSR6.SA","GERADOR","Banrisul"),
        # Utilities / energia elétrica / saneamento
        ("TAEE11.SA","ANCORA","Taesa"), ("EGIE3.SA","ANCORA","Engie"),
        ("CMIG4.SA","GERADOR","Cemig"), ("CPLE6.SA","ANCORA","Copel"),
        ("EQTL3.SA","ANCORA","Equatorial"), ("ELET3.SA","ACELERADOR","Eletrobras"),
        ("SBSP3.SA","ANCORA","Sabesp"), ("SAPR11.SA","ANCORA","Sanepar"),
        ("ENEV3.SA","ACELERADOR","Eneva"), ("CPFE3.SA","ANCORA","CPFL Energia"),
        ("NEOE3.SA","ANCORA","Neoenergia"), ("AURE3.SA","GERADOR","Auren"),
        ("ALUP11.SA","ANCORA","Alupar"), ("CSMG3.SA","GERADOR","Copasa"),
        ("ENGI11.SA","GERADOR","Energisa"),
        # Materiais / mineração / siderurgia / papel (TATICO = cíclica)
        ("VALE3.SA","TATICO","Vale"), ("PETR4.SA","TATICO","Petrobras"),
        ("PRIO3.SA","TATICO","PRIO"), ("SUZB3.SA","TATICO","Suzano"),
        ("GGBR4.SA","TATICO","Gerdau"), ("KLBN11.SA","GERADOR","Klabin"),
        ("CSNA3.SA","TATICO","CSN"), ("USIM5.SA","TATICO","Usiminas"),
        ("CMIN3.SA","TATICO","CSN Mineração"), ("BRAP4.SA","TATICO","Bradespar"),
        ("DXCO3.SA","TATICO","Dexco"),
        # Consumo / varejo / saúde / indústria / telecom
        ("ABEV3.SA","ANCORA","Ambev"), ("WEGE3.SA","ACELERADOR","WEG"),
        ("RADL3.SA","ACELERADOR","RaiaDrogasil"), ("RENT3.SA","ACELERADOR","Localiza"),
        ("LREN3.SA","ACELERADOR","Lojas Renner"), ("VIVT3.SA","GERADOR","Vivo"),
        ("TOTS3.SA","ACELERADOR","Totvs"), ("EMBR3.SA","ACELERADOR","Embraer"),
        ("RDOR3.SA","ACELERADOR","Rede D'Or"), ("ASAI3.SA","TATICO","Assaí"),
        ("NTCO3.SA","ACELERADOR","Natura"), ("HYPE3.SA","ACELERADOR","Hypera"),
        ("FLRY3.SA","GERADOR","Fleury"), ("SMTO3.SA","ACELERADOR","São Martinho"),
        ("CRFB3.SA","GERADOR","Carrefour BR"), ("TIMS3.SA","GERADOR","TIM"),
        ("UGPA3.SA","GERADOR","Ultrapar"), ("VBBR3.SA","GERADOR","Vibra"),
        ("RAIZ4.SA","TATICO","Raízen"), ("GMAT3.SA","ACELERADOR","Grupo Mateus"),
        ("PETZ3.SA","ACELERADOR","Petz"), ("LWSA3.SA","ACELERADOR","Locaweb"),
        # Alimentos / agro (cíclicas)
        ("JBSS3.SA","TATICO","JBS"), ("BRFS3.SA","TATICO","BRF"),
        ("MRFG3.SA","TATICO","Marfrig"), ("SLCE3.SA","TATICO","SLC Agrícola"),
        # Transporte / infraestrutura / construção
        ("RAIL3.SA","ACELERADOR","Rumo"), ("CCRO3.SA","GERADOR","CCR"),
        ("POMO4.SA","ACELERADOR","Marcopolo"), ("CYRE3.SA","ACELERADOR","Cyrela"),
        ("MRVE3.SA","ACELERADOR","MRV"), ("MULT3.SA","GERADOR","Multiplan"),
        ("DIRR3.SA","ACELERADOR","Direcional"),
    ],
    "US": [
        # Tech / comunicação
        ("AAPL","ACELERADOR","Apple"), ("MSFT","ACELERADOR","Microsoft"),
        ("GOOGL","ACELERADOR","Alphabet"), ("AMZN","ACELERADOR","Amazon"),
        ("NVDA","ACELERADOR","Nvidia"), ("META","ACELERADOR","Meta"),
        ("AVGO","ACELERADOR","Broadcom"), ("ORCL","ACELERADOR","Oracle"),
        ("ADBE","ACELERADOR","Adobe"), ("CSCO","GERADOR","Cisco"),
        ("CRM","ACELERADOR","Salesforce"), ("ACN","ACELERADOR","Accenture"),
        ("AMD","ACELERADOR","AMD"), ("QCOM","GERADOR","Qualcomm"),
        ("TXN","GERADOR","Texas Instruments"), ("INTU","ACELERADOR","Intuit"),
        ("NOW","ACELERADOR","ServiceNow"), ("IBM","GERADOR","IBM"),
        ("AMAT","ACELERADOR","Applied Materials"), ("NFLX","ACELERADOR","Netflix"),
        ("DIS","ACELERADOR","Disney"), ("CMCSA","GERADOR","Comcast"),
        ("TMUS","ACELERADOR","T-Mobile"),
        # Financeiro
        ("BRK-B","ANCORA","Berkshire"), ("JPM","GERADOR","JPMorgan"),
        ("V","ACELERADOR","Visa"), ("MA","ACELERADOR","Mastercard"),
        ("BAC","GERADOR","Bank of America"), ("AXP","ACELERADOR","Amex"),
        ("WFC","GERADOR","Wells Fargo"), ("GS","ACELERADOR","Goldman Sachs"),
        ("MS","ACELERADOR","Morgan Stanley"), ("BLK","ACELERADOR","BlackRock"),
        ("SPGI","ACELERADOR","S&P Global"), ("SCHW","GERADOR","Schwab"),
        ("CB","GERADOR","Chubb"), ("PGR","ACELERADOR","Progressive"),
        # Saúde
        ("UNH","ACELERADOR","UnitedHealth"), ("LLY","ACELERADOR","Eli Lilly"),
        ("JNJ","ANCORA","J&J"), ("ABBV","GERADOR","AbbVie"),
        ("MRK","ANCORA","Merck"), ("TMO","ACELERADOR","Thermo Fisher"),
        ("ABT","ANCORA","Abbott"), ("DHR","ACELERADOR","Danaher"),
        ("PFE","GERADOR","Pfizer"), ("BMY","GERADOR","Bristol Myers"),
        ("AMGN","GERADOR","Amgen"), ("MDT","GERADOR","Medtronic"),
        ("ISRG","ACELERADOR","Intuitive Surgical"), ("ELV","ACELERADOR","Elevance"),
        # Consumo
        ("PG","ANCORA","P&G"), ("KO","ANCORA","Coca-Cola"),
        ("PEP","ANCORA","PepsiCo"), ("WMT","ANCORA","Walmart"),
        ("COST","ACELERADOR","Costco"), ("HD","ACELERADOR","Home Depot"),
        ("MCD","ANCORA","McDonald's"), ("NKE","ACELERADOR","Nike"),
        ("PM","ANCORA","Philip Morris"), ("MO","GERADOR","Altria"),
        ("MDLZ","ANCORA","Mondelez"), ("CL","ANCORA","Colgate"),
        ("KMB","ANCORA","Kimberly-Clark"), ("TGT","GERADOR","Target"),
        ("LOW","ACELERADOR","Lowe's"), ("SBUX","ACELERADOR","Starbucks"),
        ("BKNG","ACELERADOR","Booking"),
        # Energia / indústria / utilities / renda
        ("XOM","TATICO","Exxon"), ("CVX","TATICO","Chevron"),
        ("COP","TATICO","ConocoPhillips"), ("SLB","TATICO","Schlumberger"),
        ("CAT","TATICO","Caterpillar"), ("DE","TATICO","Deere"),
        ("HON","ACELERADOR","Honeywell"), ("GE","ACELERADOR","GE Aerospace"),
        ("LMT","GERADOR","Lockheed"), ("RTX","GERADOR","Raytheon"),
        ("UNP","ACELERADOR","Union Pacific"), ("UPS","GERADOR","UPS"),
        ("ETN","ACELERADOR","Eaton"), ("MMM","GERADOR","3M"),
        ("VZ","GERADOR","Verizon"), ("O","GERADOR","Realty Income"),
        ("MAIN","GERADOR","Main Street"), ("NEE","ANCORA","NextEra"),
        ("DUK","ANCORA","Duke Energy"), ("SO","ANCORA","Southern Co"),
    ],
    "ETF": [
        ("SPY","ANCORA","S&P 500"), ("VOO","ANCORA","S&P 500 Vanguard"),
        ("QQQ","ACELERADOR","Nasdaq 100"), ("DIA","ANCORA","Dow Jones"),
        ("IWM","ACELERADOR","Russell 2000"), ("VTI","ANCORA","Total US Market"),
        ("SCHD","ANCORA","Schwab Dividend"), ("VYM","ANCORA","Vanguard High Div"),
        ("DGRO","ANCORA","Dividend Growth"), ("JEPI","GERADOR","JPM Premium Income"),
        ("JEPQ","GERADOR","JPM Nasdaq Income"), ("SHY","RESERVA","Treasury 1-3a"),
        ("IEF","RESERVA","Treasury 7-10a"), ("TLT","TATICO","Treasury 20a+"),
    ],
    "EUROPE": [
        # US-listed (NYSE/NASDAQ) — diretos
        ("ASML","ACELERADOR","ASML (NL)"), ("NVO","ACELERADOR","Novo Nordisk (DK)"),
        ("SAP","ACELERADOR","SAP (DE)"), ("SHEL","TATICO","Shell (UK)"),
        ("AZN","ANCORA","AstraZeneca (UK)"), ("UL","ANCORA","Unilever (UK)"),
        ("TTE","TATICO","TotalEnergies (FR)"), ("NVS","ANCORA","Novartis (CH)"),
        ("DEO","ANCORA","Diageo (UK)"), ("SNY","ANCORA","Sanofi (FR)"),
        ("BTI","GERADOR","British Am. Tobacco"), ("RIO","TATICO","Rio Tinto"),
        ("BUD","ANCORA","AB InBev (BE)"), ("BP","TATICO","BP (UK)"),
        ("GSK","GERADOR","GSK (UK)"), ("HSBC","GERADOR","HSBC (UK)"),
        ("SAN","GERADOR","Banco Santander (ES)"), ("BBVA","GERADOR","BBVA (ES)"),
        ("UBS","GERADOR","UBS (CH)"), ("ING","GERADOR","ING (NL)"),
        ("STLA","TATICO","Stellantis"), ("SPOT","ACELERADOR","Spotify (SE)"),
        ("ERIC","GERADOR","Ericsson (SE)"), ("NOK","GERADOR","Nokia (FI)"),
        ("VOD","GERADOR","Vodafone (UK)"), ("PHG","ACELERADOR","Philips (NL)"),
        ("EQNR","TATICO","Equinor (NO)"), ("SNN","ACELERADOR","Smith & Nephew (UK)"),
        ("E","TATICO","Eni (IT)"), ("FMS","GERADOR","Fresenius Medical (DE)"),
        # ADRs US (OTC) — substituem bolsa local p/ disponibilidade Quantfury
        ("LVMUY","ACELERADOR","LVMH (FR) ADR"),   # era MC.PA (Paris)
        ("NSRGY","ANCORA","Nestlé (CH) ADR"),     # era NESN.SW (Suíça)
        ("SIEGY","ACELERADOR","Siemens (DE) ADR"),# era SIE.DE (Frankfurt)
        ("RHHBY","ANCORA","Roche (CH) ADR"),
    ],
    "COMMODITY": [
        ("GLD","ANCORA","Ouro"), ("SLV","TATICO","Prata"),
        ("USO","TATICO","Petróleo WTI"), ("BNO","TATICO","Petróleo Brent"),
        ("UNG","TATICO","Gás natural"), ("CPER","TATICO","Cobre"),
        ("PPLT","TATICO","Platina"), ("PALL","TATICO","Paládio"),
        ("DBC","TATICO","Cesta commodities"), ("DBA","TATICO","Agrícolas"),
    ],
    "CRYPTO": [
        ("BTC-USD","ACELERADOR","Bitcoin"), ("ETH-USD","ACELERADOR","Ethereum"),
        ("BNB-USD","TATICO","BNB"), ("SOL-USD","TATICO","Solana"),
        ("XRP-USD","TATICO","XRP"), ("ADA-USD","TATICO","Cardano"),
        ("DOGE-USD","TATICO","Dogecoin"), ("AVAX-USD","TATICO","Avalanche"),
        ("TRX-USD","TATICO","Tron"), ("LINK-USD","TATICO","Chainlink"),
    ],
    # FIIs — Fundos de Investimento Imobiliário (B3)
    # Scoring próprio: DY+P/VP+safety+drawdown (sem ROIC/FCF/EPS — estrutura de fundo, não empresa).
    # bucket: GERADOR = renda corrente; ANCORA = previdenciário sólido; TATICO = oportunidade/ciclo.
    "FII": [
        # Logística / galpões (tijolo) — renda previsível, ativos de longa vida
        ("HGLG11.SA","GERADOR","CSHG Logística"),
        ("XPLG11.SA","GERADOR","XP Log"),
        ("BRCO11.SA","GERADOR","Bresco"),
        ("BTLG11.SA","GERADOR","BTG Logística"),
        ("LVBI11.SA","GERADOR","VBI Logística"),
        # Shoppings / varejo (tijolo) — renda crescente, vacância cíclica
        ("XPML11.SA","ANCORA","XP Malls"),
        ("VISC11.SA","ANCORA","Vinci Shopping"),
        ("HSML11.SA","GERADOR","HSI Malls"),
        ("MALL11.SA","GERADOR","Malls Brasil Plural"),
        # Lajes corporativas (tijolo) — escritórios prime
        ("HGRE11.SA","GERADOR","CSHG Real Estate"),
        ("RBRP11.SA","GERADOR","RBR Properties"),
        ("BRCR11.SA","GERADOR","BTG Pactual Corporate"),
        # Renda urbana / residencial / diversificado (tijolo)
        ("HGRU11.SA","ANCORA","CSHG Renda Urbana"),
        ("RZTR11.SA","GERADOR","Riza Terrax"),
        # Papel (CRI/CRA) — rendimento atrelado a CDI/IPCA, sem ativo físico
        ("MXRF11.SA","GERADOR","Maxi Renda"),
        ("KNCR11.SA","ANCORA","Kinea Rendimentos"),
        ("KNRI11.SA","ANCORA","Kinea Renda Imobiliária"),
        ("RECR11.SA","GERADOR","REC Recebíveis"),
        ("IRDM11.SA","GERADOR","Iridium Recebíveis"),
        ("BCFF11.SA","GERADOR","BTG Fundo de Fundos"),
        # FOF (fundo de fundos)
        ("BPFF11.SA","TATICO","Brasil Plural FoF"),
    ],
}

INDEX_BY_CAT = {
    "BR": "^BVSP", "US": "^GSPC", "ETF": "^GSPC",
    "EUROPE": "^STOXX50E", "COMMODITY": "^GSPC", "CRYPTO": "BTC-USD",
    "FII": "^BVSP",  # benchmark: Ibovespa (IFIX não disponível grátis no yfinance)
}
