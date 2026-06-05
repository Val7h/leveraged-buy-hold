#!/usr/bin/env pwsh

# Lighthouse Audit Script for LBH System Frontend
# Audits all pages on desktop and mobile views

$ErrorActionPreference = "SilentlyContinue"
$baseUrl = "http://localhost:3000"
$reportDir = "C:\Users\Admin\leveraged-buy-hold\lighthouse-reports"

# Create report directory if it doesn't exist
if (-not (Test-Path $reportDir)) {
    New-Item -ItemType Directory -Path $reportDir -Force | Out-Null
}

$pages = @(
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

$timestamp = (Get-Date -Format "yyyyMMdd_HHmmss")
$results = @()

Write-Host "Starting Lighthouse Audits..." -ForegroundColor Green
Write-Host "Base URL: $baseUrl" -ForegroundColor Yellow
Write-Host "Report Directory: $reportDir" -ForegroundColor Yellow
Write-Host ""

foreach ($page in $pages) {
    # Clean up page name for file
    $pageName = if ($page -eq "/") { "homepage" } else { $page.Trim("/").Replace("/", "_") }

    # Desktop Audit
    Write-Host "Auditing $page (Desktop)..." -ForegroundColor Cyan
    $desktopReport = "$reportDir\${pageName}_desktop_${timestamp}.json"
    $desktopHtml = "$reportDir\${pageName}_desktop_${timestamp}.html"

    try {
        $output = lighthouse "$baseUrl$page" --output=json --output-path="$desktopReport" --chrome-flags="--headless --no-sandbox" --throttling-method=devtools 2>&1
        Move-Item "$desktopReport.json" $desktopReport -Force -ErrorAction SilentlyContinue

        $json = Get-Content $desktopReport | ConvertFrom-Json
        $performance = [math]::Round($json.categories.performance.score * 100)
        $accessibility = [math]::Round($json.categories.accessibility.score * 100)
        $bestPractices = [math]::Round($json.categories.'best-practices'.score * 100)
        $seo = [math]::Round($json.categories.seo.score * 100)

        Write-Host "  Performance: $performance | Accessibility: $accessibility | Best Practices: $bestPractices | SEO: $seo" -ForegroundColor Green

        $results += @{
            page = $page
            device = "Desktop"
            performance = $performance
            accessibility = $accessibility
            bestPractices = $bestPractices
            seo = $seo
            report = $desktopReport
        }
    } catch {
        Write-Host "  Error: $_" -ForegroundColor Red
    }

    # Mobile Audit
    Write-Host "Auditing $page (Mobile)..." -ForegroundColor Cyan
    $mobileReport = "$reportDir\${pageName}_mobile_${timestamp}.json"

    try {
        lighthouse "$baseUrl$page" --output=json --output-path="$mobileReport" --emulated-form-factor=mobile --chrome-flags="--headless --no-sandbox" --throttling-method=devtools 2>&1 | Out-Null
        Move-Item "$mobileReport.json" $mobileReport -Force -ErrorAction SilentlyContinue

        $json = Get-Content $mobileReport | ConvertFrom-Json
        $performance = [math]::Round($json.categories.performance.score * 100)
        $accessibility = [math]::Round($json.categories.accessibility.score * 100)
        $bestPractices = [math]::Round($json.categories.'best-practices'.score * 100)
        $seo = [math]::Round($json.categories.seo.score * 100)

        Write-Host "  Performance: $performance | Accessibility: $accessibility | Best Practices: $bestPractices | SEO: $seo" -ForegroundColor Green

        $results += @{
            page = $page
            device = "Mobile"
            performance = $performance
            accessibility = $accessibility
            bestPractices = $bestPractices
            seo = $seo
            report = $mobileReport
        }
    } catch {
        Write-Host "  Error: $_" -ForegroundColor Red
    }

    Start-Sleep -Seconds 2
}

# Save summary
$summaryFile = "$reportDir\LIGHTHOUSE_SUMMARY_$timestamp.txt"
$results | Format-Table -AutoSize | Out-File $summaryFile

Write-Host ""
Write-Host "Lighthouse audits completed!" -ForegroundColor Green
Write-Host "Summary saved to: $summaryFile" -ForegroundColor Yellow
Write-Host "Reports saved to: $reportDir" -ForegroundColor Yellow
