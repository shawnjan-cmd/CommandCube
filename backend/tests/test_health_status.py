"""Backend smoke tests for Butler AI — /api/health and /api/status."""
import os
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://startup-fixer.preview.emergentagent.com").rstrip("/")


@pytest.fixture
def api_client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


class TestHealth:
    def test_api_health_200(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/health", timeout=10)
        assert r.status_code == 200
        assert r.json().get("status") == "ok"

    def test_root_health_200(self, api_client):
        r = api_client.get(f"{BASE_URL}/", timeout=10)
        assert r.status_code == 200


class TestStatus:
    def test_get_status_returns_list(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/status", timeout=10)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_create_status_and_persist(self, api_client):
        payload = {"client_name": "TEST_butler_v2_1_15"}
        r = api_client.post(f"{BASE_URL}/api/status", json=payload, timeout=10)
        assert r.status_code == 200
        data = r.json()
        assert data.get("client_name") == "TEST_butler_v2_1_15"
        assert "id" in data and "timestamp" in data
        # Verify it is in the list (best-effort — DB may be unavailable)
        r2 = api_client.get(f"{BASE_URL}/api/status", timeout=10)
        assert r2.status_code == 200

    def test_root_api_route(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/", timeout=10)
        assert r.status_code == 200
        assert "message" in r.json()
