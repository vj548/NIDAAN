import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_sla_summary_calculation():
    res = client.get("/api/sla/summary")
    assert res.status_code == 200
    data = res.json()

    assert "overallComplianceRate" in data
    assert "totalActive" in data
    assert "totalResolved" in data
    assert "atRiskCount" in data
    assert "breachedCount" in data
    assert "bureauMetrics" in data
    assert len(data["bureauMetrics"]) >= 6

    # Verify bureau metrics structure
    bureau = data["bureauMetrics"][0]
    assert "bureauName" in bureau
    assert "complianceRate" in bureau
    assert "activeCases" in bureau
    assert "breachedCount" in bureau

def test_sla_urgency_in_complaint_detail():
    res = client.get("/api/complaints/C001")
    assert res.status_code == 200
    data = res.json()
    assert "sla" in data
    assert "slaState" in data["sla"]
    assert "hoursRemaining" in data["sla"]
    assert "daysRemaining" in data["sla"]
