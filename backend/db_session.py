from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from config import DATABASE_URL
from db_models import Base

# Support SQLite connect args (check_same_thread) if using sqlite
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    echo=False
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def init_db():
    """Initializes tables in database."""
    Base.metadata.create_all(bind=engine)

def get_db():
    """FastAPI dependency for database sessions."""
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()
