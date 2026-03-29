# Voice Analysis API

Minimal FastAPI service for local experiments with transparent audio and speech-delivery metrics. The service is intentionally not a "leadership detector". It extracts interpretable audio features and derived delivery correlates so you can compare files, inspect limitations, and decide later which features are useful.

## Responsibility Boundaries

- Input: local audio files or multipart uploads.
- Output: structured JSON with `raw_audio_features`, `derived_metrics`, `metadata`, `warnings`, and `limitations`.
- Scope: audio-level and speech-delivery proxy metrics only.
- Out of scope: database, job queue, LLM scoring, semantic interpretation, hard claims about personality or leadership.

## Project Structure

```text
voice_analysis/
  app/
    api/
      routes.py                  # FastAPI endpoints
    schemas/
      analysis.py                # Pydantic request/response contracts
    services/
      analysis_service.py        # Orchestration for single/batch analysis
      audio_loader.py            # Path resolution, upload persistence, audio decoding
      feature_extraction.py      # Core metric extraction logic
    config.py                    # Service configuration and path resolution
    main.py                      # FastAPI app entrypoint
  scripts/
    batch_analyze.py             # CLI helper for batch runs on local files
  tests/
    conftest.py                  # Shared fixtures for API and unit tests
    test_api.py                  # API tests
    test_feature_extraction.py   # Unit tests for feature extraction
    test_smoke_audio_files.py    # Smoke test against STT/tests_audio/*.mp3
  Dockerfile
  docker-compose.yml
  pytest.ini
  requirements.txt
  README.md
```

## Metrics Implemented

### Raw Audio Features

- `duration_seconds`: total decoded duration.
- `speech_active_duration_seconds`: non-silent duration detected via `librosa.effects.split`.
- `onset_peak_count`: count of onset-envelope peaks used as a speech-rate proxy input.
- `speech_rate_proxy_events_per_second`: onset peaks divided by full duration.
- `pause_ratio`: total duration of pauses longer than configured threshold divided by full duration.
- `pitch.*`: `mean_hz`, `median_hz`, `min_hz`, `max_hz`, `std_hz`, `variance_hz` from voiced frames via `librosa.pyin`.
- `energy.*`: RMS energy summary statistics.
- `silence.*`: total silence duration, silence ratio, silence segment count, pause count, mean/max pause duration.
- `voice_activity.*`: voiced/unvoiced frame counts and ratios.
- `stt_dependent_placeholders.*`: explicit null placeholders for metrics that need STT.

### Derived Metrics

- `speech_activity_ratio`: active speech duration / full duration.
- `pause_events_per_minute`: pause count normalized by duration.
- `active_speech_rate_proxy_events_per_second`: onset peaks normalized by active speech duration.
- `pitch_coefficient_of_variation`: pitch std / pitch mean.
- `energy_coefficient_of_variation`: RMS std / RMS mean.
- `voiced_to_silence_ratio`: voiced duration / silence duration.
- `pause_to_speech_ratio`: pause duration / active speech duration.

## Interpretation Limits

- These are correlates and delivery proxies, not ground truth indicators of leadership.
- `speech_rate_proxy_events_per_second` is onset-based. It is not syllables-per-second and not words-per-minute.
- Pitch metrics are unstable on noisy, heavily compressed, or music-heavy audio.
- Filler words, lexical speech rate, and disfluencies are not available until STT is added.

## Path Resolution

The service resolves local paths in this order:

1. Absolute path as provided.
2. Path relative to monorepo root.
3. Path relative to `voice_analysis/`.

That means all of these work:

- `STT/tests_audio/IELTS Speaking Test.mp3`
- `../STT/tests_audio/IELTS Speaking Test.mp3`
- `/absolute/path/to/repo/STT/tests_audio/IELTS Speaking Test.mp3`

## Local Run

Python 3.11+ is the target runtime. Docker is the safest option because mp3 decoding depends on system codecs.

```bash
cd voice_analysis
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8096 --reload
```

Healthcheck:

```bash
curl http://localhost:8096/api/v1/health
```

## Docker Compose Run

From `voice_analysis/`:

```bash
docker compose up --build
```

From monorepo root:

```bash
docker compose -f voice_analysis/docker-compose.yml up --build
```

The compose file mounts:

- `voice_analysis/` into `/app`
- `../STT/tests_audio` into `/workspace/STT/tests_audio`
- `voice_analysis/results` into `/app/results`

## API Contract

### `GET /api/v1/health`

Returns service status and discovered local test-audio directory.

Example:

```json
{
  "status": "ok",
  "service": "voice-analysis-api",
  "version": "0.1.0",
  "service_root": "/app",
  "repo_root": "/workspace",
  "test_audio_dir": "/workspace/STT/tests_audio",
  "available_test_audio_files": 3
}
```

### `POST /api/v1/analyze/upload`

Accepts `multipart/form-data` with one file field named `file`.

Example:

```bash
curl -X POST \
  -F "file=@../STT/tests_audio/IELTS Speaking Test.mp3" \
  http://localhost:8096/api/v1/analyze/upload
```

Error codes:

- `400`: empty upload, unsupported extension, or upload size violation.
- `500`: decoding or feature-extraction failure.

### `POST /api/v1/analyze/local`

Accepts local path JSON payload:

```json
{
  "file_path": "STT/tests_audio/IELTS Speaking Test.mp3"
}
```

Example:

```bash
curl -X POST http://localhost:8096/api/v1/analyze/local \
  -H "Content-Type: application/json" \
  -d '{"file_path":"STT/tests_audio/IELTS Speaking Test.mp3"}'
```

Error codes:

- `404`: file not found.
- `400`: unsupported extension or invalid request.
- `500`: decode or feature extraction failure.

### `POST /api/v1/analyze/batch`

Accepts either `file_paths` or `glob_pattern`, plus optional `output_path`.

Example request using repo-relative glob:

```json
{
  "glob_pattern": "STT/tests_audio/*.mp3",
  "output_path": "results/stt_batch.json"
}
```

Example:

```bash
curl -X POST http://localhost:8096/api/v1/analyze/batch \
  -H "Content-Type: application/json" \
  -d '{"glob_pattern":"STT/tests_audio/*.mp3","output_path":"results/stt_batch.json"}'
```

Behavior:

- analyzes files sequentially
- returns full per-file results
- returns flattened `comparison_rows`
- persists JSON and companion CSV if `output_path` is provided
- does not abort the full batch on one bad file; failures are reported in `failures`

## Response Shape

Top-level response for single analysis:

```json
{
  "metadata": {
    "request_id": "uuid",
    "source_type": "local_path",
    "file_name": "IELTS Speaking Test.mp3",
    "resolved_path": "/abs/path/to/file.mp3",
    "content_type": null,
    "file_size_bytes": 12345,
    "detected_format": "MP3",
    "original_sample_rate_hz": 44100,
    "analysis_sample_rate_hz": 16000,
    "analyzed_at": "2026-03-29T10:00:00Z",
    "processing_time_ms": 245.1,
    "analyzer_version": "0.1.0",
    "analysis_parameters": {
      "analysis_sample_rate": 16000,
      "frame_length": 2048,
      "hop_length": 512,
      "silence_top_db": 30,
      "min_pause_duration_seconds": 0.2,
      "pitch_fmin_hz": 50.0,
      "pitch_fmax_hz": 500.0
    }
  },
  "raw_audio_features": {},
  "derived_metrics": {},
  "warnings": [],
  "limitations": []
}
```

See [app/schemas/analysis.py](/home/alexseyka/invisionu-ats-decentrathon-2026/voice_analysis/app/schemas/analysis.py) for the exact Pydantic contract.

## Batch Helper

CLI helper:

```bash
cd voice_analysis
python scripts/batch_analyze.py --glob "STT/tests_audio/*.mp3" --output results/stt_batch.json
```

This writes:

- `results/stt_batch.json`: full API-like batch response
- `results/stt_batch_comparison.csv`: flat comparison table for quick inspection

Explicit files also work:

```bash
python scripts/batch_analyze.py \
  --file "../STT/tests_audio/IELTS Speaking Test.mp3" \
  --file "../STT/tests_audio/ssstik.io_1774782080131.mp3" \
  --output results/manual_batch.json
```

## Python Client Example

```python
import requests

response = requests.post(
    "http://localhost:8096/api/v1/analyze/local",
    json={"file_path": "STT/tests_audio/IELTS Speaking Test.mp3"},
    timeout=120,
)
response.raise_for_status()
data = response.json()
print(data["raw_audio_features"]["speech_rate_proxy_events_per_second"])
```

Upload example:

```python
import requests

with open("../STT/tests_audio/IELTS Speaking Test.mp3", "rb") as audio_file:
    response = requests.post(
        "http://localhost:8096/api/v1/analyze/upload",
        files={"file": ("IELTS Speaking Test.mp3", audio_file, "audio/mpeg")},
        timeout=120,
    )
    response.raise_for_status()
    print(response.json()["derived_metrics"])
```

## Testing

Install test dependencies from `requirements.txt`, then run:

```bash
cd voice_analysis
pytest
```

Smoke only:

```bash
pytest -m smoke
```

Inside Docker:

```bash
docker compose run --rm voice-analysis-api pytest
```

What is covered:

- unit tests for feature extraction on synthetic audio
- API tests for health, upload, local-path, and batch endpoints
- smoke tests against real files from `STT/tests_audio/*.mp3`

## Extending Metrics

To add a new feature:

1. Extend extraction logic in [feature_extraction.py](/home/alexseyka/invisionu-ats-decentrathon-2026/voice_analysis/app/services/feature_extraction.py).
2. Add the field to [analysis.py](/home/alexseyka/invisionu-ats-decentrathon-2026/voice_analysis/app/schemas/analysis.py).
3. Add assertions in `tests/test_feature_extraction.py` and, if relevant, `tests/test_api.py`.
4. If the metric should appear in cross-file comparison, extend `build_comparison_row` in [analysis_service.py](/home/alexseyka/invisionu-ats-decentrathon-2026/voice_analysis/app/services/analysis_service.py).

Recommended separation:

- raw direct measurements stay in `raw_audio_features`
- normalized or composite but still transparent ratios stay in `derived_metrics`
- anything requiring transcript or token-level alignment stays out until STT is added

## Next Steps

- Add STT-backed lexical features: words per minute, filler counts, restart counts, disfluency rate.
- Add optional diarization if you later need interviewer/candidate separation.
- Add experiment logging for feature sets and outputs, for example MLflow or flat-file experiment manifests.
- Add feature selection notebooks or scripts to compare which metrics track your downstream rubric best.
- Add optional persistence only after you know which experiments and outputs are actually worth storing.

