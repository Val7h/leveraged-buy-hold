"""
Universo CURADO para o Ranking de aporte — blue chips (disponíveis na Quantfury).
Separado por categoria. bucket = função na carteira (ESTRATEGIA_MASTER).
NOTA: lista curada por reputação/liquidez; confirmar/ajustar disponibilidade real
na conta Quantfury. Símbolos compatíveis com Yahoo (para o ranking ao vivo).
"""
# bucket: ANCORA | GERADOR | ACELERADOR | TATICO | RESERVA

UNIVERSE = {
    "BR": [
        # Financeiro
        ("ITUB4.SA","ANCORA","Itaú"), ("BBDC4.SA","ANCORA","Bradesco"),
        ("BBAS3.SA","ANCORA","Banco do Brasil"), ("BPAC11.SA","ACELERADOR","BTG Pactual"),
        ("SANB11.SA","GERADOR","Santander BR"), ("ITSA4.SA","ACELERADOR","Itaúsa"),
        ("B3SA3.SA","ACELERADOR","B3"), ("BBSE3.SA","GERADOR","BB Seguridade"),
        ("PSSA3.SA","GERADOR","Porto Seguro"),
        # Utilities / energia elétrica
        ("TAEE11.SA","ANCORA","Taesa"), ("EGIE3.SA","ANCORA","Engie"),
        ("CMIG4.SA","GERADOR","Cemig"), ("CPLE6.SA","ANCORA","Copel"),
        ("EQTL3.SA","ANCORA","Equatorial"), ("ELET3.SA","ACELERADOR","Eletrobras"),
        ("SBSP3.SA","ANCORA","Sabesp"), ("SAPR11.SA","ANCORA","Sanepar"),
        ("ENEV3.SA","ACELERADOR","Eneva"),
        # Materiais / commodities (TATICO = cíclica)
        ("VALE3.SA","TATICO","Vale"), ("PETR4.SA","TATICO","Petrobras"),
        ("PRIO3.SA","TATICO","PRIO"), ("SUZB3.SA","TATICO","Suzano"),
        ("GGBR4.SA","TATICO","Gerdau"), ("KLBN11.SA","GERADOR","Klabin"),
        # Consumo / varejo / saúde / indústria / telecom
        ("ABEV3.SA","ANCORA","Ambev"), ("WEGE3.SA","ACELERADOR","WEG"),
        ("RADL3.SA","ACELERADOR","RaiaDrogasil"), ("RENT3.SA","ACELERADOR","Localiza"),
        ("LREN3.SA","ACELERADOR","Lojas Renner"), ("VIVT3.SA","GERADOR","Vivo"),
        ("TOTS3.SA","ACELERADOR","Totvs"), ("EMBR3.SA","ACELERADOR","Embraer"),
        ("RDOR3.SA","ACELERADOR","Rede D'Or"), ("ASAI3.SA","TATICO","Assaí"),
    ],
    "US": [
        # Tech / comunicação
        ("AAPL","ACELERADOR","Apple"), ("MSFT","ACELERADOR","Microsoft"),
        ("GOOGL","ACELERADOR","Alphabet"), ("AMZN","ACELERADOR","Amazon"),
        ("NVDA","ACELERADOR","Nvidia"), ("META","ACELERADOR","Meta"),
        ("AVGO","ACELERADOR","Broadcom"), ("ORCL","ACELERADOR","Oracle"),
        ("ADBE","ACELERADOR","Adobe"), ("CSCO","GERADOR","Cisco"),
        # Financeiro
        ("BRK-B","ANCORA","Berkshire"), ("JPM","GERADOR","JPMorgan"),
        ("V","ACELERADOR","Visa"), ("MA","ACELERADOR","Mastercard"),
        ("BAC","GERADOR","Bank of America"), ("AXP","ACELERADOR","Amex"),
        # Saúde
        ("UNH","ACELERADOR","UnitedHealth"), ("LLY","ACELERADOR","Eli Lilly"),
        ("JNJ","ANCORA","J&J"), ("ABBV","GERADOR","AbbVie"),
        ("MRK","ANCORA","Merck"), ("TMO","ACELERADOR","Thermo Fisher"),
        # Consumo
        ("PG","ANCORA","P&G"), ("KO","ANCORA","Coca-Cola"),
        ("PEP","ANCORA","PepsiCo"), ("WMT","ANCORA","Walmart"),
        ("COST","ACELERADOR","Costco"), ("HD","ACELERADOR","Home Depot"),
        ("MCD","ANCORA","McDonald's"), ("NKE","ACELERADOR","Nike"),
        # Energia / indústria / telecom / renda
        ("XOM","TATICO","Exxon"), ("CVX","TATICO","Chevron"),
        ("CAT","TATICO","Caterpillar"), ("HON","ACELERADOR","Honeywell"),
        ("VZ","GERADOR","Verizon"), ("O","GERADOR","Realty Income"),
        ("MAIN","GERADOR","Main Street"),
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
        ("ASML","ACELERADOR","ASML (NL)"), ("NVO","ACELERADOR","Novo Nordisk (DK)"),
        ("SAP","ACELERADOR","SAP (DE)"), ("SHEL","TATICO","Shell (UK)"),
        ("AZN","ANCORA","AstraZeneca (UK)"), ("UL","ANCORA","Unilever (UK)"),
        ("TTE","TATICO","TotalEnergies (FR)"), ("NVS","ANCORA","Novartis (CH)"),
        ("DEO","ANCORA","Diageo (UK)"), ("SNY","ANCORA","Sanofi (FR)"),
        ("BTI","GERADOR","British Am. Tobacco"), ("RIO","TATICO","Rio Tinto"),
        ("MC.PA","ACELERADOR","LVMH (FR)"), ("NESN.SW","ANCORA","Nestlé (CH)"),
        ("SIE.DE","ACELERADOR","Siemens (DE)"),
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
}

INDEX_BY_CAT = {
    "BR": "^BVSP", "US": "^GSPC", "ETF": "^GSPC",
    "EUROPE": "^STOXX50E", "COMMODITY": "^GSPC", "CRYPTO": "BTC-USD",
}
