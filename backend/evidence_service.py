import os
import uuid
import hashlib
import datetime
from typing import Tuple, Optional, Dict, Any
from fastapi import UploadFile, HTTPException
from sqlalchemy.orm import Session
from db_models import Evidence, Complaint, AuditLedgerEntry
from config import STORAGE_DIR, MAX_UPLOAD_SIZE_BYTES
from crypto import compute_audit_hash

ALLOWED_MIME_TYPES = {
    "application/pdf": ".pdf",
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "text/plain": ".txt",
}

EVIDENCE_DIR = os.path.join(STORAGE_DIR, "evidence")
os.makedirs(EVIDENCE_DIR, exist_ok=True)

def extract_text_from_file(file_path: str, content_type: str) -> str:
    """
    Extracts plain text content from uploaded evidence for compliance analysis.
    If PDF contains only scanned imagery without embedded text, returns transparent status.
    """
    if content_type == "text/plain":
        try:
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                return f.read()[:50000]
        except Exception as e:
            return f"Plain text read error: {str(e)}"

    if content_type == "application/pdf":
        try:
            import fitz  # PyMuPDF
            doc = fitz.open(file_path)
            extracted = []
            for page in doc:
                text = page.get_text()
                if text.strip():
                    extracted.append(text.strip())
            full_text = "\n\n".join(extracted)
            if full_text.strip():
                return full_text[:50000]
            else:
                return "[OCR Note: PDF contains scanned image layers without embedded text streams. OCR required for full-text indexing.]"
        except ImportError:
            try:
                from pdfminer.high_level import extract_text
                text = extract_text(file_path)
                return text[:50000] if text.strip() else "[OCR Note: No text stream extracted. Image-only PDF.]"
            except Exception as e:
                return f"[PDF text parser error: {str(e)}]"
        except Exception as e:
            return f"[PDF parsing error: {str(e)}]"

    return "[Binary document / Image evidence. Text extraction not applicable.]"


def save_evidence_file(
    db: Session,
    complaint_id: str,
    file: UploadFile,
    uploaded_by: str = "Officer Arjun Sharma"
) -> Evidence:
    """
    Validates, securely stores, computes SHA-256 checksum, extracts text,
    and records an Evidence entry in the database.
    """
    complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if not complaint:
        raise HTTPException(status_code=404, detail=f"Complaint '{complaint_id}' not found.")

    # 1. Validate MIME type
    content_type = file.content_type or "application/octet-stream"
    if content_type not in ALLOWED_MIME_TYPES:
        allowed_list = ", ".join(ALLOWED_MIME_TYPES.keys())
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{content_type}'. Allowed MIME formats: {allowed_list}"
        )

    # 2. Read contents and check size
    file_bytes = file.file.read()
    file_size = len(file_bytes)
    if file_size > MAX_UPLOAD_SIZE_BYTES:
        raise HTTPException(
            status_code=400,
            detail=f"File size ({file_size // (1024*1024)} MB) exceeds maximum allowed limit of {MAX_UPLOAD_SIZE_BYTES // (1024*1024)} MB."
        )

    # 3. Compute SHA-256 Checksum
    sha256_hash = hashlib.sha256(file_bytes).hexdigest()

    # 4. Generate safe unique filename
    safe_ext = ALLOWED_MIME_TYPES[content_type]
    file_uuid = str(uuid.uuid4())[:12]
    clean_original_name = "".join(c for c in (file.filename or "evidence") if c.isalnum() or c in "._- ")
    storage_key = f"{complaint_id}_{file_uuid}_{clean_original_name}"
    target_path = os.path.join(EVIDENCE_DIR, storage_key)

    # 5. Write to private filesystem
    with open(target_path, "wb") as f:
        f.write(file_bytes)

    # 6. Extract text
    extracted_text = extract_text_from_file(target_path, content_type)

    # 7. Create DB record
    now = datetime.datetime.utcnow()
    evidence_id = f"EVD-{int(now.timestamp() * 1000)}"
    evidence_record = Evidence(
        id=evidence_id,
        complaint_id=complaint.id,
        filename=clean_original_name,
        storage_key=storage_key,
        content_type=content_type,
        file_size_bytes=file_size,
        sha256_checksum=sha256_hash,
        extracted_text=extracted_text,
        uploaded_by=uploaded_by,
        created_at=now
    )
    db.add(evidence_record)

    # 8. Cryptographic audit entry
    detail = (
        f"Evidence uploaded: '{clean_original_name}' ({file_size // 1024} KB) for {complaint.case_number}. "
        f"SHA-256: {sha256_hash[:16]}... Uploaded by: {uploaded_by}."
    )
    last_entry = db.query(AuditLedgerEntry).order_by(AuditLedgerEntry.created_at.desc(), AuditLedgerEntry.id.desc()).first()
    prev_hash = last_entry.current_hash if last_entry else "0000000000000000"
    ledger_count = db.query(AuditLedgerEntry).count() + 1
    ledger_id = f"#{1000 + ledger_count}"
    
    current_hash = compute_audit_hash("EVIDENCE_UPLOADED", detail, prev_hash)
    audit_entry = AuditLedgerEntry(
        id=f"AUD-{int(now.timestamp() * 1000)}",
        ledger_id=ledger_id,
        actor_name=uploaded_by,
        event_type="EVIDENCE_UPLOADED",
        complaint_id=complaint.id,
        case_number=complaint.case_number,
        detail=detail,
        previous_hash=prev_hash,
        current_hash=current_hash,
        created_at=now
    )
    db.add(audit_entry)

    db.commit()
    db.refresh(evidence_record)
    return evidence_record
