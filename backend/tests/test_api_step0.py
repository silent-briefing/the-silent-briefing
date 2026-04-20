from __future__ import annotations

from fastapi.testclient import TestClient

from briefing.api.main import app


def test_health_and_version_and_request_id() -> None:
    with TestClient(app) as client:
        h = client.get("/health")
        assert h.status_code == 200
        assert h.json() == {"status": "ok"}

        v = client.get("/version")
        assert v.status_code == 200
        body = v.json()
        assert body["service"] == "silent-briefing-api"
        assert body["version"]

        r = client.get("/health", headers={"X-Request-ID": "trace-abc"})
        assert r.status_code == 200
        assert r.headers.get("X-Request-ID") == "trace-abc"


def test_shared_http_client_present_after_lifespan() -> None:
    with TestClient(app) as client:
        hc = client.app.state.http_client
        assert hc is not None
        assert not hc.is_closed
