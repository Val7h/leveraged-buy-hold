"""
Load Testing Suite for LBH Platform
Tests concurrent users, response times, throughput, and system stability under load.
Uses Locust framework for realistic user behavior simulation.
"""

import time
import json
from typing import Dict, List
from locust import HttpUser, task, between, TaskSet, events
from locust.clients import ResponseContextManager
import statistics


class BaseUser(HttpUser):
    """Base user class with common setup."""

    wait_time = between(0.5, 2.0)  # Random wait between 0.5-2 seconds

    def on_start(self):
        """Called when a simulated user starts."""
        self.token = None
        self.user_email = f"loadtest_{int(time.time() * 1000)}@example.com"
        self.register_and_login()

    def register_and_login(self):
        """Register a test user and get JWT tokens."""
        # Register
        response = self.client.post(
            "/api/v1/auth/register",
            json={
                "email": self.user_email,
                "password": "LoadTest123!",
                "full_name": "Load Test User",
                "risk_profile": "balanced",
            },
            catch_response=True
        )

        if response.status_code == 201:
            response.success()
        elif response.status_code == 400:  # User already exists
            response.success()
        else:
            response.failure(f"Registration failed: {response.status_code}")

        # Login
        response = self.client.post(
            "/api/v1/auth/login",
            data={
                "username": self.user_email,
                "password": "LoadTest123!",
            },
            catch_response=True
        )

        if response.status_code == 200:
            try:
                data = response.json()
                self.token = data.get("access_token")
                response.success()
            except Exception as e:
                response.failure(f"Failed to parse login response: {e}")
        else:
            response.failure(f"Login failed: {response.status_code}")


class AuthenticationTasks(TaskSet):
    """Authentication-related tasks."""

    @task(1)
    def get_current_user(self):
        """Fetch current user profile."""
        if not self.user.token:
            return

        self.client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {self.user.token}"},
            name="/api/v1/auth/me"
        )

    @task(1)
    def refresh_token(self):
        """Refresh access token."""
        if not self.user.token:
            return

        self.client.post(
            "/api/v1/auth/refresh",
            headers={"Authorization": f"Bearer {self.user.token}"},
            name="/api/v1/auth/refresh"
        )


class PortfolioTasks(TaskSet):
    """Portfolio-related tasks."""

    @task(2)
    def get_portfolio(self):
        """Fetch user portfolio."""
        if not self.user.token:
            return

        self.client.get(
            "/api/v1/portfolio",
            headers={"Authorization": f"Bearer {self.user.token}"},
            name="/api/v1/portfolio"
        )

    @task(1)
    def get_portfolio_summary(self):
        """Fetch portfolio summary/stats."""
        if not self.user.token:
            return

        self.client.get(
            "/api/v1/portfolio/summary",
            headers={"Authorization": f"Bearer {self.user.token}"},
            name="/api/v1/portfolio/summary"
        )


class AssetTasks(TaskSet):
    """Asset-related tasks."""

    @task(3)
    def get_assets(self):
        """Fetch available assets."""
        self.client.get(
            "/api/v1/assets",
            name="/api/v1/assets"
        )

    @task(1)
    def search_assets(self):
        """Search for specific assets."""
        self.client.get(
            "/api/v1/assets?search=AAPL",
            name="/api/v1/assets?search=*"
        )


class AlertsTasks(TaskSet):
    """Alerts-related tasks."""

    @task(1)
    def get_alerts(self):
        """Fetch user alerts."""
        if not self.user.token:
            return

        self.client.get(
            "/api/v1/alerts",
            headers={"Authorization": f"Bearer {self.user.token}"},
            name="/api/v1/alerts"
        )


class WatchlistTasks(TaskSet):
    """Watchlist-related tasks."""

    @task(1)
    def get_watchlist(self):
        """Fetch user watchlist."""
        if not self.user.token:
            return

        self.client.get(
            "/api/v1/watchlist",
            headers={"Authorization": f"Bearer {self.user.token}"},
            name="/api/v1/watchlist"
        )


class HealthCheck(HttpUser):
    """Health check task - monitors system health."""

    wait_time = between(1, 3)

    @task
    def health_check(self):
        """Check system health."""
        self.client.get(
            "/api/health",
            name="/api/health"
        )


class NormalLoadUser(BaseUser):
    """Normal user workflow - typical load test."""

    tasks = [
        AuthenticationTasks,
        PortfolioTasks,
        AssetTasks,
        AlertsTasks,
        WatchlistTasks,
    ]

    task_weights = [1, 3, 2, 1, 1]  # Portfolio is 3x, Assets 2x, others 1x


class HeavyLoadUser(BaseUser):
    """Heavy load user - more aggressive task execution."""

    wait_time = between(0.1, 0.5)  # Shorter waits = more requests

    tasks = [
        AuthenticationTasks,
        PortfolioTasks,
        AssetTasks,
    ]

    task_weights = [1, 5, 3]  # Heavier weighting to portfolio tasks


# ─────────────────────────────────────────────────────────────────────────────
# Event handlers for metrics collection
# ─────────────────────────────────────────────────────────────────────────────

response_times: Dict[str, List[float]] = {}
errors: List[Dict] = []


@events.request.add_listener
def record_response_time(request_type, name, response_time, response_length, response, context, exception, **kwargs):
    """Record response times for analysis."""
    if name not in response_times:
        response_times[name] = []

    response_times[name].append(response_time)

    # Record errors
    if exception:
        errors.append({
            "endpoint": name,
            "error": str(exception),
            "timestamp": time.time()
        })


@events.test_stop.add_listener
def on_test_stop(environment, **kwargs):
    """Called when load test stops - print results."""
    print("\n" + "=" * 80)
    print("LOAD TEST RESULTS SUMMARY")
    print("=" * 80)

    print("\nResponse Time Statistics (ms):")
    print("-" * 80)

    all_times = []
    for endpoint, times in sorted(response_times.items()):
        all_times.extend(times)

        if times:
            print(f"\n{endpoint}:")
            print(f"  Count:    {len(times)}")
            print(f"  Min:      {min(times):.2f}ms")
            print(f"  Max:      {max(times):.2f}ms")
            print(f"  Avg:      {statistics.mean(times):.2f}ms")
            print(f"  Median:   {statistics.median(times):.2f}ms")
            if len(times) > 1:
                print(f"  StdDev:   {statistics.stdev(times):.2f}ms")

            # Percentiles
            sorted_times = sorted(times)
            p95_idx = int(len(sorted_times) * 0.95)
            p99_idx = int(len(sorted_times) * 0.99)
            print(f"  P95:      {sorted_times[p95_idx]:.2f}ms")
            print(f"  P99:      {sorted_times[p99_idx]:.2f}ms")

    if all_times:
        print(f"\n{'Overall':<40}:")
        print(f"  Total Requests: {len(all_times)}")
        print(f"  Avg Response:   {statistics.mean(all_times):.2f}ms")
        print(f"  Median Response: {statistics.median(all_times):.2f}ms")
        sorted_times = sorted(all_times)
        p95_idx = int(len(sorted_times) * 0.95)
        p99_idx = int(len(sorted_times) * 0.99)
        print(f"  P95:            {sorted_times[p95_idx]:.2f}ms")
        print(f"  P99:            {sorted_times[p99_idx]:.2f}ms")

    if errors:
        print(f"\n{'ERROR SUMMARY':<40}:")
        print(f"  Total Errors: {len(errors)}")
        error_counts = {}
        for error in errors:
            endpoint = error["endpoint"]
            error_counts[endpoint] = error_counts.get(endpoint, 0) + 1

        for endpoint, count in sorted(error_counts.items()):
            print(f"  {endpoint}: {count}")

    print("\n" + "=" * 80)
    print("END OF LOAD TEST REPORT")
    print("=" * 80 + "\n")


__all__ = [
    "NormalLoadUser",
    "HeavyLoadUser",
    "HealthCheck",
    "response_times",
    "errors",
]
