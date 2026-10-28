import pytest
from fastapi.testclient import TestClient
from main import app
from db_session import SessionLocal
from db_models import Complaint, CaseEvent, AuditLedgerEntry, CaseRelationship
from seed_eval_dataset import seed_synthetic_evaluation_dataset, GROUND_TRUTH_BENCHMARK_PAIRS
from triage_ai import classify_complaint
from intelligence import evaluate_pair, analyze_relationships_for_case, record_relationship_review
from crypto import verify_audit_chain

client = TestClient(app)

@pytest.fixture(scope="module", autouse=True)
def setup_eval_data():
    """Ensures synthetic evaluation dataset (CC-1001 to CC-1020) is seeded prior to testing."""
    with SessionLocal() as session:
        seed_synthetic_evaluation_dataset(session)

def test_idempotent_seed():
    """Verify that rerunning the seed script does not create duplicate complaint records."""
    with SessionLocal() as session:
        initial_count = session.query(Complaint).filter(Complaint.case_number.like("CC-10%")).count()
        assert initial_count == 20, f"Expected 20 synthetic cases, found {initial_count}."
        
        # Run seed again to verify idempotency
        seed_synthetic_evaluation_dataset(session)
        after_count = session.query(Complaint).filter(Complaint.case_number.like("CC-10%")).count()
        assert after_count == 20, f"Idempotency failed: count changed from 20 to {after_count}."

def test_triage_classification_engine():
    """Verify that all 20 complaints execute through the real classification engine."""
    with SessionLocal() as session:
        cases = session.query(Complaint).filter(Complaint.case_number.like("CC-10%")).all()
        assert len(cases) == 20

        for c in cases:
            pred = classify_complaint(c.title, c.description, c.category)
            assert "suggested_bureau_id" in pred
            assert "suggested_bureau_name" in pred
            assert pred["priority"] in ["CRITICAL", "HIGH", "MEDIUM", "LOW"]
            assert 0.0 <= pred["confidence"] <= 1.0
            assert "sla" in pred

def test_triage_consistency_cc1004_cc1005():
    """
    Verify triage classification consistency for CC-1004 and CC-1005.
    Both complaints involve illegal capitation fees and certificate retention and
    must consistently map to B003 Finance & Accounts with HIGH priority.
    """
    with SessionLocal() as session:
        c1004 = session.query(Complaint).filter_by(case_number="CC-1004").first()
        c1005 = session.query(Complaint).filter_by(case_number="CC-1005").first()
        assert c1004 is not None and c1005 is not None

        pred1004 = classify_complaint(c1004.title, c1004.description, c1004.category)
        pred1005 = classify_complaint(c1005.title, c1005.description, c1005.category)

        # Bureau recommendation must match
        assert pred1004["suggested_bureau_id"] == "B003"
        assert pred1005["suggested_bureau_id"] == "B003"
        assert pred1004["suggested_bureau_name"] == "Finance & Accounts"
        assert pred1005["suggested_bureau_name"] == "Finance & Accounts"

        # Priority level must match
        assert pred1004["priority"] == "HIGH"
        assert pred1005["priority"] == "HIGH"

def test_positive_pairs_evaluation():
    """Evaluate observed relationship scores for all 6 expected positive pairs against 0.75 threshold."""
    with SessionLocal() as session:
        c = {case.case_number: case for case in session.query(Complaint).all()}
        
        # 1. CC-1001 / CC-1002 (Faculty Shortage & Cadre Ratio)
        res_faculty = evaluate_pair(session, c["CC-1001"], c["CC-1002"])
        assert res_faculty["similarityScore"] >= 0.75, f"CC-1001/CC-1002 expected >= 0.75, got {res_faculty['similarityScore']}"
        assert res_faculty["isRecommended"] is True
        assert res_faculty["matchType"] == "STRONG_CANDIDATE"

        # 2. CC-1004 / CC-1005 (Capitation Fee & Certificates)
        res_fee = evaluate_pair(session, c["CC-1004"], c["CC-1005"])
        assert res_fee["similarityScore"] >= 0.75
        assert res_fee["isRecommended"] is True
        assert res_fee["matchType"] == "STRONG_CANDIDATE"

        # 3. CC-1007 / CC-1008 (Exact FDR Escrow Match)
        res_fdr = evaluate_pair(session, c["CC-1007"], c["CC-1008"])
        assert res_fdr["similarityScore"] == 1.0
        assert res_fdr["matchType"] == "EXACT_IDENTIFIER"
        assert res_fdr["isRecommended"] is True
        assert any("FDR" in s for s in res_fdr["matchingSignals"])

        # 4. CC-1010 / CC-1011 (Unapproved Intake)
        res_intake = evaluate_pair(session, c["CC-1010"], c["CC-1011"])
        assert res_intake["similarityScore"] >= 0.75
        assert res_intake["isRecommended"] is True
        assert res_intake["matchType"] == "STRONG_CANDIDATE"

        # 5. CC-1013 / CC-1014 (Hostel Ragging)
        res_ragging = evaluate_pair(session, c["CC-1013"], c["CC-1014"])
        assert res_ragging["similarityScore"] >= 0.75
        assert res_ragging["isRecommended"] is True
        assert res_ragging["matchType"] == "STRONG_CANDIDATE"

        # 6. CC-1016 / CC-1017 (Cross-Institution Ghost PAN Match)
        res_pan = evaluate_pair(session, c["CC-1016"], c["CC-1017"])
        assert res_pan["similarityScore"] == 1.0
        assert res_pan["matchType"] == "EXACT_IDENTIFIER"
        assert res_pan["isRecommended"] is True
        assert any("ABCDE1234F" in s for s in res_pan["matchingSignals"])

def test_exact_identifier_matches():
    """Verify that exact instrument/PAN identifiers decisively trigger EXACT_IDENTIFIER status."""
    with SessionLocal() as session:
        c = {case.case_number: case for case in session.query(Complaint).all()}

        # FDR duplicate instrument match
        eval_fdr = evaluate_pair(session, c["CC-1007"], c["CC-1008"])
        assert eval_fdr["similarityScore"] == 1.0
        assert eval_fdr["matchType"] == "EXACT_IDENTIFIER"
        assert any("FDR-SB-2024-9981" in s for s in eval_fdr["matchingSignals"])

        # Cross-institution PAN duplicate match
        eval_pan = evaluate_pair(session, c["CC-1016"], c["CC-1017"])
        assert eval_pan["similarityScore"] == 1.0
        assert eval_pan["matchType"] == "EXACT_IDENTIFIER"
        assert any("ABCDE1234F" in s for s in eval_pan["matchingSignals"])

def test_same_institution_different_issue_discrimination():
    """
    Verify that complaints at the same institution with disparate regulatory issues
    are correctly suppressed and scored well below the 0.75 recommendation threshold.
    """
    with SessionLocal() as session:
        c = {case.case_number: case for case in session.query(Complaint).all()}

        disparate_same_inst_pairs = [
            ("CC-1001", "CC-1003", "Faculty Shortage vs Fire Safety"),
            ("CC-1004", "CC-1006", "Capitation Fee vs Library Access"),
            ("CC-1007", "CC-1009", "FDR Escrow Fraud vs Hall Ticket Delay"),
            ("CC-1010", "CC-1012", "Unapproved Intake vs Scholarship NSP Delay"),
            ("CC-1013", "CC-1015", "Hostel Ragging vs Canteen Water Hygiene"),
            ("CC-1016", "CC-1018", "Ghost PAN Fraud vs 7th CPC Salary Arrears"),
            ("CC-1019", "CC-1020", "Fake Degree Racket vs Transcript Courier Delay"),
        ]

        for src, tgt, label in disparate_same_inst_pairs:
            res = evaluate_pair(session, c[src], c[tgt])
            assert res["similarityScore"] <= 0.15, f"{src}/{tgt} ({label}) scored {res['similarityScore']}, expected <= 0.15"
            assert res["isRecommended"] is False
            assert res["matchType"] == "BELOW_THRESHOLD"

def test_conflicting_signals_detection():
    """Verify that conflicting regulatory matters generate explicit conflicting signals."""
    with SessionLocal() as session:
        c = {case.case_number: case for case in session.query(Complaint).all()}
        eval_res = evaluate_pair(session, c["CC-1013"], c["CC-1015"])

        # Ragging vs Canteen Water hygiene at NPIT
        assert len(eval_res["conflictingSignals"]) >= 1
        assert any("Disparate regulatory matters" in s for s in eval_res["conflictingSignals"])
        assert eval_res["similarityScore"] == 0.0

def test_negative_comparisons_discrimination():
    """Verify wide margin of discrimination between positive pairs and negative comparisons."""
    with SessionLocal() as session:
        c = {case.case_number: case for case in session.query(Complaint).all()}

        clusters = [
            ("CC-1001", "CC-1002", "CC-1003"),
            ("CC-1004", "CC-1005", "CC-1006"),
            ("CC-1007", "CC-1008", "CC-1009"),
            ("CC-1010", "CC-1011", "CC-1012"),
            ("CC-1013", "CC-1014", "CC-1015"),
            ("CC-1016", "CC-1017", "CC-1018"),
        ]

        for base, pos, neg in clusters:
            pos_eval = evaluate_pair(session, c[base], c[pos])
            neg_eval = evaluate_pair(session, c[base], c[neg])

            margin = pos_eval["similarityScore"] - neg_eval["similarityScore"]
            assert margin >= 0.50, f"Cluster {base}: Positive {pos} ({pos_eval['similarityScore']}) vs Negative {neg} ({neg_eval['similarityScore']}) has insufficient margin {margin}."
            assert neg_eval["isRecommended"] is False

def test_human_review_workflow_and_required_reason():
    """Test human-in-the-loop review actions on suggested relationships and reason requirement."""
    with SessionLocal() as session:
        rel = session.query(CaseRelationship).filter(CaseRelationship.source_case_number == "CC-1004").first()
        if not rel:
            rel = CaseRelationship(
                id="REL-TEST-1004-1005",
                source_id="C1004",
                target_id="C1005",
                source_case_number="CC-1004",
                target_case_number="CC-1005",
                match_type="STRONG_CANDIDATE",
                similarity_score=0.80,
                explanation="Common capitation fee allegations at Kaveri Valley College.",
                review_status="PENDING"
            )
            session.add(rel)
            session.commit()

        rel_id = rel.id

    # 1. Review with missing reason must fail (400)
    fail_res = client.post(
        f"/api/relationships/{rel_id}/decision",
        json={
            "decision": "CONFIRM",
            "reason": "   ",
            "actorName": "Officer Arjun Sharma"
        }
    )
    assert fail_res.status_code == 400
    assert "mandatory" in fail_res.json()["detail"].lower()

    # 2. Review with valid reason must succeed
    succ_res = client.post(
        f"/api/relationships/{rel_id}/decision",
        json={
            "decision": "CONFIRM",
            "reason": "Verified common account ledger fee extortion for certificates across multiple students.",
            "actorName": "Officer Arjun Sharma"
        }
    )
    assert succ_res.status_code == 200
    assert succ_res.json()["relationship"]["reviewStatus"] == "CONFIRMED"

def test_audit_trail_and_cryptographic_integrity():
    """Verify that seeding and evaluation actions maintain cryptographic audit chain integrity."""
    res = client.post("/api/audit/verify")
    assert res.status_code == 200
    data = res.json()
    assert data["intact"] is True, f"Audit chain broken at link {data.get('brokenLedgerId')}: {data.get('message')}"
    assert data["brokenIndex"] == -1

def test_persistence_across_restarts():
    """Verify all 20 synthetic cases persist across fresh database connections."""
    fresh_session = SessionLocal()
    try:
        cases = fresh_session.query(Complaint).filter(Complaint.case_number.like("CC-10%")).all()
        assert len(cases) == 20
        numbers = {c.case_number for c in cases}
        for i in range(1001, 1021):
            assert f"CC-{i}" in numbers, f"Missing case CC-{i}"
    finally:
        fresh_session.close()
