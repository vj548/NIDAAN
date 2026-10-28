import json
from db_session import SessionLocal
from db_models import Complaint
from triage_ai import classify_complaint
from intelligence import evaluate_pair, ALGORITHM_VERSION, RECOMMENDATION_THRESHOLD
from seed_eval_dataset import GROUND_TRUTH_BENCHMARK_PAIRS

# Historical scores before v2.0 improvements (recorded under baseline model)
HISTORICAL_SCORES = {
    "CC-1001 / CC-1002": {"score": 0.47, "decision": "BELOW_THRESHOLD (False Negative)"},
    "CC-1004 / CC-1005": {"score": 0.54, "decision": "POSSIBLE_RELATION"},
    "CC-1007 / CC-1008": {"score": 1.00, "decision": "EXACT_IDENTIFIER (True Positive)"},
    "CC-1010 / CC-1011": {"score": 0.57, "decision": "POSSIBLE_RELATION"},
    "CC-1013 / CC-1014": {"score": 0.57, "decision": "POSSIBLE_RELATION"},
    "CC-1001 / CC-1003": {"score": 0.23, "decision": "BELOW_THRESHOLD (True Negative)"},
    "CC-1004 / CC-1006": {"score": 0.23, "decision": "BELOW_THRESHOLD (True Negative)"},
    "CC-1007 / CC-1009": {"score": 0.23, "decision": "BELOW_THRESHOLD (True Negative)"},
    "CC-1010 / CC-1012": {"score": 0.23, "decision": "BELOW_THRESHOLD (True Negative)"},
    "CC-1013 / CC-1015": {"score": 0.48, "decision": "BELOW_THRESHOLD (High Ambiguity Risk)"},
}

def run_synthetic_evaluation():
    db = SessionLocal()
    print("=" * 85)
    print(f"CASECONNECT AI — EVALUATION BENCHMARK & DISCRIMINATION REPORT ({ALGORITHM_VERSION})")
    print(f"Decision Threshold: {RECOMMENDATION_THRESHOLD}")
    print("=" * 85)

    cases = {c.case_number: c for c in db.query(Complaint).all()}

    # 1. Triage Classification
    print("\n" + "=" * 50)
    print("1. AI TRIAGE CLASSIFICATION SUMMARY (20 SYNTHETIC CASES)")
    print("=" * 50)
    triage_results = {}
    for i in range(1001, 1021):
        cnum = f"CC-{i}"
        case = cases.get(cnum)
        if not case:
            continue
        pred = classify_complaint(case.title, case.description, case.category)
        triage_results[cnum] = pred
        print(f"[{cnum}] {case.title[:55]}...")
        print(f"   -> Bureau: {pred['suggested_bureau_name']:<24} Priority: {pred['priority']:<8} Confidence: {pred['confidence']}")
        print(f"   -> Matched Tokens: {pred['matched_keywords'][:4]}")

    # 2. Relationship Evaluation on Ground-Truth Pairs
    print("\n" + "=" * 50)
    print("2. RELATIONSHIP INTELLIGENCE EVALUATION & COMPARISON")
    print("=" * 50)

    tp, fp, tn, fn = 0, 0, 0, 0
    pair_reports = []

    print(f"{'Pair':<20} | {'Expected':<8} | {'Before':<6} | {'After':<6} | {'TextSim':<7} | {'Match Type':<16} | {'Outcome'}")
    print("-" * 95)

    for item in GROUND_TRUTH_BENCHMARK_PAIRS:
        src = cases.get(item["source"])
        tgt = cases.get(item["target"])
        pair_key = f"{item['source']} / {item['target']}"
        if not src or not tgt:
            print(f"Skipping {pair_key} (missing case)")
            continue

        eval_res = evaluate_pair(db, src, tgt, threshold=RECOMMENDATION_THRESHOLD)
        after_score = eval_res["similarityScore"]
        is_rec = eval_res["isRecommended"]
        expected = item["expected_relationship"]

        hist_info = HISTORICAL_SCORES.get(pair_key, {"score": "N/A"})
        before_score = str(hist_info["score"])

        # Metric classification
        if expected and is_rec:
            tp += 1
            outcome = "TRUE POSITIVE (Hit)"
        elif not expected and not is_rec:
            tn += 1
            outcome = "TRUE NEGATIVE (Correct Rejection)"
        elif not expected and is_rec:
            fp += 1
            outcome = "FALSE POSITIVE (Error)"
        else:
            fn += 1
            outcome = "FALSE NEGATIVE (Miss)"

        pair_reports.append({
            "pair": pair_key,
            "label": item["label"],
            "type": item["type"],
            "expected": expected,
            "before_score": before_score,
            "after_score": after_score,
            "text_sim": eval_res.get("textSimilarity", 0.0),
            "match_type": eval_res["matchType"],
            "is_recommended": is_rec,
            "matching_signals": eval_res["matchingSignals"],
            "conflicting_signals": eval_res["conflictingSignals"],
            "explanation": eval_res["explanation"],
            "outcome": outcome
        })

        expected_str = "SIMILAR" if expected else "DISTINCT"
        print(f"{pair_key:<20} | {expected_str:<8} | {before_score:<6} | {after_score:<6.2f} | {eval_res.get('textSimilarity', 0.0):<7.2f} | {eval_res['matchType']:<16} | {outcome}")

    # 3. Detailed Signal Breakdown
    print("\n" + "=" * 50)
    print("3. EXPLANATION & CONFLICTING SIGNALS BREAKDOWN")
    print("=" * 50)
    for rep in pair_reports:
        print(f"\n[{rep['pair']}] {rep['label']} (Outcome: {rep['outcome']})")
        print(f"   Score: {rep['after_score']} (Text: {rep['text_sim']}) | Match: {rep['match_type']}")
        print(f"   Matching Signals ({len(rep['matching_signals'])}): {rep['matching_signals']}")
        print(f"   Conflicting Signals ({len(rep['conflicting_signals'])}): {rep['conflicting_signals']}")
        print(f"   Explanation: {rep['explanation']}")

    # 4. Statistical Metrics (Precision, Recall, F1)
    precision = (tp / (tp + fp)) if (tp + fp) > 0 else 0.0
    recall = (tp / (tp + fn)) if (tp + fn) > 0 else 0.0
    f1 = (2 * precision * recall / (precision + recall)) if (precision + recall) > 0 else 0.0
    accuracy = ((tp + tn) / (tp + tn + fp + fn)) if (tp + tn + fp + fn) > 0 else 0.0

    print("\n" + "=" * 50)
    print("4. BENCHMARK PERFORMANCE METRICS")
    print("=" * 50)
    print(f"Total Evaluated Ground-Truth Pairs: {len(pair_reports)}")
    print(f"True Positives  (TP): {tp:<4} | False Positives (FP): {fp}")
    print(f"True Negatives  (TN): {tn:<4} | False Negatives (FN): {fn}")
    print(f"--------------------------------------------------")
    print(f"Accuracy : {accuracy * 100:.1f}%")
    print(f"Precision: {precision * 100:.1f}%")
    print(f"Recall   : {recall * 100:.1f}%")
    print(f"F1-Score : {f1 * 100:.1f}%")
    print("=" * 50)

    db.close()
    return {
        "triage_results": triage_results,
        "pair_reports": pair_reports,
        "metrics": {
            "tp": tp, "fp": fp, "tn": tn, "fn": fn,
            "accuracy": accuracy,
            "precision": precision,
            "recall": recall,
            "f1": f1
        }
    }

if __name__ == "__main__":
    run_synthetic_evaluation()
