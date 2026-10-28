import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent

# Database configuration: defaults to SQLite file in backend/ directory, supports PostgreSQL via env
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR / 'caseconnect.db'}")

SECRET_KEY = os.getenv("SECRET_KEY", "aicte-sih26264-caseconnect-secret-key-2026")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# Storage configuration for uploaded evidence
STORAGE_DIR = Path(os.getenv("STORAGE_DIR", BASE_DIR / "storage" / "evidence"))
STORAGE_DIR.mkdir(parents=True, exist_ok=True)

MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB limit
ALLOWED_MIME_TYPES = {
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/jpg",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/csv",
    "text/plain"
}

# Intelligence parameters
RELATIONSHIP_THRESHOLD = 0.75
ALGORITHM_VERSION = "v1.4-tfidf-hybrid"
DEMO_MODE = True
