import re
import datetime
import json
from typing import List, Dict, Any, Optional, Set
from sqlalchemy.orm import Session
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from db_models import Complaint, CaseRelationship, AuditLedgerEntry, Notification
from crypto import compute_audit_hash

ALGORITHM_VERSION = "v2.1-issue-dominant-congruence"
RECOMMENDATION_THRESHOLD = 0.75

# Fine-grained regulatory issue taxonomy
ISSUE_TAXONOMY = {
    "FACULTY_CADRE_RATIO": [
        "cadre ratio", "faculty shortage", "shortage of faculty", "understaffed",
        "student to faculty", "student-to-faculty", "teacher to student", "teacher-student",
        "senior professor", "associate professor", "deficient faculty",
        "deficient teaching staff", "faculty strength", "lack of qualified professors",
        "inadequate teaching staff", "ad-hoc junior instructors"
    ],
    "SALARY_COMPENSATION_ARREARS": [
        "salary arrears", "7th cpc", "pay commission", "pay scale", "pending disbursement",
        "unpaid salary", "delayed payment", "7th central pay commission", "revised basic pay"
    ],
    "FEE_CAPITATION_RETENTION": [
        "capitation", "retention of original", "withheld certificate", "withholding",
        "original marksheet", "return original", "penalty fee", "unapproved fee",
        "extortionate fee", "caution fee", "retaining original", "transfer certificate",
        "caution money"
    ],
    "FDR_ESCROW_FRAUD": [
        "fdr", "fixed deposit", "lien", "escrow", "encumbered", "dual encumbrance",
        "pledged with", "joint lien", "security deposit", "statutory deposit", "escrow funds"
    ],
    "UNAPPROVED_INTAKE_COURSE": [
        "unapproved course", "unapproved program", "unapproved branch", "unapproved diploma",
        "unauthorized admission", "sanctioned intake", "excess intake", "intake exceeded",
        "excess seats", "without approval", "unapproved b.tech", "unapproved off-campus",
        "fake distance mba", "unaccredited executive mba", "forged aicte approval"
    ],
    "RAGGING_HOSTEL_HARASSMENT": [
        "ragging", "harassment", "intimidation", "physical abuse", "anti-ragging",
        "anti-ragging squad", "anti-ragging committee", "hostel warden", "hostel block",
        "late-night intimidation"
    ],
    "FACULTY_GHOST_PAN": [
        "pan", "ghost faculty", "dual appointment", "concurrent salary",
        "multiple institutions", "drawing salary at another", "concurrently drawing"
    ],
    "INFRASTRUCTURE_SAFETY": [
        "fire safety", "fire extinguisher", "electrical hazard", "cabling",
        "noc expired", "workshop safety"
    ],
    "CAMPUS_AMENITY_SERVICE": [
        "canteen", "water filter", "drinking water", "library books", "digital library",
        "admit card delay", "hall ticket delay", "scholarship biometric", "official academic transcripts",
        "courier surcharge"
    ]
}

def extract_identifiers(text: str) -> Dict[str, List[str]]:
    """Extracts explicit identifiers such as bank FDR numbers, PAN patterns, course codes, or faculty names."""
    fdr_matches = re.findall(r'\b(?:FDR|FD)[-\s]?(?:[A-Za-z]{1,4}[-\s]?)?[0-9]{4,12}(?:-[0-9]{2,6})?\b', text, re.IGNORECASE)
    pan_matches = re.findall(r'\b[A-Z]{5}[0-9]{4}[A-Z]\b', text)
    reg_matches = re.findall(r'\b(?:REG|ENR|ROLL)[-\s]?[0-9]{4,12}\b', text, re.IGNORECASE)
    return {
        "fdr": [m.upper().replace(" ", "") for m in fdr_matches],
        "pan": [m.upper() for m in pan_matches],
        "reg": [m.upper() for m in reg_matches]
    }

def extract_issue_topics(title: str, description: str) -> Set[str]:
    """Extracts fine-grained regulatory issue topics from complaint title and description."""
    text = f"{title} {description}".lower()
    matched_topics = set()
    for topic, keywords in ISSUE_TAXONOMY.items():
        for kw in keywords:
            if kw in text:
                matched_topics.add(topic)
                break
    return matched_topics

def evaluate_pair(db: Session, source_case: Complaint, target_case: Complaint, threshold: float = RECOMMENDATION_THRESHOLD) -> Dict[str, Any]:
    """Evaluates relationship intelligence metrics between two specific complaints."""
    candidates = analyze_relationships_for_case(db, source_case, threshold=threshold)
    match = next((c for c in candidates if c["targetCaseId"] == target_case.id or c["targetCaseNumber"] == target_case.case_number), None)
    if match:
        return match
    return {
        "targetCaseId": target_case.id,
        "targetCaseNumber": target_case.case_number,
        "similarityScore": 0.0,
        "isRecommended": False,
        "matchingSignals": [],
        "conflictingSignals": ["Unrelated case"],
        "explanation": "No correlation found between cases."
    }

def analyze_relationships_for_case(
    db: Session,
    source_case: Complaint,
    threshold: float = RECOMMENDATION_THRESHOLD
) -> List[Dict[str, Any]]:
    """
    Analyzes a given complaint against all other complaints in the database.
    Weights issue-level congruence, n-gram TF-IDF, exact entity matches,
    and applies contextual gating to prevent broad-institution false positives.
    """
    other_cases = db.query(Complaint).filter(Complaint.id != source_case.id).all()
    if not other_cases:
        return []

    # Prepare corpus for TF-IDF
    corpus = [f"{source_case.title}. {source_case.description}"]
    for c in other_cases:
        corpus.append(f"{c.title}. {c.description}")

    try:
        vectorizer = TfidfVectorizer(
            stop_words='english',
            sublinear_tf=True,
            min_df=1,
            ngram_range=(1, 2),
            token_pattern=r'(?u)\b[a-zA-Z0-9_-]{2,}\b'
        )
        tfidf_matrix = vectorizer.fit_transform(corpus)
        sim_scores = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:])[0]
    except Exception:
        sim_scores = [0.0] * len(other_cases)

    source_idents = extract_identifiers(f"{source_case.title} {source_case.description}")
    source_topics = extract_issue_topics(source_case.title, source_case.description)
    candidates = []

    for idx, target_case in enumerate(other_cases):
        text_sim = float(sim_scores[idx])
        target_idents = extract_identifiers(f"{target_case.title} {target_case.description}")
        target_topics = extract_issue_topics(target_case.title, target_case.description)

        matching_signals = []
        conflicting_signals = []
        boost = 0.0
        penalty = 0.0

        # 1. Fine-Grained Issue Topic Congruence
        common_topics = source_topics.intersection(target_topics)
        has_issue_congruence = len(common_topics) > 0

        if has_issue_congruence:
            topics_str = ", ".join([t.replace("_", " ").title() for t in common_topics])
            matching_signals.append(f"Congruent core regulatory issue: {topics_str}")
            boost += 0.40
        elif source_topics and target_topics:
            src_str = ", ".join([t.replace("_", " ").title() for t in source_topics])
            tgt_str = ", ".join([t.replace("_", " ").title() for t in target_topics])
            conflicting_signals.append(f"Disparate regulatory matters: {src_str} vs {tgt_str}")
            penalty += 0.15

        # 2. Institution Match (Gated by issue congruence)
        same_institution = (source_case.institution_id == target_case.institution_id)
        if same_institution:
            if has_issue_congruence or text_sim >= 0.20:
                matching_signals.append(f"Identical institution: {source_case.institution_name} ({source_case.institution_id})")
                boost += 0.15
            else:
                matching_signals.append(f"Same institution campus ({source_case.institution_name}) but distinct operational matters")
                boost += 0.05
        else:
            conflicting_signals.append(f"Different institutions: {source_case.institution_name} vs {target_case.institution_name}")

        # 3. Category Match
        if source_case.category.lower() == target_case.category.lower():
            if has_issue_congruence:
                matching_signals.append(f"Same grievance category: {source_case.category}")
                boost += 0.10
            else:
                boost += 0.02
        else:
            conflicting_signals.append(f"Different grievance categories: {source_case.category} vs {target_case.category}")

        # 4. Bureau Alignment
        if source_case.assigned_bureau_id == target_case.assigned_bureau_id:
            if has_issue_congruence:
                matching_signals.append(f"Same assigned bureau: {source_case.assigned_bureau_name}")
                boost += 0.05
        else:
            conflicting_signals.append(f"Cross-bureau jurisdiction: {source_case.assigned_bureau_name} vs {target_case.assigned_bureau_name}")

        # 5. Exact Identifier Matches (Decisive signals)
        common_fdr = set(source_idents["fdr"]).intersection(target_idents["fdr"])
        if common_fdr:
            matching_signals.append(f"Exact matching FDR certificate instrument: {', '.join(common_fdr)}")
            boost += 0.50

        common_pan = set(source_idents["pan"]).intersection(target_idents["pan"])
        if common_pan:
            matching_signals.append(f"Exact matching faculty PAN: {', '.join(common_pan)}")
            boost += 0.45

        # 6. Natural Language TF-IDF Similarity
        text_weight = text_sim * 0.40
        if text_sim >= 0.30:
            matching_signals.append(f"Substantive natural language similarity in grievance narrative: {int(text_sim * 100)}%")

        # 7. Composite Score Calculation
        raw_composite = (text_weight + boost) - penalty
        composite_score = round(min(1.0, max(0.0, raw_composite)), 2)

        # Force exact identifier matches to high confidence
        if common_fdr:
            composite_score = 1.0
            match_type = "EXACT_IDENTIFIER"
            explanation = f"Definitive duplicate instrument linkage: Both filings reference the exact same bank FDR certificate ({', '.join(common_fdr)})."
        elif common_pan:
            composite_score = max(composite_score, 0.95)
            match_type = "EXACT_IDENTIFIER"
            explanation = f"Cross-institutional duplicate detection: Identical faculty PAN ({', '.join(common_pan)}) flagged across distinct college appointments."
        elif composite_score >= threshold:
            match_type = "STRONG_CANDIDATE"
            explanation = f"Strong candidate relationship for officer review. Congruent regulatory violation at {source_case.institution_name} ({int(composite_score * 100)}% match)."
        elif composite_score >= 0.50:
            match_type = "POSSIBLE_RELATION"
            explanation = f"Possible relation based on overlapping institutional parameters ({int(composite_score * 100)}% match)."
        else:
            match_type = "BELOW_THRESHOLD"
            explanation = f"Substantive differences in grievance subject matter ({int(composite_score * 100)}% match)."

        candidates.append({
            "targetCaseId": target_case.id,
            "targetCaseNumber": target_case.case_number,
            "targetTitle": target_case.title,
            "targetInstitution": target_case.institution_name,
            "targetCategory": target_case.category,
            "targetStatus": target_case.status,
            "targetBureau": target_case.assigned_bureau_name,
            "similarityScore": composite_score,
            "textSimilarity": round(text_sim, 2),
            "matchType": match_type,
            "matchingSignals": matching_signals,
            "conflictingSignals": conflicting_signals,
            "explanation": explanation,
            "algorithmVersion": ALGORITHM_VERSION,
            "recommendationThreshold": threshold,
            "isRecommended": composite_score >= threshold
        })

    # Sort descending by composite score
    candidates.sort(key=lambda x: x["similarityScore"], reverse=True)
    return candidates


def record_relationship_review(
    db: Session,
    relationship_id: str,
    decision: str,  # CONFIRM, DISMISS, FLAGGED
    reason: str,
    actor_name: str
) -> CaseRelationship:
    """
    Records an authorized officer's decision on a suggested complaint relationship.
    Requires a non-empty written justification reason.
    Writes an immutable entry to the cryptographic audit ledger.
    Does NOT automatically merge cases, maintaining human-in-the-loop oversight.
    """
    if not reason or not reason.strip():
        raise ValueError("An explicit written reason is mandatory before confirming or dismissing a relationship candidate.")

    rel = db.query(CaseRelationship).filter(CaseRelationship.id == relationship_id).first()
    if not rel:
        raise KeyError(f"Case relationship link '{relationship_id}' not found.")

    valid_decisions = ["CONFIRMED", "DISMISSED", "FLAGGED"]
    upper_dec = decision.upper()
    if upper_dec == "CONFIRM":
        upper_dec = "CONFIRMED"
    elif upper_dec == "DISMISS":
        upper_dec = "DISMISSED"
    elif upper_dec == "FLAG":
        upper_dec = "FLAGGED"

    if upper_dec not in valid_decisions:
        raise ValueError(f"Invalid decision '{decision}'. Must be one of: CONFIRMED, DISMISSED, FLAGGED.")

    now = datetime.datetime.utcnow()
    rel.review_status = upper_dec
    rel.reviewed_by = actor_name
    rel.review_reason = reason.strip()

    detail = (
        f"Officer relationship decision: {upper_dec} for link {rel.source_case_number} ↔ {rel.target_case_number}. "
        f"Match type: {rel.match_type} (Score: {rel.similarity_score}). Written reason: '{reason.strip()}'."
    )

    # Cryptographic Audit Ledger Entry
    last_entry = db.query(AuditLedgerEntry).order_by(AuditLedgerEntry.created_at.desc(), AuditLedgerEntry.id.desc()).first()
    prev_hash = last_entry.current_hash if last_entry else "0000000000000000"
    ledger_count = db.query(AuditLedgerEntry).count() + 1
    ledger_id = f"#{1000 + ledger_count}"

    current_hash = compute_audit_hash("RELATIONSHIP_REVIEWED", detail, prev_hash)
    audit_entry = AuditLedgerEntry(
        id=f"AUD-{int(now.timestamp() * 1000)}",
        ledger_id=ledger_id,
        actor_name=actor_name,
        event_type="RELATIONSHIP_REVIEWED",
        complaint_id=rel.source_id,
        case_number=rel.source_case_number,
        detail=detail,
        previous_hash=prev_hash,
        current_hash=current_hash,
        created_at=now
    )
    db.add(audit_entry)

    # In-App Notification
    notif = Notification(
        id=f"NOTIF-{int(now.timestamp() * 1000)}",
        recipient_id="OFFICER_REVIEW",
        type="RELATIONSHIP_DECISION",
        message=f"Relationship link between {rel.source_case_number} and {rel.target_case_number} reviewed as {upper_dec} by {actor_name}.",
        complaint_id=rel.source_id,
        case_number=rel.source_case_number,
        created_at=now
    )
    db.add(notif)

    db.commit()
    db.refresh(rel)
    return rel
