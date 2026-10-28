# NIDAAN - CaseConnect AI

> **Centralized AICTE Grievance Redressal & Compliance Audit System**  
> *Smart Triage, Cryptographic Audit Ledger, Cross-Case Intelligence & Multi-Bureau Governance Platform (SIH26264 / PRAMAAN)*

---

## 🌟 Overview

**NIDAAN** is an advanced AI-powered platform designed for regulatory bodies and educational authorities (such as AICTE) to manage grievance redressal, institutional compliance, and investigative audits seamlessly.

Key capabilities include:
- **Smart Triage & NLP Routing**: Automatically categorizes grievances into regulatory taxonomies (e.g., faculty-cadre ratios, capitation fees, FDR escrow fraud, ragging, ghost faculty) with SLA estimation and bureau routing.
- **Cross-Case Intelligence & Deduplication**: Vectorized TF-IDF hybrid intelligence engine to detect duplicate, related, or coordinated complaints across institutions.
- **Cryptographic Audit Ledger**: SHA-256 chain of custody ensuring non-repudiation and tamper-evident event trails for all case transitions and officer actions.
- **Multi-Bureau Governance & SLA Engine**: Dynamic SLA tracking, escalation rules, and cross-bureau transfers with role-based access control.
- **Tamper-Evident Evidence Vault**: Secure handling of documentary evidence, inspection memos, and digital proofs.

---

## 🏗️ Architecture & Tech Stack

### Backend
- **Framework**: [FastAPI](https://fastapi.tiangolo.com/) (Python 3.10+)
- **ORM & Database**: [SQLAlchemy](https://www.sqlalchemy.org/) with [Alembic](https://alembic.sqlalchemy.org/) migrations (SQLite for development / PostgreSQL ready)
- **Machine Learning & NLP**: `scikit-learn`, `numpy` (TF-IDF hybrid similarity, pattern matching, fuzzy categorization)
- **Security & Integrity**: Passlib (Bcrypt), PyJWT, SHA-256 cryptographic chaining

### Frontend
- **Framework**: [React 18](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Icons & UI**: Lucide React, Headless UI, Recharts

---

## 📁 Repository Structure

```
├── backend/
│   ├── alembic/              # Database migration scripts
│   ├── tests/                # Comprehensive test suites (audit, SLA, triage, lifecycle)
│   ├── config.py             # Application configuration & env loader
│   ├── crypto.py             # SHA-256 audit hashing & verification
│   ├── database.py           # Database engine & base models
│   ├── db_models.py          # SQLAlchemy models (Complaints, Audit, Evidence, SLA)
│   ├── db_session.py         # Session management
│   ├── evidence_service.py   # Uploaded document handling & validation
│   ├── intelligence.py       # Cross-case similarity & deduplication engine
│   ├── lifecycle.py          # State transition engine & workflow validations
│   ├── main.py               # FastAPI application endpoints
│   ├── requirements.txt      # Python dependencies
│   ├── seed_data.py          # Realistic synthetic institutional grievance data
│   ├── sla_engine.py         # Automated SLA calculation & breach tracker
│   └── triage_ai.py          # Classification & automated routing
├── frontend/
│   ├── public/               # Static assets & icons
│   ├── src/
│   │   ├── components/       # Reusable UI components & layouts
│   │   ├── pages/            # Role-specific dashboard views & case consoles
│   │   ├── services/         # API integration layer
│   │   ├── store/            # State management
│   │   ├── App.tsx           # Main application routing
│   │   └── main.tsx          # Frontend entry point
│   ├── package.json          # Node dependencies & scripts
│   ├── tailwind.config.ts    # Tailwind styling config
│   └── vite.config.ts        # Vite build configuration
├── .env.example              # Sample environment configuration
└── .gitignore                # Git ignore rules for node_modules, cache, & db
```

---

## 🚀 Getting Started

### Prerequisites
- Python 3.10 or higher
- Node.js 18+ and npm

### 1. Backend Setup

```bash
cd backend

# Create and activate a virtual environment
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start the FastAPI development server
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

The interactive API docs will be available at [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs).

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start the Vite development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🧪 Running Tests

```bash
cd backend
pytest
```

---

## 📜 License

This project is licensed under the MIT License.
