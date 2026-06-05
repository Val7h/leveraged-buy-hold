#!/usr/bin/env python3
import subprocess
import json
import os
from pathlib import Path

BASE_URL = "http://localhost:3000"
REPORT_DIR = Path("/c/Users/Admin/leveraged-buy-hold/lighthouse-reports")
REPORT_DIR.mkdir(exist_ok=True)

PAGES = [
    "/",
    "/dashboard",
    "/watchlist",
    "/portfolio",
    "/history",
    "/assets",
    "/backtest",
    "/sharpe-compare",
    "/simulator",
    "/alerts",
    "/login"
]

results = []

for page in PAGES:
    page_name = "homepage" if page == "/" else page.strip("/").replace("/", "_")
    
    # Desktop audit
    print(f"Auditing {page} (Desktop)...")
    report_path = REPORT_DIR / f"{page_name}_desktop.json"
    
    try:
        subprocess.run([
            "lighthouse",
            f"{BASE_URL}{page}",
            "--output=json",
            f"--output-path={report_path}",
            "--chrome-flags=--headless",
        ], timeout=300, capture_output=True)
        
        if report_path.exists():
            with open(report_path) as f:
                data = json.load(f)
            cats = data['categories']
            perf = int(cats['performance']['score'] * 100)
            a11y = int(cats['accessibility']['score'] * 100)
            bp = int(cats['best-practices']['score'] * 100)
            seo = int(cats['seo']['score'] * 100)
            print(f"  Performance: {perf}, A11y: {a11y}, BP: {bp}, SEO: {seo}")
            results.append(f"{page},Desktop,{perf},{a11y},{bp},{seo}")
    except Exception as e:
        print(f"  Error: {e}")
    
    # Mobile audit
    print(f"Auditing {page} (Mobile)...")
    report_path = REPORT_DIR / f"{page_name}_mobile.json"
    
    try:
        subprocess.run([
            "lighthouse",
            f"{BASE_URL}{page}",
            "--output=json",
            f"--output-path={report_path}",
            "--emulated-form-factor=mobile",
            "--chrome-flags=--headless",
        ], timeout=300, capture_output=True)
        
        if report_path.exists():
            with open(report_path) as f:
                data = json.load(f)
            cats = data['categories']
            perf = int(cats['performance']['score'] * 100)
            a11y = int(cats['accessibility']['score'] * 100)
            bp = int(cats['best-practices']['score'] * 100)
            seo = int(cats['seo']['score'] * 100)
            print(f"  Performance: {perf}, A11y: {a11y}, BP: {bp}, SEO: {seo}")
            results.append(f"{page},Mobile,{perf},{a11y},{bp},{seo}")
    except Exception as e:
        print(f"  Error: {e}")

# Save summary
summary_file = REPORT_DIR / "LIGHTHOUSE_AUDIT_SUMMARY.csv"
with open(summary_file, 'w') as f:
    f.write("PAGE,DEVICE,PERFORMANCE,ACCESSIBILITY,BEST_PRACTICES,SEO\n")
    f.write("\n".join(results))

print(f"\nSummary saved to: {summary_file}")
