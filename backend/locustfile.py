"""
Locust configuration file for load testing the LBH platform.

Run load tests with:
  locust -f locustfile.py --host=http://localhost:8000

Or with specific user count and spawn rate:
  locust -f locustfile.py --host=http://localhost:8000 -u 100 -r 10 --run-time 5m

Headless mode (no web UI):
  locust -f locustfile.py --host=http://localhost:8000 -u 500 -r 50 --headless --run-time 10m
"""

from load_tests.load_test_suite import (
    NormalLoadUser,
    HeavyLoadUser,
    HealthCheck,
)

# Define user classes to use in load tests
user_classes = [
    NormalLoadUser,
    HeavyLoadUser,
    HealthCheck,
]

# Custom settings
settings = {
    "default_headless_spawn_rate": 50,
    "default_headless_users": 100,
    "headless": False,  # Set to True for CI/CD environments
}
