import hashlib
from typing import List, Dict, Any, Tuple

def compute_audit_hash(event_type: str, detail: str, previous_hash: str) -> str:
    """
    Computes a cryptographic SHA-256 hash over event_type + detail + previous_hash.
    Returns the first 16 hex characters for readable display (or full 64).
    """
    payload = f"{event_type}|{detail}|{previous_hash}".encode('utf-8')
    return hashlib.sha256(payload).hexdigest()[:16]

def verify_audit_chain(entries: List[Dict[str, Any]]) -> Tuple[bool, int, str]:
    """
    Verifies that every entry's previousHash matches the prior currentHash,
    and that currentHash matches sha256(eventType|detail|previousHash).
    Returns: (is_intact, broken_index, message)
    """
    if not entries:
        return True, -1, "Ledger is empty"
    
    for i, entry in enumerate(entries):
        prev_hash = "0000000000000000" if i == 0 else entries[i - 1]["currentHash"]
        
        # Check previous hash link
        if entry.get("previousHash") != prev_hash:
            return False, i, f"Link #{entry.get('ledgerId')} previous hash mismatch. Expected {prev_hash}, found {entry.get('previousHash')}"
        
        # Check content hash
        expected_curr = compute_audit_hash(entry["eventType"], entry["detail"], entry["previousHash"])
        if entry.get("currentHash") != expected_curr:
            return False, i, f"Link #{entry.get('ledgerId')} hash mismatch. Content may have been tampered with."
            
    return True, -1, f"All {len(entries)} links recomputed and verified intact."
