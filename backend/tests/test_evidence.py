import io
import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_evidence_upload_and_download():
    # 1. Upload valid text evidence
    test_content = b"Verification memo: AICTE Inspection Committee visit notes regarding lab equipment."
    file_tuple = ("inspection_memo.txt", io.BytesIO(test_content), "text/plain")

    upload_res = client.post(
        "/api/complaints/C001/evidence",
        files={"file": file_tuple},
        data={"uploadedBy": "Officer Arjun Sharma"}
    )
    assert upload_res.status_code == 200
    data = upload_res.json()
    assert data["ok"] is True
    assert "sha256" in data
    evidence_id = data["id"]

    # 2. List evidence for complaint
    list_res = client.get("/api/complaints/C001/evidence")
    assert list_res.status_code == 200
    ev_list = list_res.json()
    assert any(e["id"] == evidence_id for e in ev_list)

    # 3. Secure download
    dl_res = client.get(f"/api/evidence/{evidence_id}/download")
    assert dl_res.status_code == 200
    assert dl_res.content == test_content

def test_evidence_upload_invalid_type_rejected():
    # Upload unsupported file format (e.g. executable/binary)
    bad_file = ("script.exe", io.BytesIO(b"binary"), "application/x-msdownload")
    upload_res = client.post(
        "/api/complaints/C001/evidence",
        files={"file": bad_file},
        data={"uploadedBy": "Officer Arjun Sharma"}
    )
    assert upload_res.status_code == 400
    assert "unsupported file type" in upload_res.json()["detail"].lower()
