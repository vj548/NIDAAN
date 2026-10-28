import pytest
from fastapi.testclient import TestClient
from main import app
from db_session import SessionLocal
from db_models import Complaint, CaseEvent

client = TestClient(app)

def test_database_persistence_across_sessions():
    # 1. Create a new complaint via API
    payload = {
        "institutionId": "I001",
        "institutionName": "Sri Vaikunta Institute of Technology",
        "title": "Unlawful Retention of Faculty Degree Certificates",
        "description": "The institution is withholding original PhD certificates of junior professors in violation of AICTE norms.",
        "category": "Faculty Welfare",
        "priority": "HIGH",
        "suggestedBureauId": "B001",
        "complainantName": "Dr. S. R. Raman",
        "complainantRole": "Faculty"
    }
    create_res = client.post("/api/complaints", json=payload)
    assert create_res.status_code == 200
    created_case = create_res.json()
    case_id = created_case["id"]
    case_num = created_case["caseNumber"]

    # 2. Add a consequential transition with an explicit reason
    trans_res = client.post(
        f"/api/complaints/{case_id}/transition",
        json={
            "newStatus": "ACTION_REQUIRED",
            "reason": "Direct notice issued to institution management to return all certificates within 7 business days.",
            "actorName": "Officer Arjun Sharma"
        }
    )
    assert trans_res.status_code == 200
    assert trans_res.json()["complaint"]["status"] == "ACTION_REQUIRED"

    # 3. Simulate backend restart: Instantiate an entirely fresh, isolated DB session directly from disk
    fresh_session = SessionLocal()
    try:
        persisted_complaint = fresh_session.query(Complaint).filter(Complaint.id == case_id).first()
        assert persisted_complaint is not None, f"Complaint {case_id} failed to persist in database file."
        assert persisted_complaint.case_number == case_num
        assert persisted_complaint.status == "ACTION_REQUIRED"
        assert persisted_complaint.title == payload["title"]

        # Confirm timeline events also persisted
        events = fresh_session.query(CaseEvent).filter(CaseEvent.complaint_id == case_id).all()
        assert len(events) >= 2, "Case timeline events were not persisted across sessions."
        assert any(e.new_status == "ACTION_REQUIRED" for e in events)
        assert any(e.reason == "Direct notice issued to institution management to return all certificates within 7 business days." for e in events)
    finally:
        fresh_session.close()
