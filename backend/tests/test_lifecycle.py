import pytest
from fastapi.testclient import TestClient
from main import app
from db_session import SessionLocal
from db_models import Complaint, CaseEvent

client = TestClient(app)

def test_allowed_state_transitions():
    # Fetch an active case
    res = client.get("/api/complaints/C001")
    assert res.status_code == 200
    complaint = res.json()
    curr_status = complaint["status"]

    # Transition to ACTION_REQUIRED with reason
    t_res = client.post(
        "/api/complaints/C001/transition",
        json={
            "newStatus": "ACTION_REQUIRED",
            "reason": "Administrative inquiry indicates non-compliance with faculty norms.",
            "actorName": "Officer Arjun Sharma",
            "actorRole": "OFFICER"
        }
    )
    assert t_res.status_code == 200
    assert t_res.json()["complaint"]["status"] == "ACTION_REQUIRED"

    # Transition back to UNDER_REVIEW
    t2_res = client.post(
        "/api/complaints/C001/transition",
        json={
            "newStatus": "UNDER_REVIEW",
            "reason": "Institution submitted response explanation.",
            "actorName": "Officer Arjun Sharma"
        }
    )
    assert t2_res.status_code == 200
    assert t2_res.json()["complaint"]["status"] == "UNDER_REVIEW"

def test_consequential_transition_requires_reason():
    # Attempting to resolve without reason should fail with 400 Bad Request
    res = client.post(
        "/api/complaints/C001/transition",
        json={
            "newStatus": "RESOLVED",
            "reason": "   ",  # empty whitespace
            "actorName": "Officer Arjun Sharma"
        }
    )
    assert res.status_code == 400
    assert "mandatory written administrative reason" in res.json()["detail"].lower()

def test_invalid_transition_rejected():
    # Cannot jump directly from RECEIVED to CLOSED without review
    # Let's test an illegal transition
    res = client.post(
        "/api/complaints/C001/transition",
        json={
            "newStatus": "TRIAGE_PENDING",
            "reason": "Invalid test attempt",
            "actorName": "Officer Arjun Sharma"
        }
    )
    # C001 is currently UNDER_REVIEW, allowed targets do not include TRIAGE_PENDING
    assert res.status_code == 400
    assert "invalid state transition" in res.json()["detail"].lower()

def test_inter_bureau_transfer():
    res = client.post(
        "/api/complaints/C002/transfer",
        json={
            "targetBureauId": "B002",
            "reason": "Lab building deficiency requires Infrastructure Cell on-site inspection.",
            "actorName": "Officer Arjun Sharma"
        }
    )
    assert res.status_code == 200
    data = res.json()["complaint"]
    assert data["assignedBureauId"] == "B002"
    assert data["status"] == "CROSS_BUREAU_REVIEW"

def test_case_events_recorded():
    res = client.get("/api/complaints/C001/events")
    assert res.status_code == 200
    events = res.json()
    assert len(events) >= 1
    assert any(ev["eventType"] == "STATE_TRANSITION" for ev in events)
