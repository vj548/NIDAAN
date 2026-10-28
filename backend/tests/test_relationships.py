import pytest
from fastapi.testclient import TestClient
from main import app
from db_session import SessionLocal
from db_models import CaseRelationship

client = TestClient(app)

def test_relationship_candidates_generation():
    res = client.get("/api/complaints/C001/candidates")
    assert res.status_code == 200
    data = res.json()
    assert data["sourceCaseId"] == "C001"
    assert data["algorithmVersion"] == "v1.4-tfidf-hybrid"
    assert data["threshold"] == 0.75
    assert len(data["candidates"]) > 0

    # Every candidate must have matching signals, conflicting signals, and explanation
    top_cand = data["candidates"][0]
    assert "similarityScore" in top_cand
    assert "matchingSignals" in top_cand
    assert "conflictingSignals" in top_cand
    assert "explanation" in top_cand
    assert "isRecommended" in top_cand

def test_relationship_review_workflow():
    # Fetch existing relationships
    res = client.get("/api/relationships")
    assert res.status_code == 200
    rels = res.json()
    assert len(rels) > 0
    rel_id = rels[0]["id"]

    # Submit confirmation review with reason
    rev_res = client.post(
        f"/api/relationships/{rel_id}/decision",
        json={
            "decision": "CONFIRM",
            "reason": "Verified common FDR reuse across both engineering departments.",
            "actorName": "Officer Arjun Sharma"
        }
    )
    assert rev_res.status_code == 200
    assert rev_res.json()["relationship"]["reviewStatus"] == "CONFIRMED"

def test_relationship_review_missing_reason_rejected():
    res = client.get("/api/relationships")
    rel_id = res.json()[0]["id"]

    rev_res = client.post(
        f"/api/relationships/{rel_id}/decision",
        json={
            "decision": "DISMISS",
            "reason": "  ",
            "actorName": "Officer Arjun Sharma"
        }
    )
    assert rev_res.status_code == 400
    assert "mandatory" in rev_res.json()["detail"].lower()
