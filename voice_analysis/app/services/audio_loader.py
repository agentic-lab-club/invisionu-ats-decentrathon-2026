from __future__ import annotations

import glob
from dataclasses import dataclass
from pathlib import Path
from tempfile import NamedTemporaryFile

import librosa
import numpy as np
import soundfile as sf

from app.config import Settings


SUPPORTED_AUDIO_EXTENSIONS = {
    ".aac",
    ".flac",
    ".m4a",
    ".mp3",
    ".ogg",
    ".wav",
    ".webm",
}


@dataclass(frozen=True)
class LoadedAudio:
    waveform: np.ndarray
    sample_rate: int
    duration_seconds: float
    original_sample_rate: int | None
    channels: int | None
    detected_format: str | None
    file_path: Path
    file_size_bytes: int | None


def ensure_supported_audio_path(path: Path) -> None:
    if path.suffix.lower() not in SUPPORTED_AUDIO_EXTENSIONS:
        raise ValueError(
            f"Unsupported audio extension '{path.suffix}'. "
            f"Supported extensions: {sorted(SUPPORTED_AUDIO_EXTENSIONS)}"
        )


def resolve_local_audio_path(file_path: str, settings: Settings) -> Path:
    requested = Path(file_path).expanduser()
    candidate_paths: list[Path] = []

    if requested.is_absolute():
        candidate_paths.append(requested)
    else:
        candidate_paths.append(settings.repo_root / requested)
        candidate_paths.append(settings.service_root / requested)

    for candidate in candidate_paths:
        if candidate.exists() and candidate.is_file():
            ensure_supported_audio_path(candidate)
            return candidate.resolve()

    attempted = ", ".join(str(path) for path in candidate_paths)
    raise FileNotFoundError(
        f"Audio file was not found. Looked at: {attempted or file_path}"
    )


def resolve_glob_pattern(pattern: str, settings: Settings) -> list[Path]:
    requested = Path(pattern).expanduser()
    candidate_patterns: list[str] = []

    if requested.is_absolute():
        candidate_patterns.append(str(requested))
    else:
        candidate_patterns.append(str(settings.repo_root / requested))
        candidate_patterns.append(str(settings.service_root / requested))

    matches: list[Path] = []
    for candidate_pattern in candidate_patterns:
        for raw_match in glob.glob(candidate_pattern):
            path = Path(raw_match)
            if path.is_file() and path.suffix.lower() in SUPPORTED_AUDIO_EXTENSIONS:
                matches.append(path.resolve())

    unique_matches = sorted({path for path in matches})
    if not unique_matches:
        raise FileNotFoundError(
            f"No audio files matched glob pattern '{pattern}'. Tried: {candidate_patterns}"
        )
    return unique_matches


def persist_uploaded_audio(filename: str | None, content: bytes) -> Path:
    if not content:
        raise ValueError("Uploaded file is empty.")

    suffix = Path(filename or "upload.wav").suffix or ".wav"
    with NamedTemporaryFile(delete=False, suffix=suffix) as tmp_file:
        tmp_file.write(content)
        return Path(tmp_file.name)


def load_audio(path: Path, target_sample_rate: int) -> LoadedAudio:
    ensure_supported_audio_path(path)

    info = None
    try:
        info = sf.info(str(path))
    except RuntimeError:
        info = None

    waveform, sample_rate = librosa.load(
        path,
        sr=target_sample_rate,
        mono=True,
    )

    waveform = waveform.astype(np.float32, copy=False)
    duration_seconds = float(librosa.get_duration(y=waveform, sr=sample_rate))

    return LoadedAudio(
        waveform=waveform,
        sample_rate=sample_rate,
        duration_seconds=duration_seconds,
        original_sample_rate=getattr(info, "samplerate", None),
        channels=getattr(info, "channels", None),
        detected_format=getattr(info, "format", None),
        file_path=path,
        file_size_bytes=path.stat().st_size if path.exists() else None,
    )


def list_test_audio_files(settings: Settings) -> list[Path]:
    if not settings.test_audio_dir.exists():
        return []
    return sorted(
        path.resolve()
        for path in settings.test_audio_dir.iterdir()
        if path.is_file() and path.suffix.lower() in SUPPORTED_AUDIO_EXTENSIONS
    )

