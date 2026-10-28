import re
from typing import Dict, Any, List

# Keyword maps for AICTE Bureaus
BUREAU_RULES = {
    "B001": {
        "name": "Academic Bureau",
        "keywords": ["faculty", "teacher", "professor", "phd", "qualification", "attendance", "curriculum", "syllabus", "lecturer", "shortage", "cadre ratio", "teaching", "dean"],
        "default_priority": "HIGH"
    },
    "B002": {
        "name": "Infrastructure Cell",
        "keywords": ["lab", "laboratory", "library", "building", "fire safety", "fire", "electrical safety", "computer", "internet", "hostel building", "sanitation", "campus", "equipment", "classroom", "area", "sqm"],
        "default_priority": "MEDIUM"
    },
    "B003": {
        "name": "Finance & Accounts",
        "keywords": ["fee", "fees", "capitation", "refund", "deposit", "fdr", "accounts", "salary", "delayed pay", "extortion", "excessive fee", "unapproved fee", "penalty fee", "certificate retention", "retention of original", "receipt", "money"],
        "default_priority": "HIGH"
    },
    "B004": {
        "name": "Approval Bureau",
        "keywords": ["extension of approval", "eoa", "affiliation", "sanctioned intake", "intake", "unapproved course", "unapproved program", "unapproved branch", "unapproved diploma", "fake degree", "closure", "accreditation"],
        "default_priority": "CRITICAL"
    },
    "B005": {
        "name": "Student Affairs Cell",
        "keywords": ["ragging", "harassment", "hall ticket", "admit card", "victimization", "caste", "discrimination", "mental health", "hostel intimidation", "warden ragging", "anti-ragging"],
        "default_priority": "CRITICAL"
    },
    "B006": {
        "name": "Compliance Cell",
        "keywords": ["inspection", "ombudsperson", "grievance redressal committee", "grc", "anti-ragging committee", "compliance", "mandatory disclosure"],
        "default_priority": "MEDIUM"
    }
}

PRIORITY_TRIGGERS = {
    "CRITICAL": ["ragging", "harassment", "hall ticket withheld", "suicide", "safety hazard", "fdr reuse", "fake degree", "unapproved course", "unapproved program", "exam tomorrow"],
    "HIGH": ["excess fee", "capitation", "unapproved fee", "salary unpaid", "faculty shortage", "cadre ratio", "no lab equipment", "fire safety expired", "intake exceeded"],
    "MEDIUM": ["library book shortage", "canteen hygiene", "wifi speed", "delay in certificate", "admit card delay", "drinking water"],
    "LOW": ["general inquiry", "website outdated", "minor maintenance"]
}

def clean_text_for_classification(text: str) -> str:
    """Normalizes generic regulatory citations so they do not falsely skew bureau matches."""
    cleaned = text.lower()
    # Normalize general regulatory manual citations
    cleaned = re.sub(r'\bapproval process handbook\b', 'regulatory_handbook', cleaned)
    cleaned = re.sub(r'\baicte approval process\b', 'regulatory_handbook', cleaned)
    cleaned = re.sub(r'\bapproval handbook\b', 'regulatory_handbook', cleaned)
    cleaned = re.sub(r'\baph\b', 'regulatory_handbook', cleaned)
    return cleaned

def classify_complaint(title: str, description: str, category: str = "") -> Dict[str, Any]:
    raw_text = f"{title} {description} {category}"
    text = clean_text_for_classification(raw_text)

    # Calculate bureau match scores
    scores = {}
    matched_keywords = {}
    for bureau_id, info in BUREAU_RULES.items():
        matches = []
        for kw in info["keywords"]:
            if " " in kw:
                if kw in text:
                    matches.append(kw)
            else:
                if re.search(r'\b' + re.escape(kw) + r'\b', text):
                    matches.append(kw)
        scores[bureau_id] = len(matches)
        if matches:
            matched_keywords[bureau_id] = matches

    # Determine Best bureau
    best_bureau_id = "B001"
    max_score = 0
    for b_id, score in scores.items():
        if score > max_score:
            max_score = score
            best_bureau_id = b_id

    # Fallback to category hints if tie or no keywords
    if max_score == 0 and category:
        cat_lower = category.lower()
        if "faculty" in cat_lower or "academic" in cat_lower:
            best_bureau_id = "B001"
        elif "infra" in cat_lower:
            best_bureau_id = "B002"
        elif "fee" in cat_lower:
            best_bureau_id = "B003"
        elif "admission" in cat_lower or "intake" in cat_lower:
            best_bureau_id = "B004"
        elif "student" in cat_lower or "ragging" in cat_lower:
            best_bureau_id = "B005"

    # Determine Priority
    assigned_priority = "MEDIUM"
    priority_reason = "Standard processing priority"

    for prio, triggers in PRIORITY_TRIGGERS.items():
        found = [t for t in triggers if t in text]
        if found:
            assigned_priority = prio
            priority_reason = f"Keyword triggers identified: {', '.join(found)}"
            break

    if assigned_priority == "MEDIUM" and max_score > 0:
        assigned_priority = BUREAU_RULES[best_bureau_id]["default_priority"]

    # Calculate confidence score
    confidence = min(0.96, max(0.68, 0.65 + (max_score * 0.08)))

    # SLA calculation
    sla_map = {
        "CRITICAL": {"response_days": 3, "resolution_days": 14},
        "HIGH": {"response_days": 7, "resolution_days": 30},
        "MEDIUM": {"response_days": 14, "resolution_days": 60},
        "LOW": {"response_days": 30, "resolution_days": 90},
    }

    return {
        "suggested_bureau_id": best_bureau_id,
        "suggested_bureau_name": BUREAU_RULES[best_bureau_id]["name"],
        "priority": assigned_priority,
        "priority_reason": priority_reason,
        "confidence": round(confidence, 2),
        "matched_keywords": matched_keywords.get(best_bureau_id, []),
        "sla": sla_map[assigned_priority]
    }

def compute_similarity(text1: str, text2: str) -> float:
    """Computes Jaccard word similarity between two texts."""
    words1 = set(re.findall(r'\w{4,}', text1.lower()))
    words2 = set(re.findall(r'\w{4,}', text2.lower()))
    if not words1 or not words2:
        return 0.0
    intersection = words1.intersection(words2)
    union = words1.union(words2)
    return round(len(intersection) / len(union), 2)
