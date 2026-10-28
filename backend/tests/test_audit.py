import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_audit_ledger_integrity_cycle():
    # 1. Restore to ensure pristine state
    rest_res = client.post("/api/audit/restore")
    assert rest_res.status_code == 200

    # 2. Verify pristine chain
    v_res = client.post("/api/audit/verify")
    assert v_res.status_code == 200
    assert v_res.json()["intact"] is True
    assert v_res.json()["brokenIndex"] == -1

    # 3. Simulate unauthorized tamper
    t_res = client.post("/api/audit/tamper")
    assert t_res.status_code == 200
    assert t_res.json()["ok"] is True

    # 4. Verification must detect tamper
    v2_res = client.post("/api/audit/verify")
    assert v2_res.status_code == 200
    assert v2_res.json()["intact"] is False
    assert v2_res.json()["brokenIndex"] >= 0
    assert v2_res.json()["brokenLedgerId"] is not None

    # 5. Restore pristine chain
    rest2_res = client.post("/api/audit/restore")
    assert rest2_res.status_code == 200

    # 6. Verify restored chain is intact
    v3_res = client.post("/api/audit/verify")
    assert v3_res.status_code == 200
    assert v3_res.json()["intact"] is True
