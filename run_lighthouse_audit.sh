#!/bin/bash

BASE_URL="http://localhost:3000"
REPORT_DIR="/c/Users/Admin/leveraged-buy-hold/lighthouse-reports"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

mkdir -p "$REPORT_DIR"

PAGES=(
  "/"
  "/dashboard"
  "/watchlist"
  "/portfolio"
  "/history"
  "/assets"
  "/backtest"
  "/sharpe-compare"
  "/simulator"
  "/alerts"
  "/login"
)

echo "Starting Lighthouse Audits..."
echo "Base URL: $BASE_URL"
echo "Report Directory: $REPORT_DIR"
echo ""

# Create summary file
SUMMARY_FILE="$REPORT_DIR/LIGHTHOUSE_SUMMARY_${TIMESTAMP}.txt"

{
  echo "LBH System Frontend - Lighthouse Audit Report"
  echo "Timestamp: $TIMESTAMP"
  echo "==============================================="
  echo ""
  echo "PAGE,DEVICE,PERFORMANCE,ACCESSIBILITY,BEST_PRACTICES,SEO"
} > "$SUMMARY_FILE"

for page in "${PAGES[@]}"; do
    # Clean up page name for file
    if [ "$page" = "/" ]; then
        pageName="homepage"
    else
        pageName="${page//\//_}"
        pageName="${pageName#_}"
    fi

    # Desktop Audit
    echo "Auditing $page (Desktop)..."
    desktopReport="$REPORT_DIR/${pageName}_desktop_${TIMESTAMP}.json"
    
    lighthouse "$BASE_URL$page" --output=json --output-path="$desktopReport" --chrome-flags="--headless --no-sandbox" --throttling-method=devtools 2>/dev/null
    
    if [ -f "$desktopReport" ]; then
        perf=$(jq '.categories.performance.score * 100 | floor' "$desktopReport")
        a11y=$(jq '.categories.accessibility.score * 100 | floor' "$desktopReport")
        best=$(jq '.categories."best-practices".score * 100 | floor' "$desktopReport")
        seo=$(jq '.categories.seo.score * 100 | floor' "$desktopReport")
        
        echo "  Performance: $perf | Accessibility: $a11y | Best Practices: $best | SEO: $seo"
        echo "$page,Desktop,$perf,$a11y,$best,$seo" >> "$SUMMARY_FILE"
    fi

    sleep 2

    # Mobile Audit
    echo "Auditing $page (Mobile)..."
    mobileReport="$REPORT_DIR/${pageName}_mobile_${TIMESTAMP}.json"
    
    lighthouse "$BASE_URL$page" --output=json --output-path="$mobileReport" --emulated-form-factor=mobile --chrome-flags="--headless --no-sandbox" --throttling-method=devtools 2>/dev/null
    
    if [ -f "$mobileReport" ]; then
        perf=$(jq '.categories.performance.score * 100 | floor' "$mobileReport")
        a11y=$(jq '.categories.accessibility.score * 100 | floor' "$mobileReport")
        best=$(jq '.categories."best-practices".score * 100 | floor' "$mobileReport")
        seo=$(jq '.categories.seo.score * 100 | floor' "$mobileReport")
        
        echo "  Performance: $perf | Accessibility: $a11y | Best Practices: $best | SEO: $seo"
        echo "$page,Mobile,$perf,$a11y,$best,$seo" >> "$SUMMARY_FILE"
    fi

    sleep 2
done

echo ""
echo "Lighthouse audits completed!"
echo "Summary saved to: $SUMMARY_FILE"
echo "Reports saved to: $REPORT_DIR"
