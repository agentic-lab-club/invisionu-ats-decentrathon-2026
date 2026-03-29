from __future__ import annotations

import os
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path


@dataclass(frozen=True)
class Settings:
    service_name: str
    service_version: str
    service_root: Path
    repo_root: Path
    test_audio_dir: Path
    analysis_sample_rate: int
    frame_length: int
    hop_length: int
    silence_top_db: int
    min_pause_duration_seconds: float
    pitch_fmin_hz: float
    pitch_fmax_hz: float
    max_upload_size_mb: int

    @property
    def analysis_parameters(self) -> dict[str, int | float]:
        return {
            "analysis_sample_rate": self.analysis_sample_rate,
            "frame_length": self.frame_length,
            "hop_length": self.hop_length,
            "silence_top_db": self.silence_top_db,
            "min_pause_duration_seconds": self.min_pause_duration_seconds,
            "pitch_fmin_hz": self.pitch_fmin_hz,
            "pitch_fmax_hz": self.pitch_fmax_hz,
        }


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    service_root = Path(__file__).resolve().parents[1]
    repo_root = service_root.parent

    return Settings(
        service_name=os.getenv("SERVICE_NAME", "voice-analysis-api"),
        service_version=os.getenv("SERVICE_VERSION", "0.1.0"),
        service_root=service_root,
        repo_root=repo_root,
        test_audio_dir=Path(
            os.getenv("TEST_AUDIO_DIR", str(repo_root / "STT" / "tests_audio"))
        ).expanduser(),
        analysis_sample_rate=int(os.getenv("ANALYSIS_SAMPLE_RATE", "16000")),
        frame_length=int(os.getenv("FRAME_LENGTH", "2048")),
        hop_length=int(os.getenv("HOP_LENGTH", "512")),
        silence_top_db=int(os.getenv("SILENCE_TOP_DB", "30")),
        min_pause_duration_seconds=float(
            os.getenv("MIN_PAUSE_DURATION_SECONDS", "0.20")
        ),
        pitch_fmin_hz=float(os.getenv("PITCH_FMIN_HZ", "50.0")),
        pitch_fmax_hz=float(os.getenv("PITCH_FMAX_HZ", "500.0")),
        max_upload_size_mb=int(os.getenv("MAX_UPLOAD_SIZE_MB", "50")),
    )

