from __future__ import annotations

import io
import sys
from pathlib import Path

import numpy as np
import pytest
import soundfile as sf

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from app.config import get_settings


@pytest.fixture(scope="session")
def settings():
    return get_settings()


@pytest.fixture()
def sample_rate() -> int:
    return 16000


@pytest.fixture()
def speech_like_waveform(sample_rate: int) -> np.ndarray:
    def tone(frequency: float, seconds: float, amplitude: float = 0.25) -> np.ndarray:
        t = np.linspace(0, seconds, int(sample_rate * seconds), endpoint=False)
        return amplitude * np.sin(2 * np.pi * frequency * t)

    silence = lambda seconds: np.zeros(int(sample_rate * seconds), dtype=np.float32)

    waveform = np.concatenate(
        [
            silence(0.20),
            tone(220.0, 0.35),
            silence(0.25),
            tone(240.0, 0.30),
            silence(0.18),
            tone(200.0, 0.40),
            silence(0.25),
        ]
    )
    return waveform.astype(np.float32)


@pytest.fixture()
def silence_waveform(sample_rate: int) -> np.ndarray:
    return np.zeros(sample_rate, dtype=np.float32)


@pytest.fixture()
def wav_bytes(speech_like_waveform: np.ndarray, sample_rate: int) -> bytes:
    buffer = io.BytesIO()
    sf.write(buffer, speech_like_waveform, sample_rate, format="WAV")
    buffer.seek(0)
    return buffer.read()


@pytest.fixture()
def local_wav_file(tmp_path: Path, speech_like_waveform: np.ndarray, sample_rate: int) -> Path:
    audio_path = tmp_path / "synthetic.wav"
    sf.write(audio_path, speech_like_waveform, sample_rate)
    return audio_path

