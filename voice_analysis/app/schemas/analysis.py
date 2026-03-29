from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, model_validator


class HealthResponse(BaseModel):
    status: Literal["ok"] = "ok"
    service: str
    version: str
    service_root: str
    repo_root: str
    test_audio_dir: str
    available_test_audio_files: int


class PitchStats(BaseModel):
    mean_hz: float | None = None
    median_hz: float | None = None
    min_hz: float | None = None
    max_hz: float | None = None
    std_hz: float | None = None
    variance_hz: float | None = None


class EnergyStats(BaseModel):
    mean_rms: float
    std_rms: float
    variance_rms: float
    min_rms: float
    max_rms: float
    p10_rms: float
    p90_rms: float


class SilenceStats(BaseModel):
    silence_total_duration_seconds: float
    silence_ratio: float
    silence_segment_count: int
    pause_count: int
    mean_pause_duration_seconds: float | None = None
    max_pause_duration_seconds: float | None = None


class VoiceActivityStats(BaseModel):
    voiced_frame_count: int
    unvoiced_frame_count: int
    voiced_frame_ratio: float | None = None
    voiced_to_unvoiced_ratio: float | None = None


class STTDependentPlaceholders(BaseModel):
    lexical_speech_rate_wpm: None = None
    filler_count: None = None
    disfluency_rate: None = None
    transcript_confidence: None = None
    status: Literal["not_available_without_stt"] = "not_available_without_stt"


class RawAudioFeatures(BaseModel):
    duration_seconds: float
    analysis_frame_count: int
    speech_active_duration_seconds: float
    onset_peak_count: int
    speech_rate_proxy_events_per_second: float
    pause_ratio: float
    pitch: PitchStats
    energy: EnergyStats
    silence: SilenceStats
    voice_activity: VoiceActivityStats
    stt_dependent_placeholders: STTDependentPlaceholders


class DerivedMetrics(BaseModel):
    speech_activity_ratio: float
    pause_events_per_minute: float
    active_speech_rate_proxy_events_per_second: float | None = None
    pitch_coefficient_of_variation: float | None = None
    energy_coefficient_of_variation: float | None = None
    voiced_to_silence_ratio: float | None = None
    pause_to_speech_ratio: float | None = None


class AnalysisMetadata(BaseModel):
    request_id: str
    source_type: Literal["upload", "local_path"]
    file_name: str
    resolved_path: str | None = None
    content_type: str | None = None
    file_size_bytes: int | None = None
    detected_format: str | None = None
    original_sample_rate_hz: int | None = None
    analysis_sample_rate_hz: int
    analyzed_at: datetime
    processing_time_ms: float
    analyzer_version: str
    analysis_parameters: dict[str, int | float]


class AudioAnalysisResponse(BaseModel):
    metadata: AnalysisMetadata
    raw_audio_features: RawAudioFeatures
    derived_metrics: DerivedMetrics
    warnings: list[str] = Field(default_factory=list)
    limitations: list[str] = Field(default_factory=list)


class LocalAudioAnalyzeRequest(BaseModel):
    file_path: str = Field(
        ...,
        description=(
            "Absolute path or path relative to repo root / service root. "
            "Examples: STT/tests_audio/sample.mp3 or ../STT/tests_audio/sample.mp3"
        ),
    )


class BatchAnalyzeRequest(BaseModel):
    file_paths: list[str] | None = Field(
        default=None,
        description="Explicit list of local file paths.",
    )
    glob_pattern: str | None = Field(
        default=None,
        description="Glob pattern relative to repo root or service root.",
    )
    output_path: str | None = Field(
        default=None,
        description="Optional JSON output file path for persisting batch results.",
    )

    @model_validator(mode="after")
    def validate_input(self) -> "BatchAnalyzeRequest":
        if not self.file_paths and not self.glob_pattern:
            raise ValueError("Provide either file_paths or glob_pattern.")
        return self


class BatchFailure(BaseModel):
    file_path: str
    error: str


class BatchComparisonRow(BaseModel):
    file_name: str
    resolved_path: str | None = None
    duration_seconds: float
    speech_rate_proxy_events_per_second: float
    pause_ratio: float
    pitch_mean_hz: float | None = None
    pitch_variance_hz: float | None = None
    energy_mean_rms: float
    energy_variance_rms: float
    voiced_frame_ratio: float | None = None
    speech_activity_ratio: float
    active_speech_rate_proxy_events_per_second: float | None = None


class BatchMetadata(BaseModel):
    analyzed_at: datetime
    requested_count: int
    analyzed_count: int
    failed_count: int
    output_path: str | None = None
    glob_pattern: str | None = None


class BatchAnalyzeResponse(BaseModel):
    metadata: BatchMetadata
    results: list[AudioAnalysisResponse]
    comparison_rows: list[BatchComparisonRow]
    failures: list[BatchFailure] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
