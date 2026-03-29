from __future__ import annotations

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_healthcheck():
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ok"
    assert "test_audio_dir" in payload


def test_analyze_upload_endpoint(wav_bytes: bytes):
    response = client.post(
        "/api/v1/analyze/upload",
        files={"file": ("synthetic.wav", wav_bytes, "audio/wav")},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["metadata"]["source_type"] == "upload"
    assert payload["raw_audio_features"]["duration_seconds"] > 0
    assert "derived_metrics" in payload


def test_analyze_local_endpoint(local_wav_file):
    response = client.post(
        "/api/v1/analyze/local",
        json={"file_path": str(local_wav_file)},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["metadata"]["source_type"] == "local_path"
    assert payload["metadata"]["resolved_path"] == str(local_wav_file.resolve())


def test_analyze_batch_endpoint(local_wav_file, tmp_path):
    second_file = tmp_path / "synthetic_2.wav"
    second_file.write_bytes(local_wav_file.read_bytes())

    response = client.post(
        "/api/v1/analyze/batch",
        json={"file_paths": [str(local_wav_file), str(second_file)]},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["metadata"]["analyzed_count"] == 2
    assert len(payload["results"]) == 2
    assert len(payload["comparison_rows"]) == 2

