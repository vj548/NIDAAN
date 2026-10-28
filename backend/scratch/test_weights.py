import sys, os
sys.path.insert(0, os.path.abspath("."))
import re
from db_session import SessionLocal
from seed_eval_dataset import GROUND_TRUTH_BENCHMARK_PAIRS
from db_models import Complaint
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from intelligence import extract_identifiers

TEST_TAXONOMY = {
    "FACULTY_CADRE_RATIO": [
        "cadre ratio", "faculty shortage", "shortage of faculty", "understaffed",
        "student to faculty", "student-to-faculty", "teacher to student", "teacher-student",
        "senior professor", "associate professor", "deficient faculty",
        "deficient teaching staff", "faculty strength", "lack of qualified professors",
        "inadequate teaching staff", "ad-hoc junior instructors"
    ],
    "SALARY_COMPENSATION_ARREARS": [
        "salary arrears", "7th cpc", "pay commission", "pay scale", "pending disbursement",
        "unpaid salary", "delayed payment", "7th central pay commission"
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
        "fake distance mba", "unaccredited executive mba"
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

def sim_extract_topics(title: str, description: str):
    text = f"{title} {description}".lower()
    matched = set()
    for topic, keywords in TEST_TAXONOMY.items():
        for kw in keywords:
            if kw in text:
                matched.add(topic)
                break
    return matched

def sim_evaluate(c1, c2, issue_boost=0.40, inst_boost=0.15, cat_boost=0.10, bur_boost=0.05):
    corpus = [f"{c1.title}. {c1.description}", f"{c2.title}. {c2.description}"]
    vec = TfidfVectorizer(stop_words='english', sublinear_tf=True, min_df=1, ngram_range=(1, 2))
    mat = vec.fit_transform(corpus)
    text_sim = float(cosine_similarity(mat[0:1], mat[1:])[0][0])
    
    t1 = sim_extract_topics(c1.title, c1.description)
    t2 = sim_extract_topics(c2.title, c2.description)
    
    common_topics = t1.intersection(t2)
    has_issue = len(common_topics) > 0
    
    boost = 0.0
    penalty = 0.0
    
    if has_issue:
        boost += issue_boost
    elif t1 and t2:
        penalty += 0.15
        
    same_inst = (c1.institution_id == c2.institution_id)
    if same_inst:
        if has_issue or text_sim >= 0.20:
            boost += inst_boost
        else:
            boost += 0.05
            
    if c1.category.lower() == c2.category.lower():
        if has_issue:
            boost += cat_boost
        else:
            boost += 0.02
            
    if c1.assigned_bureau_id == c2.assigned_bureau_id:
        if has_issue:
            boost += bur_boost
            
    # Identifiers
    id1 = extract_identifiers(f"{c1.title} {c1.description}")
    id2 = extract_identifiers(f"{c2.title} {c2.description}")
    common_fdr = set(id1["fdr"]).intersection(id2["fdr"])
    common_pan = set(id1["pan"]).intersection(id2["pan"])
    
    raw = (text_sim * 0.40 + boost) - penalty
    score = round(min(1.0, max(0.0, raw)), 2)
    
    if common_fdr or common_pan:
        score = 1.0
        
    return score, text_sim, t1, t2

with SessionLocal() as db:
    cases = {c.case_number: c for c in db.query(Complaint).all()}
    print("\n--- SIMULATION 1: issue_boost=0.40, inst_boost=0.15, cat_boost=0.10, bur_boost=0.05 ---")
    all_matched = True
    for p in GROUND_TRUTH_BENCHMARK_PAIRS:
        src = cases[p['source']]
        tgt = cases[p['target']]
        score, text_sim, t1, t2 = sim_evaluate(src, tgt, issue_boost=0.40, inst_boost=0.15, cat_boost=0.10, bur_boost=0.05)
        status = "MATCH" if (score >= 0.75) == p['expected_relationship'] else "MISMATCH"
        if status == "MISMATCH":
            all_matched = False
        print(f"{p['source']}/{p['target']} exp={p['expected_relationship']} got={score} (text={text_sim:.2f}) => {status}")
    print(f"All matched? {all_matched}")
