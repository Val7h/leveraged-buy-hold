"""
Fetcher de dados históricos REAIS via Yahoo chart API (query1) — contorna o
bug de cookie/crumb do yfinance. Salva CSV por ticker em ./data/.
15 anos de OHLCV diário ajustado.
"""
import urllib.request, ssl, json, time, os, csv

CTX = ssl.create_default_context()
CTX.check_hostname = False
CTX.verify_mode = ssl.CERT_NONE

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
os.makedirs(DATA_DIR, exist_ok=True)

# Cesta: defensivas/dividendos BR, blue chips US, índices p/ regime
TICKERS = [
    # BR defensivas/dividendos
    "BBAS3.SA", "TAEE11.SA", "ITUB4.SA", "EGIE3.SA", "PETR4.SA", "VALE3.SA",
    # US
    "AAPL", "JNJ", "KO", "MSFT",
    # Índices (regime)
    "^BVSP", "^GSPC",
]


def fetch(ticker, years=15):
    end = int(time.time())
    start = end - years * 365 * 86400
    url = (f"https://query1.finance.yahoo.com/v8/finance/chart/{ticker}"
           f"?period1={start}&period2={end}&interval=1d")
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    for attempt in range(3):
        try:
            r = urllib.request.urlopen(req, timeout=30, context=CTX)
            d = json.loads(r.read())
            res = d["chart"]["result"][0]
            ts = res["timestamp"]
            q = res["indicators"]["quote"][0]
            adj = (res["indicators"].get("adjclose") or [{}])[0].get("adjclose")
            closes = adj if adj else q["close"]
            rows = []
            for i, t in enumerate(ts):
                c = closes[i]
                if c is None:
                    continue
                rows.append((time.strftime("%Y-%m-%d", time.gmtime(t)), float(c)))
            return rows
        except Exception as e:
            if attempt == 2:
                print(f"  ! {ticker} falhou: {str(e)[:80]}")
                return []
            time.sleep(2)


if __name__ == "__main__":
    for tk in TICKERS:
        rows = fetch(tk)
        if rows:
            path = os.path.join(DATA_DIR, tk.replace("^", "_") + ".csv")
            with open(path, "w", newline="") as f:
                w = csv.writer(f)
                w.writerow(["date", "close"])
                w.writerows(rows)
            print(f"  OK {tk:12s} {len(rows):5d} pts  {rows[0][0]} -> {rows[-1][0]}")
        time.sleep(1)
    print("DONE")
