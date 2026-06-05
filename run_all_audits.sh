#!/bin/bash
BASE_URL="http://localhost:3000"
REPORT_DIR="/c/Users/Admin/leveraged-buy-hold/lighthouse-reports"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
mkdir -p "$REPORT_DIR"

PAGES=("/" "/dashboard" "/watchlist" "/portfolio" "/history" "/assets" "/backtest" "/sharpe-compare" "/simulator" "/alerts" "/login")

SUMMARY_FILE="$REPORT_DIR/LIGHTHOUSE_SUMMARY_${TIMESTAMP}.txt"
echo "PAGE,DEVICE,PERFORMANCE,ACCESSIBILITY,BEST_PRACTICES,SEO" > "$SUMMARY_FILE"

for page in "${PAGES[@]}"; do
    pageName=$([ "$page" = "/" ] && echo "homepage" || echo "${page//\//_}" | sed 's/^_//')
    
    # Desktop
    echo "Auditing $page (Desktop)..." >> "$SUMMARY_FILE"
    lighthouse "$BASE_URL$page" --output=json --output-path="$REPORT_DIR/${pageName}_desktop_${TIMESTAMP}.json" --chrome-flags="--headless --no-sandbox" 2>/dev/null
    if [ -f "$REPORT_DIR/${pageName}_desktop_${TIMESTAMP}.json" ]; then
        perf=$(jq '.categories.performance.score * 100 | floor' "$REPORT_DIR/${pageName}_desktop_${TIMESTAMP}.json" 2>/dev/null || echo "0")
        echo "$page,Desktop,$perf,--,--,--" >> "$SUMMARY_FILE"
    fi
    
    # Mobile
    echo "Auditing $page (Mobile)..." >> "$SUMMARY_FILE"
    lighthouse "$BASE_URL$page" --output=json --output-path="$REPORT_DIR/${pageName}_mobile_${TIMESTAMP}.json" --emulated-form-factor=mobile --chrome-flags="--headless --no-sandbox" 2>/dev/null
    if [ -f "$REPORT_DIR/${pageName}_mobile_${TIMESTAMP}.json" ]; then
        perf=$(jq '.categories.performance.score * 100 | floor' "$REPORT_DIR/${pageName}_mobile_${TIMESTAMP}.json" 2>/dev/null || echo "0")
        echo "$page,Mobile,$perf,--,--,--" >> "$SUMMARY_FILE"
    fi
done
