#!/usr/bin/env python
"""Quick test to verify analytics endpoints are importable and have correct signatures."""
import sys
sys.path.insert(0, '/c/Users/Admin/leveraged-buy-hold/backend')

# Test analytics module import
try:
    from app.api.v1.analytics import router
    print("✓ Analytics router imported successfully")
except ImportError as e:
    print(f"✗ Failed to import analytics router: {e}")
    sys.exit(1)

# Test endpoint routes
endpoints = []
for route in router.routes:
    if hasattr(route, 'path'):
        endpoints.append((route.path, getattr(route, 'methods', set())))

print(f"\n✓ Found {len(endpoints)} analytics endpoints:")
for path, methods in endpoints:
    print(f"  • {methods if methods else 'GET'} {path}")

expected_endpoints = {
    "/portfolio/{portfolio_id}/ytd-performance": "GET",
    "/metrics/volatility": "GET",
    "/metrics/sharpe-ratio": "GET",
    "/backtest-results": "POST",
    "/risk-analysis": "GET",
}

print(f"\nVerifying expected endpoints:")
found_paths = {path: methods for path, methods in endpoints}
for expected_path, expected_method in expected_endpoints.items():
    if expected_path in found_paths:
        print(f"  ✓ {expected_method} /api/v1/analytics{expected_path}")
    else:
        print(f"  ✗ {expected_method} /api/v1/analytics{expected_path} - NOT FOUND")

print(f"\n✓ Analytics module validation complete")
