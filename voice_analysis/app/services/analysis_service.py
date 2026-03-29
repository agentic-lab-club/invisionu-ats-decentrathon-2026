from __future__ import annotations

import csv
import json
import uuid
from datetime import datetime, timezone
from pathlib import Path
from tempfile import TemporaryDirectory
from time import perf_counter

from app.config import Settings
from app.schemas.analysis import (
    AnalysisMetadata,
    AudioAnalysisResponse,
    BatchAnalyzeRequest,
    BatchAnalyzeResponse,
    BatchComparisonRow,
    BatchFailure,
    BatchMetadata,
)
from app.services.audio_loader import (
    load_audio,
    persist_uploaded_audio,
    resolve_glob_pattern,
    resolve_local_audio_path,
)
from app.services.feature_extraction import extract_features


BASE_LIMITATIONS = [
    "This service extracts speech-delivery correlates and audio proxies, not personality traits or leadership labels.",
    "No STT is used in the current pipeline, so lexical accuracy, filler words, and semantic quality are out of scope.",
    "Pitch, pause, and energy metrics are sensitive to microphone quality, compression, background noise, and editing.",
]


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _build_analysis_response(
    *,
    source_type: str,
    file_name: str,
    resolved_path: str | None,
    content_type: str | None,
    audio_path: Path,
    settings: Settings,
) -> AudioAnalysisResponse:
    started = perf_counter()
    loaded_audio = load_audio(audio_path, settings.analysis_sample_rate)
    raw_audio_features, derived_metrics, warnings = extract_features(
        waveform=loaded_audio.waveform,
        sample_rate=loaded_audio.sample_rate,
        settings=settings,
    )
    processing_time_ms = round((perf_counter() - started) * 1000, 3)

    return AudioAnalysisResponse(
        metadata=AnalysisMetadata(
            request_id=str(uuid.uuid4()),
            source_type=source_type,
            file_name=file_name,
            resolved_path=resolved_path,
            content_type=content_type,
            file_size_bytes=loaded_audio.file_size_bytes,
            detected_format=loaded_audio.detected_format,
            original_sample_rate_hz=loaded_audio.original_sample_rate,
            analysis_sample_rate_hz=loaded_audio.sample_rate,
            analyzed_at=_now_utc(),
            processing_time_ms=processing_time_ms,
            analyzer_version=settings.service_version,
            analysis_parameters=settings.analysis_parameters,
        ),
        raw_audio_features=raw_audio_features,
        derived_metrics=derived_metrics,
        warnings=warnings,
        limitations=BASE_LIMITATIONS,
    )


def analyze_uploaded_bytes(
    *,
    file_name: str | None,
    content_type: str | None,
    content: bytes,
    settings: Settings,
) -> AudioAnalysisResponse:
    if len(content) > settings.max_upload_size_mb * 1024 * 1024:
        raise ValueError(
            f"Uploaded file exceeds MAX_UPLOAD_SIZE_MB={settings.max_upload_size_mb}."
        )

    temp_file_path = persist_uploaded_audio(file_name, content)
    try:
        return _build_analysis_response(
            source_type="upload",
            file_name=file_name or temp_file_path.name,
            resolved_path=None,
            content_type=content_type,
            audio_path=temp_file_path,
            settings=settings,
        )
    finally:
        temp_file_path.unlink(missing_ok=True)


def analyze_local_file(file_path: str, settings: Settings) -> AudioAnalysisResponse:
    resolved_path = resolve_local_audio_path(file_path, settings)
    return _build_analysis_response(
        source_type="local_path",
        file_name=resolved_path.name,
        resolved_path=str(resolved_path),
        content_type=None,
        audio_path=resolved_path,
        settings=settings,
    )


def build_comparison_row(result: AudioAnalysisResponse) -> BatchComparisonRow:
    return BatchComparisonRow(
        file_name=result.metadata.file_name,
        resolved_path=result.metadata.resolved_path,
        duration_seconds=result.raw_audio_features.duration_seconds,
        speech_rate_proxy_events_per_second=result.raw_audio_features.speech_rate_proxy_events_per_second,
        pause_ratio=result.raw_audio_features.pause_ratio,
        pitch_mean_hz=result.raw_audio_features.pitch.mean_hz,
        pitch_variance_hz=result.raw_audio_features.pitch.variance_hz,
        energy_mean_rms=result.raw_audio_features.energy.mean_rms,
        energy_variance_rms=result.raw_audio_features.energy.variance_rms,
        voiced_frame_ratio=result.raw_audio_features.voice_activity.voiced_frame_ratio,
        speech_activity_ratio=result.derived_metrics.speech_activity_ratio,
        active_speech_rate_proxy_events_per_second=result.derived_metrics.active_speech_rate_proxy_events_per_second,
    )


def _persist_batch_json(response: BatchAnalyzeResponse, output_path: Path) -> None:
    try:
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(
            json.dumps(response.model_dump(mode="json"), indent=2, ensure_ascii=True),
            encoding="utf-8",
        )
    except PermissionError as exc:
        raise ValueError(
            f"Cannot write batch JSON output to '{output_path}'. "
            "Check directory permissions or choose another output_path."
        ) from exc


def _persist_batch_csv(comparison_rows: list[BatchComparisonRow], output_path: Path) -> None:
    csv_path = output_path.with_name(f"{output_path.stem}_comparison.csv")
    try:
        csv_path.parent.mkdir(parents=True, exist_ok=True)
        if not comparison_rows:
            csv_path.write_text("", encoding="utf-8")
            return

        field_names = list(comparison_rows[0].model_dump().keys())
        with csv_path.open("w", encoding="utf-8", newline="") as csv_file:
            writer = csv.DictWriter(csv_file, fieldnames=field_names)
            writer.writeheader()
            for row in comparison_rows:
                writer.writerow(row.model_dump())
    except PermissionError as exc:
        raise ValueError(
            f"Cannot write batch comparison CSV to '{csv_path}'. "
            "Check directory permissions or choose another output_path."
        ) from exc


def analyze_batch(
    request: BatchAnalyzeRequest,
    settings: Settings,
) -> BatchAnalyzeResponse:
    file_paths = request.file_paths or []
    if request.glob_pattern:
        file_paths.extend(str(path) for path in resolve_glob_pattern(request.glob_pattern, settings))

    unique_file_paths = list(dict.fromkeys(file_paths))
    results: list[AudioAnalysisResponse] = []
    failures: list[BatchFailure] = []

    for file_path in unique_file_paths:
        try:
            results.append(analyze_local_file(file_path, settings))
        except Exception as exc:
            failures.append(BatchFailure(file_path=file_path, error=str(exc)))

    comparison_rows = [build_comparison_row(result) for result in results]

    output_path = None
    if request.output_path:
        candidate = Path(request.output_path).expanduser()
        output_path = (
            candidate
            if candidate.is_absolute()
            else (settings.service_root / candidate).resolve()
        )

    response = BatchAnalyzeResponse(
        metadata=BatchMetadata(
            analyzed_at=_now_utc(),
            requested_count=len(unique_file_paths),
            analyzed_count=len(results),
            failed_count=len(failures),
            output_path=str(output_path) if output_path else None,
            glob_pattern=request.glob_pattern,
        ),
        results=results,
        comparison_rows=comparison_rows,
        failures=failures,
        warnings=[
            "Batch endpoint analyzes local files sequentially. For large batches, prefer the CLI helper and persist outputs."
        ],
    )

    if output_path:
        _persist_batch_json(response, output_path)
        _persist_batch_csv(comparison_rows, output_path)

    return response
